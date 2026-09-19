# CyberShield — Development Master Task List (TODO.md)

> **Sprint Duration:** 24 Hours  
> **Focus:** High-Impact Personal Browser SOC MVP  
> **Rule:** P0 deliverables MUST be completed before proceeding to P1/P2.

---

## Task Dependency Graph (Conceptual)

```
[P0.1 Extension Shell] ───> [P0.2 URL/Domain Analysis] ──┐
                         └──> [P0.3 Page/DOM Scanner]    ├──> [P0.4 Risk Engine] ──> [P0.5 Evidence UI] ──> [P0.7 Protection UI]
                                                         │
[P0.6 AI FastAPI Proxy] <────────────────────────────────┘ (Consumes Risk Engine Output)

[P0.4 Risk Engine] ───> [P1.8 Credential Guard] ──> [P1.9 Incident Timeline] ──> [P1.10 Storage] ──> [P1.11 Dashboard]
```

---

## Phase 0: Architecture & Specification [COMPLETED]

- [x] **P0.0 Architecture Design**
  - Create `ARCHITECTURE.md` (System specs, data flows, types, security boundary)
  - Create `TODO.md` (Task breakdown & dependencies)
  - Create `SECURITY.md` (Threat model, privacy rules, credential guard constraints)

---

## Phase 1: Core MVP — Must Have (P0)

Target Completion: **Hours 0 – 14**

### 1. Chrome Extension Shell
- [ ] **P0.1.1** Initialize extension project structure (`Vite`, `React`, `TypeScript`, `Tailwind CSS`)
- [ ] **P0.1.2** Configure `manifest.json` (MV3, minimal permissions: `storage`, `activeTab`, `scripting`, background service worker, popup action)
- [ ] **P0.1.3** Set up background service worker build script & lifecycle listeners (`chrome.runtime.onInstalled`, `chrome.tabs.onUpdated`)
- [ ] **P0.1.4** Implement strongly typed Message Passing Bus (`messaging/bus.ts`)
- **Dependencies:** None

### 2. URL & Domain Security Analysis
- [ ] **P0.2.1** Implement IP-address host detector (`detection/urlRules.ts`)
- [ ] **P0.2.2** Implement TLD risk classifier (`.zip`, `.top`, `.tk`, `.mov`, etc.)
- [ ] **P0.2.3** Implement Levenshtein distance algorithm for top brand typosquatting (`utils/distance.ts`)
- [ ] **P0.2.4** Implement Shannon entropy calculator for domain randomness detection
- [ ] **P0.2.5** Implement subdomain count & deep path analysis
- **Dependencies:** `P0.1`

### 3. Page & DOM Security Signal Detection
- [ ] **P0.3.1** Build content script DOM scanner (`content/domScanner.ts`)
- [ ] **P0.3.2** Detect `<input type="password">` presence & count
- [ ] **P0.3.3** Extract form `action` URLs and identify cross-origin submissions
- [ ] **P0.3.4** Scan hidden input fields and iframe origins
- [ ] **P0.3.5** Transmit structural DOM snapshot to Background Service Worker via `ANALYZE_PAGE` IPC message
- **Dependencies:** `P0.1`

### 4. Risk Scoring Engine
- [ ] **P0.4.1** Implement signal weight registry & confidence multipliers (`detection/engine.ts`)
- [ ] **P0.4.2** Implement exponential decay score normalizer ($0 - 100$ scale)
- [ ] **P0.4.3** Implement severity classifier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- [ ] **P0.4.4** Implement risk score breakdown matrix (URL, Domain, Page, Redirect, Credential scores)
- [ ] **P0.4.5** Unit test engine with mock malicious & safe payload suites
- **Dependencies:** `P0.2`, `P0.3`

### 5. Evidence Mode ("SHOW ME WHY")
- [ ] **P0.5.1** Create Shadow DOM container injector in Content Script (`content/overlayInjector.ts`)
- [ ] **P0.5.2** Build React Evidence Overlay drawer (`evidence/EvidenceDrawer.tsx`)
- [ ] **P0.5.3** Render detected `SecuritySignal` array with severity badges and detailed evidence key-values
- [ ] **P0.5.4** Add "SHOW ME WHY" toggle button to extension popup & floating page badge
- [ ] **P0.5.5** Guarantee UI renders ONLY engine-originated signals (Zero AI hallucination vector)
- **Dependencies:** `P0.4`

### 6. AI Security Analyst (Backend Proxy & Grounding)
- [ ] **P0.6.1** Setup FastAPI backend structure (`app/main.py`, `app/routes/explain.py`)
- [ ] **P0.6.2** Integrate Google Gemini 1.5 Flash SDK via server-side API key (`.env`)
- [ ] **P0.6.3** Define Pydantic request/response schemas matching TypeScript `AIExplanation` interfaces
- [ ] **P0.6.4** Enforce strict grounding system prompt (prohibit AI from generating extra evidence)
- [ ] **P0.6.5** Implement background service worker API client (`background/apiProxy.ts`)
- [ ] **P0.6.6** Implement client-side deterministic fallback generator for offline / API failure scenarios
- **Dependencies:** `P0.4`

