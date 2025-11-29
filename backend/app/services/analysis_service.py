"""
Analysis Service - Uses OpenAI Responses API with file references.
Files are uploaded once and referenced by ID for both domain detection and analysis.
"""

import json
import time
from typing import List, Dict, Any, Optional

from openai import OpenAI
from app.config import settings
from app.prompts.domain_prompts import DOMAIN_TAXONOMY
from app.prompts.analysis_schema import DOMAIN_DETECTION_SCHEMA, ANALYSIS_SCHEMA
from app.core.logging import get_logger

logger = get_logger("clarify.analysis_service")

# Models for different stages
# gpt-4.1-mini: Fast & cheap for domain detection (lower token usage)
# o4-mini: Powerful reasoning model for full analysis (handles large docs)
DOMAIN_DETECTION_MODEL = "gpt-4.1-mini"
ANALYSIS_MODEL = "o4-mini"


class AnalysisService:
    """
    Service for document analysis using OpenAI Responses API.
    Uses file IDs to reference uploaded documents instead of sending raw text.
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        if not self.client:
            logger.warning("OpenAI client not configured")

    async def detect_domain_with_files(self, file_ids: List[str]) -> Dict[str, Any]:
        """
        Detect document domain using Responses API with file references.

        Args:
            file_ids: List of OpenAI file IDs for the uploaded documents

        Returns:
            Dict with domain, confidence, and reasoning
        """
        logger.info(f"Detecting document domain using {len(file_ids)} file(s)...")
        start_time = time.time()

        if not self.client:
            logger.error("OpenAI client not configured")
            return {"domain": "unsupported", "confidence": 0.0, "reasoning": "API not configured"}

        if not file_ids:
            logger.error("No file IDs provided")
            return {"domain": "unsupported", "confidence": 0.0, "reasoning": "No files provided"}

        try:
            # Build input content with text prompt and file references
            user_content = [
                {
                    "type": "input_text",
                    "text": """Analyze the uploaded document(s) and determine the domain.

ALLOWED DOMAINS:
- real_estate: Property purchases, deeds, titles, mortgages
- rental: Lease agreements, rental contracts, tenant/landlord documents
- employment: Job contracts, offer letters, employment agreements
- finance: Loans, credit agreements, financial contracts
- insurance: Insurance policies, coverage documents
- legal_agreement: NDAs, service contracts, general legal agreements

If the document does NOT fit any of these domains, respond with "unsupported".

Analyze the document content and provide your assessment."""
                }
            ]

            # Add file references
            for file_id in file_ids:
                user_content.append({
                    "type": "input_file",
                    "file_id": file_id
                })

            # Call Responses API with structured output (using fast model for domain detection)
            logger.info(f"Using model: {DOMAIN_DETECTION_MODEL} for domain detection")
            response = self.client.responses.create(
                model=DOMAIN_DETECTION_MODEL,
                instructions="You are a document classification expert. Analyze the document and determine its domain type.",
                input=[{
                    "role": "user",
                    "content": user_content
                }],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": DOMAIN_DETECTION_SCHEMA["name"],
                        "schema": DOMAIN_DETECTION_SCHEMA["schema"],
                        "strict": True
                    }
                }
            )

            # Extract JSON from response
            result = self._extract_json_payload(response)

            if not result:
                logger.error("Failed to parse domain detection response")
                return {"domain": "unsupported", "confidence": 0.0, "reasoning": "Failed to parse response"}

            elapsed = time.time() - start_time
            logger.info(f"Domain detected: {result.get('domain', 'unknown')} "
                       f"(confidence: {result.get('confidence', 0):.2f}) in {elapsed:.2f}s")

            return result

        except Exception as e:
            logger.exception(f"Domain detection failed: {e}")
            return {"domain": "unsupported", "confidence": 0.0, "reasoning": str(e)}

    async def analyze_document_with_files(
        self,
        file_ids: List[str],
        domain: str,
        intent: str,
        user_notes: Optional[str] = None,
        language: str = "English"
    ) -> Dict[str, Any]:
        """
        Perform full document analysis using Responses API with file references.

        Args:
            file_ids: List of OpenAI file IDs for the uploaded documents
            domain: Detected document domain
            intent: User's selected intent (e.g., "tenant", "buyer")
            user_notes: Optional additional context from user
            language: Language for all output text (e.g., "English", "Hindi", "Marathi")

        Returns:
            Full analysis result matching the ANALYSIS_SCHEMA
        """
        logger.info(f"Starting document analysis - domain: {domain}, intent: {intent}, language: {language}")
        start_time = time.time()

        if not self.client:
            logger.error("OpenAI client not configured")
            return self._empty_analysis("API not configured")

        if not file_ids:
            logger.error("No file IDs provided")
            return self._empty_analysis("No files provided")

        try:
            # Get intent description
            intent_description = self._get_intent_description(domain, intent)

            # Build system prompt with language instruction
            language_instruction = ""
            if language != "English":
                language_instruction = f"""
