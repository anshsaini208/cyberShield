import { SecuritySignal, SignalSeverity, ThreatAnalysis, ThreatType, RiskSeverity } from '../types/security';

/**
 * Derives user-facing non-alarmist threat label directly from ThreatAnalysis.
 */
export function getPrimaryThreatLabel(analysis: ThreatAnalysis | null): string {
  if (!analysis) return 'No Significant Risk Detected';

  switch (analysis.threatType) {
    case ThreatType.CREDENTIAL_HARVESTING:
      return 'Potential Credential Harvesting';
    case ThreatType.PHISHING:
      return 'Potential Phishing';
    case ThreatType.SUSPICIOUS_REDIRECT:
      return 'Suspicious Redirect';
    case ThreatType.SUSPICIOUS:
      return 'Suspicious Website';
    case ThreatType.SAFE:
      return 'No Significant Risk Detected';
    default:
      return 'No Significant Risk Detected';
  }
}

/**
 * Sorts detected signals by severity priority (CRITICAL > HIGH > MEDIUM > LOW) and weight.
 * Returns the top N signals for concise Protection Screen display.
 */
export function getPrioritizedSignals(signals: SecuritySignal[], limit = 4): SecuritySignal[] {
  if (!signals || signals.length === 0) return [];

  const severityOrder: Record<SignalSeverity, number> = {
    [SignalSeverity.CRITICAL]: 4,
    [SignalSeverity.HIGH]: 3,
    [SignalSeverity.MEDIUM]: 2,
    [SignalSeverity.LOW]: 1,
    [SignalSeverity.INFO]: 0,
  };

  const sorted = [...signals].sort((a, b) => {
    const sevDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;
    return b.weight - a.weight;
  });

  return sorted.slice(0, limit);
}

/**
 * Generates a stable incident ID for a navigation URL to prevent duplicate incident creation.
 */
export function getStableIncidentId(url: string): string {
  let cleanKey = url;
  try {
    const parsed = new URL(url);
    cleanKey = `${parsed.hostname}${parsed.pathname}`;
  } catch {
    cleanKey = url;
  }
  
  let hash = 0;
  for (let i = 0; i < cleanKey.length; i++) {
    hash = (hash << 5) - hash + cleanKey.charCodeAt(i);
    hash |= 0;
  }
  return `CS-INC-${Math.abs(hash).toString(36).toUpperCase()}`;
}

/**
 * Updates extension action badge based on Risk Severity if chrome.action is available.
 */
export function updateActionBadge(_score: number, severity: RiskSeverity) {
  if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setBadgeText) {
    try {
      if (severity === RiskSeverity.CRITICAL) {
        chrome.action.setBadgeText({ text: 'RISK' });
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
      } else if (severity === RiskSeverity.HIGH) {
        chrome.action.setBadgeText({ text: 'WARN' });
        chrome.action.setBadgeBackgroundColor({ color: '#F97316' });
      } else if (severity === RiskSeverity.MEDIUM) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    } catch (err) {
      console.warn('[CyberShield Controller] Could not set action badge:', err);
    }
  }
}
