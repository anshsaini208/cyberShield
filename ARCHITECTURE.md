# CyberShield — System Architecture Specification

> **Project Concept:** CyberShield — A Personal Security Operations Center (SOC) in the Browser  
> **Target Platform:** Chrome Extension (Manifest V3) + FastAPI AI Backend Proxy  
> **Hackathon Timeline:** 24 Hours  
> **Core Pipeline:** DETECT → EXPLAIN → PROTECT → RECORD  

---

## 1. Executive Overview & Hackathon Strategy

CyberShield is a browser-native security companion that provides end-users with real-time visibility, transparent threat explanation, and active credential protection without compromising privacy or introducing cloud lock-in.

### Key Architectural Tenets
1. **Engine as Source of Truth:** Detection is 100% deterministic and operates client-side without relying on AI availability or network connectivity.
2. **AI as Explanation Only:** Generative AI (via Google Gemini API) serves exclusively as an intuitive translation layer for non-technical users. It never generates, hallucinates, or modifies security evidence.
3. **Zero-Knowledge Credential Handling:** Plaintext passwords are never read, stored, logged, or transmitted over network boundaries under any circumstances.
4. **Lean & Rapid 24-Hour Scope:** Built with standard browser APIs, local storage, and lightweight FastAPI micro-backend. No complex databases (e.g. Supabase) or heavy ML frameworks in MVP.

---

## 2. System Architecture

CyberShield strictly separates concerns into seven decoupled modules: **Detection**, **Risk Scoring**, **Evidence Generation**, **AI Explanation**, **Protection UI**, **Storage**, and **Presentation/Dashboard**.

```
+-----------------------------------------------------------------------------------+
|                                  CHROME BROWSER                                   |
|                                                                                   |
|  +------------------------+             +--------------------------------------+  |
|  |     Content Script     |             |       Background Service Worker      |  |
|  |                        |             |                                      |  |
|  |  +------------------+  |  DOM Signals|  +--------------------------------+  |  |
|  |  | Page Signal      |--|------------>|  | Detection Engine & Risk Engine|  |  |
|  |  | Extraction       |  |             |  | - URL / Domain Parser         |  |  |
|  |  +------------------+  |             |  | - Heuristic Analyzer          |  |  |
|  |                        |  Analysis   |  | - Risk Score Generator        |  |  |
|  |  +------------------+  |<------------|  +--------------------------------+  |  |
|  |  | Evidence Overlay |  |   Result    |                 |                    |  |
|  |  | & Interstitial   |  |             |  AI Req (Clean) | AI Resp (JSON)     |  |
|  |  +------------------+  |             |                 v                    |  |
|  +------------------------+             |  +--------------------------------+  |  |
|              ^                          |  | Storage Layer                  |  |  |
|              | User Actions             |  | (chrome.storage.local)         |  |  |
|              v                          |  +--------------------------------+  |  |
|  +------------------------+             +--------------------------------------+  |
|  | Popup & Dashboard UI   |                                ^                      |
|  | (React / Tailwind)     |<-------------------------------+                      |
|  +------------------------+         Direct Storage Reads                          |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP / REST (Sanitized Payload Only)
                                         v
+-----------------------------------------------------------------------------------+
|                              CYBERSHIELD BACKEND API                              |
|                                 (FastAPI / Python)                                |
|                                                                                   |
|    +------------------------+                  +-----------------------------+    |
|    | /api/v1/explain        |----------------->| Gemini API Client           |    |
|    | (Sanitized Request)    |<-----------------| (Google AI Studio SDK)      |    |
|    +------------------------+                  +-----------------------------+    |
|                                                                                   |
|  * Note: Server-Side API Key Storage only. CORS Restricted to Extension Origin.  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Extension Components & Responsibility Matrix

### Component Roles

| Component | Execution Context | Primary Responsibility | Allowed Communication | Forbidden Communication |
| :--- | :--- | :--- | :--- | :--- |
| **Content Script** | Isolated Web Page Context | Scans DOM, extracts structural signals, listens for password field interactions, injects Shadow DOM Protection UI & Evidence Overlay. | Background Service Worker | External APIs, Popup directly, Direct Gemini API |
| **Background Service Worker** | Extension Event Page | Central Orchestrator: runs domain heuristics, calculates risk scores, handles IPC routing, persists data to storage, communicates with FastAPI backend. | Content Script, Popup, Dashboard, FastAPI Backend, `chrome.storage` | Direct DOM access, Raw Web APIs |
| **Detection Engine** | Service Worker / Content Helper | Pure function modules evaluating URL structures, DOM tree anomalies, certificate patterns, and form action targets. | Background Service Worker | UI Components, Network |
| **Storage Layer** | Service Worker / UI context | Abstraction wrapper over `chrome.storage.local` with typing, LRU eviction, and schema enforcement. | Service Worker, Popup, Dashboard | External APIs |
| **Message Passing Hub** | Runtime IPC Layer | Strongly typed event router handling request/response lifecycle across extension contexts. | All Extension Components | External Web Pages |
| **Evidence Overlay** | Content Script (Shadow DOM) | Non-intrusive drawer/panel displaying exact ground-truth `SecuritySignal` items behind the risk score. | Content Script parent | External APIs, Background Worker directly |
| **Protection UI** | Content Script (Shadow DOM) | High-risk modal intercepting navigation or credential submit when Risk Score exceeds critical threshold (75+). | Content Script parent | External APIs |
| **Popup UI** | Browser Action Panel | Quick status overview, current page risk gauge, "SHOW ME WHY" button trigger, threat summary. | Background Service Worker, Storage | Content Script directly, External APIs |
| **Dashboard UI** | Full Page Tab (`index.html`) | Deep SOC view: Incident Timeline, Local Security History, Analytics, Settings, Manual Signal Inspector. | Service Worker, Storage | Content Script directly, External APIs |

### Strictly Enforced Component Communication Paths

```
[ Content Script ] <---> [ Service Worker ] <---> [ FastAPI Backend ] <---> [ Gemini API ]
        ^                         ^
        |                         |
        v                         v
