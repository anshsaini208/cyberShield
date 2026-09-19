import { useState } from 'react';
import {
  X, ArrowLeft, ShieldAlert, Eye, Bot,
  Globe, Clock, Hash, BarChart2,
} from 'lucide-react';
import { SecurityIncident, SecuritySignal } from '../../types/security';
import { AIExplanationCard } from '../../evidence/AIExplanationCard';
import { sendMessageToBackground } from '../../messaging/bus';
import { MessageType } from '../../messaging/types';
import { relativeTime, sanitizeDisplayUrl, severityConfig, threatLabel } from '../utils';

const STATUS_BADGE: Record<SecurityIncident['status'], string> = {
  OPEN: 'bg-rose-950/60 text-rose-300 border-rose-800',
  RESOLVED: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  DISMISSED: 'bg-gray-800 text-gray-400 border-gray-700',
};

interface IncidentDetailProps {
  incident: SecurityIncident;
  onClose: () => void;
  onStatusChange: (id: string, status: SecurityIncident['status']) => void;
}

function SignalRow({ signal }: { signal: SecuritySignal }) {
  const sev = severityConfig(signal.severity as any);

  const handleViewEvidence = async () => {
    try {
      await sendMessageToBackground({
        type: MessageType.OPEN_EVIDENCE_MODE,
      });
      if (signal.target) {
        await sendMessageToBackground({
          type: MessageType.HIGHLIGHT_EVIDENCE,
          payload: { signalId: signal.id, target: signal.target },
        });
      }
    } catch {
      // Evidence Mode only works when a page is active in the same tab
    }
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sev.cls}`}>
              {sev.label}
            </span>
            <span className="text-xs font-semibold text-gray-200">{signal.title}</span>
          </div>
          <p className="text-[11px] text-gray-400">{signal.description}</p>
        </div>
        {signal.target && (
          <button
            onClick={handleViewEvidence}
            className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 border border-emerald-800/50 hover:border-emerald-600 px-2 py-1 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            title="View evidence in active tab"
          >
            <Eye className="w-3 h-3" />
            View Evidence
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 font-mono">
        <span>Category: <span className="text-gray-300">{signal.category}</span></span>
        <span>Confidence: <span className="text-gray-300">{Math.round(signal.confidence * 100)}%</span></span>
        <span>Weight: <span className="text-gray-300">{signal.weight}</span></span>
      </div>
      {signal.evidence.length > 0 && (
        <div className="bg-gray-950/60 rounded p-2 space-y-0.5">
          {signal.evidence.map((ev, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-gray-500 shrink-0">{ev.key}:</span>
              <span className="text-emerald-300 font-mono break-all">{ev.value}</span>
            </div>
          ))}
          <div className="text-[9px] text-gray-700 pt-0.5 font-mono">Signal ID: {signal.id}</div>
        </div>
      )}
    </div>
  );
}

export function IncidentDetail({ incident, onClose, onStatusChange }: IncidentDetailProps) {
  const [requestingAI, setRequestingAI] = useState(false);
  const sev = severityConfig(incident.severity);

  const handleMarkResolved = () => onStatusChange(incident.id, 'RESOLVED');
  const handleDismiss = () => onStatusChange(incident.id, 'DISMISSED');
  const handleReopen = () => onStatusChange(incident.id, 'OPEN');

  const handleExplainRisk = async () => {
    // AI explanation must be triggered manually — no auto-call.
    setRequestingAI(true);
    try {
      await sendMessageToBackground({
        type: MessageType.ANALYZE_PAGE,
        payload: { url: incident.url, domain: incident.domain },
      });
    } catch {
      // ignore
    } finally {
      setRequestingAI(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          aria-label="Back to incident list"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-200 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
          aria-label="Close detail"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6 overflow-y-auto max-h-[70vh]">
        {/* Overview */}
        <section aria-labelledby="detail-overview">
          <h2 id="detail-overview" className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${sev.cls.split(' ')[0]}`} aria-hidden="true" />
            {threatLabel(incident.threatType)}
          </h2>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900/60 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Risk Score</div>
              <div className="text-2xl font-extrabold font-mono text-white">{incident.riskScore.score}</div>
              <div className="text-[10px] text-gray-500">/ 100</div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Severity</div>
              <div className={`text-sm font-bold mt-1 ${sev.cls.split(' ')[0]}`}>{sev.label}</div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Status</div>
              <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[incident.status]}`}>
                {incident.status}
              </span>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Signals</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">{incident.signals.length}</div>
            </div>
          </div>
        </section>

        {/* Website */}
        <section aria-labelledby="detail-website">
          <h3 id="detail-website" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5" /> Website
          </h3>
          <div className="bg-gray-900/60 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0">Hostname:</span>
              <span className="font-mono text-emerald-400">{incident.hostname}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0">URL:</span>
              <span className="font-mono text-gray-300 break-all">{sanitizeDisplayUrl(incident.url, 80)}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Clock className="w-3 h-3 text-gray-500" aria-hidden="true" />
              <span className="text-gray-400">{relativeTime(incident.createdAt)}</span>
              <span className="text-gray-600 text-[10px]">({new Date(incident.createdAt).toLocaleString()})</span>
            </div>
          </div>
        </section>

        {/* Security Signals */}
        <section aria-labelledby="detail-signals">
          <h3 id="detail-signals" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <BarChart2 className="w-3.5 h-3.5" /> Security Signals ({incident.signals.length})
          </h3>
          {incident.signals.length === 0 ? (
            <p className="text-xs text-gray-500">No signals recorded for this incident.</p>
          ) : (
            <div className="space-y-2">
              {incident.signals.map((sig) => (
                <SignalRow key={sig.id} signal={sig} />
              ))}
            </div>
          )}
        </section>

        {/* Score Breakdown */}
        <section aria-labelledby="detail-breakdown">
          <h3 id="detail-breakdown" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Hash className="w-3.5 h-3.5" /> Risk Score Breakdown
          </h3>
          <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
            {Object.entries(incident.riskScore.breakdown).map(([key, val]) => (
              <div key={key} className="bg-gray-900/60 rounded p-2">
                <div className="text-gray-500 capitalize">{key.replace('Score', '')}</div>
                <div className="font-mono font-bold text-white">{val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Explanation */}
        <section aria-labelledby="detail-ai">
          <h3 id="detail-ai" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Bot className="w-3.5 h-3.5" /> AI Security Analyst
          </h3>
          {incident.aiExplanation ? (
            <AIExplanationCard explanation={incident.aiExplanation} />
          ) : (
            <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 text-center space-y-3">
              <p className="text-xs text-gray-400">AI explanation not generated for this incident.</p>
              <button
                onClick={handleExplainRisk}
                disabled={requestingAI}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                {requestingAI ? 'Requesting…' : 'Explain This Risk'}
              </button>
              <p className="text-[10px] text-gray-600">Requires backend to be running. AI cannot modify the risk score or signals.</p>
            </div>
          )}
        </section>

        {/* Event Timeline */}
        {incident.events && incident.events.length > 0 && (
          <section aria-labelledby="detail-timeline">
            <h3 id="detail-timeline" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" /> Event Timeline
            </h3>
            <div className="space-y-2">
              {incident.events
                .slice()
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((ev) => (
                  <div key={ev.id} className="flex gap-3 items-start text-xs">
                    <span className="font-mono text-gray-600 shrink-0 mt-0.5">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <div>
                      <span className="font-mono text-emerald-400 text-[11px]">{ev.eventType}</span>
                      <span className="text-gray-400 ml-2">{ev.details}</span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Status Action Bar */}
      <div className="border-t border-gray-800 p-4 flex gap-2 justify-end">
        {incident.status === 'OPEN' && (
          <>
            <button
              onClick={handleMarkResolved}
              className="px-4 py-2 bg-emerald-900/60 text-emerald-300 border border-emerald-700 hover:bg-emerald-800/60 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              Mark Resolved
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500"
            >
              Dismiss
            </button>
          </>
        )}
        {(incident.status === 'RESOLVED' || incident.status === 'DISMISSED') && (
          <button
            onClick={handleReopen}
            className="px-4 py-2 bg-amber-950/60 text-amber-300 border border-amber-700 hover:bg-amber-900/60 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