IMPORTANT - OUTPUT LANGUAGE:
You MUST write ALL your analysis output in {language}.
This includes: executive summary, document summary, key term definitions,
red flag titles/summaries/explanations/recommendations, scenario descriptions,
and all other text content. The JSON keys remain in English, but all values
containing human-readable text must be written in {language}.
"""

            system_prompt = f"""You are Clarify, an AI document analyst specialized in {domain} documents.

Your role is to help a layperson understand this document given their intent: "{intent}"
{intent_description}
{language_instruction}
ANALYSIS REQUIREMENTS:
1. Provide a Smart Score (0-100) based on:
   - Red flag severity and count
   - Document completeness for its type
   - Clarity and readability
   - Fairness of terms

2. Identify red flags with:
   - Severity labels (critical/high/medium/low/info)
   - Exact quotes from the document
   - Plain language explanations
   - Actionable recommendations
   - 3 UNIQUE questions to ask the other party (specific to THIS red flag)
   - 3 UNIQUE suggested modifications (specific to THIS clause)
   - Professional advice tailored to THIS specific issue

3. Gap analysis:
   - Missing clauses that should be present
   - Incomplete sections

4. Scenario planning:
   - What could go wrong
   - Likelihood and impact

5. Follow-up questions for a lawyer or the other party

RED FLAG SEVERITY GUIDELINES:
- CRITICAL: At least ONE red flag should be marked "critical" - identify the MOST concerning clause in the document that could cause the user significant harm. Every document has something that deserves critical attention.
- HIGH: Issues that could cause financial loss or legal problems
- MEDIUM: Unfavorable but common terms
- LOW: Minor concerns worth noting
- INFO: Informational notes

CRITICAL RULES FOR ACTION ITEMS:
- questions_to_ask: Must be 3 UNIQUE questions specific to this exact red flag. Do NOT repeat generic questions across red flags.
- suggested_changes: Must be 3 UNIQUE modification suggestions specific to this exact clause. Each red flag needs distinct suggestions.
- professional_advice: Must specify the TYPE of professional (e.g., "employment lawyer", "real estate attorney") and WHY they're needed for THIS specific issue.

CRITICAL RULES - ZERO HALLUCINATION:
- ONLY cite issues that ACTUALLY EXIST in the document
- For EVERY claim, provide the EXACT QUOTE from the document
- If something is missing, say "this document does not include X"
- If uncertain, say "this appears to..." or "it is unclear whether..."
- Do NOT manufacture red flags to seem thorough
- A clean document with few/no issues is a VALID outcome

Use 8th-grade reading level. Avoid legal jargon - explain everything simply."""

            # Build user query
            output_language_note = f" Provide all output in {language}." if language != "English" else ""
            user_query = f"""Domain: {domain}
