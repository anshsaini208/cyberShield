import { PieChart } from 'lucide-react';
import { SecurityIncident, ThreatType } from '../../types/security';
import { threatLabel } from '../utils';

const THREAT_COLORS: Record<ThreatType, string> = {
  [ThreatType.SAFE]: 'bg-emerald-500',
  [ThreatType.SUSPICIOUS]: 'bg-amber-500',
  [ThreatType.PHISHING]: 'bg-orange-500',
  [ThreatType.CREDENTIAL_HARVESTING]: 'bg-rose-500',
  [ThreatType.SUSPICIOUS_REDIRECT]: 'bg-purple-500',
  [ThreatType.UNKNOWN]: 'bg-gray-500',
};

interface ThreatDistributionProps {
  incidents: SecurityIncident[];
}

export function ThreatDistribution({ incidents }: ThreatDistributionProps) {
  const counts: Partial<Record<ThreatType, number>> = {};
  for (const inc of incidents) {
    counts[inc.threatType] = (counts[inc.threatType] ?? 0) + 1;
  }

  const total = incidents.length;
  const entries = Object.entries(counts)
    .sort(([, a], [, b]) => b - a) as [ThreatType, number][];

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <PieChart className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        Threat Distribution
      </h3>

      {total === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">Not enough incident data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(([type, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={type} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${THREAT_COLORS[type] ?? 'bg-gray-500'}`}
                      aria-hidden="true"
                    />
                    {threatLabel(type)}
                  </span>
                  <span className="text-gray-500 font-mono">
                    {count} <span className="text-gray-600">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${threatLabel(type)}: ${pct}%`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${THREAT_COLORS[type] ?? 'bg-gray-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
