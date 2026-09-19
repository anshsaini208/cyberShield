import {
  RiskScore,
  RiskSeverity,
  SecuritySignal,
  SignalCategory,
  ThreatType,
} from '../types/security';

/**
 * Calculates normalized RiskScore (0-100), severity tier, breakdown, and probable threat type.
 *
 * SCORING FORMULA DOCUMENTATION:
 * 1. Raw Score is calculated as the sum of (signal.weight * signal.confidence) across unique signals.
 * 2. Asymptotic Normalization formula:
 *    NormalizedScore = min(100, Math.round(100 * (1 - Math.exp(-RawScore / 40))))
 *    - Scale Constant (K = 40): Ensures a single high signal (weight 30) yields ~53/100 (HIGH severity),
 *      while multiple signals smoothly approach 100 without overflowing or double-counting dominate.
 * 3. Breakdown per category computes the raw component contributions normalized proportionally.
 */
export function calculateRiskScore(signals: SecuritySignal[]): { riskScore: RiskScore; threatType: ThreatType } {
  if (!signals || signals.length === 0) {
    return {
      riskScore: {
        score: 0,
        severity: RiskSeverity.LOW,
        breakdown: {
          urlScore: 0,
          domainScore: 0,
          pageScore: 0,
          redirectScore: 0,
          credentialScore: 0,
        },
      },
      threatType: ThreatType.SAFE,
    };
  }

  // Calculate raw category weights
  let rawTotal = 0;
  const categoryRaw: Record<SignalCategory, number> = {
    [SignalCategory.URL]: 0,
    [SignalCategory.DOMAIN]: 0,
    [SignalCategory.PAGE]: 0,
    [SignalCategory.REDIRECT]: 0,
    [SignalCategory.CREDENTIAL]: 0,
  };

  // Deduplicate signals by ID
  const seenIds = new Set<string>();
  signals.forEach((sig) => {
    if (!seenIds.has(sig.id)) {
      seenIds.add(sig.id);
      const contribution = sig.weight * sig.confidence;
      rawTotal += contribution;
      categoryRaw[sig.category] = (categoryRaw[sig.category] || 0) + contribution;
    }
  });

  // Apply Asymptotic Normalization: Score = 100 * (1 - e^(-rawTotal / 40))
  const normalizedScore = Math.min(100, Math.round(100 * (1 - Math.exp(-rawTotal / 40))));

  // Map Category Breakdown proportionally to normalized score
  const urlScore = rawTotal > 0 ? Math.round((categoryRaw[SignalCategory.URL] / rawTotal) * normalizedScore) : 0;
  const domainScore = rawTotal > 0 ? Math.round((categoryRaw[SignalCategory.DOMAIN] / rawTotal) * normalizedScore) : 0;
  const pageScore = rawTotal > 0 ? Math.round((categoryRaw[SignalCategory.PAGE] / rawTotal) * normalizedScore) : 0;
  const redirectScore = rawTotal > 0 ? Math.round((categoryRaw[SignalCategory.REDIRECT] / rawTotal) * normalizedScore) : 0;
  const credentialScore = rawTotal > 0 ? Math.round((categoryRaw[SignalCategory.CREDENTIAL] / rawTotal) * normalizedScore) : 0;

  // Map Severity Tier
  let severity: RiskSeverity = RiskSeverity.LOW;
  if (normalizedScore >= 75) {
    severity = RiskSeverity.CRITICAL;
  } else if (normalizedScore >= 50) {
    severity = RiskSeverity.HIGH;
  } else if (normalizedScore >= 25) {
    severity = RiskSeverity.MEDIUM;
  } else {
    severity = RiskSeverity.LOW;
  }

  // Determine Probable Threat Type (Heuristic Classification)
  const hasCrossOriginForm = signals.some((s) => s.id.startsWith('SIG_PAGE_CROSS_ORIGIN_FORM'));
  const hasPasswordField = signals.some((s) => s.id === 'SIG_PAGE_PASSWORD_INPUT');
  const hasTyposquatting = signals.some((s) => s.id === 'SIG_DOMAIN_TYPOSQUATTING');
  const hasIPHost = signals.some((s) => s.id === 'SIG_URL_IP_HOST');
  const hasHTTP = signals.some((s) => s.id === 'SIG_URL_UNENCRYPTED_HTTP');
  const hasPunycode = signals.some((s) => s.id === 'SIG_DOMAIN_PUNYCODE');
  const hasMetaRefresh = signals.some((s) => s.id === 'SIG_REDIRECT_META_REFRESH');

  let threatType: ThreatType = ThreatType.SAFE;

  if (normalizedScore >= 50 && (hasCrossOriginForm || (hasPasswordField && (hasTyposquatting || hasIPHost || hasHTTP)))) {
    threatType = ThreatType.CREDENTIAL_HARVESTING;
  } else if (normalizedScore >= 40 && (hasTyposquatting || hasPunycode || (hasPasswordField && hasHTTP))) {
    threatType = ThreatType.PHISHING;
  } else if (hasMetaRefresh && normalizedScore >= 25) {
    threatType = ThreatType.SUSPICIOUS_REDIRECT;
  } else if (normalizedScore >= 25) {
    threatType = ThreatType.SUSPICIOUS;
  } else {
    threatType = ThreatType.SAFE;
  }

  return {
    riskScore: {
      score: normalizedScore,
      severity,
      breakdown: {
        urlScore,
        domainScore,
        pageScore,
        redirectScore,
        credentialScore,
      },
    },
    threatType,
  };
}
