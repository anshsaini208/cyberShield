from fastapi import APIRouter
from app.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "CyberShield AI Security Analyst",
        "model": settings.GEMINI_MODEL,
        "hasApiKey": bool(settings.GEMINI_API_KEY),
    }
