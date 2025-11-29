"""
JSON Schema for OpenAI Responses API structured output.
This schema ensures the model returns properly structured analysis results.
"""

# Schema for domain detection
DOMAIN_DETECTION_SCHEMA = {
    "name": "domain_detection",
    "schema": {
        "type": "object",
        "properties": {
            "domain": {
                "type": "string",
                "enum": ["real_estate", "rental", "employment", "finance", "insurance", "legal_agreement", "unsupported"],
                "description": "The detected domain of the document"
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Confidence score from 0 to 1"
            },
            "reasoning": {
                "type": "string",
                "description": "Brief explanation of why this domain was detected"
            }
        },
        "required": ["domain", "confidence", "reasoning"],
        "additionalProperties": False
    },
    "strict": True
}


# Schema for full document analysis
ANALYSIS_SCHEMA = {
    "name": "clarify_analysis",
    "schema": {
        "type": "object",
        "properties": {
            "smart_score": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "Overall document score from 0-100"
            },
            "score_breakdown": {
                "type": "object",
                "properties": {
                    "red_flag_score": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Score based on severity and count of red flags (100 = no issues)"
                    },
                    "completeness_score": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "How complete the document is for its type"
                    },
                    "clarity_score": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "How clear and readable the document is"
                    },
                    "fairness_score": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "How balanced the terms are between parties"
                    }
                },
                "required": ["red_flag_score", "completeness_score", "clarity_score", "fairness_score"],
                "additionalProperties": False
            },
            "executive_summary": {
                "type": "string",
                "description": "2-3 sentence plain language summary of the document and key findings"
            },
            "document_summary": {
                "type": "string",
                "description": "Detailed plain language explanation of what this document is and does"
            },
            "key_terms": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "term": {
                            "type": "string",
                            "description": "The term or concept"
                        },
                        "definition": {
                            "type": "string",
                            "description": "Plain language explanation"
                        },
                        "importance": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                            "description": "How important this term is to understand"
                        }
                    },
                    "required": ["term", "definition", "importance"],
                    "additionalProperties": False
                },
                "description": "Important terms and their explanations"
            },
            "main_obligations": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "List of main obligations for the user based on their intent"
            },
            "red_flags": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Unique identifier like rf_1, rf_2"
                        },
                        "title": {
                            "type": "string",
                            "description": "5-8 word title summarizing the issue"
                        },
                        "severity": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low", "info"],
                            "description": "Severity level of the issue"
                        },
                        "summary": {
                            "type": "string",
                            "description": "One sentence summary of the issue"
                        },
                        "explanation": {
                            "type": "string",
                            "description": "2-3 sentence plain language explanation of what this means"
                        },
                        "source_text": {
                            "type": "string",
                            "description": "The exact quote from the document that this flag refers to"
                        },
                        "page_number": {
                            "type": "integer",
                            "description": "Page number where this was found (0 if unknown)"
                        },
                        "recommendation": {
                            "type": "string",
                            "description": "What the user should do about this"
                        },
                        "questions_to_ask": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "3 specific questions to ask the other party about this issue"
                        },
                        "suggested_changes": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "3 specific modifications to request for this clause"
                        },
                        "professional_advice": {
                            "type": "string",
                            "description": "Specific advice about when and what type of professional to consult for this issue"
                        }
                    },
                    "required": ["id", "title", "severity", "summary", "explanation", "source_text", "page_number", "recommendation", "questions_to_ask", "suggested_changes", "professional_advice"],
                    "additionalProperties": False
                },
                "description": "Issues and concerns found in the document"
            },
            "scenarios": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Unique identifier like sc_1, sc_2"
                        },
                        "title": {
                            "type": "string",
                            "description": "Short title for the scenario"
                        },
                        "description": {
                            "type": "string",
                            "description": "What could happen in this scenario"
                        },
                        "likelihood": {
                            "type": "string",
                            "enum": ["likely", "possible", "unlikely"],
                            "description": "How likely this scenario is"
                        },
                        "impact": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                            "description": "Impact severity if this occurs"
                        }
                    },
                    "required": ["id", "title", "description", "likelihood", "impact"],
                    "additionalProperties": False
                },
                "description": "Potential scenarios and their implications"
            },
            "missing_clauses": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Standard clauses or protections that are missing from this document"
            },
            "positive_notes": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Good things about this document"
            },
            "follow_up_questions": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Questions the user should ask a lawyer or the other party"
            }
        },
        "required": [
            "smart_score",
            "score_breakdown",
            "executive_summary",
            "document_summary",
            "key_terms",
            "main_obligations",
            "red_flags",
            "scenarios",
            "missing_clauses",
            "positive_notes",
            "follow_up_questions"
        ],
        "additionalProperties": False
    },
    "strict": True
}
