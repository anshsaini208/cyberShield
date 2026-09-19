import { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  RefreshCw,
  Terminal,
  Activity,
  Trash2,
  Lock,
} from 'lucide-react';
import { sendMessageToBackground } from '../messaging/bus';
import { MessageType } from '../messaging/types';
import { ExtensionSettings, ExtensionStats, SecurityIncident } from '../types/security';
import { DEMO_INCIDENTS } from './demoData';

export default function DashboardApp() {
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'settings'>('overview');
  const [stats, setStats] = useState<ExtensionStats>({
    pagesScanned: 0,
    threatsDetected: 0,
    highRiskCount: 0,
    protectedEvents: 0,
    credentialWarnings: 0,
    openIncidents: 0,
  });
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>({
    enableAI: true,
    autoBlockCritical: false,
    showOverlay: true,
    demoMode: false,
    geminiModel: 'gemini-1.5-flash',
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const setResp = await sendMessageToBackground<ExtensionSettings>({
        type: MessageType.GET_SETTINGS,
      });
      const nextSettings = setResp.success && setResp.data ? setResp.data : settings;
      setSettings(nextSettings);

      const incResp = await sendMessageToBackground<SecurityIncident[]>({
        type: MessageType.GET_INCIDENTS,
      });
      if (incResp.success && incResp.data) {
        const dashboardIncidents = nextSettings.demoMode ? DEMO_INCIDENTS : incResp.data;
        setIncidents(dashboardIncidents);
        // Compute statistics based on incidents
        setStats({
          pagesScanned: dashboardIncidents.length + 1,
          threatsDetected: dashboardIncidents.length,
          highRiskCount: dashboardIncidents.filter((i) => i.riskScore.severity === 'CRITICAL' || i.riskScore.severity === 'HIGH').length,
          protectedEvents: dashboardIncidents.length,
          credentialWarnings: dashboardIncidents.filter((i) => i.threatType === 'CREDENTIAL_HARVESTING').length,
          openIncidents: dashboardIncidents.filter((i) => i.status === 'OPEN').length,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDemoMode = async () => {
    const updated = !settings.demoMode;
    setSettings((prev) => ({ ...prev, demoMode: updated }));
    await sendMessageToBackground({
      type: MessageType.SET_DEMO_MODE,
      payload: { enabled: updated },
    });
    if (updated) {
      setIncidents(DEMO_INCIDENTS);
      setStats({
        pagesScanned: DEMO_INCIDENTS.length + 1,
        threatsDetected: DEMO_INCIDENTS.length,
        highRiskCount: DEMO_INCIDENTS.filter((i) => i.riskScore.severity === 'CRITICAL' || i.riskScore.severity === 'HIGH').length,
        protectedEvents: DEMO_INCIDENTS.length,
        credentialWarnings: DEMO_INCIDENTS.filter((i) => i.threatType === 'CREDENTIAL_HARVESTING').length,
        openIncidents: DEMO_INCIDENTS.filter((i) => i.status === 'OPEN').length,
      });
    } else {
      fetchDashboardData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="border-b border-gray-800 bg-[#111827]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wider text-white uppercase flex items-center gap-2">
                CyberShield <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">SOC Center</span>
              </h1>
              <p className="text-xs text-gray-400">Personal Security Operations Center in the Browser</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-lg font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online (v0.2.0)
            </span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800 bg-[#0E1322]">
        <div className="max-w-7xl mx-auto px-6 flex gap-8 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'incidents'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-4 h-4" /> Incident Timeline ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> System Settings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pages Scanned</div>
                <div className="text-3xl font-extrabold font-mono text-white">{stats.pagesScanned}</div>
                <div className="text-[11px] text-gray-500">Total websites evaluated</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Threats Detected</div>
                <div className="text-3xl font-extrabold font-mono text-amber-400">{stats.threatsDetected}</div>
                <div className="text-[11px] text-gray-500">High / Critical severity signals</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">High Risk Count</div>
                <div className="text-3xl font-extrabold font-mono text-rose-400">{stats.highRiskCount}</div>
                <div className="text-[11px] text-gray-500">Critical risk score pages</div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protected Events</div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">{stats.protectedEvents}</div>
                <div className="text-[11px] text-gray-500">Security incidents recorded</div>
              </div>
            </div>

            {/* Recent Incidents Card */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Recent Security Incidents
                </h3>
                <span className="text-xs text-gray-400">{incidents.length} recorded</span>
              </div>

              {incidents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto" />
                  <p className="text-sm font-medium">No incidents recorded yet.</p>
                  <p className="text-xs text-gray-600">CyberShield automatically records high-risk security signals here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.slice(0, 5).map((inc) => (
                    <div key={inc.id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-emerald-400 font-semibold">{inc.domain}</span>
                          <span className="text-xs bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold font-mono">
                            {inc.riskScore.score}/100 ({inc.riskScore.severity})
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-xl">{inc.url}</div>
                      </div>
                      <div className="text-right font-mono text-xs text-gray-500">
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Architecture Principles Callout */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" /> CyberShield Security Architecture
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Deterministic Source of Truth:</strong> Threat detection operates entirely via local heuristic rules without cloud dependency.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Zero-Knowledge Credential Handling:</strong> Plaintext passwords are never read, stored, logged, or transmitted.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Heuristic Disclaimer:</strong> Risk scores indicate potential security indicators and do not claim 100% guaranteed malware detection.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" /> Full Incident Log History
              </h3>
              <button
                onClick={() => setIncidents([])}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No incidents recorded yet.</div>
            ) : (
              <div className="space-y-4">
                {incidents.map((inc) => (
                  <div key={inc.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-emerald-400 font-bold">{inc.domain}</span>
                        <span className="text-xs bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold font-mono">
                          Score: {inc.riskScore.score}/100
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{inc.threatType}</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">{new Date(inc.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="text-xs text-gray-300 font-mono bg-gray-950 p-2 rounded border border-gray-800 truncate">
                      {inc.url}
                    </div>

                    {inc.signals.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-400 uppercase font-semibold">Detected Evidence Signals ({inc.signals.length}):</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {inc.signals.map((sig) => (
                            <div key={sig.id} className="bg-gray-950/60 border border-gray-800 p-2 rounded text-xs space-y-1">
                              <div className="font-semibold text-gray-200">{sig.title}</div>
                              <p className="text-gray-400 text-[11px]">{sig.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider border-b border-gray-800 pb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-emerald-400" /> System Settings & Environment Configuration
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block uppercase">Configured AI Model</label>
              <div className="font-mono text-sm bg-gray-900 text-emerald-400 px-3 py-2 rounded border border-gray-800 flex items-center justify-between">
                <span>GEMINI_MODEL: {settings.geminiModel}</span>
                <span className="text-xs text-gray-500 font-normal">FastAPI Server Config</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-900/60 border border-gray-800 rounded-lg">
              <div>
                <div className="text-sm font-semibold text-gray-200">Safe Hackathon Demo Mode</div>
                <div className="text-xs text-gray-400">Activates simulation indicators for presentation testing.</div>
              </div>
              <button
                onClick={handleToggleDemoMode}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                  settings.demoMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {settings.demoMode ? 'ENABLED' : 'OFF'}
              </button>
            </div>

            <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Zero-Knowledge Privacy Guarantee
              </div>
              <p className="text-emerald-400/80">
                CyberShield never logs, reads, stores, or transmits password values under any circumstances.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 bg-[#0E1322] py-4 text-center text-xs text-gray-500">
        CyberShield SOC v0.2.0 — Manifest V3 Personal Security Operations Center
      </footer>
    </div>
  );
}
