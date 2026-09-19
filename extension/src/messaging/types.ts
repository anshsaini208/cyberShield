import { ThreatAnalysis, SecurityIncident, SecurityIncidentDraft, ExtensionSettings, DOMSnapshotData, SignalTarget } from '../types/security';

export enum MessageType {
  ANALYZE_PAGE = 'ANALYZE_PAGE',
  ANALYSIS_RESULT = 'ANALYSIS_RESULT',
  GET_CURRENT_ANALYSIS = 'GET_CURRENT_ANALYSIS',
  GET_INCIDENTS = 'GET_INCIDENTS',
  INCIDENTS_RESULT = 'INCIDENTS_RESULT',
  RECORD_INCIDENT = 'RECORD_INCIDENT',
  GET_SETTINGS = 'GET_SETTINGS',
  SETTINGS_RESULT = 'SETTINGS_RESULT',
  SET_DEMO_MODE = 'SET_DEMO_MODE',
  PING = 'PING',
  PONG = 'PONG',
  
  // Phase 6/7 Incident Status
  UPDATE_INCIDENT_STATUS = 'UPDATE_INCIDENT_STATUS',

  // Phase 3 Evidence Mode Messages
  OPEN_EVIDENCE_MODE = 'OPEN_EVIDENCE_MODE',
  HIGHLIGHT_EVIDENCE = 'HIGHLIGHT_EVIDENCE',
  CLOSE_EVIDENCE_MODE = 'CLOSE_EVIDENCE_MODE'
}

export interface BaseMessage {
  type: MessageType;
  requestId: string;
}

export interface AnalyzePagePayload {
  url: string;
  domain: string;
  domSnapshot?: DOMSnapshotData;
}

export interface AnalyzePageMessage extends BaseMessage {
  type: MessageType.ANALYZE_PAGE;
  payload: AnalyzePagePayload;
}

export interface GetCurrentAnalysisMessage extends BaseMessage {
  type: MessageType.GET_CURRENT_ANALYSIS;
}

export interface GetIncidentsMessage extends BaseMessage {
  type: MessageType.GET_INCIDENTS;
  payload?: {
    limit?: number;
  };
}

export interface RecordIncidentMessage extends BaseMessage {
  type: MessageType.RECORD_INCIDENT;
  payload: {
    incident: SecurityIncidentDraft;
  };
}

export interface GetSettingsMessage extends BaseMessage {
  type: MessageType.GET_SETTINGS;
}

export interface SetDemoModeMessage extends BaseMessage {
  type: MessageType.SET_DEMO_MODE;
  payload: {
    enabled: boolean;
  };
}

export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

export interface OpenEvidenceModeMessage extends BaseMessage {
  type: MessageType.OPEN_EVIDENCE_MODE;
}

export interface HighlightEvidenceMessage extends BaseMessage {
  type: MessageType.HIGHLIGHT_EVIDENCE;
  payload: {
    signalId: string;
    target?: SignalTarget;
  };
}

export interface CloseEvidenceModeMessage extends BaseMessage {
  type: MessageType.CLOSE_EVIDENCE_MODE;
}

export interface UpdateIncidentStatusMessage extends BaseMessage {
  type: MessageType.UPDATE_INCIDENT_STATUS;
  payload: {
    id: string;
    status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  };
}
export type ExtensionRequestMessage =
  | AnalyzePageMessage
  | GetCurrentAnalysisMessage
  | GetIncidentsMessage
  | RecordIncidentMessage
  | GetSettingsMessage
  | SetDemoModeMessage
  | PingMessage
  | OpenEvidenceModeMessage
  | HighlightEvidenceMessage
  | CloseEvidenceModeMessage
  | UpdateIncidentStatusMessage;

export type MessageInput =
  | { type: MessageType.ANALYZE_PAGE; payload: AnalyzePagePayload }
  | { type: MessageType.GET_CURRENT_ANALYSIS }
  | { type: MessageType.GET_INCIDENTS; payload?: { limit?: number } }
  | { type: MessageType.RECORD_INCIDENT; payload: { incident: SecurityIncidentDraft } }
  | { type: MessageType.GET_SETTINGS }
  | { type: MessageType.SET_DEMO_MODE; payload: { enabled: boolean } }
  | { type: MessageType.PING }
  | { type: MessageType.OPEN_EVIDENCE_MODE }
  | { type: MessageType.HIGHLIGHT_EVIDENCE; payload: { signalId: string; target?: SignalTarget } }
  | { type: MessageType.CLOSE_EVIDENCE_MODE }
  | { type: MessageType.UPDATE_INCIDENT_STATUS; payload: { id: string; status: 'OPEN' | 'RESOLVED' | 'DISMISSED' } };

export interface MessageResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
}

export type AnalysisResponse = MessageResponse<ThreatAnalysis>;
export type IncidentsResponse = MessageResponse<SecurityIncident[]>;
export type SettingsResponse = MessageResponse<ExtensionSettings>;
export type PongResponse = MessageResponse<{ status: string; timestamp: number }>;



