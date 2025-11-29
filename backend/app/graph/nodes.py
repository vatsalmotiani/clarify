"""
Graph nodes for the analysis workflow.
Uses OpenAI Files API + Responses API for document processing.
"""

from typing import Dict, Any
from pathlib import Path
from app.graph.state import AnalysisState
from app.config import settings
from app.core.logging import get_logger

logger = get_logger("clarify.graph.nodes")


async def file_upload_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Upload PDF files to OpenAI and get file IDs for reuse.
    This replaces the old ingestion + vectorization nodes.
    """
    from app.services.openai_file_service import OpenAIFileService

    file_service = OpenAIFileService()
    analysis_id = state["analysis_id"]

    # Get file paths from temp storage
    temp_dir = Path(settings.TEMP_DIR) / analysis_id
    file_paths = list(temp_dir.glob("*.pdf"))

    if not file_paths:
        logger.error(f"No PDF files found in {temp_dir}")
        return {
            **state,
            "openai_file_ids": [],
            "files_metadata": [],
            "document_names": [],
            "errors": state.get("errors", []) + ["No PDF files found"],
            "current_step": "error"
        }

    logger.info(f"Found {len(file_paths)} PDF file(s) to upload")

    try:
        # Upload files to OpenAI
        result = await file_service.upload_files([str(p) for p in file_paths])

        if not result["success"]:
            return {
                **state,
                "openai_file_ids": [],
                "files_metadata": [],
                "document_names": [],
                "errors": state.get("errors", []) + result["errors"],
                "current_step": "error"
            }

        # Extract document names
        document_names = [meta["name"] for meta in result["files_metadata"]]

        logger.info(f"Successfully uploaded {len(result['file_ids'])} file(s)")

        return {
            **state,
            "openai_file_ids": result["file_ids"],
            "files_metadata": result["files_metadata"],
            "document_names": document_names,
            "current_step": "domain_detection"
        }

    except Exception as e:
        logger.exception(f"File upload failed: {e}")
        return {
            **state,
            "openai_file_ids": [],
            "files_metadata": [],
            "document_names": [],
            "errors": state.get("errors", []) + [str(e)],
            "current_step": "error"
        }


async def domain_detection_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Detect document domain using Responses API with file references.
    The same file IDs can be reused for analysis later.
    """
    from app.services.analysis_service import AnalysisService
    from app.prompts.domain_prompts import DOMAIN_TAXONOMY

    analysis_service = AnalysisService()
    file_ids = state.get("openai_file_ids", [])

    if not file_ids:
        logger.error("No file IDs available for domain detection")
        return {
            **state,
            "domain": "unsupported",
            "domain_confidence": 0.0,
            "intent_options": [],
            "errors": state.get("errors", []) + ["No files uploaded"],
            "current_step": "waiting_for_intent"
        }

    try:
        # Detect domain using file references
        result = await analysis_service.detect_domain_with_files(file_ids)

        domain = result.get("domain", "unsupported")
        confidence = result.get("confidence", 0.0)

        # Get intent options for the domain
        intent_options = []
        if domain in DOMAIN_TAXONOMY:
            intent_options = DOMAIN_TAXONOMY[domain]["intents"]

        logger.info(f"Domain detected: {domain} (confidence: {confidence:.2f})")

        return {
            **state,
            "domain": domain,
            "domain_confidence": confidence,
            "intent_options": intent_options,
            "current_step": "waiting_for_intent"
        }

    except Exception as e:
        logger.exception(f"Domain detection failed: {e}")
        return {
            **state,
            "domain": "unsupported",
            "domain_confidence": 0.0,
            "intent_options": [],
            "errors": state.get("errors", []) + [str(e)],
            "current_step": "waiting_for_intent"
        }


