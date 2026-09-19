import { DOMSnapshotData, SecuritySignal, ThreatAnalysis } from '../types/security';
import { analyzeDomainRules } from './domainRules';
import { analyzePageRules, extractDOMSnapshot } from './pageRules';
import { calculateRiskScore } from './riskScoring';
import { analyzeUrlRules } from './urlRules';

export interface AnalyzePageInput {
  url: string;
  domain?: string;
  snapshot?: DOMSnapshotData;
  document?: Document;
}

export const ENGINE_VERSION = '0.2.0-deterministic-heuristic';

/**
 * Main Deterministic Threat Detection Engine Entrypoint.
 *
 * Runs client-side heuristic security analysis on URL, domain, and DOM snapshot inputs.
 * Returns a fully structured ThreatAnalysis object including signals, risk score, and timing metadata.
 */
export async function analyzePage(input: AnalyzePageInput): Promise<ThreatAnalysis> {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const url = input.url || 'https://example.com';
  let domain = input.domain || '';

  if (!domain) {
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }
  }

  // 1. Run URL Rules Analysis
  const urlSignals: SecuritySignal[] = analyzeUrlRules(url);

  // 2. Extract Page Title (if document or snapshot present)
  let pageTitle = input.snapshot?.pageTitle;
  if (!pageTitle && input.document) {
    pageTitle = input.document.title;
  }

  // 3. Run Domain Rules Analysis (Punycode, Entropy, Levenshtein Typosquatting, Title Mismatch)
  const domainSignals: SecuritySignal[] = analyzeDomainRules(domain, pageTitle);

  // 4. Run DOM/Page Rules Analysis (if DOM snapshot or document available)
  let pageSignals: SecuritySignal[] = [];
  if (input.snapshot) {
    pageSignals = analyzePageRules(input.snapshot, url);
  } else if (input.document) {
    const snapshot = extractDOMSnapshot(input.document, url);
    pageSignals = analyzePageRules(snapshot, url);
  }

  // Aggregate all detected signals
  const allSignals: SecuritySignal[] = [...urlSignals, ...domainSignals, ...pageSignals];

  // 5. Calculate Risk Score, Severity, and Threat Type
  const { riskScore, threatType } = calculateRiskScore(allSignals);

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Number((endTime - startTime).toFixed(2));

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url,
    domain,
    timestamp: Date.now(),
    riskScore,
    threatType,
    signals: allSignals,
    engineVersion: ENGINE_VERSION,
    analysisDurationMs: durationMs,
    isPlaceholder: false,
  };
}
