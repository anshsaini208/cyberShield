// src/protection/CredentialGuard.tsx
import React from 'react';
import { CredentialContext, ProtectionEventType, RiskSeverity, ThreatType } from '../types/security';
import { sendMessageToBackground } from '../messaging/bus';
import { MessageType } from '../messaging/types';

interface Props {
  riskScore: number;
  severity: RiskSeverity;
  credentialContext: CredentialContext;
  onDismiss: () => void;
  onLeavePage: () => void;
  onViewEvidence: () => void;
}

export const CredentialGuard: React.FC<Props> = ({ riskScore, severity, credentialContext, onDismiss, onLeavePage, onViewEvidence }) => {
  // Determine visual style based on severity
  const isStrong = severity === RiskSeverity.HIGH || severity === RiskSeverity.CRITICAL;
  const panelClass = isStrong ? 'bg-red-100 border-red-400' : 'bg-yellow-100 border-yellow-400';

  const recordCredentialEvent = (eventType: ProtectionEventType, details: string) => {
    sendMessageToBackground({
      type: MessageType.RECORD_INCIDENT,
      payload: {
        incident: {
          url: window.location.href,
          hostname: window.location.hostname,
          domain: window.location.hostname,
          severity,
          threatType: ThreatType.CREDENTIAL_HARVESTING,
          riskScore: {
            score: riskScore,
            severity,
            breakdown: {
              urlScore: 0,
              domainScore: 0,
              pageScore: 0,
              redirectScore: credentialContext.crossOriginAction ? 10 : 0,
              credentialScore: Math.max(10, riskScore),
            },
          },
          signals: [],
          events: [
            {
              id: `evt_${Date.now()}`,
              incidentId: '',
              timestamp: Date.now(),
              eventType,
              details,
              url: window.location.href,
              riskScore,
              severity,
            },
          ],
        },
      },
    });
  };

  // Record when warning is shown (once on mount)
  React.useEffect(() => {
    recordCredentialEvent('CREDENTIAL_WARNING_SHOWN', 'Credential Guard warning displayed');
  }, []);

  const handleDismiss = () => {
    onDismiss();
    recordCredentialEvent('CREDENTIAL_WARNING_DISMISSED', 'User dismissed Credential Guard warning');
  };

  const handleLeave = () => {
    onLeavePage();
    recordCredentialEvent('CREDENTIAL_PROTECTION_LEFT_PAGE', 'User chose to leave page from Credential Guard');
  };

  return (
    <div className={`fixed inset-0 z-[2147483647] flex items-center justify-center p-4 ${panelClass} border rounded-md shadow-lg`}>
      <div className="max-w-md w-full bg-white rounded-lg p-6 shadow-xl">
        <div className="flex items-center mb-4">
          <span className="text-xl font-bold mr-2">⚠️ CREDENTIAL GUARD</span>
        </div>
        <p className="mb-2">High‑risk indicators were detected on this page.</p>
        <p className="mb-2">This page contains a credential‑entry form.</p>
        {credentialContext.crossOriginAction && (
          <p className="mb-2">The form submits to a different origin: {credentialContext.formActionOrigin}</p>
        )}
        <p className="mb-4">Risk: {riskScore} / 100</p>
        <p className="mb-4">Avoid entering sensitive credentials until you have verified the website.</p>
        <div className="flex justify-between">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onViewEvidence}>🔬 VIEW EVIDENCE</button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded" onClick={handleLeave}>LEAVE PAGE</button>
          <button className="px-4 py-2 bg-gray-300 text-black rounded" onClick={handleDismiss}>DISMISS</button>
        </div>
      </div>
    </div>
  );
};
