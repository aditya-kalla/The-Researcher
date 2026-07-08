"""
Firestore writer using the Admin SDK.

This is the piece your reference doc calls out as the payoff of choosing
Firebase: each agent writes its own slice of the session document the
moment it finishes, instead of the frontend writing one big blob after the
entire pipeline completes (which is what firestore.ts's saveSession() does
today).

Session documents live at the same path your frontend already reads:
  users/{uid}/sessions/{sessionId}

This module only ever merges fields in — it never overwrites the whole
document — so it's safe to call from multiple agents writing to the same
session concurrently.
"""

import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

_app = None


def _get_app():
    """Lazily initializes the Firebase Admin app exactly once per process."""
    global _app
    if _app is not None:
        return _app

    client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    private_key = os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "the-researcher-ef159")

    if not client_email or not private_key:
        raise RuntimeError(
            "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set — "
            "same credentials server.js already uses."
        )

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "private_key": private_key,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    _app = firebase_admin.initialize_app(cred)
    return _app


def _session_ref(user_id: str, session_id: str):
    _get_app()
    db = firestore.client()
    return db.collection("users").document(user_id).collection("sessions").document(session_id)


def write_agent_result(user_id: str, session_id: str, agent_name: str, payload: dict) -> None:
    """Merges one agent's output into the live session document.

    Appends the agent's terminal lines to agentStream (matching the existing
    agent_stream shape the frontend already renders) and merges any
    agent-specific fields (e.g. SCOUT's referenced_sources / frontier_cards)
    directly into the document root, matching the field names firestore.ts's
    saveSession() already uses (sourceVault, frontierCards, etc.) so the
    frontend needs zero changes to read either the old one-shot write or
    these new incremental ones.

    Args:
        user_id: Firebase auth UID, matches the path firestore.ts uses.
        session_id: The session document ID.
        agent_name: e.g. "SCOUT" — used for logging only.
        payload: The agent's parsed JSON output. Expected to contain at
            least "lines" (list[str]) and "color" (str); other keys are
            mapped per-agent below.
    """
    ref = _session_ref(user_id, session_id)

    stream_entry = {
        "agent": agent_name,
        "color": payload.get("color", "electric"),
        "lines": payload.get("lines", []),
    }

    update = {
        "agentStream": firestore.ArrayUnion([stream_entry]),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

    # Per-agent field mapping. As more agents come online, extend this with
    # their fields (e.g. ADVOCATE -> dashboard.executive_summary).
    if "referenced_sources" in payload:
        update["sourceVault"] = payload["referenced_sources"]
    if "frontier_cards" in payload:
        update["frontierCards"] = payload["frontier_cards"]
    if "refined_topic" in payload:
        update["orchestratorPlan"] = {
            "refinedTopic": payload.get("refined_topic"),
            "researchLevel": payload.get("research_level"),
            "searchSubqueries": payload.get("search_subqueries", []),
            "scopeNote": payload.get("scope_note"),
            "prerequisiteMap": payload.get("prerequisite_map", []),
        }
    if "position_summary" in payload:
        update["logicLab"] = {
            "advocate": {
                "positionSummary": payload.get("position_summary"),
                "keyArguments": payload.get("key_arguments", []),
                "confidence": payload.get("confidence"),
            }
        }
    if "challenges" in payload:
        update["logicLab"] = {
            "skeptic": {
                "challenges": payload.get("challenges", []),
                "counterConfidence": payload.get("counter_confidence"),
                "verdict": payload.get("verdict"),
            }
        }
    if "source_assessments" in payload:
        update["empiricistAssessment"] = {
            "sourceAssessments": payload.get("source_assessments", []),
            "overallEvidenceStrength": payload.get("overall_evidence_strength"),
        }
    if "analogy" in payload:
        update["graphArchitect"] = {
            "analogy": payload.get("analogy"),
            "conceptMap": payload.get("concept_map"),
        }
    if "primary_domain" in payload:
        update["classifier"] = {
            "primaryDomain": payload.get("primary_domain"),
            "subdomains": payload.get("subdomains", []),
            "interdisciplinaryLinks": payload.get("interdisciplinary_links", []),
            "maturityLevel": payload.get("maturity_level"),
            "maturityNote": payload.get("maturity_note"),
            "controversyFlag": payload.get("controversy_flag"),
            "controversyNote": payload.get("controversy_note"),
            "epistemicDecay": payload.get("epistemic_decay", {"stale": [], "fresh": []}),
        }
    if "executive_summary" in payload:
        update["dashboard"] = {
            "executiveSummary": payload.get("executive_summary"),
            "keyClaims": payload.get("key_claims", []),
            "coreMechanisms": payload.get("core_mechanisms", []),
            "openQuestions": payload.get("open_questions", []),
        }

    ref.set(update, merge=True)
    print(f"[FIRESTORE] {agent_name} wrote to users/{user_id}/sessions/{session_id}")
