"""
FastAPI service hosting THE RESEARCHER's ADK agents.

Live agents: ORCHESTRATOR, SCOUT, ADVOCATE, SKEPTIC, EMPIRICIST,
GRAPH_ARCHITECT, CLASSIFIER, SYNTHESIS.

Endpoints:
  GET  /health
  POST /agents/{orchestrator,scout,advocate,empiricist,graph_architect,
                classifier}/run   — run one agent alone, for testing
  POST /pipeline/run              — ORCHESTRATOR -> SCOUT only (legacy,
                                     kept for backward-compat testing).
  POST /pipeline/full/run         — Runs the complete default research
                                     pipeline SYNCHRONOUSLY and returns the
                                     full result. Useful for testing, but
                                     takes ~60-90+ seconds — NOT what a real
                                     user-facing request should block on.
  POST /pipeline/full/start       — THE REAL ENDPOINT for production use.
                                     Kicks off the same full pipeline in the
                                     background and returns IMMEDIATELY.
                                     Results arrive via incremental
                                     Firestore writes (already built into
                                     every agent call) — the frontend should
                                     use onSnapshot on the session doc to
                                     show each agent's result as it lands,
                                     rather than waiting on one long HTTP
                                     response. This is what Express's
                                     /api/research should call.
  POST /agents/logic_lab/run      — ADVOCATE -> SKEPTIC chained. ON-DEMAND
                                     ONLY — maps to the frontend's
                                     `logic_lab` special command, not part
                                     of the default pipeline.
  POST /agents/graph_architect/run — ON-DEMAND ONLY — maps to the
                                     frontend's `show_analogy` command, not
                                     part of the default pipeline.

Run locally:
    uvicorn app.main:app --reload --port 8080

Deploy to Cloud Run (from this directory):
    gcloud run deploy researcher-adk-service \\
        --source . \\
        --region us-central1 \\
        --allow-unauthenticated \\
        --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT,GOOGLE_CLOUD_LOCATION=us-central1

(Use --no-allow-unauthenticated once Express is calling this with a
service-to-service token instead of testing it directly.)
"""

import asyncio
import json
import uuid

from dotenv import load_dotenv

load_dotenv()

from fastapi import BackgroundTasks, FastAPI, HTTPException
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

from app.agents.advocate import advocate_agent
from app.agents.classifier import classifier_agent
from app.agents.empiricist import empiricist_agent
from app.agents.graph_architect import graph_architect_agent
from app.agents.orchestrator import orchestrator_agent
from app.agents.scout import scout_agent
from app.agents.skeptic import skeptic_agent
from app.agents.synthesis import synthesis_agent
from app.firestore_writer import write_agent_result

APP_NAME = "the_researcher_adk"

app = FastAPI(title="THE RESEARCHER — ADK Service")

# One shared in-memory session service for ADK's own internal bookkeeping
# (separate from Firestore — this is ADK's own conversation/session
# tracking, not your app's sessions). Fine for a single instance; swap to
# VertexAiSessionService if this moves to multiple Cloud Run instances or
# needs to survive restarts.
_session_service = InMemorySessionService()

# One Runner per agent — Runner is bound to a single agent, so each live
# agent gets its own. Cheap to create; just a wiring object.
_runners: dict[str, Runner] = {
    "orchestrator": Runner(agent=orchestrator_agent, app_name=APP_NAME, session_service=_session_service),
    "scout": Runner(agent=scout_agent, app_name=APP_NAME, session_service=_session_service),
    "advocate": Runner(agent=advocate_agent, app_name=APP_NAME, session_service=_session_service),
    "skeptic": Runner(agent=skeptic_agent, app_name=APP_NAME, session_service=_session_service),
    "empiricist": Runner(agent=empiricist_agent, app_name=APP_NAME, session_service=_session_service),
    "graph_architect": Runner(agent=graph_architect_agent, app_name=APP_NAME, session_service=_session_service),
    "classifier": Runner(agent=classifier_agent, app_name=APP_NAME, session_service=_session_service),
    "synthesis": Runner(agent=synthesis_agent, app_name=APP_NAME, session_service=_session_service),
}


class AgentRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    write_to_firestore: bool = True


class LogicLabRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    # The real papers SCOUT already found for this session — the frontend
    # should pass whatever it currently has in sourceVault for this
    # session. If omitted, ADVOCATE will honestly say it has nothing to
    # argue from rather than inventing sources.
    referenced_sources: list[dict] = []
    write_to_firestore: bool = True


class EmpiricistRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    referenced_sources: list[dict] = []
    write_to_firestore: bool = True


class GraphArchitectRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    referenced_sources: list[dict] = []
    write_to_firestore: bool = True


class ClassifierRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    referenced_sources: list[dict] = []
    write_to_firestore: bool = True


class SynthesisRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    # Whichever upstream agent outputs are available for this session.
    # Not all sessions will have run every agent — SYNTHESIS is instructed
    # to work with whatever subset it's given rather than assume full data.
    orchestrator: dict | None = None
    scout: dict | None = None
    advocate: dict | None = None
    skeptic: dict | None = None
    empiricist: dict | None = None
    graph_architect: dict | None = None
    classifier: dict | None = None
    write_to_firestore: bool = True


def _extract_json(text: str, agent_label: str) -> dict:
    """Same defensive parse strategy server.js already uses for Groq output:
    try direct parse, then fall back to slicing between the first { and
    last }. Models occasionally wrap JSON in commentary despite instructions."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        first, last = text.find("{"), text.rfind("}")
        if first == -1 or last == -1:
            raise ValueError(f"No JSON object found in {agent_label} output: {text[:200]}")
        return json.loads(text[first : last + 1])


async def _run_agent(agent_key: str, user_id: str, prompt_text: str, agent_label: str) -> dict:
    """Runs one agent to completion and returns its parsed JSON output.

    A fresh ADK session per call — each agent invocation is independent,
    it doesn't need to remember previous calls. session_id is randomized
    so concurrent requests (e.g. two users researching at once) never
    collide with each other inside ADK's own session tracking.

    Retries once on Vertex AI quota exhaustion (429 RESOURCE_EXHAUSTED).
    New GCP projects have a fairly low default per-minute Gemini quota,
    and bursty testing (running several agents back to back) can trip it
    even though normal, spread-out usage rarely will. Same pattern as the
    Semantic Scholar retry in tools.py — this is a transient-limit problem,
    not a code bug, so a short backoff-and-retry is the right fix rather
    than surfacing a hard 500 to the caller for what's often a one-off blip.
    """
    runner = _runners[agent_key]
    adk_session_id = f"{agent_key}-{uuid.uuid4().hex[:12]}"
    await _session_service.create_session(app_name=APP_NAME, user_id=user_id, session_id=adk_session_id)

    content = types.Content(role="user", parts=[types.Part(text=prompt_text)])

    max_attempts = 2
    final_text = None
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            async for event in runner.run_async(
                user_id=user_id, session_id=adk_session_id, new_message=content
            ):
                if event.is_final_response() and event.content and event.content.parts:
                    final_text = event.content.parts[0].text
            break  # succeeded, exit retry loop
        except Exception as e:
            is_quota_error = "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e)
            if is_quota_error and attempt < max_attempts:
                wait_seconds = 15 * attempt
                print(
                    f"[{agent_label}] Vertex AI quota exhausted (attempt {attempt}/{max_attempts}), "
                    f"retrying in {wait_seconds}s..."
                )
                await asyncio.sleep(wait_seconds)
                last_error = e
                continue
            # Not a quota error, or out of retries — surface a clear error
            # instead of letting FastAPI turn this into a bare 500.
            detail = (
                f"{agent_label} hit Vertex AI quota exhaustion after {attempt} attempt(s). "
                f"This is a rate-limit issue, not a code bug — wait a minute and retry, "
                f"or request a quota increase in the GCP console."
                if is_quota_error
                else f"{agent_label} failed: {type(e).__name__}: {e}"
            )
            raise HTTPException(status_code=503 if is_quota_error else 502, detail=detail)

    if final_text is None:
        raise HTTPException(status_code=502, detail=f"{agent_label} produced no final response")

    try:
        return _extract_json(final_text, agent_label)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


def _safe_firestore_write(user_id: str, session_id: str, agent_name: str, result: dict) -> None:
    """Never let a Firestore hiccup take down an otherwise-successful agent
    response — log it and move on."""
    try:
        write_agent_result(user_id, session_id, agent_name, result)
    except Exception as e:
        print(f"[FIRESTORE ERROR] {agent_name}: {e}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "researcher-adk",
        "agents_live": [
            "ORCHESTRATOR", "SCOUT", "ADVOCATE", "SKEPTIC",
            "EMPIRICIST", "GRAPH_ARCHITECT", "CLASSIFIER", "SYNTHESIS",
        ],
    }


@app.post("/agents/orchestrator/run")
async def run_orchestrator(req: AgentRequest):
    """Runs ORCHESTRATOR alone against a raw topic."""
    result = await _run_agent("orchestrator", req.user_id, f"Raw topic: {req.topic}", "ORCHESTRATOR")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "ORCHESTRATOR", result)
    return result


@app.post("/agents/scout/run")
async def run_scout(req: AgentRequest):
    """Runs SCOUT alone against a topic (no ORCHESTRATOR refinement)."""
    result = await _run_agent("scout", req.user_id, f"Research topic: {req.topic}", "SCOUT")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "SCOUT", result)
    return result


@app.post("/pipeline/run")
async def run_pipeline(req: AgentRequest):
    """LEGACY/TESTING endpoint — runs only ORCHESTRATOR -> SCOUT. Kept
    around because earlier tests depend on it. For real research sessions,
    use /pipeline/full/run instead, which runs the complete default
    pipeline including CLASSIFIER, EMPIRICIST, and SYNTHESIS.
    """
    orchestrator_result = await _run_agent(
        "orchestrator", req.user_id, f"Raw topic: {req.topic}", "ORCHESTRATOR"
    )
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "ORCHESTRATOR", orchestrator_result)

    refined_topic = orchestrator_result.get("refined_topic") or req.topic
    subqueries = orchestrator_result.get("search_subqueries") or []

    scout_prompt = (
        f"Research topic: {refined_topic}\n"
        f"Original user phrasing: {req.topic}\n"
        f"Alternate angles to try if the primary search comes up short: "
        f"{', '.join(subqueries) if subqueries else 'none provided'}"
    )
    scout_result = await _run_agent("scout", req.user_id, scout_prompt, "SCOUT")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "SCOUT", scout_result)

    return {
        "orchestrator": orchestrator_result,
        "scout": scout_result,
    }


async def _run_and_write(agent_key: str, user_id: str, session_id: str, prompt: str,
                          label: str, write_to_firestore: bool) -> dict:
    """Runs one agent and writes its result to Firestore as soon as it's
    done — used for the parallel CLASSIFIER/EMPIRICIST step so each writes
    to the live session doc the moment it individually finishes, rather
    than waiting for both to complete."""
    result = await _run_agent(agent_key, user_id, prompt, label)
    if write_to_firestore:
        _safe_firestore_write(user_id, session_id, label, result)
    return result


async def _execute_full_pipeline(topic: str, user_id: str, session_id: str, write_to_firestore: bool) -> dict:
    """The actual pipeline logic: ORCHESTRATOR -> SCOUT -> (CLASSIFIER +
    EMPIRICIST in parallel) -> SYNTHESIS. Shared by both the synchronous
    /pipeline/full/run endpoint (for testing) and the background task
    kicked off by /pipeline/full/start (for real use).

    ADVOCATE/SKEPTIC (logic_lab) and GRAPH_ARCHITECT (show_analogy) are
    deliberately NOT part of this default pipeline — they're on-demand,
    triggered by specific frontend commands, to keep the cost of a normal
    query lower (5 Gemini calls here vs. 8 if everything ran every time).
    """
    orchestrator_result = await _run_agent("orchestrator", user_id, f"Raw topic: {topic}", "ORCHESTRATOR")
    if write_to_firestore:
        _safe_firestore_write(user_id, session_id, "ORCHESTRATOR", orchestrator_result)

    refined_topic = orchestrator_result.get("refined_topic") or topic
    subqueries = orchestrator_result.get("search_subqueries") or []

    scout_prompt = (
        f"Research topic: {refined_topic}\n"
        f"Original user phrasing: {topic}\n"
        f"Alternate angles to try if the primary search comes up short: "
        f"{', '.join(subqueries) if subqueries else 'none provided'}"
    )
    scout_result = await _run_agent("scout", user_id, scout_prompt, "SCOUT")
    if write_to_firestore:
        _safe_firestore_write(user_id, session_id, "SCOUT", scout_result)

    referenced_sources = scout_result.get("referenced_sources") or []
    sources_json = json.dumps(referenced_sources, indent=2) if referenced_sources else "[]"

    classifier_prompt = f"Topic: {refined_topic}\nReal sources to ground the classification in:\n{sources_json}"
    empiricist_prompt = (
        f"Topic (for context only — do not argue for or against it): {refined_topic}\n"
        f"Real sources to assess:\n{sources_json}"
    )

    # CLASSIFIER and EMPIRICIST don't depend on each other — only on SCOUT's
    # output, which we already have. Run them concurrently to cut latency.
    classifier_result, empiricist_result = await asyncio.gather(
        _run_and_write("classifier", user_id, session_id, classifier_prompt, "CLASSIFIER", write_to_firestore),
        _run_and_write("empiricist", user_id, session_id, empiricist_prompt, "EMPIRICIST", write_to_firestore),
    )

    synthesis_upstream = {
        "orchestrator": orchestrator_result,
        "scout": scout_result,
        "classifier": classifier_result,
        "empiricist": empiricist_result,
    }
    synthesis_prompt = (
        f"Topic: {topic}\n"
        f"Available upstream agent outputs (synthesize ONLY from what's "
        f"actually here):\n{json.dumps(synthesis_upstream, indent=2)}"
    )
    synthesis_result = await _run_agent("synthesis", user_id, synthesis_prompt, "SYNTHESIS")
    if write_to_firestore:
        _safe_firestore_write(user_id, session_id, "SYNTHESIS", synthesis_result)

    return {
        "orchestrator": orchestrator_result,
        "scout": scout_result,
        "classifier": classifier_result,
        "empiricist": empiricist_result,
        "synthesis": synthesis_result,
    }


@app.post("/pipeline/full/run")
async def run_pipeline_full(req: AgentRequest):
    """SYNCHRONOUS full pipeline run — blocks until everything finishes
    (~60-90+ seconds) and returns the complete result in the HTTP response.

    Useful for testing and debugging where you want to see the whole
    result at once. NOT what a real user-facing request should call —
    use /pipeline/full/start for that instead.
    """
    return await _execute_full_pipeline(req.topic, req.user_id, req.session_id, req.write_to_firestore)


async def _run_full_pipeline_background(topic: str, user_id: str, session_id: str) -> None:
    """Wrapper for the background task version: runs the full pipeline,
    swallowing the return value (results go to Firestore incrementally as
    they're produced — nothing is waiting on this function's return value)
    and writing a clear error marker to Firestore if anything fails, so the
    frontend doesn't wait forever on a session that silently died.
    """
    try:
        await _execute_full_pipeline(topic, user_id, session_id, write_to_firestore=True)
    except Exception as e:
        print(f"[PIPELINE ERROR] session={session_id}: {type(e).__name__}: {e}")
        try:
            write_agent_result(
                user_id,
                session_id,
                "PIPELINE_ERROR",
                {
                    "color": "crimson",
                    "lines": [f"Pipeline failed: {type(e).__name__}: {e}"],
                    "pipeline_error": True,
                },
            )
        except Exception as firestore_error:
            print(f"[FIRESTORE ERROR while recording pipeline failure] {firestore_error}")


@app.post("/pipeline/full/start")
async def start_pipeline_full(req: AgentRequest, background_tasks: BackgroundTasks):
    """THE REAL ENDPOINT for a normal user research session.

    Kicks off the full pipeline (ORCHESTRATOR -> SCOUT -> CLASSIFIER +
    EMPIRICIST -> SYNTHESIS) in the background and returns IMMEDIATELY —
    typically well under a second, unlike /pipeline/full/run which blocks
    for 60-90+ seconds.

    Results are NOT in the HTTP response. Every agent already writes its
    result to Firestore incrementally as it completes (orchestratorPlan,
    then sourceVault/frontierCards, then classifier + empiricistAssessment,
    then finally dashboard from SYNTHESIS). The frontend should attach an
    onSnapshot listener to the session document and render each field as
    it appears, rather than waiting on one long request.

    write_to_firestore is forced to true here regardless of what's passed
    — there is no other way to get results out of a background task, so a
    caller asking for this endpoint without Firestore writes would get
    nothing back at all. Use /pipeline/full/run instead if you need a
    synchronous, in-response result for testing.
    """
    background_tasks.add_task(_run_full_pipeline_background, req.topic, req.user_id, req.session_id)
    return {
        "status": "started",
        "session_id": req.session_id,
        "message": "Pipeline running in the background. Watch the Firestore session document for incremental updates.",
    }


@app.post("/agents/logic_lab/run")
async def run_logic_lab(req: LogicLabRequest):
    """Runs the on-demand 'Logic Lab' debate: ADVOCATE builds a case from
    real sources, then SKEPTIC independently checks that case against the
    SAME sources — but never sees ADVOCATE's reasoning, only its final
    output. This is what makes the disagreement real instead of one model
    arguing with itself in a single pass.

    Maps to the frontend's `logic_lab` special command. The caller should
    pass whatever real papers this session's SCOUT already found in
    referenced_sources — if none are passed, ADVOCATE will say so honestly
    rather than inventing sources to argue from.
    """
    sources_json = json.dumps(req.referenced_sources, indent=2) if req.referenced_sources else "[]"

    advocate_prompt = (
        f"Topic: {req.topic}\n"
        f"Real sources available (use ONLY these — do not invent others):\n{sources_json}"
    )
    advocate_result = await _run_agent("advocate", req.user_id, advocate_prompt, "ADVOCATE")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "ADVOCATE", advocate_result)

    # SKEPTIC gets the same sources plus ONLY ADVOCATE's final output —
    # never ADVOCATE's internal reasoning, which we don't even capture in
    # the first place (only the final JSON), preserving genuine independence.
    skeptic_prompt = (
        f"Topic: {req.topic}\n"
        f"Same real sources ADVOCATE had access to:\n{sources_json}\n\n"
        f"ADVOCATE's final position (this is ALL you see of its work — "
        f"you do not know how it reasoned, only what it concluded):\n"
        f"{json.dumps({k: v for k, v in advocate_result.items() if k != 'lines'}, indent=2)}"
    )
    skeptic_result = await _run_agent("skeptic", req.user_id, skeptic_prompt, "SKEPTIC")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "SKEPTIC", skeptic_result)

    return {
        "advocate": advocate_result,
        "skeptic": skeptic_result,
    }


@app.post("/agents/empiricist/run")
async def run_empiricist(req: EmpiricistRequest):
    """Runs EMPIRICIST against a topic and its real sources, rating each
    source's methodological strength (study design, sample size, population
    directness) independent of any claim being made about the topic.

    This is a different question than ADVOCATE/SKEPTIC ask — they check
    whether claims match sources; EMPIRICIST checks how much weight the
    sources can bear on their own terms, regardless of any claim at all.
    """
    sources_json = json.dumps(req.referenced_sources, indent=2) if req.referenced_sources else "[]"
    prompt = (
        f"Topic (for context only — do not argue for or against it): {req.topic}\n"
        f"Real sources to assess:\n{sources_json}"
    )
    result = await _run_agent("empiricist", req.user_id, prompt, "EMPIRICIST")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "EMPIRICIST", result)
    return result


@app.post("/agents/graph_architect/run")
async def run_graph_architect(req: GraphArchitectRequest):
    """Runs GRAPH_ARCHITECT against a topic and its real sources, producing
    an accessible analogy plus a concept map grounded strictly in entities
    and relationships actually mentioned in the source abstracts.

    Powers the frontend's `show_analogy` on-demand command.
    """
    sources_json = json.dumps(req.referenced_sources, indent=2) if req.referenced_sources else "[]"
    prompt = f"Topic: {req.topic}\nReal sources to ground the concept map in:\n{sources_json}"
    result = await _run_agent("graph_architect", req.user_id, prompt, "GRAPH_ARCHITECT")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "GRAPH_ARCHITECT", result)
    return result


@app.post("/agents/classifier/run")
async def run_classifier(req: ClassifierRequest):
    """Runs CLASSIFIER against a topic and its real sources, placing the
    topic in its actual field(s), assessing research maturity, and flagging
    genuine controversy — all grounded in concrete signals from the source
    set (venues, years, terminology) rather than general world knowledge
    about what the topic name sounds like.
    """
    sources_json = json.dumps(req.referenced_sources, indent=2) if req.referenced_sources else "[]"
    prompt = f"Topic: {req.topic}\nReal sources to ground the classification in:\n{sources_json}"
    result = await _run_agent("classifier", req.user_id, prompt, "CLASSIFIER")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "CLASSIFIER", result)
    return result


@app.post("/agents/synthesis/run")
async def run_synthesis(req: SynthesisRequest):
    """Runs SYNTHESIS: assembles whichever upstream agent outputs are
    provided into the final dashboard narrative (executive_summary,
    key_claims, core_mechanisms, open_questions).

    This is the last agent in the pipeline and the only one that doesn't
    reason independently about the topic — it strictly synthesizes what
    the other agents already found, and is instructed not to inflate
    confidence beyond what ADVOCATE/SKEPTIC/EMPIRICIST/CLASSIFIER actually
    established. Not every field needs to be present — pass whatever this
    session actually ran.
    """
    upstream = {
        "orchestrator": req.orchestrator,
        "scout": req.scout,
        "advocate": req.advocate,
        "skeptic": req.skeptic,
        "empiricist": req.empiricist,
        "graph_architect": req.graph_architect,
        "classifier": req.classifier,
    }
    # Drop keys the caller didn't provide rather than passing null values —
    # keeps the prompt clean and makes "this agent didn't run" unambiguous.
    upstream = {k: v for k, v in upstream.items() if v is not None}

    prompt = (
        f"Topic: {req.topic}\n"
        f"Available upstream agent outputs (synthesize ONLY from what's "
        f"actually here — do not invent findings for agents not present):\n"
        f"{json.dumps(upstream, indent=2)}"
    )
    result = await _run_agent("synthesis", req.user_id, prompt, "SYNTHESIS")
    if req.write_to_firestore:
        _safe_firestore_write(req.user_id, req.session_id, "SYNTHESIS", result)
    return result
