const complaints = [];
const complaintLogs = [];

let nextComplaintId = 1;
let nextLogId = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function timestamp(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

function addComplaint(seed) {
  const complaint = {
    id: nextComplaintId++,
    student_sub: seed.student_sub,
    student_email: seed.student_email,
    student_name: seed.student_name,
    category: seed.category,
    description: seed.description,
    priority: seed.priority,
    stage: seed.stage,
    assigned_to_sub: seed.assigned_to_sub || null,
    admin_notes: seed.admin_notes || null,
    created_at: seed.created_at || timestamp(-120 + nextComplaintId * 11),
    updated_at: seed.updated_at || timestamp(-120 + nextComplaintId * 11),
  };

  complaints.push(complaint);
  return complaint;
}

function addLog(seed) {
  complaintLogs.push({
    id: nextLogId++,
    complaint_id: seed.complaint_id,
    changed_by_sub: seed.changed_by_sub,
    changed_by_name: seed.changed_by_name,
    from_stage: seed.from_stage,
    to_stage: seed.to_stage,
    note: seed.note || null,
    changed_at: seed.changed_at || timestamp(-90 + nextLogId * 7),
  });
}

const seededStudentSub = "demo-student-1";

addComplaint({
  student_sub: seededStudentSub,
  student_email: "student@gmail.com",
  student_name: "Demo Student",
  category: "room",
  description: "Ceiling fan is making a loud rattling noise during the night.",
  priority: "high",
  stage: 1,
});

addComplaint({
  student_sub: seededStudentSub,
  student_email: "student@gmail.com",
  student_name: "Demo Student",
  category: "water",
  description:
    "The water cooler on the second floor is leaking around the base.",
  priority: "medium",
  stage: 2,
});

addLog({
  complaint_id: 2,
  changed_by_sub: "demo-water-admin",
  changed_by_name: "Water Admin",
  from_stage: 1,
  to_stage: 2,
  note: "Maintenance team has been notified.",
});

addComplaint({
  student_sub: "demo-student-2",
  student_email: "another.student@gmail.com",
  student_name: "Another Student",
  category: "electrical",
  description:
    "The corridor light on the third floor is flickering repeatedly.",
  priority: "high",
  stage: 3,
});

addLog({
  complaint_id: 3,
  changed_by_sub: "demo-electrical-admin",
  changed_by_name: "Electrical Admin",
  from_stage: 1,
  to_stage: 2,
  note: "Issue acknowledged and assigned.",
});

addLog({
  complaint_id: 3,
  changed_by_sub: "demo-electrical-admin",
  changed_by_name: "Electrical Admin",
  from_stage: 2,
  to_stage: 3,
  note: "Repair work in progress.",
});

addComplaint({
  student_sub: "demo-student-3",
  student_email: "resolved.student@gmail.com",
  student_name: "Resolved Student",
  category: "food",
  description: "Mess hall menu display was updated incorrectly.",
  priority: "low",
  stage: 4,
});

addLog({
  complaint_id: 4,
  changed_by_sub: "demo-food-admin",
  changed_by_name: "Food Admin",
  from_stage: 1,
  to_stage: 2,
  note: "Menu corrected.",
});

addLog({
  complaint_id: 4,
  changed_by_sub: "demo-food-admin",
  changed_by_name: "Food Admin",
  from_stage: 2,
  to_stage: 3,
  note: "Awaiting staff verification.",
});

addLog({
  complaint_id: 4,
  changed_by_sub: "demo-food-admin",
  changed_by_name: "Food Admin",
  from_stage: 3,
  to_stage: 4,
  note: "Complaint resolved.",
});

function createComplaint({
  studentSub,
  studentEmail,
  studentName,
  category,
  description,
  priority,
}) {
  const complaint = addComplaint({
    student_sub: studentSub,
    student_email: studentEmail,
    student_name: studentName,
    category,
    description,
    priority,
    stage: 1,
  });

  return complaint.id;
}

function findByStudent(studentSub) {
  return clone(
    complaints
      .filter((complaint) => complaint.student_sub === studentSub)
      .sort(
        (left, right) => new Date(right.created_at) - new Date(left.created_at),
      ),
  );
}

function findAll({ category, priority, stage, adminCategory } = {}) {
  return clone(
    complaints
      .filter((complaint) => {
        if (adminCategory && complaint.category !== adminCategory) {
          return false;
        }
        if (!adminCategory && category && complaint.category !== category) {
          return false;
        }
        if (priority && complaint.priority !== priority) {
          return false;
        }
        if (stage && complaint.stage !== Number(stage)) {
          return false;
        }
        return true;
      })
      .sort(
        (left, right) => new Date(right.created_at) - new Date(left.created_at),
      ),
  );
}

function findById(id) {
  const complaint = complaints.find((entry) => entry.id === Number(id));
  return complaint ? clone(complaint) : null;
}

function updateDetails(id, { category, description, priority, adminNotes }) {
  const complaint = complaints.find((entry) => entry.id === Number(id));
  if (!complaint) {
    return;
  }

  complaint.category = category;
  complaint.description = description;
  complaint.priority = priority;
  complaint.admin_notes = adminNotes || null;
  complaint.updated_at = new Date().toISOString();
}

function updateStage(id, stage) {
  const complaint = complaints.find((entry) => entry.id === Number(id));
  if (!complaint) {
    return;
  }

  complaint.stage = stage;
  complaint.updated_at = new Date().toISOString();
}

function addComplaintLog({
  complaintId,
  changedBySub,
  changedByName,
  fromStage,
  toStage,
  note,
}) {
  complaintLogs.push({
    id: nextLogId++,
    complaint_id: Number(complaintId),
    changed_by_sub: changedBySub,
    changed_by_name: changedByName,
    from_stage: fromStage,
    to_stage: toStage,
    note: note || null,
    changed_at: new Date().toISOString(),
  });
}

function getLogs(complaintId) {
  return clone(
    complaintLogs
      .filter((log) => log.complaint_id === Number(complaintId))
      .sort(
        (left, right) => new Date(left.changed_at) - new Date(right.changed_at),
      ),
  );
}

function deleteLatestLog(complaintId) {
  const latest = complaintLogs
    .map((log, index) => ({ log, index }))
    .filter((entry) => entry.log.complaint_id === Number(complaintId))
    .sort(
      (left, right) =>
        new Date(right.log.changed_at) - new Date(left.log.changed_at),
    )[0];

  if (latest) {
    complaintLogs.splice(latest.index, 1);
  }
}

module.exports = {
  createComplaint,
  findByStudent,
  findAll,
  findById,
  updateDetails,
  updateStage,
  addComplaintLog,
  getLogs,
  deleteLatestLog,
};
