import { SecurityIncident, ThreatType, RiskSeverity, SignalCategory } from '../types/security';

/** Derive KPI stats from a list of incidents. */
export interface DashboardStats {
  total: number;
  highRisk: number;
  credentialWarnings: number;
  openCount: number;
}

export function computeStats(incidents: SecurityIncident[]): DashboardStats {
  return {
    total: incidents.length,
    highRisk: incidents.filter(
      (i) => i.severity === RiskSeverity.HIGH || i.severity === RiskSeverity.CRITICAL
    ).length,
    credentialWarnings: incidents.filter(
      (i) =>
        i.threatType === ThreatType.CREDENTIAL_HARVESTING ||
        i.signals.some((s) => s.category === SignalCategory.CREDENTIAL)
    ).length,
    openCount: incidents.filter((i) => i.status === 'OPEN').length,
  };
}

export type FilterType = 'ALL' | 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'HIGH_RISK' | 'CREDENTIAL';

/** Filter incidents according to the selected filter. */
export function filterIncidents(incidents: SecurityIncident[], filter: FilterType): SecurityIncident[] {
  switch (filter) {
    case 'OPEN':
      return incidents.filter((i) => i.status === 'OPEN');
    case 'RESOLVED':
      return incidents.filter((i) => i.status === 'RESOLVED');
    case 'DISMISSED':
      return incidents.filter((i) => i.status === 'DISMISSED');
    case 'HIGH_RISK':
      return incidents.filter(
        (i) => i.severity === RiskSeverity.HIGH || i.severity === RiskSeverity.CRITICAL
      );
    case 'CREDENTIAL':
      return incidents.filter(
        (i) =>
          i.threatType === ThreatType.CREDENTIAL_HARVESTING ||
          i.signals.some((s) => s.category === SignalCategory.CREDENTIAL)
      );
    case 'ALL':
    default:
      return incidents;
  }
}

/** Group incidents by calendar day (YYYY-MM-DD) for trend charts. */
export function groupByDay(incidents: SecurityIncident[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const inc of incidents) {
    const date = new Date(inc.createdAt).toISOString().slice(0, 10);
    result[date] = (result[date] ?? 0) + 1;
  }
  return result;
}

/** Incidents within the last N days (inclusive). */
export function incidentsInLastDays(incidents: SecurityIncident[], days: number): SecurityIncident[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return incidents.filter((i) => i.createdAt >= cutoff);
}

/** Generate an array of ISO date strings for the last N days (inclusive of today). */
export function lastNDays(n: number): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/** Human-readable relative time: "2 min ago", "3 hours ago", "5 days ago". */
export function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/** Truncate a URL for display, keeping hostname and path up to 60 chars. */
export function sanitizeDisplayUrl(url: string, maxLen = 60): string {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname;
    return display.length > maxLen ? display.slice(0, maxLen - 1) + '…' : display;
  } catch {
    return url.slice(0, maxLen);
  }
}

/** Label and color class for severity. */
export function severityConfig(severity: RiskSeverity): { label: string; cls: string; dotCls: string } {
  switch (severity) {
    case RiskSeverity.LOW:
      return { label: 'LOW', cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50', dotCls: 'bg-emerald-500' };
    case RiskSeverity.MEDIUM:
      return { label: 'MEDIUM', cls: 'text-amber-400 bg-amber-950/40 border-amber-800/50', dotCls: 'bg-amber-500' };
    case RiskSeverity.HIGH:
      return { label: 'HIGH', cls: 'text-orange-400 bg-orange-950/40 border-orange-800/50', dotCls: 'bg-orange-500' };
    case RiskSeverity.CRITICAL:
      return { label: 'CRITICAL', cls: 'text-rose-400 bg-rose-950/40 border-rose-800/50', dotCls: 'bg-rose-500 animate-pulse' };
    default:
      return { label: String(severity), cls: 'text-gray-400 bg-gray-800 border-gray-700', dotCls: 'bg-gray-500' };
  }
}

/** Human-friendly threat type label. */
export function threatLabel(type: ThreatType): string {
  switch (type) {
    case ThreatType.CREDENTIAL_HARVESTING: return 'Credential Harvesting';
    case ThreatType.PHISHING: return 'Phishing';
    case ThreatType.SUSPICIOUS_REDIRECT: return 'Suspicious Redirect';
    case ThreatType.SUSPICIOUS: return 'Suspicious';
    case ThreatType.SAFE: return 'Safe';
    default: return 'Unknown';
  }
}
