import { AIExplanation, ThreatAnalysis } from '../types/security';

const BACKEND_URL = 'http://localhost:8000';

/**
 * Generates client-side deterministic fallback explanation when FastAPI backend or Gemini API is unreachable.
 * Works 100% offline without network calls or API keys.
 */
export function generateClientFallbackExplanation(analysis: ThreatAnalysis): AIExplanation {
  const signalIds = analysis.signals.map((s) => s.id);
  const score = analysis.riskScore.score;

  let summary = `CyberShield evaluated ${analysis.domain} and calculated a Risk Score of ${score}/100 (${analysis.riskScore.severity}).`;
  if (score >= 75) {
    summary = `CyberShield detected severe security indicators on ${analysis.domain} consistent with high-risk credential phishing.`;
  } else if (score >= 50) {
    summary = `CyberShield identified elevated threat indicators on ${analysis.domain} that warrant caution.`;
  }

  const detectedBullets = analysis.signals.length > 0
    ? analysis.signals.map((s) => `• ${s.title}: ${s.description}`).join('\n')
    : 'No high-risk indicators were detected.';

  let whyItMatters = `The page heuristics exhibit patterns evaluated at severity level ${analysis.riskScore.severity}.`;
  if (analysis.signals.some((s) => s.id.startsWith('SIG_PAGE_CROSS_ORIGIN_FORM'))) {
    whyItMatters = 'A credential form on this page submits data to a different destination origin. This can lead to unverified credential exposure.';
  } else if (analysis.signals.some((s) => s.id === 'SIG_DOMAIN_TYPOSQUATTING')) {
    whyItMatters = `The domain '${analysis.domain}' closely resembles an official brand name. Deceptive look-alike domains are commonly used in phishing.`;
  }

  const actions = score >= 50
    ? [
        'Do not enter passwords or sensitive personal data on this page.',
        'Verify the hostname in your browser address bar matches the official service.',
        'Leave the page and navigate via an official bookmark.',
      ]
    : [
        'Verify the web address in your browser status bar.',
        'Ensure sensitive forms use encrypted HTTPS connections.',
      ];

  return {
    id: `client_fallback_${Date.now()}`,
    analysisId: analysis.id,
    summary,
    whatDetected: detectedBullets,
    whyItMatters,
    potentialImpact: score >= 50
      ? 'Entering credentials on a deceptive page may result in account theft or credential harvesting.'
      : 'Standard security awareness is advised.',
    recommendedActions: actions,
    generatedAt: Date.now(),
    isFallback: true,
    confidenceNote: 'Client fallback explanation generated deterministically from local heuristic signals without AI synthesis.',
    evidenceReferences: signalIds,
  };
}

/**
 * Requests structured AI Security Explanation from FastAPI Gemini Proxy Backend.
 * Automatically executes client-side fallback if backend is offline or errors.
 */
export async function fetchAIExplanation(analysis: ThreatAnalysis): Promise<AIExplanation> {
  const sanitizedPayload = {
    url: analysis.url,
    domain: analysis.domain,
    riskScore: {
      score: analysis.riskScore.score,
      severity: analysis.riskScore.severity,
    },
    threatType: analysis.threatType,
    signals: analysis.signals.map((s) => ({
      id: s.id,
      category: s.category,
      severity: s.severity,
      title: s.title,
      description: s.description,
      evidence: s.evidence || [],
      confidence: s.confidence,
    })),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch(`${BACKEND_URL}/api/v1/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[CyberShield API] Backend returned HTTP ${response.status}. Using local fallback.`);
      return generateClientFallbackExplanation(analysis);
    }

    const data = await response.json();
    return {
      id: data.id || `ai_exp_${Date.now()}`,
      analysisId: analysis.id,
      summary: data.summary,
      whatDetected: data.whatDetected,
      whyItMatters: data.whyItMatters,
      potentialImpact: data.potentialImpact,
      recommendedActions: data.recommendedActions || [],
      generatedAt: Date.now(),
      isFallback: Boolean(data.isFallback),
      confidenceNote: data.confidenceNote || 'Synthesized from engine signals.',
      evidenceReferences: data.evidenceReferences || [],
    };
  } catch (err) {
    console.warn('[CyberShield API] Failed to connect to FastAPI backend:', err, '. Executing client-side fallback.');
    return generateClientFallbackExplanation(analysis);
  }
}
