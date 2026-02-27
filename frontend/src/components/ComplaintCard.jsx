import StageProgressBar from './StageProgressBar';

const STAGE_LABELS = {
  1: 'Received',
  2: 'Acknowledged',
  3: 'In Progress',
  4: 'Resolved',
};

const PRIORITY_STYLES = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const CATEGORY_STYLES = {
  food: 'bg-orange-100 text-orange-800',
  water: 'bg-blue-100 text-blue-800',
  room: 'bg-purple-100 text-purple-800',
  electrical: 'bg-yellow-100 text-yellow-800',
  cleaning: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-700',
};

export default function ComplaintCard({ complaint, showActions, onAdvanceStage, onEdit }) {
  const stageLabel = STAGE_LABELS[complaint.stage] || 'Unknown';
  const priorityStyle = PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low;
  const categoryStyle = CATEGORY_STYLES[complaint.category] || CATEGORY_STYLES.other;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header row: ID + badges */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-500">
          #{complaint.id}
        </span>
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
      <p className="text-gray-700 text-sm leading-relaxed mb-4">
        {complaint.description}
      </p>

      {/* Stage progress bar */}
      <div className="mb-4">
        <StageProgressBar currentStage={complaint.stage} />
      </div>

      {/* Footer: date + status */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Submitted: {new Date(complaint.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className="font-medium">{stageLabel}</span>
      </div>

      {/* Admin action buttons */}
      {showActions && complaint.stage < 4 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          {complaint.stage <= 2 && onEdit && (
            <button
              onClick={() => onEdit(complaint)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Edit Details
            </button>
          )}
          {onAdvanceStage && (
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
