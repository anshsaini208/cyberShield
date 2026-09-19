from fastapi import APIRouter, HTTPException
from app.models.schemas import ThreatAnalysisInput, AIExplanationResponse
from app.services.gemini import generate_ai_explanation

router = APIRouter()

@router.post("/explain", response_model=AIExplanationResponse)
def explain_threat_analysis(payload: ThreatAnalysisInput):
    """
    POST /api/v1/explain
    Synthesizes a structured AI Security Explanation from deterministic ThreatAnalysis evidence.
    """
    try:
        explanation = generate_ai_explanation(payload)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")