[ Shadow DOM UI ]        [ Popup / Dashboard ]
```

- **Rule 1:** Content scripts CANNOT make HTTP requests to the FastAPI backend or Gemini API directly.
- **Rule 2:** Popup and Dashboard CANNOT directly execute code inside Content Scripts; all commands route through the Background Service Worker.
- **Rule 3:** The Gemini API key resides solely in the FastAPI backend environment variables (`.env`). It NEVER touches any Chrome extension code.

---

## 4. Message Flow & Data Lifecycle

### 4.1 Page Analysis Lifecycle (Automatic Trigger)
```
User Navigates -> Content Script Loaded -> DOM Scanned -> ANALYZE_PAGE Message sent to SW
SW Runs URL/Domain Heuristics + Evaluates DOM Signals -> Computes RiskScore
SW Stores ThreatAnalysis in chrome.storage.local -> Sends ANALYSIS_RESULT to Content Script & Popup
If RiskScore >= 75: Content Script triggers High-Risk Protection UI Modal
```

### 4.2 AI Explanation Request Lifecycle (User-Initiated)
```
User clicks "EXPLAIN WITH AI" in Evidence Overlay or Popup
Popup / Content Script -> Sends REQUEST_AI_EXPLANATION to SW
SW retrieves current ThreatAnalysis from Storage (Signals + RiskScore)
SW checks Backend Health:
  - If Backend Online: SW POSTs sanitized payload to FastAPI /api/v1/explain
    FastAPI calls Gemini API -> Parses response into AIExplanation JSON -> Returns to SW
  - If Backend Offline / Error: SW calls local Deterministic Fallback Generator
SW stores AIExplanation -> Sends AI_EXPLANATION_RESULT to UI
```

---

## 5. Type Definitions (`types/security.ts`)

```typescript
// ============================================================================
// ENUMS
// ============================================================================

export enum SignalCategory {
  URL = 'URL',
  DOMAIN = 'DOMAIN',
  PAGE = 'PAGE',
  REDIRECT = 'REDIRECT',
  CREDENTIAL = 'CREDENTIAL'
}

export enum SignalSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum RiskSeverity {
  LOW = 'LOW',         // 0 - 24
  MEDIUM = 'MEDIUM',   // 25 - 49
  HIGH = 'HIGH',       // 50 - 74
  CRITICAL = 'CRITICAL'// 75 - 100
}

