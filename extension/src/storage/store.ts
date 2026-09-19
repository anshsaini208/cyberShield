import {
  ThreatAnalysis,
  SecurityIncident,
  SecurityIncidentDraft,
  ExtensionSettings,
  ExtensionStats,
  RiskSeverity,
  IncidentStatus,
  ThreatType,
  SignalCategory,
} from '../types/security';

const STORAGE_KEYS = {
  CURRENT_ANALYSIS: 'cybershield_current_analysis',
  INCIDENTS: 'cybershield_incidents',
  SETTINGS: 'cybershield_settings',
  STATS: 'cybershield_stats',
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enableAI: true,
  autoBlockCritical: false,
  showOverlay: true,
  demoMode: false,
  geminiModel: 'gemini-1.5-flash',
};

export const DEFAULT_STATS: ExtensionStats = {
  pagesScanned: 0,
  threatsDetected: 0,
  highRiskCount: 0,
  protectedEvents: 0,
  credentialWarnings: 0,
  openIncidents: 0,
};

/** Maximum number of incidents to retain in storage. */
const MAX_INCIDENTS = 150;

/**
 * Retention pruning: keep max `cap` incidents.
 * Strategy: prune oldest RESOLVED/DISMISSED first, then oldest OPEN.
 */
function pruneIncidents(incidents: SecurityIncident[], cap: number): SecurityIncident[] {
  if (incidents.length <= cap) return incidents;

  const resolved = [...incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'DISMISSED')]
    .sort((a, b) => (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt));
  const open = [...incidents.filter((i) => i.status === 'OPEN')]
    .sort((a, b) => a.createdAt - b.createdAt);

  const pruneOrder = [...resolved, ...open];
  const toRemove = new Set(pruneOrder.slice(0, incidents.length - cap).map((i) => i.id));
  return incidents.filter((i) => !toRemove.has(i.id));
}

/**
 * Storage Abstraction Layer over chrome.storage.local
 */
class StorageStore {
  private memoryStore: Record<string, unknown> = {};

  private isChromeStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage) && Boolean(chrome.storage.local);
  }

  async saveAnalysis(analysis: ThreatAnalysis): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_ANALYSIS]: analysis });
    } else {
      this.memoryStore[STORAGE_KEYS.CURRENT_ANALYSIS] = analysis;
    }
  }

  async getLatestAnalysis(): Promise<ThreatAnalysis | null> {
    if (this.isChromeStorageAvailable()) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_ANALYSIS);
      return (data[STORAGE_KEYS.CURRENT_ANALYSIS] as ThreatAnalysis) || null;
    }
    return (this.memoryStore[STORAGE_KEYS.CURRENT_ANALYSIS] as ThreatAnalysis) || null;
  }

  async saveIncident(incident: SecurityIncidentDraft): Promise<SecurityIncident> {
    const now = Date.now();
    const id = `inc_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const fullIncident: SecurityIncident = {
      ...incident,
      id,
      createdAt: incident.createdAt ?? now,
      updatedAt: incident.updatedAt ?? now,
      status: incident.status ?? 'OPEN',
      hostname: incident.hostname ?? incident.domain,
      severity: incident.severity ?? incident.riskScore.severity,
      events: (incident.events ?? []).map((event) => ({
        ...event,
        incidentId: event.incidentId || id,
      })),
    };

    const current = await this.getAllIncidents();
    const deduped = [fullIncident, ...current.filter((i) => i.id !== fullIncident.id)];
    const pruned = pruneIncidents(deduped, MAX_INCIDENTS);

    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.INCIDENTS]: pruned });
    } else {
      this.memoryStore[STORAGE_KEYS.INCIDENTS] = pruned;
    }

    await this.incrementStat('protectedEvents');
    if (fullIncident.status === 'OPEN') {
      await this.incrementStat('openIncidents');
    }
    if (
      fullIncident.riskScore.severity === RiskSeverity.HIGH ||
      fullIncident.riskScore.severity === RiskSeverity.CRITICAL
    ) {
      await this.incrementStat('highRiskCount');
    }
    if (
      fullIncident.threatType === ThreatType.CREDENTIAL_HARVESTING ||
      fullIncident.signals.some((s) => s.category === SignalCategory.CREDENTIAL)
    ) {
      await this.incrementStat('credentialWarnings');
    }

    return fullIncident;
  }

  /**
   * Update an incident's status and append a status-change SecurityEvent.
   * Returns the updated incident, or null if not found.
   */
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<SecurityIncident | null> {
    const incidents = await this.getAllIncidents();
    const idx = incidents.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const now = Date.now();
    const eventTypeMap: Record<IncidentStatus, SecurityIncident['events'][number]['eventType']> = {
      RESOLVED: 'INCIDENT_RESOLVED',
      DISMISSED: 'INCIDENT_DISMISSED',
      OPEN: 'INCIDENT_REOPENED',
    };

    const statusEvent: SecurityIncident['events'][number] = {
      id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
      incidentId: id,
      timestamp: now,
      eventType: eventTypeMap[status],
      details: `Incident status changed to ${status}`,
    };

    const updated: SecurityIncident = {
      ...incidents[idx],
      status,
      updatedAt: now,
      events: [...(incidents[idx].events ?? []), statusEvent],
    };

    incidents[idx] = updated;

    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.INCIDENTS]: incidents });
    } else {
      this.memoryStore[STORAGE_KEYS.INCIDENTS] = incidents;
    }

    return updated;
  }

  async getIncidents(limit = MAX_INCIDENTS): Promise<SecurityIncident[]> {
    const incidents = await this.getAllIncidents();
    return incidents.slice(0, limit);
  }

  private async getAllIncidents(): Promise<SecurityIncident[]> {
    if (this.isChromeStorageAvailable()) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.INCIDENTS);
      return (data[STORAGE_KEYS.INCIDENTS] as SecurityIncident[]) || [];
    }
    return (this.memoryStore[STORAGE_KEYS.INCIDENTS] as SecurityIncident[]) || [];
  }

  async clearIncidents(): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.INCIDENTS]: [] });
    } else {
      this.memoryStore[STORAGE_KEYS.INCIDENTS] = [];
    }
  }

  async getSettings(): Promise<ExtensionSettings> {
    if (this.isChromeStorageAvailable()) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...((this.memoryStore[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings>) || {}),
    };
  }

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    } else {
      this.memoryStore[STORAGE_KEYS.SETTINGS] = updated;
    }
    return updated;
  }

  async getStats(): Promise<ExtensionStats> {
    if (this.isChromeStorageAvailable()) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
      return { ...DEFAULT_STATS, ...(data[STORAGE_KEYS.STATS] || {}) };
    }
    return {
      ...DEFAULT_STATS,
      ...((this.memoryStore[STORAGE_KEYS.STATS] as Partial<ExtensionStats>) || {}),
    };
  }

  async incrementStat(key: keyof ExtensionStats, amount = 1): Promise<ExtensionStats> {
    const current = await this.getStats();
    const updated = { ...current, [key]: current[key] + amount };
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: updated });
    } else {
      this.memoryStore[STORAGE_KEYS.STATS] = updated;
    }
    return updated;
  }
}

export const storage = new StorageStore();
