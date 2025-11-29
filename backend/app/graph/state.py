from typing import TypedDict, List, Dict, Optional, Any


class AnalysisState(TypedDict):
    # Input
    analysis_id: str
    language: str  # User's selected language for LLM outputs (e.g., "English", "Hindi", "Marathi")

    # OpenAI File IDs - uploaded files for reuse across prompts
    openai_file_ids: List[str]  # File IDs returned from OpenAI Files API
    files_metadata: List[Dict]  # {name, size, openai_file_id}

    # Domain & Intent
    domain: str
    domain_confidence: float
    intent_options: List[Dict]
    selected_intent: str
    custom_intent: Optional[str]

    # Questions (optional)
    needs_questions: bool
    questions: List[str]
    user_answers: List[str]

    # Analysis Results (from Responses API)
    smart_score: int  # Renamed from overall_score
    score_breakdown: Dict  # {red_flag_score, completeness_score, clarity_score, fairness_score}
    executive_summary: str
    document_summary: str
    key_terms: List[Dict]  # {term, definition, importance}
    main_obligations: List[str]
    red_flags: List[Dict]  # {id, title, severity, summary, explanation, source_text, page_number, recommendation}
    scenarios: List[Dict]  # {id, title, description, likelihood, impact}
    missing_clauses: List[str]
    positive_notes: List[str]
    follow_up_questions: List[str]

    # Metadata
    document_names: List[str]
    current_step: str
    errors: List[str]
