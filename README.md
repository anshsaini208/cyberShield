# CyberShield: Personal Browser Security Operations Center

CyberShield is a Chrome extension that turns everyday browsing into a personal Security Operations Center. It detects phishing-like and suspicious web pages using local deterministic security signals, explains the evidence behind each risk score, shows a protection screen for high-risk pages, and records incidents in a dashboard built for quick review.

The core idea is simple: security warnings should be explainable. CyberShield does not just say "dangerous"; it shows what it detected, why it matters, and what the user can do next.

## Why It Matters

Phishing attacks often succeed because browser warnings are either too generic or arrive too late. CyberShield focuses on the moment of risk: when a user lands on a suspicious page or is about to enter credentials.

CyberShield helps by:

- Detecting high-risk browser signals locally.
- Showing a clear risk score and severity level.
- Explaining evidence through "Show Me Why".
- Warning users before credential entry on suspicious pages.
- Recording incidents in a Personal SOC dashboard.
- Preserving privacy by never reading password values.

## Key Features

### Local Threat Detection

CyberShield uses deterministic heuristics to analyze:

- Suspicious URL patterns.
- Domain impersonation indicators.
- IP-based hosts.
- Unencrypted HTTP pages.
- Login and password forms.
- Cross-origin credential form submissions.
- Hidden iframes.
- Meta refresh redirects.
- Page-level phishing indicators.

The detection engine runs locally in the browser extension. It does not require an AI model to decide whether a page is risky.

### Risk Scoring

Each security signal contributes to a normalized risk score from `0` to `100`.

Severity levels:

- `LOW`: 0-24
- `MEDIUM`: 25-49
- `HIGH`: 50-74
- `CRITICAL`: 75-100

The score is based on weighted security signals and confidence values, not hardcoded page names.

### Show Me Why

Instead of showing a vague warning, CyberShield provides evidence cards that explain:

- What was detected.
- Which signal triggered the warning.
- How confident the system is.
- Which page element is related to the signal.
- Why the signal matters.

This makes CyberShield suitable for both end users and judges reviewing the technical implementation.

### Protection Mode

For high-risk and critical pages, CyberShield displays an interstitial protection screen with:

- Risk score.
- Potential threat type.
- Prioritized evidence.
- Recommended action.
- Leave Page action.
- Show Me Why action.
- Continue Anyway confirmation.

CyberShield uses careful language such as "high-risk indicators detected" rather than claiming a site is definitely malicious.

### Credential Guard

CyberShield includes a privacy-first Credential Guard for login pages. It can detect credential-entry situations and cross-origin form submissions without reading password values.

CyberShield never:

- Reads password field values.
- Stores passwords.
- Logs passwords.
- Hashes passwords.
- Sends passwords to a backend.
- Sends passwords to an AI model.

Credential Guard uses page structure, form metadata, origins, and existing threat analysis only.

### Personal SOC Dashboard

The dashboard gives a judge-friendly overview of browser security activity:

- Total incidents.
- High-risk incidents.
- Credential warnings.
- Current incident status.
- Recent incident timeline.
- Evidence signals.
- Demo Mode with populated sample incidents.

Demo Mode is included so the dashboard can be reviewed even before live browsing creates new incidents.

### Optional AI Security Analyst

CyberShield includes an optional FastAPI backend for AI-generated explanations.

Important: AI is not the detector. The deterministic engine decides the risk score and evidence. The AI layer can only explain evidence that already exists.

The MVP works without an API key.

## Tech Stack

- Chrome Extension Manifest V3
- React
- TypeScript
- Vite
- Tailwind CSS
- Chrome Storage API
- FastAPI backend
- Pydantic validation
- Optional Google Gemini integration
- Vitest
- Pytest

## Project Structure

