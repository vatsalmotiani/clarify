"""
Workflow orchestration for document analysis.
Uses OpenAI Files API + Responses API for processing.
"""

from pathlib import Path
import time
from app.graph.state import AnalysisState
from app.graph.nodes import (
    file_upload_node,
    domain_detection_node,
    analysis_node,
    persist_node
)
from app.core.dependencies import get_supabase_client
from app.config import settings
from app.core.logging import get_logger

logger = get_logger("clarify.workflow")


async def run_analysis_workflow(analysis_id: str, language: str = "English"):
    """
    Run the initial analysis workflow (upload files + detect domain).
    Pauses for user intent selection.

    Args:
        analysis_id: Unique identifier for the analysis
        language: Language for LLM outputs (e.g., "English", "Hindi", "Marathi")
    """
    workflow_start = time.time()
    logger.info(f"{'='*60}")
    logger.info(f"WORKFLOW START: {analysis_id} (language: {language})")
    logger.info(f"{'='*60}")

    supabase = get_supabase_client()

    # Create initial analysis record with language
    if supabase:
        try:
            logger.debug(f"Creating analysis record in database...")
            # Try to insert with language column first
            try:
                supabase.table("analyses").insert({
                    "id": analysis_id,
                    "document_names": [],
                    "domain": "",
                    "intent": "",
                    "language": language,
                    "overall_score": 0,
                    "score_components": {},
                    "red_flags": [],
                    "scenarios": [],
                    "key_terms": [],
                    "missing_clauses": [],
                    "openai_file_ids": [],
                    "current_step": "uploading"
                }).execute()
                logger.info(f"Analysis record created in database (language: {language})")
            except Exception as lang_err:
                # If language column doesn't exist, try without it
                logger.warning(f"Insert with language failed, trying without: {lang_err}")
                supabase.table("analyses").insert({
                    "id": analysis_id,
                    "document_names": [],
                    "domain": "",
                    "intent": "",
                    "overall_score": 0,
                    "score_components": {},
                    "red_flags": [],
                    "scenarios": [],
                    "key_terms": [],
                    "missing_clauses": [],
                    "openai_file_ids": [],
                    "current_step": "uploading"
                }).execute()
                logger.info(f"Analysis record created in database (without language column)")
        except Exception as e:
            logger.error(f"Failed to create analysis record: {e}")

    # Initialize state
    state: AnalysisState = {
        "analysis_id": analysis_id,
        "language": language,
        "openai_file_ids": [],
        "files_metadata": [],
        "domain": "",
        "domain_confidence": 0.0,
        "intent_options": [],
        "selected_intent": "",
        "custom_intent": None,
        "needs_questions": False,
        "questions": [],
        "user_answers": [],
        "smart_score": 0,
        "score_breakdown": {},
        "executive_summary": "",
        "document_summary": "",
        "key_terms": [],
        "main_obligations": [],
        "red_flags": [],
        "scenarios": [],
        "missing_clauses": [],
        "positive_notes": [],
        "follow_up_questions": [],
        "document_names": [],
        "current_step": "uploading",
        "errors": []
    }

    try:
        # Step 1: Upload files to OpenAI
        step_start = time.time()
        logger.info(f"STEP 1/2: Uploading files to OpenAI...")
        state = await file_upload_node(state)
        await update_status(supabase, analysis_id, state["current_step"])
        logger.info(f"   Upload complete ({time.time() - step_start:.2f}s) - {len(state['openai_file_ids'])} files")

        if state["current_step"] == "error":
            logger.error(f"Workflow failed at file upload: {state.get('errors', [])}")
            return state

        # Step 2: Domain Detection (using file references)
        step_start = time.time()
        logger.info(f"STEP 2/2: Domain Detection...")
        state = await domain_detection_node(state)
        await update_status(supabase, analysis_id, state["current_step"])
        logger.info(f"   Domain detected: {state['domain']} (confidence: {state['domain_confidence']:.2f})")
        logger.info(f"   Domain detection complete ({time.time() - step_start:.2f}s)")

        # Update database with domain info and file IDs
        if supabase:
            supabase.table("analyses").update({
                "domain": state["domain"],
                "domain_confidence": state["domain_confidence"],
                "document_names": state["document_names"],
                "openai_file_ids": state["openai_file_ids"]
            }).eq("id", analysis_id).execute()

        total_time = time.time() - workflow_start
        logger.info(f"{'='*60}")
        logger.info(f"WORKFLOW PAUSED - Awaiting intent selection")
        logger.info(f"   Total time: {total_time:.2f}s | Status: {state['current_step']}")
        logger.info(f"{'='*60}")

        return state

    except Exception as e:
        logger.exception(f"WORKFLOW ERROR: {e}")
        if supabase:
            supabase.table("analyses").update({
                "current_step": "error",
                "error": str(e)
            }).eq("id", analysis_id).execute()
        raise


