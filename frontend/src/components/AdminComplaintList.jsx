import { useState, useEffect } from 'react';
import api from '../api/axios';
import ComplaintCard from './ComplaintCard';

const CATEGORIES = ['all', 'food', 'water', 'room', 'electrical', 'cleaning', 'other'];
const PRIORITIES = ['all', 'low', 'medium', 'high'];
const STAGES = ['all', '1', '2', '3', '4'];
const STAGE_LABELS = { all: 'All Stages', 1: 'Received', 2: 'Acknowledged', 3: 'In Progress', 4: 'Resolved' };

export default function AdminComplaintList() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  // Edit modal state
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('');

  // Stage advance modal state
  const [advancingComplaint, setAdvancingComplaint] = useState(null);
  const [stageNote, setStageNote] = useState('');

  // Audit log state
  const [viewingLogs, setViewingLogs] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchComplaints();
  }, []);

  async function fetchComplaints() {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (stageFilter !== 'all') params.stage = stageFilter;

      const res = await api.get('/complaints', { params });
      setComplaints(res.data.complaints);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch when filters change
  useEffect(() => {
    fetchComplaints();
  }, [categoryFilter, priorityFilter, stageFilter]);

  // --- Edit complaint ---
  function handleEditClick(complaint) {
    setEditingComplaint(complaint);
    setEditCategory(complaint.category);
    setEditDescription(complaint.description);
    setEditPriority(complaint.priority);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      await api.patch(`/complaints/${editingComplaint.id}`, {
        category: editCategory,
        description: editDescription,
        priority: editPriority,
      });
      setEditingComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update complaint.');
    }
  }

  // --- Advance stage ---
  function handleAdvanceClick(complaint) {
    setAdvancingComplaint(complaint);
    setStageNote('');
  }

  async function handleAdvanceSubmit(e) {
    e.preventDefault();
    try {
      await api.patch(`/complaints/${advancingComplaint.id}/stage`, {
        toStage: advancingComplaint.stage + 1,
        note: stageNote,
      });
      setAdvancingComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to advance stage.');
    }
  }

  // --- View audit log ---
  async function handleViewLogs(complaint) {
    try {
      const res = await api.get(`/complaints/${complaint.id}/logs`);
      setLogs(res.data.logs);
      setViewingLogs(complaint);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load audit log.');
    }
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No complaints found.</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <div key={complaint.id}>
              <ComplaintCard
                complaint={complaint}
                showActions={true}
                onAdvanceStage={handleAdvanceClick}
                onEdit={complaint.stage <= 2 ? handleEditClick : undefined}
              />
              {/* View Logs button */}
              <button
                onClick={() => handleViewLogs(complaint)}
                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline cursor-pointer"
              >
                View Audit Log
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingComplaint && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Complaint #{editingComplaint.id}</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {CATEGORIES.filter(c => c !== 'all').map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {PRIORITIES.filter(p => p !== 'all').map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingComplaint(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stage Advance Modal */}
      {advancingComplaint && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleAdvanceSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              Advance Complaint #{advancingComplaint.id}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Stage {advancingComplaint.stage} → Stage {advancingComplaint.stage + 1}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder="Add an optional note for the audit trail..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setAdvancingComplaint(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer">
                Confirm Advance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Audit Log Modal */}
      {viewingLogs && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Audit Log — Complaint #{viewingLogs.id}
            </h3>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400">No audit records yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={i} className="border-l-4 border-indigo-300 pl-3 py-1">
                    <p className="text-sm font-medium text-gray-700">
                      Stage {log.from_stage} → {log.to_stage}
                    </p>
                    {log.note && (
                      <p className="text-xs text-gray-500 italic mt-0.5">"{log.note}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.changed_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingLogs(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
