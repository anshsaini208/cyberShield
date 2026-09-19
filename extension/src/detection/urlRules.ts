import { SecuritySignal, SignalCategory, SignalSeverity } from '../types/security';
import { createSecuritySignal } from './signalFactory';

export const SECURITY_KEYWORDS = [
  'login',
  'signin',
  'verify',
  'verification',
  'secure',
  'account',
  'password',
  'update',
  'wallet',
  'payment',
  'confirm',
  'recover',
  'banking',
  'credential',
];

const IP_HOST_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^\[[0-9a-fA-F:]+\]$/;

/**
 * Evaluates URL string against security heuristic rules.
 */
export function analyzeUrlRules(urlStr: string): SecuritySignal[] {
  const signals: SecuritySignal[] = [];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    // Invalid URL structure signal
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_INVALID_FORMAT',
        category: SignalCategory.URL,
        severity: SignalSeverity.MEDIUM,
        weight: 15,
        title: 'Malformed or unparseable URL',
        description: 'The target web address does not adhere to standard URL formatting specifications.',
        evidence: [{ key: 'rawUrl', value: urlStr }],
        confidence: 0.9,
      })
    );
    return signals;
  }

  const hostname = parsedUrl.hostname;
  const protocol = parsedUrl.protocol;
  const fullPath = parsedUrl.pathname + parsedUrl.search;

  // Rule A: IP Address Hostname
  if (IP_HOST_REGEX.test(hostname)) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_IP_HOST',
        category: SignalCategory.URL,
        severity: SignalSeverity.HIGH,
        weight: 20,
        title: 'IP address used as hostname',
        description: 'The website uses a raw IP address instead of a registered domain name.',
        evidence: [
          { key: 'hostname', value: hostname },
          { key: 'protocol', value: protocol },
        ],
        confidence: 0.95,
      })
    );
  }

  // Rule B: Unencrypted HTTP Connection
  if (protocol === 'http:') {
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_UNENCRYPTED_HTTP',
        category: SignalCategory.URL,
        severity: SignalSeverity.LOW,
        weight: 8,
        title: 'Unencrypted HTTP connection',
        description: 'The website uses unencrypted HTTP instead of HTTPS. Data transmitted is not encrypted.',
        evidence: [
          { key: 'protocol', value: protocol },
          { key: 'hostname', value: hostname },
        ],
        confidence: 1.0,
      })
    );
  }

  // Rule C: Excessive URL Length (> 75 chars)
  if (urlStr.length > 75) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_EXCESSIVE_LENGTH',
        category: SignalCategory.URL,
        severity: SignalSeverity.LOW,
        weight: 8,
        title: 'Unusually long URL structure',
        description: `The URL length (${urlStr.length} characters) exceeds normal limits (> 75 chars).`,
        evidence: [
          { key: 'urlLength', value: String(urlStr.length) },
          { key: 'threshold', value: '75' },
        ],
        confidence: 0.8,
      })
    );
  }

  // Rule D: Suspicious URL Characters (@, excessive percent encoding, double slashes in path)
  const percentEncodingCount = (fullPath.match(/%[0-9a-fA-F]{2}/g) || []).length;
  const containsUserInfo = urlStr.includes('@');
  const doubleSlashInPath = parsedUrl.pathname.includes('//');

  if (percentEncodingCount > 3 || containsUserInfo || doubleSlashInPath) {
    const evidenceItems = [];
    if (containsUserInfo) evidenceItems.push({ key: 'userInfoDetected', value: 'Includes "@" symbol in URL' });
    if (percentEncodingCount > 3) evidenceItems.push({ key: 'percentEncodings', value: String(percentEncodingCount) });
    if (doubleSlashInPath) evidenceItems.push({ key: 'doubleSlashInPath', value: 'True' });

    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_SUSPICIOUS_CHARS',
        category: SignalCategory.URL,
        severity: SignalSeverity.MEDIUM,
        weight: 10,
        title: 'Suspicious URL encoding or characters',
        description: 'The URL contains suspicious character patterns, user credentials (@), or excessive percent encoding.',
        evidence: evidenceItems,
        confidence: 0.85,
      })
    );
  }

  // Rule E: Suspicious Query Parameters (> 50 chars or multi-nested tokens)
  if (parsedUrl.search.length > 50) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_SUSPICIOUS_QUERY',
        category: SignalCategory.URL,
        severity: SignalSeverity.LOW,
        weight: 8,
        title: 'Complex or suspicious query parameters',
        description: `The URL query string contains a large volume of parameters (${parsedUrl.search.length} chars).`,
        evidence: [{ key: 'queryLength', value: String(parsedUrl.search.length) }],
        confidence: 0.7,
      })
    );
  }

  // Rule F: Suspicious Security Keywords in URL
  const lowerUrl = urlStr.toLowerCase();
  const matchedKeywords = SECURITY_KEYWORDS.filter((kw) => lowerUrl.includes(kw));
  if (matchedKeywords.length > 0) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_URL_SECURITY_KEYWORD',
        category: SignalCategory.URL,
        severity: SignalSeverity.LOW,
        weight: 8,
        title: 'Security-sensitive keyword detected in URL',
        description: `The URL path or query string contains security-related terms: ${matchedKeywords.join(', ')}.`,
        evidence: [
          { key: 'matchedKeywords', value: matchedKeywords.join(', ') },
          { key: 'count', value: String(matchedKeywords.length) },
        ],
        confidence: 0.75,
      })
    );
  }

  return signals;
}