export enum ThreatType {
  SAFE = 'SAFE',
  SUSPICIOUS_DOMAIN = 'SUSPICIOUS_DOMAIN',
  PHISHING_INDICATOR = 'PHISHING_INDICATOR',
  CREDENTIAL_HARVESTING = 'CREDENTIAL_HARVESTING',
  DECEPTIVE_FORM = 'DECEPTIVE_FORM',
  ANOMALOUS_PAGE = 'ANOMALOUS_PAGE'
}

export enum UserAction {
  BLOCKED = 'BLOCKED',
  PROCEEDED_ANYWAY = 'PROCEEDED_ANYWAY',
  DISMISSED = 'DISMISSED',
  REPORTED_FALSE_POSITIVE = 'REPORTED_FALSE_POSITIVE'
}

// ============================================================================
// CORE DATA INTERFACES
// ============================================================================

export interface SecuritySignal {
  id: string;                         // e.g., 'SIG-URL-IP-HOST'
  category: SignalCategory;
  severity: SignalSeverity;
  weight: number;                     // Numeric impact (1 - 30)
  title: string;                      // Human-readable title
  description: string;               // Technical detail
  evidence: Record<string, unknown>;  // Structured key-value evidence (e.g., { foundDomain: "g00gle.com", targetDomain: "google.com" })
  confidence: number;                 // 0.0 to 1.0
  timestamp: number;                  // Unix Epoch ms
}

export interface RiskScore {
  score: number;                      // Normalized 0 - 100
  severity: RiskSeverity;
  breakdown: {
    urlScore: number;
    domainScore: number;
    pageScore: number;
    redirectScore: number;
    credentialScore: number;
  };
}

export interface ThreatAnalysis {
  id: string;                         // UUID
  url: string;                        // Full URL (sanitized)
  domain: string;                     // Top-level domain
  timestamp: number;
  riskScore: RiskScore;
  threatType: ThreatType;
  signals: SecuritySignal[];
  engineVersion: string;
}

export interface AIExplanation {
  id: string;
  analysisId: string;
  summary: string;                    // 1-2 sentence executive overview
  whatDetected: string[];             // Bullet points explaining detected signals simply
  whyItMatters: string;               // Risk context for non-technical users
  potentialImpact: string;            // What could happen if user proceeds
  recommendedActions: string[];       // Concrete steps (e.g. "Do not enter password")
  generatedAt: number;
  isFallback: boolean;                // True if generated by client-side fallback engine
}

export interface SecurityEvent {
  id: string;
  incidentId: string;
  timestamp: number;
  eventType: 'SIGNAL_DETECTED' | 'WARNING_SHOWN' | 'INTERSTITIAL_TRIGGERED' | 'USER_OVERRIDE' | 'CREDENTIAL_FOCUS';
  details: string;
}

export interface SecurityIncident {
  id: string;                         // UUID
  timestamp: number;
  url: string;
  domain: string;
  riskScore: RiskScore;
  threatType: ThreatType;
  signals: SecuritySignal[];
  aiExplanation?: AIExplanation;
  events: SecurityEvent[];
  userActionTaken?: UserAction;
}
```

---

## 6. Message Passing Protocol (`types/messaging.ts`)

```typescript
import { ThreatAnalysis, AIExplanation, SecurityIncident } from './security';

export enum MessageType {
  // Page Lifecycle
  ANALYZE_PAGE = 'ANALYZE_PAGE',
  ANALYSIS_RESULT = 'ANALYSIS_RESULT',
  GET_CURRENT_ANALYSIS = 'GET_CURRENT_ANALYSIS',

  // AI Operations
  REQUEST_AI_EXPLANATION = 'REQUEST_AI_EXPLANATION',
  AI_EXPLANATION_RESULT = 'AI_EXPLANATION_RESULT',

  // Credential Protection
  CREDENTIAL_WARNING = 'CREDENTIAL_WARNING',

  // Incident Recording & Storage
  RECORD_INCIDENT = 'RECORD_INCIDENT',
  GET_INCIDENTS = 'GET_INCIDENTS',
  INCIDENTS_RESULT = 'INCIDENTS_RESULT'
}

export interface BaseMessage {
  type: MessageType;
  requestId: string;
}

// Requests
export interface AnalyzePageMessage extends BaseMessage {
  type: MessageType.ANALYZE_PAGE;
  payload: {
    url: string;
    domSnapshot: {
      hasPasswordField: boolean;
      formActions: string[];
      iframeCount: number;
      externalScriptOrigins: string[];
      hasHiddenInputs: boolean;
      title: string;
    };
  };
}