### 7. High-Risk Protection UI
- [ ] **P0.7.1** Build Shadow DOM Interstitial Modal component (`protection/InterstitialModal.tsx`)
- [ ] **P0.7.2** Trigger interstitial when page `RiskScore >= 75` (CRITICAL)
- [ ] **P0.7.3** Provide primary "GET ME OUT OF HERE" safety exit button (navigates to `about:blank` or safe page)
- [ ] **P0.7.4** Provide explicit secondary "Proceed Anyway (Unsafe)" override button with incident event logging
- **Dependencies:** `P0.4`, `P0.5`

---

## Phase 2: Feature Complete — Should Have (P1)

Target Completion: **Hours 15 – 20**

### 8. Credential Guard
- [ ] **P1.8.1** Attach zero-knowledge event listeners (`focusin`) on password input elements
- [ ] **P1.8.2** Verify form destination origin against current `window.location.origin`
- [ ] **P1.8.3** Trigger immediate credential warning banner if form destination origin is mismatched or untrusted
- [ ] **P1.8.4** Implement safe local k-anonymity mock breach dictionary lookup
- [ ] **P1.8.5** Enforce zero-knowledge rule (ensure `input.value` is NEVER read or logged)
- **Dependencies:** `P0.3`, `P0.7`

### 9. Incident Timeline & Event Recorder
- [ ] **P1.9.1** Define `SecurityIncident` recorder in Service Worker
- [ ] **P1.9.2** Record `SIGNAL_DETECTED`, `INTERSTITIAL_TRIGGERED`, and `USER_OVERRIDE` events
- [ ] **P1.9.3** Persist incidents to `chrome.storage.local` with 100-item FIFO cap
- **Dependencies:** `P0.4`, `P0.7`

### 10. Local Security History & Storage Layer
- [ ] **P1.10.1** Build typed abstraction wrapper over `chrome.storage.local` (`storage/store.ts`)
- [ ] **P1.10.2** Implement automatic history lookup and stats counter updates
- [ ] **P1.10.3** Implement clear history & export settings options
- **Dependencies:** `P0.1`, `P1.9`

### 11. Security Dashboard (Full Page SOC Interface)
- [ ] **P1.11.1** Build React Dashboard page (`dashboard/index.html` + `DashboardApp.tsx`)
- [ ] **P1.11.2** Render Security Status Summary (Total Scanned, Blocked Threats, High Risk Alerts)
- [ ] **P1.11.3** Render Incident Timeline table with filters (Date, Severity, Threat Type)
- [ ] **P1.11.4** Build detailed Incident Inspection view with Evidence breakdown & AI summary
- **Dependencies:** `P1.10`

---

## Phase 3: Enhancements — Only If Time Remains (P2)

Target Completion: **Hours 21 – 24**

- [ ] **P2.12 Advanced Machine Learning / Heuristics** (Local TFJS or light clustering model)
- [ ] **P2.13 Threat Intelligence Integrations** (Async Google Safe Browsing / VirusTotal backend lookup)
- [ ] **P2.14 PDF Security Reports** (Client-side HTML2PDF export of Incident details)
- [ ] **P2.15 Team Accounts & Central Logging** (Multi-tenant incident sync)
- [ ] **P2.16 Behavioural Anomaly Detection** (Cursor trajectory & fast form fill detection)

---

## 24-Hour Hackathon Execution Timeline

| Time Window | Focus Area | Deliverables |
| :--- | :--- | :--- |
| **Hours 00 – 02** | Architecture & Setup | Complete Phase 0 docs, init Vite + TS + Tailwind + FastAPI skeleton |
| **Hours 02 – 06** | Extension Shell & Engine | MV3 Service worker, DOM scanner, URL rules, Risk Engine & unit tests |
| **Hours 06 – 10** | Evidence Mode & UI | React Evidence Overlay (Shadow DOM), Popup UI, Interstitial Modal |
| **Hours 10 – 14** | AI Analyst Backend | FastAPI `/api/v1/explain` endpoint, Gemini integration, Client Fallback |
| **Hours 14 – 18** | Credential Guard & History | Password field hooks, Form action validator, `chrome.storage.local` |
| **Hours 18 – 21** | Security Dashboard | React SOC Dashboard, Incident Timeline, Stat Cards |
| **Hours 21 – 23** | Integration & Polish | E2E testing on demo phishing pages, styling fixes, bug squashing |
| **Hours 23 – 24** | Demo Prep | Record video demo, finalize README, test fresh extension install |
