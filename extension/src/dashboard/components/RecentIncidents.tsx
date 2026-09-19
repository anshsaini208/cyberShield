import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { SecurityIncident } from '../../types/security';
import { FilterType, filterIncidents, relativeTime, severityConfig, threatLabel } from '../utils';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Dismissed', value: 'DISMISSED' },
  { label: 'High Risk', value: 'HIGH_RISK' },
  { label: 'Credential', value: 'CREDENTIAL' },
];

const STATUS_BADGE: Record<SecurityIncident['status'], string> = {
  OPEN: 'bg-rose-950/60 text-rose-300 border-rose-800',
  RESOLVED: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  DISMISSED: 'bg-gray-800 text-gray-400 border-gray-700',
};

interface RecentIncidentsProps {
  incidents: SecurityIncident[];
  onSelectIncident: (id: string) => void;
  selectedId: string | null;
}

export function RecentIncidents({ incidents, onSelectIncident, selectedId }: RecentIncidentsProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');

  const sorted = [...incidents].sort((a, b) => b.createdAt - a.createdAt);
  const visible = filterIncidents(sorted, filter);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
      {/* Header + Filters */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
          Incidents
          <span className="ml-2 text-[11px] font-mono text-gray-500 normal-case">({incidents.length})</span>
        </h3>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter incidents">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-0.5 text-[11px] font-semibold rounded border transition-colors ${
                filter === f.value
                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                  : 'text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-600'
              }`}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500">No incidents match this filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Threat</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Website</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider sr-only">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((inc) => {
                const sev = severityConfig(inc.severity);
                const isSelected = inc.id === selectedId;
                return (
                  <tr
                    key={inc.id}
                    className={`border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-950/20' : ''}`}
                    onClick={() => onSelectIncident(inc.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectIncident(inc.id)}
                    aria-selected={isSelected}
                  >
                    <td className="px-4 py-3 font-medium text-gray-200 whitespace-nowrap">
                      {threatLabel(inc.threatType)}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400 truncate max-w-[200px]">
                      {inc.hostname}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {inc.riskScore.score}/100
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sev.cls}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_BADGE[inc.status]}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {relativeTime(inc.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
                        onClick={(e) => { e.stopPropagation(); onSelectIncident(inc.id); }}
                        aria-label={`View incident details for ${inc.hostname}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
