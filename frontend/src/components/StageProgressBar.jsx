const STAGES = [
  { stage: 1, label: 'Received', emoji: '🟡', color: 'bg-yellow-400' },
  { stage: 2, label: 'Acknowledged', emoji: '🔵', color: 'bg-blue-500' },
  { stage: 3, label: 'In Progress', emoji: '🟠', color: 'bg-orange-500' },
  { stage: 4, label: 'Resolved', emoji: '🟢', color: 'bg-green-500' },
];

export default function StageProgressBar({ currentStage }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STAGES.map((s, index) => (
          <div key={s.stage} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  currentStage >= s.stage
                    ? `${s.color} text-white shadow-md`
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {currentStage >= s.stage ? s.emoji : s.stage}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  currentStage >= s.stage ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {index < STAGES.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                  currentStage > s.stage ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
