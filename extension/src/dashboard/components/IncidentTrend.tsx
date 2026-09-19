import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { SecurityIncident } from '../../types/security';
import { groupByDay, lastNDays } from '../utils';

type Range = 7 | 30 | 'ALL';

interface IncidentTrendProps {
  incidents: SecurityIncident[];
}

export function IncidentTrend({ incidents }: IncidentTrendProps) {
  const [range, setRange] = useState<Range>(7);

  const filtered =
    range === 'ALL'
      ? incidents
      : incidents.filter((i) => i.createdAt >= Date.now() - (range as number) * 24 * 60 * 60 * 1000);

  const grouped = groupByDay(filtered);

  const days: string[] =
    range === 'ALL'
      ? Object.keys(grouped).sort()
      : lastNDays(range as number);

  const counts = days.map((d) => grouped[d] ?? 0);
  const maxCount = Math.max(...counts, 1);
  const H = 60; // SVG height in px
  const W_STEP = Math.max(20, Math.floor(540 / Math.max(days.length, 1)));
  const svgWidth = W_STEP * days.length;

  const points = counts.map((c, i) => {
    const x = i * W_STEP + W_STEP / 2;
    const y = H - Math.round((c / maxCount) * (H - 8)) - 4;
    return { x, y, c };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  const rangeOptions: { label: string; value: Range }[] = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: 'All', value: 'ALL' },
  ];

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          Incident Trend
        </h3>
        <div className="flex gap-1" role="group" aria-label="Select time range">
          {rangeOptions.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setRange(opt.value)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                range === opt.value
                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                  : 'text-gray-400 border-gray-700 hover:text-gray-200'
              }`}
              aria-pressed={range === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">No incidents in this range.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${Math.max(svgWidth, 200)} ${H + 20}`}
            className="w-full h-20"
            aria-label="Incident trend chart"
            role="img"
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac) => (
              <line
                key={frac}
                x1={0}
                y1={H - frac * (H - 8) - 4}
                x2={Math.max(svgWidth, 200)}
                y2={H - frac * (H - 8) - 4}
                stroke="#1f2937"
                strokeWidth="1"
              />
            ))}

            {/* Line */}
            {points.length > 1 && (
              <polyline
                points={polyline}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            )}

            {/* Dots + tooltips */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" fill="#10b981" />
                {p.c > 0 && (
                  <text
                    x={p.x}
                    y={p.y - 6}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#6ee7b7"
                  >
                    {p.c}
                  </text>
                )}
                {/* Day label */}
                <text
                  x={p.x}
                  y={H + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#4b5563"
                >
                  {days[i].slice(5)} {/* MM-DD */}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
