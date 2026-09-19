import React from 'react';
import ReactDOM from 'react-dom/client';
import { extractDOMSnapshot } from '../detection/pageRules';
import { onMessage, sendMessageToBackground } from '../messaging/bus';
import { ExtensionRequestMessage, MessageResponse, MessageType } from '../messaging/types';
import { RiskSeverity, SecuritySignal, ThreatAnalysis } from '../types/security';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { EvidenceOverlay } from '../evidence/EvidenceOverlay';
import { ProtectionScreen } from '../protection/ProtectionScreen';
import { updateActionBadge } from '../protection/protectionController';

console.log('[CyberShield Content] Content script initialized on:', window.location.href);

let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let shadowReactRoot: ReactDOM.Root | null = null;
let currentAnalysis: ThreatAnalysis | null = null;
let highlightedElement: HTMLElement | null = null;
let originalElementOutline: string = '';
let originalElementBoxShadow: string = '';
let hasProtectionDismissed: boolean = false;

function ensureShadowDOM(): { container: HTMLDivElement } {
  if (shadowHost && shadowRoot && shadowReactRoot) {
    const existingContainer = shadowRoot.querySelector('#cybershield-shadow-container') as HTMLDivElement;
    if (existingContainer) return { container: existingContainer };
  }

  const host = document.createElement('cybershield-ui-host');
  host.id = 'cybershield-root';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.top = '0';
  host.style.left = '0';
  host.style.pointerEvents = 'none';

  const root = host.attachShadow({ mode: 'closed' });

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    :host { font-family: 'Inter', system-ui, sans-serif; }
    .pointer-events-auto { pointer-events: auto !important; }
  `;
  root.appendChild(styleTag);

  const container = document.createElement('div');
  container.id = 'cybershield-shadow-container';
  container.className = 'pointer-events-auto';
  root.appendChild(container);

  document.documentElement.appendChild(host);

  shadowHost = host;
  shadowRoot = root;
  shadowReactRoot = ReactDOM.createRoot(container);

  return { container };
}

function highlightTargetElement(targetSelector?: string) {
  clearElementHighlight();

  if (!targetSelector) return;

  try {
    const el = document.querySelector(targetSelector) as HTMLElement;
    if (el) {
      originalElementOutline = el.style.outline;
      originalElementBoxShadow = el.style.boxShadow;

      el.style.outline = '3px solid #EF4444';
      el.style.outlineOffset = '4px';
      el.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.6)';

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightedElement = el;
    }
  } catch (err) {
    console.warn(`[CyberShield Content] Could not highlight element with selector ${targetSelector}:`, err);
  }
}

function clearElementHighlight() {
  if (highlightedElement) {
    highlightedElement.style.outline = originalElementOutline;
    highlightedElement.style.boxShadow = originalElementBoxShadow;
    highlightedElement = null;
  }
}

function openEvidencePanel() {
  ensureShadowDOM();
  if (!shadowReactRoot) return;

  sendMessageToBackground({
    type: MessageType.RECORD_INCIDENT,
    payload: {
      incident: {
        url: window.location.href,
        domain: window.location.hostname,
        riskScore: currentAnalysis?.riskScore || { score: 0, severity: RiskSeverity.LOW, breakdown: { urlScore: 0, domainScore: 0, pageScore: 0, redirectScore: 0, credentialScore: 0 } },
        threatType: currentAnalysis?.threatType || ('SAFE' as any),
        signals: currentAnalysis?.signals || [],
        events: [
          {
            id: `evt_${Date.now()}`,
            incidentId: '',
            timestamp: Date.now(),
            eventType: 'PROTECTION_EVIDENCE_VIEWED',
            details: 'User opened Evidence Mode panel',
            url: window.location.href,
          },
        ],
      },
    },
  });

  shadowReactRoot.render(
    <React.StrictMode>
      <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
        <EvidencePanel
          analysis={currentAnalysis}
          onClose={closeUI}
          onHighlightTarget={(sig) => {
            if (sig.target && sig.target.selector) {
              highlightTargetElement(sig.target.selector);
              openEvidenceBanner(sig);
            }
          }}
        />
      </div>
    </React.StrictMode>
  );
}

function openEvidenceBanner(signal: SecuritySignal) {
  ensureShadowDOM();
  if (!shadowReactRoot) return;

  shadowReactRoot.render(
    <React.StrictMode>
      <EvidenceOverlay activeSignal={signal} onClose={closeUI} />
    </React.StrictMode>
  );
}

function openProtectionScreen(analysis: ThreatAnalysis) {
  if (hasProtectionDismissed) return;
  ensureShadowDOM();
  if (!shadowReactRoot) return;

  sendMessageToBackground({
    type: MessageType.RECORD_INCIDENT,
    payload: {
      incident: {
        url: analysis.url,
        domain: analysis.domain,
        riskScore: analysis.riskScore,
        threatType: analysis.threatType,
        signals: analysis.signals,
        events: [
          {
            id: `evt_${Date.now()}`,
            incidentId: '',
            timestamp: Date.now(),
            eventType: 'PROTECTION_WARNING_SHOWN',
            details: `Protection warning displayed (Score: ${analysis.riskScore.score}/100, Severity: ${analysis.riskScore.severity})`,
            url: analysis.url,
          },
        ],
      },
    },
  });

  shadowReactRoot.render(
    <React.StrictMode>
      <ProtectionScreen
        analysis={analysis}
        onLeavePage={() => {
          sendMessageToBackground({
            type: MessageType.RECORD_INCIDENT,
            payload: {
              incident: {
                url: analysis.url,
                domain: analysis.domain,
                riskScore: analysis.riskScore,
                threatType: analysis.threatType,
                signals: analysis.signals,
                events: [
                  {
                    id: `evt_${Date.now()}`,
                    incidentId: '',
                    timestamp: Date.now(),
                    eventType: 'PROTECTION_LEAVE_PAGE',
                    details: 'User selected Leave Page safety action',
                    url: analysis.url,
                  },
                ],
              },
            },
          });
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = 'about:blank';
          }
        }}
        onShowEvidence={openEvidencePanel}
        onContinueAnyway={() => {
          hasProtectionDismissed = true;
          sendMessageToBackground({
            type: MessageType.RECORD_INCIDENT,
            payload: {
              incident: {
                url: analysis.url,
                domain: analysis.domain,
                riskScore: analysis.riskScore,
                threatType: analysis.threatType,
                signals: analysis.signals,
                events: [
                  {
                    id: `evt_${Date.now()}`,
                    incidentId: '',
                    timestamp: Date.now(),
                    eventType: 'PROTECTION_CONTINUE',
                    details: 'User explicitly confirmed Continue Anyway override',
                    url: analysis.url,
                  },
                ],
              },
            },
          });
          closeUI();
        }}
      />
    </React.StrictMode>
  );
}

function closeUI() {
  clearElementHighlight();
  if (shadowReactRoot) {
    shadowReactRoot.render(<React.StrictMode>{null}</React.StrictMode>);
  }
}

async function runAnalysisPipeline() {
  ensureShadowDOM();

  try {
    const snapshot = extractDOMSnapshot(document, window.location.href);

    const response = await sendMessageToBackground<ThreatAnalysis>({
      type: MessageType.ANALYZE_PAGE,
      payload: {
        url: window.location.href,
        domain: window.location.hostname,
        domSnapshot: snapshot,
      },
    });

    if (response.success && response.data) {
      currentAnalysis = response.data;
      updateActionBadge(response.data.riskScore.score, response.data.riskScore.severity);

      // Automatically trigger ProtectionScreen if risk severity is HIGH or CRITICAL
      if (
        (response.data.riskScore.severity === RiskSeverity.HIGH ||
          response.data.riskScore.severity === RiskSeverity.CRITICAL) &&
        !hasProtectionDismissed
      ) {
        openProtectionScreen(response.data);
      }
    }
  } catch (err) {
    console.error('[CyberShield Content] Detection pipeline failed:', err);
  }
}

function handleContentMessage(
  message: ExtensionRequestMessage,
  _sender: chrome.runtime.MessageSender
): MessageResponse<unknown> | void {
  switch (message.type) {
    case MessageType.OPEN_EVIDENCE_MODE:
      openEvidencePanel();
      return { requestId: message.requestId, success: true };

    case MessageType.HIGHLIGHT_EVIDENCE:
      if (message.payload?.target?.selector) {
        highlightTargetElement(message.payload.target.selector);
      }
      return { requestId: message.requestId, success: true };

    case MessageType.CLOSE_EVIDENCE_MODE:
      closeUI();
      return { requestId: message.requestId, success: true };
  }
}

onMessage(handleContentMessage);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAnalysisPipeline);
} else {
  runAnalysisPipeline();
}