Intent: {intent}
User Context: {user_notes or "Not provided"}

Please analyze the uploaded document(s) and provide:
1. Smart Score (0-100) with breakdown
2. Executive summary (2-3 sentences)
3. Detailed document summary
4. Key terms explained in plain language
5. Main obligations for the user
6. Red flags with severity, quotes, and recommendations
7. Scenarios and their implications
8. Missing clauses
9. Positive notes about the document
10. Follow-up questions to ask{output_language_note}"""

            # Build input content
            user_content = [
                {
                    "type": "input_text",
                    "text": user_query
                }
            ]

            # Add file references
            for file_id in file_ids:
                user_content.append({
                    "type": "input_file",
                    "file_id": file_id
                })

            # Call Responses API with structured output (using powerful model for full analysis)
            logger.info(f"Using model: {ANALYSIS_MODEL} for full document analysis")
            response = self.client.responses.create(
                model=ANALYSIS_MODEL,
                instructions=system_prompt,
                input=[{
                    "role": "user",
                    "content": user_content
                }],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": ANALYSIS_SCHEMA["name"],
                        "schema": ANALYSIS_SCHEMA["schema"],
                        "strict": True
                    }
                }
            )

            # Extract JSON from response
            result = self._extract_json_payload(response)

            if not result:
                logger.error("Failed to parse analysis response")
                return self._empty_analysis("Failed to parse response")

            elapsed = time.time() - start_time
            logger.info(f"Analysis complete in {elapsed:.2f}s")
            logger.info(f"  - Score: {result.get('smart_score', 0)}/100")
            logger.info(f"  - Red flags: {len(result.get('red_flags', []))}")
            logger.info(f"  - Scenarios: {len(result.get('scenarios', []))}")
            logger.info(f"  - Key terms: {len(result.get('key_terms', []))}")

            return result

        except Exception as e:
            logger.exception(f"Analysis failed: {e}")
            return self._empty_analysis(str(e))

    def _extract_json_payload(self, response: Any) -> Optional[Dict]:
        """Extract JSON payload from Responses API response."""
        if not response or not hasattr(response, 'output'):
            logger.warning("Response has no 'output' attribute")
            return None

        if response.output is None:
            logger.warning("Response output is None")
            return None

        for item in response.output:
            if not hasattr(item, 'content'):
                continue

            # Handle case where content is None
            if item.content is None:
                continue

            for block in item.content:
                # Check for output_text type (Responses API returns text with JSON)
                if hasattr(block, 'type') and block.type == "output_text":
                    if hasattr(block, 'text') and block.text:
                        try:
                            return json.loads(block.text)
                        except json.JSONDecodeError:
                            # Try to find JSON in the text
                            text = block.text.strip()
                            if text.startswith('{'):
                                try:
                                    return json.loads(text)
                                except Exception as e:
                                    logger.warning(f"Failed to parse JSON: {e}")

        logger.warning("No valid JSON payload found in response")
        return None

    def _get_intent_description(self, domain: str, intent: str) -> str:
        """Get description for the selected intent."""
        domain_info = DOMAIN_TAXONOMY.get(domain, {})
        intents = domain_info.get("intents", [])

        for intent_info in intents:
            if intent_info["id"] == intent:
                return f"({intent_info['description']})"

        return ""

    def _empty_analysis(self, error_reason: str = "") -> Dict[str, Any]:
        """Return empty analysis result for failed processing."""
        return {
            "smart_score": 0,
            "score_breakdown": {
                "red_flag_score": 0,
                "completeness_score": 0,
                "clarity_score": 0,
                "fairness_score": 0
            },
            "executive_summary": f"Analysis could not be completed. {error_reason}",
            "document_summary": "",
            "key_terms": [],
            "main_obligations": [],
            "red_flags": [],
            "scenarios": [],
            "missing_clauses": [],
            "positive_notes": [],
            "follow_up_questions": []
        }