export interface RequestAIExplanationMessage extends BaseMessage {
  type: MessageType.REQUEST_AI_EXPLANATION;
  payload: {
    analysisId: string;
  };
}

export interface RecordIncidentMessage extends BaseMessage {
  type: MessageType.RECORD_INCIDENT;
  payload: {
    incident: Omit<SecurityIncident, 'id' | 'timestamp'>;
  };
}

export interface GetIncidentsMessage extends BaseMessage {
  type: MessageType.GET_INCIDENTS;
  payload?: {
    limit?: number;
  };
}

// Responses
export interface AnalysisResultMessage {
  type: MessageType.ANALYSIS_RESULT;
  requestId: string;
  success: boolean;
  data?: ThreatAnalysis;
  error?: string;
}

export interface AIExplanationResultMessage {
  type: MessageType.AI_EXPLANATION_RESULT;
  requestId: string;
  success: boolean;
  data?: AIExplanation;
  error?: string;
}

export type ExtensionMessage =
  | AnalyzePageMessage
  | RequestAIExplanationMessage
  | RecordIncidentMessage
  | GetIncidentsMessage;
```

---

## 7. Risk Engine Architecture & Scoring Model

### Categories & Signal Registry

| Category | Indicator Evaluated | Weight Range | Severity |
| :--- | :--- | :--- | :--- |
| **URL** | Raw IP address host (`http://192.168.1.1/login`) | 25 | HIGH |
| **URL** | Excessive subdomains (`login.bank.com.attacker.xyz`) | 15 | MEDIUM |
| **URL** | Non-standard port (`:8080`, `:8443` on financial keywords) | 10 | MEDIUM |
| **DOMAIN** | Typosquatting / Levenshtein similarity to top 100 brands | 30 | CRITICAL |
| **DOMAIN** | High entropy domain name (`x7q9z2b.info`) | 15 | MEDIUM |
| **DOMAIN** | Suspicious TLD (`.zip`, `.mov`, `.top`, `.tk`, `.icu`) | 15 | MEDIUM |
| **PAGE** | Form action pointing to different origin / domain | 25 | HIGH |
| **PAGE** | Password input present on non-HTTPS origin | 35 | CRITICAL |
| **PAGE** | Invisible / zero-width password input or deceptive iframe | 20 | HIGH |
| **REDIRECT** | Multiple fast client-side meta/JS redirects | 15 | MEDIUM |
| **CREDENTIAL**| Password input focused on unverified / high-risk domain | 30 | CRITICAL |

### Scoring Algorithm (Asymptotic Normalization)

To prevent a single category from overwhelming the score while ensuring multiple high-risk indicators scale smoothly up to 100:

$$\text{Raw Score} = \sum_{i=1}^{n} (w_i \times c_i)$$

Where $w_i$ is signal weight, $c_i$ is signal confidence (0.0 to 1.0).

$$\text{Final Normalized Score} = \min\left(100, \text{Math.round}\left(100 \times \left(1 - e^{-\frac{\text{Raw Score}}{45}}\right)\right)\right)$$

### Severity Mapping Rules

```
Score   0 - 24  ==> LOW      (Safe / Clean page indicator)
Score  25 - 49  ==> MEDIUM   (Suspicious elements present - Yellow badge)
Score  50 - 74  ==> HIGH     (High risk indicators - Orange badge + Warning Banner)
Score  75 - 100 ==> CRITICAL (Severe threat / Credential risk - Red badge + Interstitial Block)
```

---

## 8. Evidence Mode Architecture ("SHOW ME WHY")

Evidence Mode is the core transparent audit interface. It translates raw `SecuritySignal` data into clean visual proof.