async def analysis_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Perform full document analysis using Responses API with file references.
    Reuses the same file IDs from the upload step.
    """
    from app.services.analysis_service import AnalysisService

    analysis_service = AnalysisService()
    file_ids = state.get("openai_file_ids", [])

    if not file_ids:
        logger.error("No file IDs available for analysis")
        return {
            **state,
            "smart_score": 0,
            "score_breakdown": {
                "red_flag_score": 0,
                "completeness_score": 0,
                "clarity_score": 0,
                "fairness_score": 0
            },
            "executive_summary": "Analysis could not be completed - no files available",
            "document_summary": "",
            "key_terms": [],
            "main_obligations": [],
            "red_flags": [],
            "scenarios": [],
            "missing_clauses": [],
            "positive_notes": [],
            "follow_up_questions": [],
            "errors": state.get("errors", []) + ["No files available"],
            "current_step": "persist"
        }

    try:
        # Analyze document using file references with language preference
        result = await analysis_service.analyze_document_with_files(
            file_ids=file_ids,
            domain=state["domain"],
            intent=state["selected_intent"],
            user_notes=state.get("custom_intent"),
            language=state.get("language", "English")
        )

        logger.info(f"Analysis complete - Score: {result.get('smart_score', 0)}/100")

        return {
            **state,
            "smart_score": result.get("smart_score", 0),
            "score_breakdown": result.get("score_breakdown", {
                "red_flag_score": 0,
                "completeness_score": 0,
                "clarity_score": 0,
                "fairness_score": 0
            }),
            "executive_summary": result.get("executive_summary", ""),
            "document_summary": result.get("document_summary", ""),
            "key_terms": result.get("key_terms", []),
            "main_obligations": result.get("main_obligations", []),
            "red_flags": result.get("red_flags", []),
            "scenarios": result.get("scenarios", []),
            "missing_clauses": result.get("missing_clauses", []),
            "positive_notes": result.get("positive_notes", []),
            "follow_up_questions": result.get("follow_up_questions", []),
            "current_step": "persist"
        }

    except Exception as e:
        logger.exception(f"Analysis failed: {e}")
        return {
            **state,
            "smart_score": 0,
            "score_breakdown": {
                "red_flag_score": 0,
                "completeness_score": 0,
                "clarity_score": 0,
                "fairness_score": 0
            },
            "executive_summary": f"Analysis failed: {str(e)}",
            "document_summary": "",
            "key_terms": [],
            "main_obligations": [],
            "red_flags": [],
            "scenarios": [],
            "missing_clauses": [],
            "positive_notes": [],
            "follow_up_questions": [],
            "errors": state.get("errors", []) + [str(e)],
            "current_step": "persist"
        }


async def persist_node(state: AnalysisState) -> Dict[str, Any]:
    """
    Save analysis results to database and cleanup.
    """
    from app.core.dependencies import get_supabase_client
    from app.services.openai_file_service import OpenAIFileService

    supabase = get_supabase_client()
    file_service = OpenAIFileService()

    # Prepare score components in the format the frontend expects
    score_breakdown = state.get("score_breakdown", {})
    score_components = {
        "red_flag_score": score_breakdown.get("red_flag_score", 0),
        "completeness_score": score_breakdown.get("completeness_score", 0),
        "clarity_score": score_breakdown.get("clarity_score", 0),
        "fairness_score": score_breakdown.get("fairness_score", 0)
    }

    if supabase:
        try:
            # Update analysis record
            supabase.table("analyses").update({
                "domain": state["domain"],
                "domain_confidence": state["domain_confidence"],
                "intent": state["selected_intent"],
                "overall_score": state["smart_score"],
                "score_components": score_components,
                "executive_summary": state.get("executive_summary", ""),
                "document_summary": state.get("document_summary", ""),
                "key_terms": state.get("key_terms", []),
                "main_obligations": state.get("main_obligations", []),
                "red_flags": state.get("red_flags", []),
                "scenarios": state.get("scenarios", []),
                "missing_clauses": state.get("missing_clauses", []),
                "positive_notes": state.get("positive_notes", []),
                "follow_up_questions": state.get("follow_up_questions", []),
                "document_names": state.get("document_names", []),
                "openai_file_ids": state.get("openai_file_ids", []),
                "current_step": "complete"
            }).eq("id", state["analysis_id"]).execute()

            logger.info(f"Analysis {state['analysis_id']} saved to database")

        except Exception as e:
            logger.error(f"Failed to save analysis to database: {e}")

    # Note: We're NOT deleting files from OpenAI here, as they might be useful
    # for follow-up questions or re-analysis. They auto-expire after some time.

    return {
        **state,
        "current_step": "complete"
    }


# Legacy node stubs for backwards compatibility (will be removed)
async def ingestion_node(state: AnalysisState) -> Dict[str, Any]:
    """Deprecated: Use file_upload_node instead."""
    return await file_upload_node(state)


async def vectorization_node(state: AnalysisState) -> Dict[str, Any]:
    """Deprecated: No longer needed with file-based approach."""
    return {
        **state,
        "current_step": "domain_detection"
    }


async def decision_node(state: AnalysisState) -> Dict[str, Any]:
    """Decide if additional questions are needed. Currently skipped."""
    return {
        **state,
        "needs_questions": False,
        "current_step": "analysis"
    }


async def scoring_node(state: AnalysisState) -> Dict[str, Any]:
    """Deprecated: Scoring is now done by the LLM in analysis_node."""
    return {
        **state,
        "current_step": "persist"
    }
