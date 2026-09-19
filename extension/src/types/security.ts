/**
 * CyberShield Security Domain Types & Enums
 */

export enum SignalCategory {
  URL = 'URL',
  DOMAIN = 'DOMAIN',
  PAGE = 'PAGE',
  REDIRECT = 'REDIRECT',
  CREDENTIAL = 'CREDENTIAL'
}

export enum SignalSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum RiskSeverity {
  LOW = 'LOW',         // 0 - 24
  MEDIUM = 'MEDIUM',   // 25 - 49
  HIGH = 'HIGH',       // 50 - 74
  CRITICAL = 'CRITICAL'// 75 - 100
}

export enum ThreatType {
  SAFE = 'SAFE',
  SUSPICIOUS = 'SUSPICIOUS',
  PHISHING = 'PHISHING',
  CREDENTIAL_HARVESTING = 'CREDENTIAL_HARVESTING',
  SUSPICIOUS_REDIRECT = 'SUSPICIOUS_REDIRECT',
  UNKNOWN = 'UNKNOWN'
}

export type IncidentStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface SignalEvidence {
  key: string;
  value: string;
}

export type TargetType = 'FORM' | 'INPUT' | 'IFRAME' | 'LINK' | 'PAGE' | 'NONE';

export interface SignalTarget {
  type: TargetType;
  selector?: string;
}

export interface SecuritySignal {
  id: string;
  category: SignalCategory;
  severity: SignalSeverity;
  weight: number;
  title: string;
  description: string;
  evidence: SignalEvidence[];
  confidence: number;
  timestamp: number;
  target?: SignalTarget;
}

export interface RiskScoreBreakdown {
  urlScore: number;
  domainScore: number;
  pageScore: number;
  redirectScore: number;
  credentialScore: number;
}

export interface RiskScore {
  score: number; // 0 - 100
  severity: RiskSeverity;
  breakdown: RiskScoreBreakdown;
}

export interface AIExplanation {
  id: string;
  analysisId: string;
  summary: string;
  whatDetected: string;
  whyItMatters: string;
  potentialImpact: string;
  recommendedActions: string[];
  generatedAt: number;
  isFallback: boolean;
  confidenceNote: string;
  evidenceReferences: string[];
}

export interface ThreatAnalysis {
  id: string;
  url: string;
  domain: string;
  timestamp: number;
  riskScore: RiskScore;
  threatType: ThreatType;
  signals: SecuritySignal[];
  engineVersion: string;
  analysisDurationMs: number;
  isPlaceholder?: boolean;
  aiExplanation?: AIExplanation;
}

export enum UserAction {
  BLOCKED = 'BLOCKED',
  PROCEEDED_ANYWAY = 'PROCEEDED_ANYWAY',
  DISMISSED = 'DISMISSED',
  REPORTED_FALSE_POSITIVE = 'REPORTED_FALSE_POSITIVE'
}

export type ProtectionEventType =
  | 'SIGNAL_DETECTED'
  | 'WARNING_SHOWN'
  | 'INTERSTITIAL_TRIGGERED'
  | 'USER_OVERRIDE'
  | 'CREDENTIAL_FOCUS'
  | 'PROTECTION_WARNING_SHOWN'
  | 'PROTECTION_LEAVE_PAGE'
  | 'PROTECTION_CONTINUE'
  | 'PROTECTION_EVIDENCE_VIEWED'
  | 'CREDENTIAL_CONTEXT_DETECTED'
  | 'CREDENTIAL_WARNING_SHOWN'
  | 'CREDENTIAL_WARNING_DISMISSED'
  | 'CREDENTIAL_EVIDENCE_VIEWED'
  | 'CREDENTIAL_PROTECTION_LEFT_PAGE'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_DISMISSED'
  | 'INCIDENT_REOPENED';

export interface SecurityEvent {
  id: string;
  incidentId: string;
  timestamp: number;
  eventType: ProtectionEventType;
  details: string;
  url?: string;
  riskScore?: number;
  severity?: RiskSeverity;
}

export interface SecurityIncident {
  id: string;
  /** @deprecated Use createdAt for incident ordering and display. */
  timestamp?: number;
  createdAt: number;
  updatedAt: number;
  url: string;
  hostname: string;
  domain: string;
  riskScore: RiskScore;
  severity: RiskSeverity;
  threatType: ThreatType;
  signals: SecuritySignal[];
  events: SecurityEvent[];
  status: IncidentStatus;
  userActionTaken?: UserAction;
  aiExplanation?: AIExplanation;
}

export type SecurityIncidentDraft =
  Omit<SecurityIncident, 'id' | 'createdAt' | 'updatedAt' | 'hostname' | 'severity' | 'status'> &
  Partial<Pick<SecurityIncident, 'createdAt' | 'updatedAt' | 'hostname' | 'severity' | 'status'>>;

export interface CredentialContext {
  hasPasswordField: boolean;
  formDetected: boolean;
  currentOrigin: string;
  formActionOrigin: string | null;
  crossOriginAction: boolean;
}

export interface ExtensionSettings {
  enableAI: boolean;
  autoBlockCritical: boolean;
  showOverlay: boolean;
  demoMode: boolean;
  geminiModel: string;
}

export interface ExtensionStats {
  pagesScanned: number;
  threatsDetected: number;
  highRiskCount: number;
  protectedEvents: number;
  credentialWarnings: number;
  openIncidents: number;
}

export interface DOMSnapshotData {
  hasPasswordField: boolean;
  passwordCount: number;
  hasLoginForm: boolean;
  formActions: { actionUrl: string; isCrossOrigin: boolean; targetOrigin: string; formSelector?: string }[];
  hiddenIframeCount: number;
  totalIframeCount: number;
  externalScriptRatio: number;
  pageTitle: string;
  hasMetaRefresh: boolean;
  visibleSecurityKeywords: string[];
}
