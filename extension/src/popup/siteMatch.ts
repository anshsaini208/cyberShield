export function normalizeHostname(value: string): string {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

export function matchesCurrentSite(analysisDomain: string | undefined, currentDomain: string | undefined): boolean {
  if (!analysisDomain || !currentDomain) return false;

  const normalizedAnalysis = normalizeHostname(analysisDomain);
  const normalizedCurrent = normalizeHostname(currentDomain);

  if (!normalizedAnalysis || !normalizedCurrent) return false;

  const analysisParts = normalizedAnalysis.split('.');
  const currentParts = normalizedCurrent.split('.');

  if (normalizedAnalysis === normalizedCurrent) return true;

  if (analysisParts.length >= 2 && currentParts.length >= 2) {
    const analysisRoot = analysisParts.slice(-2).join('.');
    const currentRoot = currentParts.slice(-2).join('.');
    if (analysisRoot === currentRoot) return true;
  }

  return false;
}
