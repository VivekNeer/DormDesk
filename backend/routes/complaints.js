const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireStudent = require('../middleware/requireStudent');
const requireAdmin = require('../middleware/requireAdmin');
const complaintModel = require('../models/complaint');
const logModel = require('../models/complaintLog');

// ─────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────

/**
 * POST /api/complaints
 * Student submits a new complaint → Stage 1 (received)
 * Identity (sub, email, name) comes directly from the verified JWT — no DB user lookup needed.
 */
router.post('/', auth, requireStudent, async (req, res) => {
  try {
    const { category, description, priority } = req.body;

    if (!category || !description || !priority) {
      return res.status(400).json({ error: 'category, description, and priority are required' });
    }

    const { sub, email, name } = req.user;

    const id = await complaintModel.create({
      studentSub:   sub,
      studentEmail: email,
      studentName:  name || email, // fall back to email if name isn't set in Cognito
      category,
      description,
      priority,
    });

    res.status(201).json({ id, message: 'Complaint submitted successfully' });
  } catch (err) {
    console.error('Submit complaint error:', err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

/**
 * GET /api/complaints/mine
 * Student views their own complaints — matched by their Cognito sub from the JWT.
 */
router.get('/mine', auth, requireStudent, async (req, res) => {
  try {
    const complaints = await complaintModel.findByStudent(req.user.sub);
    res.json({ complaints });
  } catch (err) {
    console.error('Fetch mine error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES (SuperAdmin + Category Admins)
// ─────────────────────────────────────────────────────────

/**
 * GET /api/complaints
 * Admin views complaints — category admins see only their category.
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { category, priority, stage } = req.query;
    const complaints = await complaintModel.findAll({
      category,
      priority,
      stage,
      adminCategory: req.adminCategory, // null for SuperAdmin, 'food'/'water'/etc. for category admins
    });
    res.json({ complaints });
  } catch (err) {
    console.error('Fetch all error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

/**
 * PATCH /api/complaints/:id
 * Admin edits complaint details — only allowed in Stage 1 or 2.
 * Category admins can only edit their own category's complaints.
 */
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Category admin can only touch their own category
    if (req.adminCategory && complaint.category !== req.adminCategory) {
      return res.status(403).json({ error: 'You can only edit complaints in your category' });
    }

    if (complaint.stage > 2) {
      return res.status(400).json({ error: 'Cannot edit a complaint that is already In Progress or Resolved' });
    }

    const { category, description, priority, adminNotes } = req.body;
    await complaintModel.updateDetails(complaint.id, { category, description, priority, adminNotes });
    res.json({ message: 'Complaint updated' });
  } catch (err) {
    console.error('Update complaint error:', err);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

/**
 * PATCH /api/complaints/:id/stage
 * Admin advances complaint to the next stage (must be sequential: 1→2→3→4).
 * Identity (sub, name) for the audit log comes from the verified JWT.
 */
router.patch('/:id/stage', auth, requireAdmin, async (req, res) => {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Category admin can only touch their own category
    if (req.adminCategory && complaint.category !== req.adminCategory) {
      return res.status(403).json({ error: 'You can only manage complaints in your category' });
    }

    const { toStage, note } = req.body;

    // Must advance exactly one stage at a time
    if (toStage !== complaint.stage + 1) {
      return res.status(400).json({
        error: `Invalid transition: stage ${complaint.stage} → ${toStage}. Stages must advance one at a time.`
      });
    }

    if (toStage > 4) {
      return res.status(400).json({ error: 'Stage 4 is the final stage (Resolved)' });
    }

    await complaintModel.updateStage(complaint.id, toStage);
    await logModel.addLog({
      complaintId:    complaint.id,
      changedBySub:   req.user.sub,
      changedByName:  req.user.name || req.user.email,
      fromStage:      complaint.stage,
      toStage,
      note,
    });

    const stageLabels = { 1: 'Received', 2: 'Acknowledged', 3: 'In Progress', 4: 'Resolved' };
    res.json({ message: `Complaint moved to Stage ${toStage}: ${stageLabels[toStage]}` });
  } catch (err) {
    console.error('Stage update error:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

/**
 * PATCH /api/complaints/:id/revert
 * Admin reverts complaint to the previous stage + deletes the latest audit log entry.
 * Cannot revert below Stage 1.
 */
router.patch('/:id/revert', auth, requireAdmin, async (req, res) => {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Category admin can only touch their own category
    if (req.adminCategory && complaint.category !== req.adminCategory) {
      return res.status(403).json({ error: 'You can only manage complaints in your category' });
    }

    if (complaint.stage <= 1) {
      return res.status(400).json({ error: 'Cannot revert — complaint is already at Stage 1 (Received)' });
    }

    const previousStage = complaint.stage - 1;
    await complaintModel.updateStage(complaint.id, previousStage);
    await logModel.deleteLatestLog(complaint.id);

    const stageLabels = { 1: 'Received', 2: 'Acknowledged', 3: 'In Progress', 4: 'Resolved' };
    res.json({
      message: `Complaint reverted to Stage ${previousStage}: ${stageLabels[previousStage]}`,
    });
  } catch (err) {
    console.error('Stage revert error:', err);
    res.status(500).json({ error: 'Failed to revert stage' });
  }
});

/**
 * GET /api/complaints/:id/logs
 * Admin or student can view audit logs for a complaint.
 * Students can only see logs for their own complaints (matched via Cognito sub from JWT).
 */
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const groups = req.user.groups || [];
    const ADMIN_GROUPS = ['SuperAdmin', 'FoodAdmin', 'WaterAdmin', 'RoomAdmin', 'ElectricalAdmin', 'CleaningAdmin'];
    const isAdmin   = groups.some(g => ADMIN_GROUPS.includes(g));
    const isStudent = !isAdmin;

    // Students can only view their own complaint's history
    if (isStudent && complaint.student_sub !== req.user.sub) {
      return res.status(403).json({ error: 'You can only view history for your own complaints' });
    }

    const logs = await logModel.getLogs(req.params.id);
    res.json({ logs });
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint logs' });
  }
});

module.exports = router;