```
+-------------------------------------------------------------------------+
| [EVIDENCE OVERLAY] — CyberShield Signal Inspection                     |
+-------------------------------------------------------------------------+
| Risk Score: 82/100 [CRITICAL]                                           |
| Threat Category: CREDENTIAL_HARVESTING                                  |
+-------------------------------------------------------------------------+
| DETECTED EVIDENCE (Source of Truth):                                    |
|                                                                         |
| 🔴 CRITICAL | Form Action Domain Mismatch                                |
|    - Expected Domain: paypal.com                                        |
|    - Actual Target:   http://192.241.12.3/collect.php                   |
|                                                                         |
| 🟠 HIGH     | Password Field on Insecure Context                         |
|    - Protocol: http:// (Unencrypted)                                   |
|                                                                         |
| 🟡 MEDIUM   | Typosquatting Target Detected                              |
|    - Current Host: paypa1-secure-login.net                              |
|    - Target Brand: PayPal (Distance: 2)                                 |
+-------------------------------------------------------------------------+
| [ EXPLAIN WITH AI ]  ---> Triggers FastAPI Gemini Proxy (Optional)      |
+-------------------------------------------------------------------------+
```

### Technical Guarantees
- The UI renders ONLY items present in `ThreatAnalysis.signals`.
- The AI prompt consumes `ThreatAnalysis.signals`. The AI is explicitly prohibited from emitting signals not present in the input array.

---

## 9. AI Security Analyst Architecture

### Request Pipeline & API Key Security
```
[ Extension SW ] 
      |  1. POST /api/v1/explain { riskScore: 82, threatType: "...", signals: [...] }
      v
[ FastAPI Backend ] (Reads GEMINI_API_KEY from env)
      |  2. Formats Prompt with Rigid System Instructions
      v
[ Gemini 1.5 API ]
      |  3. Returns Structured JSON (Schema Enforced)
      v
[ FastAPI Backend ]
      |  4. Validates JSON -> Returns AIExplanation
      v
[ Extension SW ]
```

### Grounding System Prompt (FastAPI Backend)

```text
You are CyberShield AI Security Analyst. Your task is to explain security signals to an end user.
CRITICAL RULES:
1. Base your explanation ONLY on the provided JSON signals.
2. DO NOT invent, assume, or hallucinate any external security evidence or indicators.
3. If no signals indicate malware, DO NOT mention malware.
4. Keep explanations concise, plain-English, reassuring yet clear about real risks.
5. Return valid JSON adhering strictly to the AIExplanation schema.
```

### Local Deterministic Fallback Generator
If the FastAPI service is unreachable or rate-limited:
- The Service Worker executes `generateFallbackExplanation(analysis: ThreatAnalysis): AIExplanation`.
- Uses rule-based templates for each `ThreatType` to populate `summary`, `whatDetected`, `whyItMatters`, `potentialImpact`, and `recommendedActions`.
- Flags `isFallback: true` in the return object to inform the UI.

---

## 10. Credential Guard Architecture

### Privacy & Zero-Knowledge Rules
1. **No Value Inspection:** The Content Script attaches event listeners (`focusin`, `submit`) to input fields matching `input[type="password"]` or `input[autocomplete="current-password"]`. It NEVER reads `input.value`.
2. **Form Action Validation:** Scans parent `<form action="...">`. Extracts destination origin. Compares with `window.location.origin`.
3. **Mismatched Destination Trigger:** If `destinationOrigin !== window.location.origin` AND `RiskScore >= 50`, Credential Guard blocks field interaction and displays an immediate warning overlay.
4. **Local Breach Check Mock:** Uses k-Anonymity SHA-256 hash prefix checking against a small bundled JSON dictionary (e.g. top known malicious form destinations) fully offline.

---

## 11. Storage Architecture (`chrome.storage.local`)

### Schema Layout
- `cybershield_current_analysis`: `ThreatAnalysis` (Active tab state)
- `cybershield_incidents`: `SecurityIncident[]` (Capped at 100 items, FIFO eviction)
- `cybershield_settings`: `{ enableAI: boolean, autoBlockCritical: boolean, showOverlay: boolean }`
- `cybershield_stats`: `{ totalScanned: number, threatsBlocked: number, incidentsRecorded: number }`

### Stored vs Forbidden Matrix

| Data Item | Stored? | Rationale |
| :--- | :--- | :--- |
| Threat Analysis Summaries | YES | Required for history & popup state |
| Detected Signal Metadata | YES | Required for Evidence Mode rendering |
| User Incident Logs | YES | Required for Security Dashboard timeline |
| Plaintext Passwords | **NEVER** | Severe security violation |
| Form Input Content / Text | **NEVER** | Privacy violation |
| Raw DOM HTML Dumps | **NEVER** | Unnecessary storage bloat & privacy risk |

---

