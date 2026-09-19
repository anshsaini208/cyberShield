import { describe, expect, it } from 'vitest';
import { calculateEntropy, levenshteinDistance, analyzeDomainRules } from '../domainRules';
import { analyzeUrlRules } from '../urlRules';
import { analyzePageRules } from '../pageRules';
import { calculateRiskScore } from '../riskScoring';
import { analyzePage } from '../engine';
import { DOMSnapshotData, RiskSeverity, SignalCategory, ThreatType } from '../../types/security';

describe('CyberShield Detection Engine — Phase 2 Unit Tests', () => {
  describe('1. Algorithm Utilities', () => {
    it('calculates Shannon entropy correctly', () => {
      expect(calculateEntropy('aaaaa')).toBe(0);
      expect(calculateEntropy('abcde')).toBeGreaterThan(2.0);
      expect(calculateEntropy('x7q9z2b')).toBeGreaterThan(2.5);
    });

    it('calculates Levenshtein distance correctly', () => {
      expect(levenshteinDistance('paypal', 'paypal')).toBe(0);
      expect(levenshteinDistance('paypa1', 'paypal')).toBe(1);
      expect(levenshteinDistance('g00gle', 'google')).toBe(2);
      expect(levenshteinDistance('microsoft', 'apple')).toBe(9);
    });
  });

  describe('2. URL Analysis Rules', () => {
    it('detects IP address as hostname', () => {
      const signals = analyzeUrlRules('http://192.168.1.20/login');
      const ipSignal = signals.find((s) => s.id === 'SIG_URL_IP_HOST');
      expect(ipSignal).toBeDefined();
      expect(ipSignal?.severity).toBe('HIGH');
    });

    it('detects unencrypted HTTP connection', () => {
      const signals = analyzeUrlRules('http://example.com/login');
      const httpSignal = signals.find((s) => s.id === 'SIG_URL_UNENCRYPTED_HTTP');
      expect(httpSignal).toBeDefined();
      expect(httpSignal?.severity).toBe('LOW');
    });

    it('detects excessive URL length (> 75 chars)', () => {
      const longUrl = 'https://example.com/path/' + 'a'.repeat(80);
      const signals = analyzeUrlRules(longUrl);
      const lenSignal = signals.find((s) => s.id === 'SIG_URL_EXCESSIVE_LENGTH');
      expect(lenSignal).toBeDefined();
    });

    it('detects security keywords in URL', () => {
      const signals = analyzeUrlRules('https://example.com/account/verify-password');
      const kwSignal = signals.find((s) => s.id === 'SIG_URL_SECURITY_KEYWORD');
      expect(kwSignal).toBeDefined();
    });
  });

  describe('3. Domain Analysis Rules', () => {
    it('detects Punycode domain encoding (xn--)', () => {
      const signals = analyzeDomainRules('xn--gogle-pqa.com');
      const punySignal = signals.find((s) => s.id === 'SIG_DOMAIN_PUNYCODE');
      expect(punySignal).toBeDefined();
      expect(punySignal?.category).toBe(SignalCategory.DOMAIN);
    });

    it('detects typosquatting look-alike domain for PayPal', () => {
      const signals = analyzeDomainRules('paypa1-security-login.net');
      const typoSignal = signals.find((s) => s.id === 'SIG_DOMAIN_TYPOSQUATTING');
      expect(typoSignal).toBeDefined();
      expect(typoSignal?.evidence.some((e) => e.value === 'paypal')).toBe(true);
    });

    it('does NOT flag official google.com domain as typosquatting', () => {
      const signals = analyzeDomainRules('google.com');
      const typoSignal = signals.find((s) => s.id === 'SIG_DOMAIN_TYPOSQUATTING');
      expect(typoSignal).toBeUndefined();
    });
  });

  describe('4. Page / DOM Analysis Rules', () => {
    const mockDOMSnapshot: DOMSnapshotData = {
      hasPasswordField: true,
      passwordCount: 1,
      hasLoginForm: true,
      formActions: [
        {
          actionUrl: 'http://192.168.1.50/harvest.php',
          isCrossOrigin: true,
          targetOrigin: 'http://192.168.1.50',
        },
      ],
      hiddenIframeCount: 1,
      totalIframeCount: 1,
      externalScriptRatio: 0.8,
      pageTitle: 'PayPal Login',
      hasMetaRefresh: false,
      visibleSecurityKeywords: ['login', 'password'],
    };

    it('detects password input presence without reading values', () => {
      const signals = analyzePageRules(mockDOMSnapshot, 'http://paypa1-login.net');
      const passSignal = signals.find((s) => s.id === 'SIG_PAGE_PASSWORD_INPUT');
      expect(passSignal).toBeDefined();
      expect(passSignal?.category).toBe(SignalCategory.CREDENTIAL);
    });

    it('detects cross-origin form submission as CRITICAL signal', () => {
      const signals = analyzePageRules(mockDOMSnapshot, 'http://paypa1-login.net');
      const crossSignal = signals.find((s) => s.id.startsWith('SIG_PAGE_CROSS_ORIGIN_FORM'));
      expect(crossSignal).toBeDefined();
      expect(crossSignal?.severity).toBe('CRITICAL');
      expect(crossSignal?.weight).toBe(30);
    });
  });

  describe('5. Risk Engine & Normalization', () => {
    it('normalizes risk score bounded strictly between 0 and 100', () => {
      const safeResult = calculateRiskScore([]);
      expect(safeResult.riskScore.score).toBe(0);
      expect(safeResult.riskScore.severity).toBe(RiskSeverity.LOW);
      expect(safeResult.threatType).toBe(ThreatType.SAFE);
    });

    it('classifies high-risk combination as CREDENTIAL_HARVESTING', async () => {
      const analysis = await analyzePage({
        url: 'http://paypa1-secure.com/login',
        domain: 'paypa1-secure.com',
        snapshot: {
          hasPasswordField: true,
          passwordCount: 1,
          hasLoginForm: true,
          formActions: [
            {
              actionUrl: 'http://192.168.1.99/steal',
              isCrossOrigin: true,
              targetOrigin: 'http://192.168.1.99',
            },
          ],
          hiddenIframeCount: 1,
          totalIframeCount: 1,
          externalScriptRatio: 0.8,
          pageTitle: 'PayPal Verify Account',
          hasMetaRefresh: false,
          visibleSecurityKeywords: ['verify'],
        },
      });

      expect(analysis.riskScore.score).toBeGreaterThanOrEqual(50);
      expect([RiskSeverity.HIGH, RiskSeverity.CRITICAL]).toContain(analysis.riskScore.severity);
      expect(analysis.threatType).toBe(ThreatType.CREDENTIAL_HARVESTING);
      expect(analysis.analysisDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('evaluates safe website as LOW risk', async () => {
      const analysis = await analyzePage({
        url: 'https://google.com/',
        domain: 'google.com',
      });

      expect(analysis.riskScore.score).toBeLessThan(25);
      expect(analysis.riskScore.severity).toBe(RiskSeverity.LOW);
      expect(analysis.threatType).toBe(ThreatType.SAFE);
    });
  });
});
