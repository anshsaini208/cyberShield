import { DOMSnapshotData, SecuritySignal, SignalCategory, SignalSeverity } from '../types/security';
import { createSecuritySignal } from './signalFactory';

/**
 * Extracts DOMSnapshotData from a browser Document object.
 * CRITICAL RULE: NEVER inspects or reads element.value on password fields!
 */
export function extractDOMSnapshot(doc: Document, currentUrl: string): DOMSnapshotData {
  let currentOrigin = '';
  try {
    currentOrigin = new URL(currentUrl).origin;
  } catch {
    currentOrigin = window.location.origin;
  }

  const passwordInputs = doc.querySelectorAll('input[type="password"]');
  const passwordCount = passwordInputs.length;
  const hasPasswordField = passwordCount > 0;

  const forms = doc.querySelectorAll('form');
  let hasLoginForm = false;
  const formActions: { actionUrl: string; isCrossOrigin: boolean; targetOrigin: string; formSelector?: string }[] = [];

  forms.forEach((form, idx) => {
    const hasPassInForm = form.querySelector('input[type="password"]') !== null;
    const hasTextOrEmailInForm = form.querySelector('input[type="email"], input[type="text"], input[type="user"]') !== null;
    if (hasPassInForm || hasTextOrEmailInForm) {
      hasLoginForm = true;
    }

    let rawAction = form.getAttribute('action') || '';
    if (!rawAction || rawAction === '#' || rawAction.startsWith('javascript:')) {
      rawAction = currentUrl;
    }

    let actionUrl = '';
    let targetOrigin = '';
    let isCrossOrigin = false;

    try {
      const resolved = new URL(rawAction, currentUrl);
      actionUrl = resolved.href;
      targetOrigin = resolved.origin;
      isCrossOrigin = targetOrigin !== currentOrigin && targetOrigin !== 'null' && resolved.protocol.startsWith('http');
    } catch {
      actionUrl = rawAction;
      targetOrigin = currentOrigin;
    }

    const formId = form.id ? `#${form.id}` : `form:nth-of-type(${idx + 1})`;

    formActions.push({
      actionUrl,
      isCrossOrigin,
      targetOrigin,
      formSelector: formId,
    });
  });

  const iframes = doc.querySelectorAll('iframe');
  let hiddenIframeCount = 0;
  iframes.forEach((iframe) => {
    const style = window.getComputedStyle ? window.getComputedStyle(iframe) : null;
    const isDisplayNone = style ? style.display === 'none' || style.visibility === 'hidden' : false;
    const width = iframe.getAttribute('width') || (style ? style.width : '');
    const height = iframe.getAttribute('height') || (style ? style.height : '');
    const isTiny = width === '0' || height === '0' || width === '1px' || height === '1px';
    if (isDisplayNone || isTiny) {
      hiddenIframeCount++;
    }
  });

  const scripts = doc.querySelectorAll('script[src]');
  let externalScriptCount = 0;
  scripts.forEach((script) => {
    const src = script.getAttribute('src');
    if (src) {
      try {
        const scriptOrigin = new URL(src, currentUrl).origin;
        if (scriptOrigin !== currentOrigin) {
          externalScriptCount++;
        }
      } catch {
        // Ignore invalid src URLs
      }
    }
  });

  const externalScriptRatio = scripts.length > 0 ? Number((externalScriptCount / scripts.length).toFixed(2)) : 0;
  const pageTitle = doc.title || '';

  return {
    hasPasswordField,
    passwordCount,
    hasLoginForm,
    formActions,
    hiddenIframeCount,
    totalIframeCount: iframes.length,
    externalScriptRatio,
    pageTitle,
    hasMetaRefresh: Boolean(doc.querySelector('meta[http-equiv="refresh"]')),
    visibleSecurityKeywords: [],
  };
}

/**
 * Evaluates Page/DOM Snapshot against security heuristic rules.
 */
