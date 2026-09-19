import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SecurityIncident, RiskSeverity } from '../../types/security';
import { incidentsInLastDays } from '../utils';

interface SecurityPostureProps {
  incidents: SecurityIncident[];
}

/**
 * Security posture derivation logic:
 * 1. Filter to incidents from the last 7 days.
 * 2. Among those, look for OPEN incidents with severity HIGH or CRITICAL.
 * 3. ALL_CLEAR   — no such incident exists.
 * 4. ATTENTION   — at least one OPEN HIGH/CRITICAL in last 7 days.
 * 5. MONITORING  — incidents exist but none are OPEN HIGH/CRITICAL.
 * No new score is created; this is purely derived from incident status + severity.
 */
function derivePosture(incidents: SecurityIncident[]): 'ALL_CLEAR' | 'ATTENTION' | 'MONITORING' {
  const recent = incidentsInLastDays(incidents, 7);
  const hasOpenHighRisk = recent.some(
    (i) =>
      i.status === 'OPEN' &&
      (i.severity === RiskSeverity.HIGH || i.severity === RiskSeverity.CRITICAL)
  );
  if (hasOpenHighRisk) return 'ATTENTION';
  if (recent.length > 0) return 'MONITORING';
  return 'ALL_CLEAR';
}

const POSTURE_CONFIG = {
  ALL_CLEAR: {
    icon: ShieldCheck,
    iconCls: 'text-emerald-400',
    bgCls: 'bg-emerald-950/30 border-emerald-800/40',
    badge: 'Monitoring Active',
    badgeCls: 'bg-emerald-950/60 text-emerald-300 border-emerald-700',
    headline: 'No recent high-risk incidents detected.',
    sub: 'CyberShield is actively monitoring your browsing. No open high-risk incidents in the last 7 days.',
  },
  ATTENTION: {
    icon: ShieldAlert,
    iconCls: 'text-rose-400',
    bgCls: 'bg-rose-950/20 border-rose-800/40',
    badge: 'Attention Needed',
    badgeCls: 'bg-rose-950/60 text-rose-300 border-rose-700',
    headline: 'Recent security incidents require review.',
    sub: 'You have open high-risk incidents in the last 7 days. Review the Incidents tab for details.',
  },
  MONITORING: {
    icon: Shield,
    iconCls: 'text-amber-400',
    bgCls: 'bg-amber-950/20 border-amber-800/30',
    badge: 'Low Activity',
    badgeCls: 'bg-amber-950/60 text-amber-300 border-amber-700',
    headline: 'Security events recorded — no open high-risk activity.',
    sub: 'Recent incidents are resolved or low severity. No immediate action required.',
  },
};

export function SecurityPosture({ incidents }: SecurityPostureProps) {
  const posture = derivePosture(incidents);
  const cfg = POSTURE_CONFIG[posture];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-5 flex items-start gap-4 ${cfg.bgCls}`}>
      <div className={`p-2.5 rounded-xl bg-black/20 shrink-0 ${cfg.iconCls}`}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border font-mono uppercase ${cfg.badgeCls}`}>
            {cfg.badge}
          </span>
        </div>
        <p className="text-sm font-semibold text-white">{cfg.headline}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{cfg.sub}</p>
      </div>
    </div>
  );
}
