// src/content/credentialGuard.ts
import { CredentialContext } from '../types/security';

/**
 * Detects credential entry context on the current page.
 * The function never reads the value of password inputs.
 * It returns a CredentialContext object when a password field is present,
 * otherwise null.
 */
export function detectCredentialContext(): CredentialContext | null {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  if (!passwordInputs.length) {
    return null;
  }

  // Find the closest form ancestor for any password input.
  const passwordInput = passwordInputs[0] as HTMLInputElement;
  const formEl = passwordInput.closest('form');
  const formDetected = !!formEl;

  const currentOrigin = window.location.origin;
  let formActionOrigin: string | null = null;
  let crossOriginAction = false;

  if (formEl) {
    const action = (formEl as HTMLFormElement).action;
    if (action) {
      try {
        const actionUrl = new URL(action, window.location.href);
        formActionOrigin = actionUrl.origin;
        crossOriginAction = actionUrl.origin !== currentOrigin;
      } catch (_) {
        // If URL parsing fails, treat as same origin.
        formActionOrigin = null;
        crossOriginAction = false;
      }
    }
  }

  const ctx: CredentialContext = {
    hasPasswordField: true,
    formDetected,
    currentOrigin,
    formActionOrigin,
    crossOriginAction,
  };

  return ctx;
}
