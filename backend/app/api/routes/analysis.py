from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from typing import List, Optional
from app.models.schemas import (
    AnalysisResult,
    AnalysisStatus,
    DomainDetectionResult,
    IntentSelectionRequest,
    IntentSelectionResponse,
    IntentOption
)
from app.core.dependencies import get_supabase_client, get_current_user_from_request
from app.prompts.domain_prompts import DOMAIN_TAXONOMY, ALLOWED_DOMAINS
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("clarify.analysis")


def calculate_progress(step: str) -> int:
    """Calculate progress percentage based on current step."""
    STEP_PROGRESS = {
        "pending": 0,
        "ingestion": 20,
        "vectorization": 40,
        "domain_detection": 50,
        "decision": 55,
        "question_generation": 60,
        "waiting_for_answers": 65,
        "waiting_for_intent": 55,
        "analysis": 75,
        "scoring": 90,
        "format_response": 95,
        "persist": 98,
        "complete": 100,
        "error": 0
    }
    return STEP_PROGRESS.get(step, 0)


@router.post("/analysis/{analysis_id}/start")
async def start_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks
):
    """
    Start the analysis workflow for uploaded documents.
    Runs in background, client polls for status.
    """
    from app.graph.workflow import run_analysis_workflow

    logger.info(f"🚀 Starting analysis workflow for {analysis_id}")

    # Run workflow in background
    background_tasks.add_task(run_analysis_workflow, analysis_id)

    return {"status": "started", "analysis_id": analysis_id}


@router.get("/analysis/{analysis_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(analysis_id: str):
    """Get current status of analysis."""
    supabase = get_supabase_client()

    if supabase:
        try:
            result = supabase.table("analyses").select(
                "id, current_step, error"
            ).eq("id", analysis_id).single().execute()

            if result.data:
                current_step = result.data.get("current_step", "pending")
                error = result.data.get("error")

                # Log status changes (only when step changes)
                if current_step == "complete":
                    logger.info(f"✅ Analysis {analysis_id} complete!")
                elif current_step == "error":
                    logger.error(f"❌ Analysis {analysis_id} failed: {error}")

                return AnalysisStatus(
                    status="complete" if current_step == "complete" else (
                        "awaiting_intent" if current_step == "waiting_for_intent" else "processing"
                    ),
                    current_step=current_step,
                    progress=calculate_progress(current_step),
                    error=error
                )
        except Exception as e:
            logger.debug(f"Status query failed for {analysis_id}: {e}")

    # Fallback for when analysis hasn't started yet
    return AnalysisStatus(
        status="pending",
        current_step="pending",
        progress=0,
        error=None
    )


@router.get("/analysis/{analysis_id}/intents", response_model=DomainDetectionResult)
async def get_analysis_intents(analysis_id: str):
    """Get detected domain and intent options for an analysis."""
    supabase = get_supabase_client()

    if supabase:
        try:
            result = supabase.table("analyses").select(
                "domain, domain_confidence"
            ).eq("id", analysis_id).single().execute()

            if result.data:
                domain = result.data.get("domain", "")
                confidence = result.data.get("domain_confidence", 0.0)

                if domain and domain in DOMAIN_TAXONOMY:
                    domain_info = DOMAIN_TAXONOMY[domain]
                    intents = [
                        IntentOption(
                            id=intent["id"],
                            label=intent["label"],
                            description=intent["description"]
                        )
                        for intent in domain_info["intents"]
                    ]
                    return DomainDetectionResult(
                        domain=domain,
                        domain_description=domain_info["description"],
                        domain_confidence=confidence,
                        is_supported=True,
                        intents=intents
                    )
                else:
                    # Unsupported domain
                    return DomainDetectionResult(
                        domain="unsupported",
                        domain_description="Unsupported document type",
                        domain_confidence=0.0,
                        is_supported=False,
                        intents=[],
                        allowed_domains=ALLOWED_DOMAINS
                    )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=404, detail="Analysis not found")


@router.post("/analysis/{analysis_id}/intent", response_model=IntentSelectionResponse)
async def select_intent(
    analysis_id: str,
    request: IntentSelectionRequest,
    background_tasks: BackgroundTasks
):
    """Select intent and continue analysis."""
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # Validate intent_id
    if request.intent_id == "other" and not request.custom_intent:
        raise HTTPException(status_code=400, detail="Custom intent required when selecting 'Other'")

    # Update analysis with selected intent
    intent_value = request.custom_intent if request.intent_id == "other" else request.intent_id

    try:
        supabase.table("analyses").update({
            "intent": intent_value,
            "current_step": "analysis"
        }).eq("id", analysis_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Continue analysis in background
    from app.graph.workflow import continue_analysis_workflow
    background_tasks.add_task(continue_analysis_workflow, analysis_id, intent_value)

    return IntentSelectionResponse(
        success=True,
        next_step="analysis"
    )


@router.get("/analysis/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    """Get complete analysis results."""
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        result = supabase.table("analyses").select("*").eq("id", analysis_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Analysis not found")

        data = result.data
        current_step = data.get("current_step", "pending")

        # Check if analysis is complete
        if current_step != "complete":
            return {
                "id": data["id"],
                "status": "processing",
                "current_step": current_step,
                "progress": calculate_progress(current_step)
            }

        # Return full results
        return {
            "id": data["id"],
            "status": "complete",
            "domain": data["domain"],
            "intent": data["intent"],
            "overall_score": data["overall_score"],
            "score_components": data["score_components"],
            "document_summary": data.get("document_summary", ""),
            "key_terms": data.get("key_terms", []),
            "main_obligations": data.get("main_obligations", []),
            "red_flags": data.get("red_flags", []),
            "document_names": data["document_names"],
            "created_at": data["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{analysis_id}/finding/{finding_id}")
async def get_finding_detail(analysis_id: str, finding_id: str):
    """Get detailed information for a specific finding."""
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        result = supabase.table("analyses").select("red_flags").eq("id", analysis_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Analysis not found")

        red_flags = result.data.get("red_flags", [])
        finding = next((f for f in red_flags if f["id"] == finding_id), None)

        if not finding:
            raise HTTPException(status_code=404, detail="Finding not found")

        return finding
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_analysis_history(
    request: Request,
    limit: int = 10,
    offset: int = 0
):
    """Get user's analysis history."""
    user = await get_current_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        result = supabase.table("analyses").select(
            "id, document_names, domain, overall_score, created_at"
        ).eq("user_id", user["id"]).order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1).execute()

        return {
            "analyses": result.data,
            "has_more": len(result.data) == limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str, request: Request):
    """Delete an analysis."""
    user = await get_current_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # Verify ownership
        result = supabase.table("analyses").select("user_id").eq("id", analysis_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Analysis not found")

        if result.data["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Delete (cascades to chunks)
        supabase.table("analyses").delete().eq("id", analysis_id).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
