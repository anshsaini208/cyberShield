import time
import uuid
from app.models.schemas import ThreatAnalysisInput, AIExplanationResponse

def generate_fallback_explanation(input_data: ThreatAnalysisInput) -> AIExplanationResponse:
    """
    Generates a local, deterministic rule-based security explanation when Gemini API is unavailable or disabled.
    Works 100% offline without network calls or API keys.
    """
    signals = input_data.signals
    signal_ids = [s.id for s in signals]
    
    score = input_data.riskScore.score
    severity = input_data.riskScore.severity
    threat_type = input_data.threatType

    # Formulate summary
    if score >= 75:
        summary = f"CyberShield detected severe security indicators on {input_data.domain} consistent with high-risk credential phishing."
    elif score >= 50:
        summary = f"CyberShield identified multiple elevated risk indicators on {input_data.domain} that warrant user caution."
    elif score >= 25:
        summary = f"CyberShield found suspicious structural elements on {input_data.domain}."
    else:
        summary = f"CyberShield evaluated {input_data.domain} and detected no significant high-risk security indicators."

    # Formulate what was detected
    detected_items = []
    has_cross_origin = False
    has_typosquatting = false_flag = False
    has_password = False

    for sig in signals:
        detected_items.append(f"• {sig.title}: {sig.description}")
        if "CROSS_ORIGIN" in sig.id:
            has_cross_origin = True
        if "TYPOSQUATTING" in sig.id:
            has_typosquatting = True
        if "PASSWORD" in sig.id:
            has_password = True

    what_detected = "\n".join(detected_items) if detected_items else "No specific threat indicators were flagged."

    # Formulate why it matters
    if has_cross_origin and has_password:
        why_it_matters = "A credential form on this page posts data to a different external origin. This is a critical indicator because submitted credentials may be transmitted to an unverified third party."
    elif has_typosquatting:
        why_it_matters = f"The domain '{input_data.domain}' closely resembles a well-known official brand. Deceptive domain names are frequently used in phishing campaigns to mislead users."
    else:
        why_it_matters = f"The combination of detected page heuristics resulting in a risk score of {score}/100 indicates potential security anomalies on {input_data.domain}."

    # Formulate potential impact
    if score >= 50:
        potential_impact = "Entering passwords or personal data on a deceptive or mismatched page could result in unauthorized account access or credential exposure."
    else:
        potential_impact = "No immediate high-severity threat detected, but standard browsing vigilance is recommended."

    # Formulate recommended actions
    actions = []
    if score >= 50:
        actions.append("Do not enter passwords, credit card numbers, or personal credentials on this page.")
        actions.append("Verify the address bar hostname to ensure it matches the expected official domain.")
        actions.append("Leave the webpage and navigate to the desired service via a trusted bookmark.")
    else:
        actions.append("Verify the URL in your browser address bar.")
        actions.append("Ensure connections use secure HTTPS protocol when submitting form data.")

    return AIExplanationResponse(
        id=f"fallback_exp_{int(time.time())}_{uuid.uuid4().hex[:6]}",
        summary=summary,
        whatDetected=what_detected,
        whyItMatters=why_it_matters,
        potentialImpact=potential_impact,
        recommendedActions=actions,
        confidenceNote="Local fallback analysis is generated deterministically from engine heuristic signals without AI synthesis.",
        evidenceReferences=signal_ids,
        isFallback=True
    )
