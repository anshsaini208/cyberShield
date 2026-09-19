import { SecuritySignal, SignalCategory, SignalSeverity, SignalEvidence, SignalTarget } from '../types/security';

export interface CreateSignalParams {
  id: string;
  category: SignalCategory;
  severity: SignalSeverity;
  weight: number;
  title: string;
  description: string;
  evidence: SignalEvidence[];
  confidence?: number;
  target?: SignalTarget;
}

export function createSecuritySignal(params: CreateSignalParams): SecuritySignal {
  return {
    id: params.id,
    category: params.category,
    severity: params.severity,
    weight: Math.max(1, Math.min(50, params.weight)),
    title: params.title,
    description: params.description,
    evidence: params.evidence,
    confidence: Math.max(0, Math.min(1.0, params.confidence ?? 1.0)),
    timestamp: Date.now(),
    target: params.target || { type: 'NONE' },
  };
}
