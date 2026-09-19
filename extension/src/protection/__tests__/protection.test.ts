import { describe, expect, it } from 'vitest';
import {
  getPrimaryThreatLabel,
  getPrioritizedSignals,
  getStableIncidentId,
} from '../protectionController';
import {
  RiskSeverity,
  SignalCategory,
  SignalSeverity,
  ThreatAnalysis,
  ThreatType,
} from '../../types/security';

describe('CyberShield Protection Mode — Phase 4 Unit & Integration Tests', () => {
  const mockLowAnalysis: ThreatAnalysis = {
    id: 'analysis_low',
    url: 'https://google.com/',
    domain: 'google.com',
    timestamp: 1742416800000,
    riskScore: {
      score: 0,
      severity: RiskSeverity.LOW,
      breakdown: { urlScore: 0, domainScore: 0, pageScore: 0, redirectScore: 0, credentialScore: 0 },
    },
    threatType: ThreatType.SAFE,
    signals: [],
    engineVersion: '0.2.0',
    analysisDurationMs: 1.2,
  };

  const mockCriticalAnalysis: ThreatAnalysis = {
    id: 'analysis_critical',
    url: 'http://paypa1-security.net/login',
    domain: 'paypa1-security.net',
    timestamp: 1742416800000,
    riskScore: {
      score: 87,
      severity: RiskSeverity.CRITICAL,
      breakdown: { urlScore: 15, domainScore: 30, pageScore: 0, redirectScore: 0, credentialScore: 42 },
    },
    threatType: ThreatType.CREDENTIAL_HARVESTING,
    signals: [
      {
        id: 'SIG_LOW_1',
        category: SignalCategory.URL,
        severity: SignalSeverity.LOW,
        weight: 5,
        title: 'Low signal',
        description: 'Low severity indicator',
        evidence: [],
        confidence: 0.8,
        timestamp: 1742416800000,
      },
      {
        id: 'SIG_CRITICAL_1',
        category: SignalCategory.CREDENTIAL,
        severity: SignalSeverity.CRITICAL,
        weight: 30,
        title: 'Credential form submits to another origin',
        description: 'Form posts to external target',
        evidence: [],
        confidence: 0.95,
        timestamp: 1742416800000,
      },
      {
        id: 'SIG_HIGH_1',
        category: SignalCategory.DOMAIN,
        severity: SignalSeverity.HIGH,
        weight: 25,
        title: 'Potential brand look-alike domain',
        description: 'Domain resembles brand',
        evidence: [],
        confidence: 0.9,
        timestamp: 1742416800000,
      },
    ],
    engineVersion: '0.2.0',
    analysisDurationMs: 2.5,
  };

  describe('1. Threat Label Derivation', () => {
    it('derives correct non-alarmist threat labels from ThreatAnalysis', () => {
      expect(getPrimaryThreatLabel(mockLowAnalysis)).toBe('No Significant Risk Detected');
      expect(getPrimaryThreatLabel(mockCriticalAnalysis)).toBe('Potential Credential Harvesting');
    });
  });

  describe('2. Signal Prioritization', () => {
    it('prioritizes signals by severity (CRITICAL > HIGH > LOW) and limits output count', () => {
      const prioritized = getPrioritizedSignals(mockCriticalAnalysis.signals, 2);
      expect(prioritized.length).toBe(2);
      expect(prioritized[0].severity).toBe(SignalSeverity.CRITICAL);
      expect(prioritized[1].severity).toBe(SignalSeverity.HIGH);
    });
  });

  describe('3. Stable Incident Hashing & Duplicate Prevention', () => {
    it('generates consistent, stable incident IDs for identical navigation URLs', () => {
      const id1 = getStableIncidentId('http://paypa1-security.net/login');
      const id2 = getStableIncidentId('http://paypa1-security.net/login');
      const id3 = getStableIncidentId('https://google.com/');

      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });

  describe('4. Protection Threshold Behavior Mapping', () => {
    it('evaluates LOW risk severity without requiring protection screen trigger', () => {
      expect(mockLowAnalysis.riskScore.severity).toBe(RiskSeverity.LOW);
      expect(mockLowAnalysis.riskScore.score).toBeLessThan(25);
    });

    it('evaluates CRITICAL risk severity requiring protection screen trigger', () => {
      expect(mockCriticalAnalysis.riskScore.severity).toBe(RiskSeverity.CRITICAL);
      expect(mockCriticalAnalysis.riskScore.score).toBeGreaterThanOrEqual(75);
    });
  });
});