export function analyzePageRules(snapshot: DOMSnapshotData, currentUrl: string): SecuritySignal[] {
  const signals: SecuritySignal[] = [];

  let currentOrigin = '';
  try {
    currentOrigin = new URL(currentUrl).origin;
  } catch {
    currentOrigin = currentUrl;
  }

  // Rule A: Password Field Detection
  if (snapshot.hasPasswordField) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_PAGE_PASSWORD_INPUT',
        category: SignalCategory.CREDENTIAL,
        severity: SignalSeverity.LOW,
        weight: 5,
        title: 'Credential input detected',
        description: `The page contains ${snapshot.passwordCount} password input field(s).`,
        evidence: [
          { key: 'passwordFieldCount', value: String(snapshot.passwordCount) },
          { key: 'pageUrl', value: currentUrl },
        ],
        confidence: 1.0,
        target: {
          type: 'INPUT',
          selector: 'input[type="password"]',
        },
      })
    );
  }

  // Rule B: Login Form Detection
  if (snapshot.hasLoginForm) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_PAGE_LOGIN_FORM',
        category: SignalCategory.CREDENTIAL,
        severity: SignalSeverity.LOW,
        weight: 8,
        title: 'Login/Credential submission form detected',
        description: 'The page contains a login form designed for credential entry.',
        evidence: [{ key: 'hasLoginForm', value: 'True' }],
        confidence: 0.9,
        target: {
          type: 'FORM',
          selector: 'form',
        },
      })
    );
  }

  // Rule C: Form Action Origin Mismatch (HIGH VALUE SIGNAL)
  const crossOriginActions = snapshot.formActions.filter((fa) => fa.isCrossOrigin);
  if (crossOriginActions.length > 0) {
    crossOriginActions.forEach((actionItem, index) => {
      signals.push(
        createSecuritySignal({
          id: `SIG_PAGE_CROSS_ORIGIN_FORM_${index}`,
          category: SignalCategory.CREDENTIAL,
          severity: SignalSeverity.CRITICAL,
          weight: 30,
          title: 'Credential form submits to another origin',
          description: `A form on this page posts data to a different destination origin ("${actionItem.targetOrigin}").`,
          evidence: [
            { key: 'currentOrigin', value: currentOrigin },
            { key: 'formActionOrigin', value: actionItem.targetOrigin },
            { key: 'actionUrl', value: actionItem.actionUrl },
          ],
          confidence: 0.95,
          target: {
            type: 'FORM',
            selector: actionItem.formSelector || 'form',
          },
        })
      );
    });
  }

  // Rule D: Hidden Iframes Detection
  if (snapshot.hiddenIframeCount > 0) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_PAGE_HIDDEN_IFRAME',
        category: SignalCategory.PAGE,
        severity: SignalSeverity.MEDIUM,
        weight: 15,
        title: 'Suspicious hidden iframe detected',
        description: `The page contains ${snapshot.hiddenIframeCount} hidden or zero-width iframe element(s).`,
        evidence: [
          { key: 'hiddenIframeCount', value: String(snapshot.hiddenIframeCount) },
          { key: 'totalIframes', value: String(snapshot.totalIframeCount) },
        ],
        confidence: 0.85,
        target: {
          type: 'IFRAME',
          selector: 'iframe',
        },
      })
    );
  }

  // Rule E: High External Script Ratio (> 70%)
  if (snapshot.externalScriptRatio > 0.70) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_PAGE_HIGH_EXTERNAL_SCRIPTS',
        category: SignalCategory.PAGE,
        severity: SignalSeverity.LOW,
        weight: 10,
        title: 'Unusually high ratio of external scripts',
        description: `Over 70% of loaded scripts originate from third-party domains (${Math.round(snapshot.externalScriptRatio * 100)}%).`,
        evidence: [
          { key: 'externalScriptRatio', value: `${Math.round(snapshot.externalScriptRatio * 100)}%` },
          { key: 'threshold', value: '70%' },
        ],
        confidence: 0.75,
        target: {
          type: 'PAGE',
        },
      })
    );
  }

  // Rule F: Meta Refresh Redirect Detection
  if (snapshot.hasMetaRefresh) {
    signals.push(
      createSecuritySignal({
        id: 'SIG_REDIRECT_META_REFRESH',
        category: SignalCategory.REDIRECT,
        severity: SignalSeverity.MEDIUM,
        weight: 12,
        title: 'Client-side automatic redirect detected',
        description: 'The page contains a meta refresh header causing an immediate browser redirect.',
        evidence: [{ key: 'hasMetaRefresh', value: 'True' }],
        confidence: 0.85,
        target: {
          type: 'PAGE',
        },
      })
    );
  }

  return signals;
}
