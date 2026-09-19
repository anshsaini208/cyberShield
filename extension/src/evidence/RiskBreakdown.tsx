import { RiskScoreBreakdown, SignalCategory } from '../types/security';

interface RiskBreakdownProps {
  breakdown: RiskScoreBreakdown;
  totalScore: number;
}

export function RiskBreakdown({ breakdown, totalScore }: RiskBreakdownProps) {
  const categories: { key: keyof RiskScoreBreakdown; label: string; emoji: string; category: SignalCategory }[] = [
    { key: 'urlScore', label: 'URL', emoji: '🌐', category: SignalCategory.URL },
    { key: 'domainScore', label: 'DOMAIN', emoji: '🌍', category: SignalCategory.DOMAIN },
    { key: 'pageScore', label: 'PAGE', emoji: '📄', category: SignalCategory.PAGE },
    { key: 'redirectScore', label: 'REDIRECT', emoji: '🔀', category: SignalCategory.REDIRECT },
    { key: 'credentialScore', label: 'CREDENTIAL', emoji: '🔐', category: SignalCategory.CREDENTIAL },
  ];

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Risk Category Contribution</h4>
        <span className="text-[10px] text-gray-500 font-mono">Total Risk Score: {totalScore}/100</span>
      </div>

      <div className="space-y-2.5">
        {categories.map((cat) => {
          const score = breakdown[cat.key] || 0;
          const percentage = Math.min(100, score);

          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-300 flex items-center gap-1.5 font-semibold">
                  <span>{cat.emoji}</span>
                  {cat.label}
                </span>
                <span className="text-gray-400 font-bold">{score} pts</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    score >= 25
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : score >= 10
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-500 italic pt-1 border-t border-gray-800/80">
        * Category contribution reflects weighted signal evidence calculated by the detection engine.
      </div>
    </div>
  );
}