```text
cyberShield/
  extension/
    public/
      manifest.json
    src/
      background/       Service worker and message routing
      content/          Page scanning and injected UI
      dashboard/        Personal SOC dashboard
      detection/        Local heuristic detection engine
      evidence/         Show Me Why evidence UI
      messaging/        Extension message contracts
      protection/       Protection Mode and Credential Guard UI
      storage/          Chrome/local storage abstraction
      types/            Security domain types
    dist/               Built Chrome extension output
  backend/
    app/
      models/           Pydantic schemas
      routes/           Health and explanation endpoints
      services/         Gemini and fallback explanation services
    tests/
  demo/
    safe_mock.html
    phishing_mock.html
  ARCHITECTURE.md
  SECURITY.md
  TODO.md
```

## MVP Status

CyberShield MVP is complete for hackathon judging.

Verified:

- Extension production build passes.
- Extension test suite passes.
- Backend test suite passes.
- Detection engine works locally.
- Risk scoring works.
- Protection screen works.
- Show Me Why evidence mode works.
- Incident storage works.
- SOC dashboard works.
- Demo Mode works.

Test results from the final MVP check:

```text
Extension tests: 25 passed
Backend tests: 4 passed
Production build: successful
```

## Installation and Local Demo

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/cybershield.git
cd cybershield
```

### 2. Install Extension Dependencies

```bash
cd extension
npm install
```

### 3. Build the Chrome Extension

```bash
npm run build
```

The build output will be created in:

```text
extension/dist
```

### 4. Load Extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select the `extension/dist` folder.

CyberShield is now installed locally.

### 5. Run Demo Pages

Chrome extensions usually do not run content scripts on direct `file://` pages, so serve the demo pages over localhost.

From the project root:

```bash
python -m http.server 5174
```

Open:

```text
http://localhost:5174/demo/safe_mock.html
http://localhost:5174/demo/phishing_mock.html
```

Expected behavior:

- Safe demo page should show low risk.
- Phishing demo page should trigger high-risk indicators and Protection Mode.
- Show Me Why should display evidence behind the warning.
- SOC dashboard should show incidents after activity.
- Demo Mode can populate dashboard incidents immediately.

## Optional Backend Setup

The extension MVP does not require the backend. The backend is only needed for optional AI explanations.

From the project root:

```bash
cd backend
python -m venv .venv
```

On Windows:

```bash
.\.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check:

```text
http://localhost:8000/health
```

### Optional AI Environment

Create `backend/.env` only if using AI explanations:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## Security and Privacy Principles

CyberShield was built with a privacy-first security model:

- Detection happens locally in the extension.
- Password values are never accessed.
- Evidence is based on metadata and page structure.
- AI is optional and cannot override deterministic risk scoring.
- Incidents are stored locally through browser storage.
- Warning language avoids unsupported claims.

## What Makes CyberShield Different

CyberShield is not just a phishing page classifier. It is a browser-native security workflow:

```text
Detect suspicious signals
        -> explain evidence
        -> warn before risky action
        -> record incident
        -> review in SOC dashboard
```

That workflow makes the project more than a one-screen prototype. It demonstrates a complete security product loop: detection, explanation, protection, and review.

## Commands

Run extension tests:

```bash
cd extension
npm test
```

Build extension:

```bash
cd extension
npm run build
```

Run backend tests:

```bash
cd backend
python -m pytest
```

Run backend:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```


Suggested project description:

```text
CyberShield is a Chrome extension that detects suspicious and phishing-like web pages using local deterministic security signals. It analyzes URLs, page structure, login forms, cross-origin credential submissions, hidden iframes, and other risk indicators to generate a risk score, show evidence through "Show Me Why", trigger Protection Mode on high-risk pages, and record incidents in a Personal SOC dashboard. Password values are never read, stored, logged, or transmitted.
```

## Current Limitations

- The extension is currently intended for local hackathon demo installation through `extension/dist`.
- AI explanations require a separately running backend and optional API key.
- Detection is heuristic and explainable; it does not claim perfect phishing detection.

