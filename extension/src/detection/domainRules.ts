import { SecuritySignal, SignalCategory, SignalSeverity } from '../types/security';
import { createSecuritySignal } from './signalFactory';

export const TARGET_BRANDS = [
  'google',
  'microsoft',
  'paypal',
  'apple',
  'amazon',
  'facebook',
  'instagram',
  'github',
  'linkedin',
  'netflix',
  'bankofamerica',
  'chase',
  'wellsfargo',
];

export const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  google: ['google.com', 'google.co.uk', 'google.ca', 'youtube.com', 'gmail.com'],
  microsoft: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'azure.com'],
  paypal: ['paypal.com', 'paypal.me'],
  apple: ['apple.com', 'icloud.com'],
  amazon: ['amazon.com', 'amazon.co.uk', 'aws.amazon.com'],
  facebook: ['facebook.com', 'meta.com'],
  instagram: ['instagram.com'],
  github: ['github.com', 'github.io'],
  linkedin: ['linkedin.com'],
};

/**
 * Calculates Shannon entropy of a string (measures randomness).
 */
export function calculateEntropy(input: string): number {
  if (!input || input.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of input) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = input.length;
  for (const count of Object.values(frequencies)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

/**
 * Calculates Levenshtein edit distance between strings a and b.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bLen][aLen];
}

/**
 * Evaluates Domain/Hostname against security rules.
 */
export function analyzeDomainRules(domainStr: string, pageTitle?: string): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  const cleanHost = domainStr.toLowerCase().trim();

  if (!cleanHost) return signals;

  // Rule A: Punycode Detection (xn--)
  if (cleanHost.includes('xn--')) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_DOMAIN_PUNYCODE',
        category: SignalCategory.DOMAIN,
        severity: SignalSeverity.MEDIUM,
        weight: 15,
        title: 'Internationalized domain (Punycode)',
        description: 'The domain uses Punycode encoding (xn--), which can be used for visually deceptive look-alike domains.',
        evidence: [{ key: 'hostname', value: cleanHost }],
        confidence: 0.9,
      })
    );
  }

  // Rule B: Domain Complexity (subdomain depth, length, hyphens)
  const parts = cleanHost.split('.');
  const subdomainDepth = parts.length > 2 ? parts.length - 2 : 0;
  const hyphenCount = (cleanHost.match(/-/g) || []).length;

  if (subdomainDepth >= 3 || hyphenCount >= 3 || cleanHost.length > 35) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_DOMAIN_HIGH_COMPLEXITY',
        category: SignalCategory.DOMAIN,
        severity: SignalSeverity.LOW,
        weight: 10,
        title: 'High domain complexity indicator',
        description: `The domain structure shows high complexity (${subdomainDepth} subdomains, ${hyphenCount} hyphens, length ${cleanHost.length}).`,
        evidence: [
          { key: 'subdomainDepth', value: String(subdomainDepth) },
          { key: 'hyphenCount', value: String(hyphenCount) },
          { key: 'length', value: String(cleanHost.length) },
        ],
        confidence: 0.75,
      })
    );
  }

  // Rule C: Shannon Entropy Calculation
  const mainDomainPart = parts.length >= 2 ? parts[parts.length - 2] : cleanHost;
  const entropy = calculateEntropy(mainDomainPart);

  if (entropy > 3.8 && mainDomainPart.length >= 7) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_DOMAIN_HIGH_ENTROPY',
        category: SignalCategory.DOMAIN,
        severity: SignalSeverity.LOW,
        weight: 10,
        title: 'Anomalous domain name randomness (high entropy)',
        description: `The domain name exhibits elevated character entropy (${entropy}), typical of generated or random domain names.`,
        evidence: [
          { key: 'domainPart', value: mainDomainPart },
          { key: 'entropyScore', value: String(entropy) },
          { key: 'threshold', value: '3.8' },
        ],
        confidence: 0.7,
      })
    );
  }

  // Rule D: Typosquatting & Brand Look-Alike Detection
  let isOfficialBrand = false;
  for (const officialDomains of Object.values(OFFICIAL_BRAND_DOMAINS)) {
    if (officialDomains.some((d) => cleanHost === d || cleanHost.endsWith('.' + d))) {
      isOfficialBrand = true;
      break;
    }
  }

  if (!isOfficialBrand) {
    const subTokens = mainDomainPart.split('-').filter(Boolean);
    const candidateTokens = [mainDomainPart, ...subTokens];

    for (const brand of TARGET_BRANDS) {
      let foundMatch = false;
      let matchDistance = 99;

      for (const token of candidateTokens) {
        const dist = levenshteinDistance(token, brand);
        if (dist >= 1 && dist <= 2 && Math.abs(token.length - brand.length) <= 2) {
          foundMatch = true;
          matchDistance = dist;
          break;
        }
      }

      const isSubstringMatch = cleanHost.includes(brand) && !cleanHost.endsWith('.' + brand + '.com');

      if (foundMatch || isSubstringMatch) {
        signals.push(
          createSecuritySignal({
            id: 'SIG_DOMAIN_TYPOSQUATTING',
            category: SignalCategory.DOMAIN,
            severity: SignalSeverity.HIGH,
            weight: 25,
            title: 'Potential brand look-alike or typosquatting domain',
            description: `The domain "${cleanHost}" resembles the official brand "${brand}".`,
            evidence: [
              { key: 'targetBrand', value: brand },
              { key: 'detectedHost', value: cleanHost },
              { key: 'levenshteinDistance', value: String(matchDistance < 99 ? matchDistance : 0) },
              { key: 'matchType', value: foundMatch ? 'Character Similarity' : 'Brand Token Embedding' },
            ],
            confidence: 0.85,
          })
        );
        break;
      }
    }
  }

  // Rule E: Brand Title Mismatch
  if (pageTitle && !isOfficialBrand) {
    const lowerTitle = pageTitle.toLowerCase();
    for (const brand of TARGET_BRANDS) {
      if (lowerTitle.includes(brand) && !cleanHost.includes(brand)) {
        signals.push(
          createSecuritySignal({
            id: 'SIG_DOMAIN_BRAND_TITLE_MISMATCH',
            category: SignalCategory.DOMAIN,
            severity: SignalSeverity.HIGH,
            weight: 20,
            title: 'Page title brand mismatch',
            description: `The page title references brand "${brand}", but the current website domain ("${cleanHost}") is not an official domain for that brand.`,
            evidence: [
              { key: 'pageTitle', value: pageTitle },
              { key: 'referencedBrand', value: brand },
              { key: 'actualHost', value: cleanHost },
            ],
            confidence: 0.8,
          })
        );
        break;
      }
    }
  }

  return signals;
}
