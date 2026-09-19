import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ExternalLink, RefreshCw, AlertTriangle, Microchip, Eye, ChevronRight } from 'lucide-react';
import { sendMessageToBackground } from '../messaging/bus';
import { MessageType } from '../messaging/types';
import { RiskSeverity, SecuritySignal, ThreatAnalysis, ThreatType } from '../types/security';
import { matchesCurrentSite } from './siteMatch';

export default function PopupApp() {
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>('example.com');
  const [currentDomain, setCurrentDomain] = useState<string>('example.com');
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [showQuickSignals, setShowQuickSignals] = useState<boolean>(false);

  useEffect(() => {
    const loadPopupState = async () => {
      let activeDomain = currentDomain;
      let activeUrl = currentUrl;

      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.url) {
          try {
            const parsedUrl = new URL(activeTab.url);
            activeUrl = activeTab.url;
            activeDomain = parsedUrl.hostname;
            setCurrentUrl(activeUrl);
            setCurrentDomain(activeDomain);
          } catch {
            activeUrl = activeTab.url;
            activeDomain = activeTab.url;
            setCurrentUrl(activeUrl);
            setCurrentDomain(activeDomain);
          }
        }
      }

      const hasMatchingStoredAnalysis = await fetchCurrentAnalysis(activeDomain);
      if (!hasMatchingStoredAnalysis) {
        await analyzeCurrentSite(activeUrl, activeDomain);
      }

      await fetchSettings();
    };

    void loadPopupState();
  }, []);

  const fetchCurrentAnalysis = async (tabDomainOverride?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const resp = await sendMessageToBackground<ThreatAnalysis>({
        type: MessageType.GET_CURRENT_ANALYSIS,
      });

      if (!resp.success || !resp.data) {
        setAnalysis(null);
        return false;
      }

      const targetDomain = tabDomainOverride || currentDomain;
      const belongsToCurrentSite = matchesCurrentSite(resp.data.domain, targetDomain);

      if (!belongsToCurrentSite) {
        setAnalysis(null);
        return false;
      }

      setAnalysis(resp.data);
      return true;
    } catch (err) {
      console.error('Failed to fetch analysis:', err);
      setAnalysis(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCurrentSite = async (urlOverride?: string, domainOverride?: string) => {
    setLoading(true);
    try {
      const urlToAnalyze = urlOverride || currentUrl;
      const domainToAnalyze = domainOverride || currentDomain;

      const resp = await sendMessageToBackground<ThreatAnalysis>({
        type: MessageType.ANALYZE_PAGE,
        payload: {
          url: urlToAnalyze,
          domain: domainToAnalyze,
        },
      });

      if (resp.success && resp.data) {
        const belongsToCurrentSite = matchesCurrentSite(resp.data.domain, domainToAnalyze);
        setAnalysis(belongsToCurrentSite ? resp.data : null);
        return resp.data;
      }

      setAnalysis(null);
      return null;
    } catch (err) {
      console.error('Failed to run analysis:', err);
      setAnalysis(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const resp = await sendMessageToBackground<{ demoMode: boolean }>({
        type: MessageType.GET_SETTINGS,
      });
      if (resp.success && resp.data) {
        setDemoMode(resp.data.demoMode);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleAnalyzePage = async () => {
    await analyzeCurrentSite(currentUrl, currentDomain);
  };

  const handleOpenEvidenceMode = async () => {
    try {
      await sendMessageToBackground({
        type: MessageType.OPEN_EVIDENCE_MODE,
      });
      // Optionally close extension popup so user views page overlay
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    } catch (err) {
      console.error('Failed to open evidence mode:', err);
    }
  };

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    } else {
      window.open('dashboard.html', '_blank');
    }
  };

  const toggleDemoMode = async () => {
    const nextState = !demoMode;
    setDemoMode(nextState);
    await sendMessageToBackground({
      type: MessageType.SET_DEMO_MODE,
      payload: { enabled: nextState },
    });
  };

  const getSeverityConfig = () => {
    if (!analysis || analysis.isPlaceholder) {
      return {
        label: 'PROTECTED',
        colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
        dotClass: 'bg-emerald-500',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      };
    }

    switch (analysis.riskScore.severity) {
      case RiskSeverity.LOW:
        return {
          label: 'SAFE',
          colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
          dotClass: 'bg-emerald-500',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        };
      case RiskSeverity.MEDIUM:
        return {
          label: 'SUSPICIOUS',
          colorClass: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
          dotClass: 'bg-amber-500',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case RiskSeverity.HIGH:
        return {
          label: 'HIGH RISK',
          colorClass: 'text-orange-400 bg-orange-950/40 border-orange-800/50',
          dotClass: 'bg-orange-500',
          icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
        };
      case RiskSeverity.CRITICAL:
        return {
          label: 'CRITICAL THREAT',
          colorClass: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
          dotClass: 'bg-rose-500 animate-pulse',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        };
      default:
        return {
          label: 'PROTECTED',
          colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
          dotClass: 'bg-emerald-500',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        };
    }
  };

  const formatThreatType = (threat: ThreatType) => {
    switch (threat) {
      case ThreatType.CREDENTIAL_HARVESTING:
        return 'Credential Phishing';
      case ThreatType.PHISHING:
        return 'Phishing Indicator Detected';
      case ThreatType.SUSPICIOUS_REDIRECT:
        return 'Suspicious Client Redirect';
      case ThreatType.SUSPICIOUS:
        return 'Suspicious Page Indicators';
      case ThreatType.SAFE:
        return 'Standard Protection Active';
      default:
        return 'Security Protection Active';
    }
  };

  const badge = getSeverityConfig();

  return (
    <div className="w-[360px] bg-[#0B0F19] text-gray-100 p-4 border border-gray-800 shadow-2xl flex flex-col gap-3.5 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider text-white uppercase">CyberShield</h1>
            <p className="text-[10px] text-gray-400 font-medium">Personal Security Center</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
          Engine v0.2.0
        </span>
      </div>

      {/* Target Host */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Current Website</span>
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${badge.colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
            {badge.label}
          </span>
        </div>
        <div className="font-mono text-xs text-emerald-400 truncate font-semibold bg-gray-900/80 px-2.5 py-1.5 rounded border border-gray-800">
          {currentDomain}
        </div>
      </div>

      {/* Risk Score Gauge & Threat Type */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 text-center space-y-2 relative">
        <div className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">Risk Score</div>

        {analysis ? (
          <>
            <div className="flex items-baseline justify-center gap-1 font-mono">
              <span className="text-4xl font-extrabold text-white">{analysis.riskScore.score}</span>
              <span className="text-sm text-gray-500 font-bold">/ 100</span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="text-xs font-semibold text-gray-200">{formatThreatType(analysis.threatType)}</div>
              <div className="text-[11px] text-gray-400 font-mono">
                Indicators Detected: <span className="font-bold text-emerald-400">{analysis.signals.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2 py-2">
            <div className="flex items-baseline justify-center gap-1 font-mono">
              <span className="text-3xl font-extrabold text-slate-300">--</span>
              <span className="text-sm text-gray-500 font-bold">/ 100</span>
            </div>
            <div className="text-[11px] text-gray-400">No analysis available for this site yet.</div>
          </div>
        )}
      </div>

      {/* Primary Action Button: [ 🔬 SHOW ME WHY ] */}
      <div className="space-y-2 pt-0.5">
        <button
          onClick={handleOpenEvidenceMode}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 tracking-wide uppercase border border-emerald-400/30"
        >
          <Microchip className="w-4 h-4 text-emerald-200" />
          🔬 SHOW ME WHY
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAnalyzePage}
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-800 text-gray-200 font-semibold text-xs py-2 px-3 rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'RE-ANALYZE'}
          </button>

          <button
            onClick={handleOpenDashboard}
            className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-800 text-gray-200 font-semibold text-xs py-2 px-3 rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            SOC CENTER
          </button>
        </div>
      </div>

      {/* Collapsible Quick Signals preview */}
      {analysis && analysis.signals.length > 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-2.5 space-y-1.5">
          <button
            onClick={() => setShowQuickSignals(!showQuickSignals)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-300 hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              Quick Signals Preview ({analysis.signals.length})
            </span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showQuickSignals ? 'rotate-90' : ''}`} />
          </button>

          {showQuickSignals && (
            <div className="space-y-1 pt-1.5 max-h-[130px] overflow-y-auto pr-1">
              {analysis.signals.map((sig: SecuritySignal) => (
                <div key={sig.id} className="bg-gray-900 border border-gray-800 rounded p-1.5 text-[10px] space-y-0.5">
                  <div className="flex justify-between items-center font-bold text-gray-200">
                    <span className="truncate">{sig.title}</span>
                    <span className="text-[9px] font-mono text-emerald-400">{sig.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-800/80 pt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Demo Mode
        </span>
        <button
          onClick={toggleDemoMode}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
            demoMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          {demoMode ? 'ENABLED' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
