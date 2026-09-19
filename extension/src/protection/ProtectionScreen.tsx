import { useState } from 'react';
import { ShieldAlert, ArrowLeft, Microchip, AlertTriangle, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { ThreatAnalysis, SecuritySignal } from '../types/security';
import { getPrimaryThreatLabel, getPrioritizedSignals } from './protectionController';

interface ProtectionScreenProps {
  analysis: ThreatAnalysis;
  onLeavePage: () => void;
  onShowEvidence: () => void;
  onContinueAnyway: () => void;
}

export function ProtectionScreen({
  analysis,
  onLeavePage,
  onShowEvidence,
  onContinueAnyway,
}: ProtectionScreenProps) {
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const threatLabel = getPrimaryThreatLabel(analysis);
  const prioritizedSignals = getPrioritizedSignals(analysis.signals, 4);

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto font-sans select-none">
      <div className="bg-[#0B0F19] text-gray-100 border-2 border-rose-500/80 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5 relative overflow-hidden">
        {/* Top Warning Banner */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
                ⚠️ CYBERSHIELD PROTECTION
              </h2>
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">
                HIGH-RISK INDICATORS DETECTED
              </p>
            </div>
          </div>

          <span className="text-xs font-mono bg-rose-950/80 text-rose-300 px-2.5 py-1 rounded border border-rose-800/80 font-bold">
            {analysis.riskScore.severity}
          </span>
        </div>

        {/* Risk Score & Threat Classification */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Potential Threat</div>
            <div className="text-base font-extrabold text-white">{threatLabel}</div>
            <div className="text-[11px] text-gray-500 font-mono">
              Target: <span className="text-gray-300 font-semibold">{analysis.domain}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-extrabold font-mono text-rose-400">
              {analysis.riskScore.score} <span className="text-xs text-gray-500 font-bold">/ 100</span>
            </div>
            <div className="text-[10px] text-gray-400">Risk Score</div>
          </div>
        </div>

        {/* Why CyberShield is warning you (Prioritized Signals) */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            Why CyberShield is warning you:
          </h3>
          <div className="space-y-2">
            {prioritizedSignals.map((sig: SecuritySignal) => (
              <div key={sig.id} className="bg-gray-900/90 border border-gray-800 rounded-lg p-2.5 flex items-start gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-gray-200">{sig.title}</div>
                  <div className="text-gray-400 text-[11px] leading-tight">{sig.description}</div>
                </div>
              </div>
            ))}
          </div>

          {analysis.signals.length > prioritizedSignals.length && (
            <button
              onClick={onShowEvidence}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 pt-1"
            >
              + View All {analysis.signals.length} Evidence Signals
            </button>
          )}
        </div>

        {/* Potential Impact & Recommended Action */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-gray-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Potential Impact:
            </span>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Entering credentials on a deceptive website could expose your account information.
            </p>
          </div>

          <div className="space-y-1 border-t border-gray-800/80 pt-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Recommended Action:
            </span>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Leave the page and access the service through its official website or a trusted bookmark.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLeavePage}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 uppercase tracking-wide border border-emerald-400/30"
            >
              <ArrowLeft className="w-4 h-4" />
              LEAVE PAGE
            </button>

            <button
              onClick={onShowEvidence}
              className="bg-gray-800 hover:bg-gray-700 active:bg-gray-800 text-gray-200 font-bold text-xs py-3 px-4 rounded-xl border border-gray-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Microchip className="w-4 h-4 text-emerald-400" />
              SHOW ME WHY
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="text-xs text-gray-400 hover:text-gray-200 underline font-medium transition-colors"
            >
              Continue Anyway (Unsafe)
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Continue Anyway */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#111827] border border-amber-500/80 rounded-xl p-5 max-w-sm w-full space-y-4 text-center">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-full w-10 h-10 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Are you sure you want to continue?</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                CyberShield detected high-risk indicators on this page. Continuing may expose sensitive data.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs py-2.5 rounded-lg border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onContinueAnyway();
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
