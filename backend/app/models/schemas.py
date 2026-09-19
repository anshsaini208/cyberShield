from typing import List, Optional
from pydantic import BaseModel, Field

class SignalEvidenceInput(BaseModel):
    key: str
    value: str

class SignalInput(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    description: str
    evidence: List[SignalEvidenceInput] = Field(default_factory=list)
    confidence: float = 1.0

class RiskScoreInput(BaseModel):
    score: int
    severity: str

class ThreatAnalysisInput(BaseModel):
    url: str
    domain: str
    riskScore: RiskScoreInput
    threatType: str
    signals: List[SignalInput] = Field(default_factory=list)

class AIExplanationResponse(BaseModel):
    id: str
    summary: str = Field(description="1-2 sentence executive summary of the detected security evidence.")
    whatDetected: str = Field(description="Bullet points or short narrative of what indicators were found.")
    whyItMatters: str = Field(description="Contextual explanation of why these indicators represent a potential security risk.")
    potentialImpact: str = Field(description="Plain-English explanation of potential consequences if user proceeds.")
    recommendedActions: List[str] = Field(description="List of practical defensive recommended actions.")
    confidenceNote: str = Field(description="Clarification of heuristic signal confidence.")
    evidenceReferences: List[str] = Field(description="List of signal IDs referenced in this explanation. MUST only contain IDs from input signals.")
    isFallback: bool = False