## 12. Minimal Practical Chrome Permissions

```json
{
  "manifest_version": 3,
  "name": "CyberShield — Personal Browser SOC",
  "version": "0.1.0",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
```

### Permission Justification Table

| Permission | Necessity / Justification |
| :--- | :--- |
| `storage` | Required to store incidents, active analysis state, and user preferences locally in `chrome.storage.local`. |
| `activeTab` | Grants temporary access to the current active tab when the user clicks the extension popup or interacts with overlays, minimizing background surveillance. |
| `scripting` | Enables dynamic injection of Content Scripts and Shadow DOM Evidence Overlays without needing broad persistent background execution. |
| `host_permissions` (`http://*/*`, `https://*/*`) | Required for Content Script match patterns so signal extraction can run on visited web pages. |

*Why `tabs` permission is omitted:* `activeTab` provides sufficient tab context without requesting full history read access across all open tabs.

---

## 13. Privacy & Sanitization Pipeline

Before sending page metadata to the backend for AI explanation, the Service Worker runs the payload through `Sanitizer.clean()`:
1. Strips URL query parameters containing sensitive tokens (e.g. `?token=...`, `?session=...`, `?key=...`).
2. Strips any element text snippet longer than 100 characters.
3. Retains only structured signal IDs, domain names, and numerical metrics.

---

## 14. Repository Folder Structure

```
CyberShield/
├── ARCHITECTURE.md
├── TODO.md
├── SECURITY.md
├── extension/
│   ├── manifest.json
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── background/
│   │   │   ├── index.ts                # Service worker entrypoint
│   │   │   ├── analyzer.ts            # SW analysis orchestrator
│   │   │   └── apiProxy.ts            # FastAPI client
│   │   ├── content/
│   │   │   ├── index.ts                # Content script entrypoint
│   │   │   ├── domScanner.ts          # DOM signal extraction
│   │   │   ├── credentialGuard.ts      # Password field monitor
│   │   │   └── overlayInjector.ts      # Shadow DOM injection helper
│   │   ├── detection/
│   │   │   ├── engine.ts               # Core risk scoring engine
│   │   │   ├── urlRules.ts             # URL heuristics
│   │   │   ├── domainRules.ts          # Domain & typosquatting rules
│   │   │   └── pageRules.ts            # DOM structure rules
│   │   ├── evidence/
│   │   │   └── EvidenceDrawer.tsx      # React Shadow DOM Evidence UI
│   │   ├── protection/
│   │   │   └── InterstitialModal.tsx   # High-Risk Block Screen
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── PopupApp.tsx            # Popup main screen
│   │   ├── dashboard/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── DashboardApp.tsx        # Deep SOC dashboard
│   │   ├── storage/
│   │   │   └── store.ts                # chrome.storage.local wrapper
│   │   ├── messaging/
│   │   │   └── bus.ts                  # Strongly typed IPC router
│   │   ├── types/
│   │   │   ├── security.ts             # Interfaces & Enums
│   │   │   └── messaging.ts            # IPC Message interfaces
│   │   └── utils/
│   │       ├── distance.ts             # Levenshtein distance implementation
│   │       └── sanitizer.ts            # Payload cleanup helpers
│   └── tests/
│       ├── engine.test.ts
│       └── rules.test.ts
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py                     # FastAPI app entry
│       ├── config.py                   # Settings & API keys
│       ├── routes/
│       │   ├── explain.py              # POST /api/v1/explain
│       │   └── health.py               # GET /health
│       ├── services/
│       │   ├── gemini.py               # Gemini SDK wrapper
│       │   └── fallback.py             # Server fallback generator
│       └── models/
│           └── schemas.py              # Pydantic models matching TS types
├── demo/
│   ├── phishing_mock.html              # Test page for heuristic trigger
│   └── safe_mock.html                  # Test page for baseline
└── README.md
```

---

## 15. Future Scalability Considerations

- **Post-Hackathon Storage:** Abstract `StorageProvider` interface to support switching seamlessly from `chrome.storage.local` to Supabase / PostgreSQL.
- **Threat Intel Feeds:** Plug-and-play architecture allows adding Google Safe Browsing API or VirusTotal lookup modules into `DetectionEngine` as async signal providers.
- **Enterprise Features:** Multi-user team logging via central FastAPI endpoints without modifying core extension signal extraction code.
