import { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, X, Microchip, Filter, Bot, RefreshCw } from 'lucide-react';
import { ThreatAnalysis, SecuritySignal, SignalCategory, RiskSeverity, ThreatType, AIExplanation } from '../types/security';
import { EvidenceCard } from './EvidenceCard';
import { RiskBreakdown } from './RiskBreakdown';
import { AIExplanationCard } from './AIExplanationCard';
import { fetchAIExplanation, generateClientFallbackExplanation } from '../background/apiProxy';

interface EvidencePanelProps {
  analysis: ThreatAnalysis | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onHighlightTarget?: (signal: SecuritySignal) => void;
}

export function EvidencePanel({
  analysis,
  loading = false,
  error,
  onClose,
  onHighlightTarget,
}: EvidencePanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<SignalCategory | 'ALL'>('ALL');
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(analysis?.aiExplanation || null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-[#0B0F19] text-gray-100 border border-gray-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 font-sans">
        <div className="flex items-center gap-3 text-emerald-400">
          <Microchip className="w-6 h-6 animate-spin" />
          <span className="text-sm font-bold font-mono">Analyzing this page...</span>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="bg-[#0B0F19] text-gray-100 border border-gray-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 font-sans">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <h3 className="text-sm font-bold text-rose-400">Analysis Unavailable</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400">{error || 'Security analysis data is currently unavailable. Try re-analyzing.'}</p>
      </div>
    );
  }

  const { riskScore, threatType, signals } = analysis;
  const filteredSignals = selectedCategory === 'ALL' ? signals : signals.filter((s) => s.category === selectedCategory);

  const handleRequestAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const exp = await fetchAIExplanation(analysis);
      setAiExplanation(exp);
    } catch (err) {
      setAiError('AI explanation is temporarily unavailable.');
      console.error('Failed to fetch AI explanation:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseLocalFallback = () => {
    const fallbackExp = generateClientFallbackExplanation(analysis);
    setAiExplanation(fallbackExp);
    setAiError(null);
  };

  const getThreatLabel = (type: ThreatType) => {
    switch (type) {
      case ThreatType.CREDENTIAL_HARVESTING:
        return 'Potential Credential Phishing';
      case ThreatType.PHISHING:
        return 'Phishing Indicator Detected';
      case ThreatType.SUSPICIOUS_REDIRECT:
        return 'Suspicious Client Redirect';
      case ThreatType.SUSPICIOUS:
        return 'Suspicious Page Indicators';
      case ThreatType.SAFE:
        return 'Standard Protection Active';
      default:
        return 'Unknown Threat Classification';
    }
  };

  const getSeverityBadge = (sev: RiskSeverity) => {
    switch (sev) {
      case RiskSeverity.CRITICAL:
        return { label: 'CRITICAL', color: 'bg-rose-950 text-rose-300 border-rose-800', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> };
      case RiskSeverity.HIGH:
        return { label: 'HIGH', color: 'bg-orange-950 text-orange-300 border-orange-800', icon: <ShieldAlert className="w-4 h-4 text-orange-400" /> };
      case RiskSeverity.MEDIUM:
        return { label: 'MEDIUM', color: 'bg-amber-950 text-amber-300 border-amber-800', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> };
      default:
        return { label: 'LOW', color: 'bg-emerald-950 text-emerald-300 border-emerald-800', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> };
    }
  };

  const sevBadge = getSeverityBadge(riskScore.severity);

  return (
    <div className="bg-[#0B0F19] text-gray-100 border border-gray-800 rounded-2xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col gap-5 overflow-hidden font-sans">
      {/* Panel Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Microchip className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              🔬 WHY IS THIS RISKY?
            </h2>
            <p className="text-xs text-gray-400">Ground-truth evidence generated by CyberShield Detection Engine</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
          title="Close Evidence Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {/* Risk Overview Header */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Potential Threat</div>
            <div className="text-sm font-extrabold text-white pt-0.5">{getThreatLabel(threatType)}</div>
            <div className="text-[11px] text-gray-500 font-mono pt-1">
              Evaluated {signals.length} indicator(s) in {analysis.analysisDurationMs}ms
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-3xl font-extrabold font-mono text-white">
              {riskScore.score} <span className="text-sm text-gray-500 font-bold">/ 100</span>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${sevBadge.color}`}>
              {sevBadge.icon}
              {sevBadge.label}
            </span>
          </div>
        </div>

        {/* AI Analyst Trigger / Card Section */}
        {aiExplanation ? (
          <AIExplanationCard explanation={aiExplanation} />
        ) : (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-400" /> AI Security Analyst
                </h4>
                <p className="text-[11px] text-gray-400">Synthesize human-readable security explanation from engine evidence.</p>
              </div>

              <button
                onClick={handleRequestAI}
                disabled={aiLoading}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ANALYZING EVIDENCE...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>EXPLAIN THIS RISK</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg text-xs flex justify-between items-center text-rose-300">
                <span>{aiError}</span>
                <button
                  onClick={handleUseLocalFallback}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded"
                >
                  USE LOCAL EXPLANATION
                </button>
              </div>
            )}
          </div>
        )}

        {/* Risk Breakdown Component */}
        <RiskBreakdown breakdown={riskScore.breakdown} totalScore={riskScore.score} />

        {/* Evidence Category Filter */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" /> Detected Evidence ({filteredSignals.length})
            </h3>

            <div className="flex gap-1 overflow-x-auto text-[10px] font-mono">
              {(['ALL', SignalCategory.URL, SignalCategory.DOMAIN, SignalCategory.PAGE, SignalCategory.CREDENTIAL] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Evidence Cards List */}
          {filteredSignals.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
              <p className="text-xs font-semibold text-gray-300">No significant security indicators detected in this category.</p>
              <p className="text-[11px] text-gray-500">The detection engine found no evidence matching this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSignals.map((sig) => (
                <EvidenceCard key={sig.id} signal={sig} onHighlightTarget={onHighlightTarget} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel Footer */}
      <div className="border-t border-gray-800 pt-3 flex justify-between items-center text-xs">
        <span className="text-[11px] text-gray-500 italic">
          * CyberShield detects indicators; heuristic analysis does not prove absolute safety.
        </span>
        <button
          onClick={onClose}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-4 py-1.5 rounded-lg border border-gray-700 transition-colors text-xs"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
