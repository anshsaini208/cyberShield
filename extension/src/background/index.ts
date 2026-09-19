import { analyzePage } from '../detection/engine';
import { onMessage, sendMessageToTab } from '../messaging/bus';
import { BaseMessage, ExtensionRequestMessage, MessageResponse, MessageType } from '../messaging/types';
import { storage } from '../storage/store';
import { RiskSeverity } from '../types/security';

console.log('[CyberShield SW] Service Worker Initialized (Engine v0.2.0)');

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[CyberShield SW] Event onInstalled: ${details.reason}`);
});

async function handleMessage(
  message: ExtensionRequestMessage,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse<unknown>> {
  console.log(`[CyberShield SW] Received message type: ${message.type} (req: ${message.requestId})`);

  switch (message.type) {
    case MessageType.PING:
      return {
        requestId: message.requestId,
        success: true,
        data: { status: 'PONG', timestamp: Date.now() },
      };

    case MessageType.ANALYZE_PAGE: {
      const { url, domain, domSnapshot } = message.payload;
      console.log(`[CyberShield SW] Running detection engine for: ${url}`);

      const analysis = await analyzePage({
        url,
        domain,
        snapshot: domSnapshot,
      });

      await storage.saveAnalysis(analysis);
      await storage.incrementStat('pagesScanned');

      if (analysis.riskScore.severity === RiskSeverity.HIGH || analysis.riskScore.severity === RiskSeverity.CRITICAL) {
        await storage.saveIncident({
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
              eventType: 'SIGNAL_DETECTED',
              details: `Detected ${analysis.signals.length} threat signals (Score: ${analysis.riskScore.score}/100)`,
            },
          ],
        });
        await storage.incrementStat('threatsDetected');
      }

      return {
        requestId: message.requestId,
        success: true,
        data: analysis,
      };
    }

    case MessageType.GET_CURRENT_ANALYSIS: {
      const analysis = await storage.getLatestAnalysis();
      return {
        requestId: message.requestId,
        success: true,
        data: analysis,
      };
    }

    case MessageType.GET_INCIDENTS: {
      const limit = message.payload?.limit || 50;
      const incidents = await storage.getIncidents(limit);
      return {
        requestId: message.requestId,
        success: true,
        data: incidents,
      };
    }

    case MessageType.RECORD_INCIDENT: {
      const incident = await storage.saveIncident(message.payload.incident);
      return {
        requestId: message.requestId,
        success: true,
        data: incident,
      };
    }

    case MessageType.GET_SETTINGS: {
      const settings = await storage.getSettings();
      return {
        requestId: message.requestId,
        success: true,
        data: settings,
      };
    }

    case MessageType.SET_DEMO_MODE: {
      const settings = await storage.saveSettings({ demoMode: message.payload.enabled });
      return {
        requestId: message.requestId,
        success: true,
        data: settings,
      };
    }

    // Phase 3 Evidence Mode Message Relay to Active Content Script Tab
    case MessageType.OPEN_EVIDENCE_MODE:
    case MessageType.HIGHLIGHT_EVIDENCE:
    case MessageType.CLOSE_EVIDENCE_MODE: {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          const tabResp = await sendMessageToTab(activeTab.id, message);
          return tabResp;
        }
      } else if (sender.tab?.id) {
        const tabResp = await sendMessageToTab(sender.tab.id, message);
        return tabResp;
      }
      return {
        requestId: message.requestId,
        success: false,
        error: 'No active tab found for Evidence Mode relay',
      };
    }

    case MessageType.UPDATE_INCIDENT_STATUS: {
      const { id, status } = message.payload;
      const updated = await storage.updateIncidentStatus(id, status);
      return {
        requestId: message.requestId,
        success: updated !== null,
        data: updated,
        error: updated === null ? `Incident ${id} not found` : undefined,
      };
    }
    default: {
      const reqId = (message as BaseMessage)?.requestId || 'unknown';
      return {
        requestId: reqId,
        success: false,
        error: `Unhandled message type`,
      };
    }
  }
}

onMessage(handleMessage);