async def continue_analysis_workflow(analysis_id: str, selected_intent: str):
    """
    Continue analysis after user selects intent.
    Uses stored file IDs - no need to re-upload.
    """
    workflow_start = time.time()
    logger.info(f"{'='*60}")
    logger.info(f"WORKFLOW RESUME: {analysis_id}")
    logger.info(f"   Selected intent: {selected_intent}")
    logger.info(f"{'='*60}")

    supabase = get_supabase_client()

    # Reconstruct state from database
    logger.debug("Reconstructing state from database...")
    state: AnalysisState = await reconstruct_state(analysis_id, supabase)
    state["selected_intent"] = selected_intent
    logger.info(f"   State reconstructed - {len(state['openai_file_ids'])} file(s)")

    try:
        # Step 1: Analysis (using stored file IDs)
        step_start = time.time()
        logger.info(f"STEP 1/2: Main Analysis (OpenAI Responses API)...")
        state = await analysis_node(state)
        await update_status(supabase, analysis_id, state["current_step"])
        logger.info(f"   Analysis complete ({time.time() - step_start:.2f}s)")
        logger.info(f"   Score: {state['smart_score']}/100 | Red flags: {len(state['red_flags'])}")

        # Step 2: Persist
        step_start = time.time()
        logger.info(f"STEP 2/2: Persisting results...")
        state = await persist_node(state)
        await update_status(supabase, analysis_id, state["current_step"])
        logger.info(f"   Results persisted ({time.time() - step_start:.2f}s)")

        total_time = time.time() - workflow_start
        logger.info(f"{'='*60}")
        logger.info(f"WORKFLOW COMPLETE: {analysis_id}")
        logger.info(f"   Total time: {total_time:.2f}s | Score: {state['smart_score']}/100")
        logger.info(f"   Red flags: {len(state['red_flags'])} | Domain: {state['domain']}")
        logger.info(f"{'='*60}")

        return state

    except Exception as e:
        logger.exception(f"WORKFLOW ERROR: {e}")
        if supabase:
            supabase.table("analyses").update({
                "current_step": "error",
                "error": str(e)
            }).eq("id", analysis_id).execute()
        raise


async def update_status(supabase, analysis_id: str, step: str):
    """Update the current step in the database."""
    if supabase:
        try:
            supabase.table("analyses").update({
                "current_step": step
            }).eq("id", analysis_id).execute()
            logger.debug(f"Status updated: {step}")
        except Exception as e:
            logger.warning(f"Failed to update status: {e}")


async def reconstruct_state(analysis_id: str, supabase) -> AnalysisState:
    """
    Reconstruct state from database.
    Uses stored file IDs instead of re-processing documents.
    """
    state: AnalysisState = {
        "analysis_id": analysis_id,
        "language": "English",
        "openai_file_ids": [],
        "files_metadata": [],
        "domain": "",
        "domain_confidence": 0.0,
        "intent_options": [],
        "selected_intent": "",
        "custom_intent": None,
        "needs_questions": False,
        "questions": [],
        "user_answers": [],
        "smart_score": 0,
        "score_breakdown": {},
        "executive_summary": "",
        "document_summary": "",
        "key_terms": [],
        "main_obligations": [],
        "red_flags": [],
        "scenarios": [],
        "missing_clauses": [],
        "positive_notes": [],
        "follow_up_questions": [],
        "document_names": [],
        "current_step": "",
        "errors": []
    }

    # Get data from database including language (language column may not exist)
    if supabase:
        try:
            # Try with language column first
            try:
                result = supabase.table("analyses").select(
                    "domain, domain_confidence, document_names, openai_file_ids, language"
                ).eq("id", analysis_id).single().execute()
            except Exception:
                # Fallback without language column
                result = supabase.table("analyses").select(
                    "domain, domain_confidence, document_names, openai_file_ids"
                ).eq("id", analysis_id).single().execute()

            if result.data:
                state["domain"] = result.data.get("domain", "")
                state["domain_confidence"] = result.data.get("domain_confidence", 0.0)
                state["document_names"] = result.data.get("document_names", [])
                state["openai_file_ids"] = result.data.get("openai_file_ids", [])
                state["language"] = result.data.get("language", "English")

                logger.info(f"   Retrieved {len(state['openai_file_ids'])} file ID(s) from database (language: {state['language']})")
        except Exception as e:
            logger.warning(f"Failed to get state from database: {e}")

    return state
