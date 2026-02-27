import { useState } from 'react';
import StageProgressBar from './StageProgressBar';
import api from '../api/axios';

const STAGE_LABELS = {
  1: 'Received',
  2: 'Acknowledged',
  3: 'In Progress',
  4: 'Resolved',
};

const PRIORITY_STYLES = {
  low:    'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high:   'bg-red-100 text-red-800',
};

const CATEGORY_STYLES = {
  food:       'bg-orange-100 text-orange-800',
  water:      'bg-blue-100 text-blue-800',
  room:       'bg-purple-100 text-purple-800',
  electrical: 'bg-yellow-100 text-yellow-800',
  cleaning:   'bg-teal-100 text-teal-800',
  other:      'bg-gray-100 text-gray-700',
};

export default function ComplaintCard({ complaint, showActions, showHistory, onAdvanceStage, onRevertStage, onEdit }) {
  const [showLogs, setShowLogs]       = useState(false);
  const [logs, setLogs]               = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const stageLabel    = STAGE_LABELS[complaint.stage]  || 'Unknown';
  const priorityStyle = PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low;
  const categoryStyle = CATEGORY_STYLES[complaint.category] || CATEGORY_STYLES.other;

  async function toggleHistory() {
    // Fetch only on first open
    if (!showLogs && logs.length === 0) {
      setLogsLoading(true);
      try {
        const res = await api.get(`/complaints/${complaint.id}/logs`);
        setLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLogsLoading(false);
      }
    }
    setShowLogs(prev => !prev);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">

      {/* Header row: ID + badges */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-500">#{complaint.id}</span>
        <div className="flex gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${categoryStyle}`}>
            {complaint.category}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityStyle}`}>
            {complaint.priority}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4">{complaint.description}</p>

      {/* Stage progress bar */}
      <div className="mb-4">
        <StageProgressBar currentStage={complaint.stage} />
      </div>

      {/* Footer: date + current stage */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Submitted: {new Date(complaint.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
        <span className="font-medium">{stageLabel}</span>
      </div>

      {/* ── History toggle (student view only) ─────────────────── */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={toggleHistory}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline cursor-pointer"
          >
            {showLogs ? '▲ Hide History' : '▼ View History'}
          </button>

          {showLogs && (
            <div className="mt-3">
              {logsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Loading history...
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-gray-400 italic mt-1">
                  No updates yet — your complaint is still awaiting review.
                </p>
              ) : (
                <div className="space-y-0 mt-2">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-0.5 flex-shrink-0" />
                        {i < logs.length - 1 && (
                          <div className="w-px flex-1 bg-indigo-100 my-1" />
                        )}
                      </div>

                      {/* Log entry */}
                      <div className="pb-3">
                        <p className="text-xs font-semibold text-gray-700">
                          {STAGE_LABELS[log.to_stage]}
                          <span className="ml-1 text-gray-400 font-normal">
                            (Stage {log.from_stage} → {log.to_stage})
                          </span>
                        </p>
                        {log.note && (
                          <p className="text-xs text-indigo-600 italic mt-0.5">
                            "{log.note}"
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.changed_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Admin action buttons ────────────────────────────────── */}
      {showActions && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          {complaint.stage <= 2 && onEdit && (
            <button
              onClick={() => onEdit(complaint)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Edit Details
            </button>
          )}
          {complaint.stage > 1 && onRevertStage && (
            <button
              onClick={() => onRevertStage(complaint)}
              className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
            >
              ← Revert to Stage {complaint.stage - 1}
            </button>
          )}
          {complaint.stage < 4 && onAdvanceStage && (
            <button
              onClick={() => onAdvanceStage(complaint)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer ml-auto"
            >
              Advance to Stage {complaint.stage + 1}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
