const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireStudent = require('../middleware/requireStudent');
const requireAdmin = require('../middleware/requireAdmin');
const complaintModel = require('../models/complaint');
const logModel = require('../models/complaintLog');
const userModel = require('../models/user');

// ─────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────

/**
 * POST /api/complaints
 * Student submits a new complaint → Stage 1 (received)
 */
router.post('/', auth, requireStudent, async (req, res) => {
  try {
    const { category, description, priority } = req.body;

    if (!category || !description || !priority) {
      return res.status(400).json({ error: 'category, description, and priority are required' });
    }

    const dbUser = await userModel.findBySub(req.user.sub);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found — please log out and back in' });
    }

    const id = await complaintModel.create({ studentId: dbUser.id, category, description, priority });
    res.status(201).json({ id, message: 'Complaint submitted successfully' });
  } catch (err) {
    console.error('Submit complaint error:', err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

/**
 * GET /api/complaints/mine
 * Student views their own complaints
 */
router.get('/mine', auth, requireStudent, async (req, res) => {
  try {
    const dbUser = await userModel.findBySub(req.user.sub);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const complaints = await complaintModel.findByStudent(dbUser.id);
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
 * Admin views complaints — category admins see only their category
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
 * Admin edits complaint details — only allowed in Stage 1 or 2
 * Category admins can only edit their own category's complaints
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
 * Admin advances complaint to the next stage (must be sequential: 1→2→3→4)
 * Category admins can only advance their own category's complaints
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

    const adminUser = await userModel.findBySub(req.user.sub);
    if (!adminUser) return res.status(404).json({ error: 'Admin user not found in DB' });

    await complaintModel.updateStage(complaint.id, toStage);
    await logModel.addLog({
      complaintId: complaint.id,
      changedBy: adminUser.id,
      fromStage: complaint.stage,
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
 * Category admins can only revert their own category's complaints.
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

    // Revert the stage
    await complaintModel.updateStage(complaint.id, previousStage);

    // Delete the latest audit log (the forward transition that's being undone)
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
 * Students can only see logs for their own complaints.
 */
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const groups = req.user.groups || [];
    const isAdmin = groups.includes('SuperAdmin') ||
      requireAdmin.CATEGORY_ADMIN_GROUPS.some(g => groups.includes(g));
    const isStudent = groups.includes('Students');

    if (isStudent) {
      const dbUser = await userModel.findBySub(req.user.sub);
      if (!dbUser || complaint.student_id !== dbUser.id) {
        return res.status(403).json({ error: 'You can only view history for your own complaints' });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const logs = await logModel.getLogs(req.params.id);
    res.json({ logs });
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint logs' });
  }
});

module.exports = router;
