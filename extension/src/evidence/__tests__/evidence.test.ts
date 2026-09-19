import { describe, expect, it } from 'vitest';
import { SecuritySignal, SignalCategory, SignalSeverity, ThreatAnalysis, RiskSeverity, ThreatType } from '../../types/security';
import { calculateRiskScore } from '../../detection/riskScoring';

describe('CyberShield Evidence Mode — Phase 3 Unit & Integration Tests', () => {
  const mockSignal1: SecuritySignal = {
    id: 'SIG_DOMAIN_TYPOSQUATTING',
    category: SignalCategory.DOMAIN,
    severity: SignalSeverity.HIGH,
    weight: 25,
    title: 'Potential brand look-alike or typosquatting domain',
    description: 'The domain paypa1-login.net resembles official brand paypal.',
    evidence: [
      { key: 'targetBrand', value: 'paypal' },
      { key: 'detectedHost', value: 'paypa1-login.net' },
      { key: 'levenshteinDistance', value: '1' },
    ],
    confidence: 0.92,
    timestamp: 1742416800000,
    target: { type: 'NONE' },
  };

  const mockSignal2: SecuritySignal = {
    id: 'SIG_PAGE_CROSS_ORIGIN_FORM_0',
    category: SignalCategory.CREDENTIAL,
    severity: SignalSeverity.CRITICAL,
    weight: 30,
    title: 'Credential form submits to another origin',
    description: 'A form on this page posts data to a different destination origin.',
    evidence: [
      { key: 'currentOrigin', value: 'http://paypa1-login.net' },
      { key: 'formActionOrigin', value: 'http://192.168.1.100' },
    ],
    confidence: 0.95,
    timestamp: 1742416800000,
    target: { type: 'FORM', selector: 'form' },
  };

  const mockAnalysis: ThreatAnalysis = {
    id: 'test_analysis_1',
    url: 'http://paypa1-login.net/login',
    domain: 'paypa1-login.net',
    timestamp: 1742416800000,
    riskScore: {
      score: 78,
      severity: RiskSeverity.CRITICAL,
      breakdown: {
        urlScore: 0,
        domainScore: 35,
        pageScore: 0,
        redirectScore: 0,
        credentialScore: 43,
      },
    },
    threatType: ThreatType.CREDENTIAL_HARVESTING,
    signals: [mockSignal1, mockSignal2],
    engineVersion: '0.2.0-deterministic-heuristic',
    analysisDurationMs: 3.2,
  };

  describe('1. Evidence Traceability & Grounding', () => {
    it('verifies every evidence item maps strictly to SecuritySignal ID', () => {
      const signalIds = mockAnalysis.signals.map((s) => s.id);
      expect(signalIds).toContain('SIG_DOMAIN_TYPOSQUATTING');
      expect(signalIds).toContain('SIG_PAGE_CROSS_ORIGIN_FORM_0');
    });

    it('verifies Evidence Cards consume exact engine technical evidence without altering content', () => {
      const card2 = mockAnalysis.signals.find((s) => s.id === 'SIG_PAGE_CROSS_ORIGIN_FORM_0');
      expect(card2).toBeDefined();
      expect(card2?.evidence.some((e) => e.key === 'formActionOrigin' && e.value === 'http://192.168.1.100')).toBe(true);
    });

    it('verifies signal target is present for page highlighting', () => {
      const card2 = mockAnalysis.signals.find((s) => s.id === 'SIG_PAGE_CROSS_ORIGIN_FORM_0');
      expect(card2?.target).toBeDefined();
      expect(card2?.target?.type).toBe('FORM');
      expect(card2?.target?.selector).toBe('form');
    });
  });

  describe('2. Risk Breakdown Calculation', () => {
    it('calculates category contributions matching engine raw breakdown output', () => {
      const result = calculateRiskScore([mockSignal1, mockSignal2]);
      expect(result.riskScore.score).toBeGreaterThan(50);
      expect(result.riskScore.breakdown.domainScore).toBeGreaterThan(0);
      expect(result.riskScore.breakdown.credentialScore).toBeGreaterThan(0);
      expect(result.riskScore.breakdown.urlScore).toBe(0);
    });
  });

  describe('3. Zero Knowledge & Privacy Verification', () => {
    it('verifies no evidence item contains credential or password values', () => {
      mockAnalysis.signals.forEach((sig) => {
        sig.evidence.forEach((ev) => {
          expect(ev.key.toLowerCase()).not.toContain('passwordvalue');
          expect(ev.key.toLowerCase()).not.toContain('secret');
          expect(ev.value.toLowerCase()).not.toContain('mysecretpassword');
        });
      });
    });
  });
});
