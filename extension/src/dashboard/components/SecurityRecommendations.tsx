import { Lightbulb, CheckCircle } from 'lucide-react';
import { SecurityIncident, ThreatType, RiskSeverity } from '../../types/security';

interface Recommendation {
  title: string;
  body: string;
  urgent: boolean;
}

/** Derive up to 3 deterministic, evidence-based recommendations from real incident data. */
function deriveRecommendations(incidents: SecurityIncident[]): Recommendation[] {
  const recs: Recommendation[] = [];

  const hasCredential = incidents.some(
    (i) =>
      i.threatType === ThreatType.CREDENTIAL_HARVESTING ||
      i.signals.some((s) => s.category === 'CREDENTIAL')
  );
  if (hasCredential) {
    recs.push({
      title: 'Credential Safety',
      body: 'Review recent credential-related warnings. Verify that any login destinations you visited are legitimate.',
      urgent: true,
    });
  }

  const openHighRisk = incidents.filter(
    (i) =>
      i.status === 'OPEN' &&
      (i.severity === RiskSeverity.HIGH || i.severity === RiskSeverity.CRITICAL)
  );
  if (openHighRisk.length > 0) {
    recs.push({
      title: 'High-Risk Activity',
      body: `You have ${openHighRisk.length} unresolved high-risk incident${openHighRisk.length > 1 ? 's' : ''} in your timeline. Review them in the Incidents tab.`,
      urgent: true,
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: 'Security Check',
      body: 'No incidents require immediate attention right now. Continue normal browsing and CyberShield will alert you to threats.',
      urgent: false,
    });
  }

  return recs;
}

interface SecurityRecommendationsProps {
  incidents: SecurityIncident[];
}

export function SecurityRecommendations({ incidents }: SecurityRecommendationsProps) {
  const recs = deriveRecommendations(incidents);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-3">
      <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400" aria-hidden="true" />
        Security Recommendations
      </h3>
      <div className="space-y-2">
        {recs.map((rec, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
              rec.urgent
                ? 'bg-amber-950/20 border-amber-800/40'
                : 'bg-emerald-950/20 border-emerald-800/30'
            }`}
          >
            <CheckCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${rec.urgent ? 'text-amber-400' : 'text-emerald-400'}`}
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold text-white block">{rec.title}</span>
              <span className="text-gray-400 leading-relaxed">{rec.body}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
