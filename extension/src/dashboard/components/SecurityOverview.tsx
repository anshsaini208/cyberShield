import { Activity, ShieldAlert, Lock, Target } from 'lucide-react';
import { SecurityIncident, ThreatAnalysis } from '../../types/security';
import { DashboardStats, severityConfig } from '../utils';

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  valueClass?: string;
}

function KPICard({ icon, label, value, sub, valueClass = 'text-white' }: KPICardProps) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`text-3xl font-extrabold font-mono ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

interface SecurityOverviewProps {
  stats: DashboardStats;
  latestAnalysis: ThreatAnalysis | null;
  incidents: SecurityIncident[];
}

export function SecurityOverview({ stats, latestAnalysis, incidents }: SecurityOverviewProps) {
  const last30 = incidents.filter((i) => i.createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000);
  const scoreDisplay = latestAnalysis ? `${latestAnalysis.riskScore.score} / 100` : '--';
  const severityDisplay = latestAnalysis
    ? severityConfig(latestAnalysis.riskScore.severity).label
    : 'No analysis available';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        icon={<Activity className="w-3.5 h-3.5" />}
        label="Total Incidents"
        value={last30.length}
        sub="Last 30 days"
      />
      <KPICard
        icon={<ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
        label="High-Risk"
        value={stats.highRisk}
        sub="Requires attention"
        valueClass={stats.highRisk > 0 ? 'text-rose-400' : 'text-white'}
      />
      <KPICard
        icon={<Lock className="w-3.5 h-3.5 text-amber-400" />}
        label="Credential Warnings"
        value={stats.credentialWarnings}
        sub="Credential contexts detected"
        valueClass={stats.credentialWarnings > 0 ? 'text-amber-400' : 'text-white'}
      />
      <KPICard
        icon={<Target className="w-3.5 h-3.5 text-blue-400" />}
        label="Current Risk"
        value={scoreDisplay}
        sub={severityDisplay}
        valueClass={
          latestAnalysis
            ? severityConfig(latestAnalysis.riskScore.severity).cls.split(' ')[0]
            : 'text-gray-500'
        }
      />
    </div>
  );
}
