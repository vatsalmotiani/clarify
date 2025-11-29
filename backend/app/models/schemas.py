from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Upload schemas
class FileMetadata(BaseModel):
    name: str
    size: int
    page_count: Optional[int] = None


class UploadResponse(BaseModel):
    analysis_id: str
    status: str
    message: str
    file_count: int
    files: List[FileMetadata]


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


# Analysis schemas
class Scenario(BaseModel):
    title: str
    description: str


class RedFlag(BaseModel):
    id: str
    title: str
    severity: Severity
    summary: str
    exact_quote: str
    page_reference: str
    what_it_is: str
    why_it_matters: str
    consequences: List[str]
    scenarios: List[Scenario]
    suggested_actions: List[str]


class KeyTerm(BaseModel):
    term: str
    explanation: str


class ScoreComponents(BaseModel):
    completeness: int
    clarity: int
    fairness: int
    risk: int


class AnalysisResult(BaseModel):
    id: str
    status: str
    domain: str
    intent: str
    overall_score: int
    score_components: ScoreComponents
    document_summary: str
    key_terms: List[KeyTerm]
    main_obligations: List[str]
    red_flags: List[RedFlag]
    document_names: List[str]
    created_at: datetime


class AnalysisStatus(BaseModel):
    status: str
    current_step: str
    progress: int
    error: Optional[str] = None


# Intent schemas
class IntentOption(BaseModel):
    id: str
    label: str
    description: str


class DomainDetectionResult(BaseModel):
    domain: str
    domain_description: str
    domain_confidence: float  # Changed from 'confidence' to match frontend
    is_supported: bool
    intents: List[IntentOption]
    allowed_domains: Optional[List[str]] = None


class StartAnalysisRequest(BaseModel):
    language: str = "English"  # Language for LLM outputs


class IntentSelectionRequest(BaseModel):
    intent_id: str
    custom_intent: Optional[str] = None


class IntentSelectionResponse(BaseModel):
    success: bool
    next_step: str  # "questions" | "analysis"


# Chunk schemas
class ChunkSchema(BaseModel):
    text: str
    page_num: int
    chunk_index: int
    document_name: str
    content_type: str = "typed_text"
    confidence_score: Optional[float] = None
    embedding: Optional[List[float]] = None


class SearchResult(BaseModel):
    chunk: ChunkSchema
    similarity_score: float


# Auth schemas
class OTPRequest(BaseModel):
    email: str


class OTPVerify(BaseModel):
    email: str
    otp: str


class UserResponse(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    user: UserResponse
