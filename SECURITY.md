# CyberShield — Security & Privacy Architecture (SECURITY.md)

> **Core Commitment:** CyberShield provides privacy-preserving, transparent browser security analysis without exposing user credentials or sensitive browsing content.

---

## 1. Threat Model

### 1.1 Protected Assets
- **User Credentials:** Passwords, usernames, OTP tokens, authentication cookies.
- **User Privacy:** Browsing history, DOM contents, PII, form entries.
- **System Integrity:** Extension background script execution context, local storage contents (`chrome.storage.local`).
- **AI Service Access:** Gemini API Key hosted on the backend proxy server.

### 1.2 Threat Actors & Attack Vectors

| Threat Actor | Attack Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Phishing Site Operator** | Typosquatting domain, deceptive login UI, cross-origin form POST | Local Levenshtein domain scanner, Form Action origin check, Interstitial Modal block |
| **Credential Harvester** | Hidden / invisible password fields, fake OAuth popups | DOM scanner detecting hidden input fields, Credential Guard focus hook |
| **Malicious Web Script** | Attempting to inspect Extension DOM or tamper with overlays | Injection via isolated **Shadow DOM (Closed)**, strict content script isolation |
| **Man-In-The-Middle (MITM)** | Intercepting API traffic between Extension and Backend | HTTPS mandatory for backend API, TLS 1.3 certificate validation |
| **Prompt Injection / Malicious Page Content** | Injecting adversarial prompt text into page elements to manipulate AI | AI input is strictly sanitized structured JSON signals; raw DOM text is NEVER sent to AI |

---

## 2. Privacy Principles

1. **Local First Signal Extraction:** Security signal extraction runs 100% locally inside the browser.
2. **Data Minimization:** Only high-level structural metadata (e.g. domain name, TLD, form action origin, boolean element flags) is processed. Page body text, emails, and form inputs are strictly excluded.
3. **Zero Plaintext Password Exposure:** Passwords never enter the analysis pipeline.
4. **No Unsanitized Cloud Transmission:** No raw web page content or URL query parameters with authorization tokens are transmitted to the backend.

---

## 3. Strict Credential Handling Rules

The following 8 rules are enforced across all codebase modules:

1. **NEVER read plaintext password values:** `element.value` on `input[type="password"]` must never be accessed or evaluated by any extension script.
2. **NEVER transmit plaintext passwords:** Password content must never enter any network payload (`fetch`, `XMLHttpRequest`, WebSocket).
3. **NEVER log plaintext passwords:** `console.log`, error tracebacks, and local storage writes must never include password input contents.
4. **NEVER store plaintext passwords:** `chrome.storage.local` schema explicitly excludes credential values.
5. **NEVER send plaintext passwords to the AI:** The AI request payload schema contains zero credential fields.
6. **Sanitize DOM text inputs:** Any form metadata passed to the detection engine extracts ONLY non-sensitive attributes (`type`, `name`, `autocomplete`, `action`).
7. **Monitor form target origin ONLY:** Form action security checks compare hostnames (`location.origin` vs `form.action.origin`) without reading field contents.
8. **Safe local mock breach checking:** Breach checking uses offline k-Anonymity SHA-256 hash prefix lookups against a static local mock dataset.

---

## 4. API Key Protection Strategy

- **Zero API Key Leakage:** The Gemini API Key (`GEMINI_API_KEY`) is stored exclusively in the FastAPI backend `.env` file on the server.
- **Client-Side Absence:** No API key variable, environment fallback, or obfuscated string exists in the Chrome Extension bundle.
- **Origin Restriction & CORS:** The FastAPI backend implements CORS middleware enforcing requests originate only from the extension's specific extension ID (`chrome-extension://<EXTENSION_ID>`).
- **Rate Limiting:** Backend endpoints apply IP and extension-based rate limits to mitigate API key abuse.

---

## 5. AI Safety & Grounding Rules

Generative AI presents hallucination and security risks if unconstrained. CyberShield mitigates AI risks via strict structural grounding:

1. **Grounding Constraint:** The AI model is strictly defined as a *translation layer* for structured engine outputs.
2. **No Independent Evidence Generation:** The AI system prompt explicitly forbids inventing threat indicators, malware claims, or CVEs not present in the input `SecuritySignal` list.
3. **Structured Schema Enforcement:** The FastAPI backend uses Pydantic response validation to guarantee Gemini returns exact JSON matching `AIExplanation`.
4. **Deterministic Client Fallback:** If the AI backend is unreachable, rate-limited, or emits malformed output, the extension falls back to a deterministic, local template generator.
5. **Strict Terminology Standard:** AI explanations use accurate, non-alarmist terminology:
   - *Use:* "potentially suspicious", "risk indicator", "consistent with phishing behavior"
   - *Avoid:* "guaranteed malware", "proven scam", "100% malicious site"

---

## 6. Extension Permission Minimization Strategy

CyberShield implements the principle of least privilege:

```json
{
  "manifest_version": 3,
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

### Permission Security Assessment

- **`storage`**: Minimal storage permission needed for local incident retention in `chrome.storage.local`. No access to cookies or sync data.
- **`activeTab`**: Temporarily elevates privileges ONLY when the user actively interacts with the extension popup, preventing passive background monitoring of user browsing.
- **`scripting`**: Allows content script injection into active tabs without requiring persistent background DOM access across all tabs.
- **Omitted High-Risk Permissions**:
  - `webRequest` / `webRequestBlocking`: NOT requested.
  - `cookies`: NOT requested.
  - `management` / `privacy`: NOT requested.
  - `tabs` (full browsing history): NOT requested (`activeTab` used instead).

---

## 7. Known Security Limitations & Hackathon MVP Constraints

1. **Heuristic Scope:** Detection relies on deterministic structural indicators (typosquatting, IP hosts, form action mismatch). It does not perform deep binary malware analysis or SSL certificate chain validation.
2. **Client-Side Evasion:** Sophisticated attackers using complex JavaScript obfuscation or dynamic DOM generation post-page-load may evade initial DOM scan heuristics.
3. **No Safety Guarantees:** CyberShield is an advisory security companion. It explicitly alerts users that heuristic analysis does not guarantee 100% protection against zero-day threats.
4. **Local Storage Limits:** `chrome.storage.local` is unencrypted on the host OS user profile. Incidents are stored locally and are subject to standard Chrome user data access boundaries.
