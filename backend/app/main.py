from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, explain

app = FastAPI(
    title="CyberShield AI Backend",
    description="AI Security Analyst explanation backend proxy for CyberShield Chrome Extension",
    version="0.5.0",
)

# Configure CORS Middleware
origins = [settings.EXTENSION_ORIGIN] if settings.EXTENSION_ORIGIN != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits Chrome Extension requests
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(explain.router, prefix="/api/v1", tags=["AI Analyst"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
