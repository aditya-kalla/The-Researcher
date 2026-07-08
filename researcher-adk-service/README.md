# THE RESEARCHER — ADK Service (Step 1: SCOUT)

This is the first real piece of the Google ADK migration described in
`THE_RESEARCHER_Technical_Reference_FULL.docx`, Chapter 11. It replaces the
*simulated* SCOUT persona (a paragraph inside one big Groq system prompt)
with a real ADK agent that has actual tools and cannot fabricate papers.

**Scope of this step, deliberately:** just SCOUT. Not the full 8-agent
pipeline. The goal is to prove the pattern — real agent, real tools, real
Firestore write, real frontend `onSnapshot` update — on one agent before
copying the pattern seven more times.

## What's here

```
app/
  tools.py          # search_semantic_scholar(), search_arxiv()
                     #   — direct ports of retrieval.js's two fetch functions
  agents/
    scout.py         # the actual SCOUT Agent definition + instruction
  firestore_writer.py # writes SCOUT's output into the live session doc
  main.py             # FastAPI service: POST /agents/scout/run
requirements.txt
.env.example
```

## Local setup

```bash
cd researcher-adk-service
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in:
#   GOOGLE_CLOUD_PROJECT  — your GCP project ID (the one with your $1000 credits)
#   FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY — copy these verbatim
#       from researcher-backend/.env, do not generate new ones
```

You'll also need to authenticate to Vertex AI locally:

```bash
gcloud auth application-default login
```

Run it:

```bash
uvicorn app.main:app --reload --port 8080
```

## Testing it

**Quick health check:**
```bash
curl http://localhost:8080/health
```

**Run SCOUT for real** (this is the actual test — it will call Gemini via
Vertex AI, which spends a small amount of your credits, and will call
Semantic Scholar + arXiv for real):

```bash
curl -X POST http://localhost:8080/agents/scout/run \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "mechanistic interpretability of transformer attention",
    "user_id": "test",
    "session_id": "test-session-001",
    "write_to_firestore": false
  }'
```

Set `"write_to_firestore": true` (or omit it — that's the default) once
you've confirmed the Firestore credentials are correct and you have a real
`user_id` you can check in the console. Watch
`users/test/sessions/test-session-001` in the Firestore console — you
should see `agentStream`, `sourceVault`, and `frontierCards` populate.

**If you want to watch it update live in your actual app:** add an
`onSnapshot` listener to `firestore.ts` pointed at that same path, wired
into the dashboard component. That's the next piece of frontend work —
ask me when you're ready for it and I'll write it against your existing
`useStore.ts` shape.

## What I verified before handing this to you

- All four files import cleanly with the real `google-adk` package installed
  (caught and fixed one bug: a relative import in `scout.py` was resolving
  to the wrong package — `from .tools` instead of `from ..tools`, since
  `scout.py` lives one directory deeper than `tools.py`).
- `search_semantic_scholar` and `search_arxiv` are structurally faithful
  ports of `retrieval.js` — same endpoints, same field mappings, same
  timeouts (8s), same fallback-to-empty-list-on-failure behavior.
- I could **not** live-test the actual Semantic Scholar / arXiv HTTP calls
  from my sandbox — its network allowlist only permits package registries
  (pypi, npm, github), not arbitrary third-party APIs. You'll get the real
  test the first time you run this locally or on Cloud Run, where there's
  no such restriction.
- I could not test the Gemini/Vertex AI call or the Firestore write either,
  since both need credentials I don't have. Same caveat applies.

So: structurally sound and import-clean, but the three things that actually
cost you credits or touch your live database are untested by me — please
run the curl command above before trusting it with anything real.

## Deploying to Cloud Run

```bash
gcloud run deploy researcher-adk-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,FIREBASE_PROJECT_ID=the-researcher-ef159 \
  --set-secrets FIREBASE_CLIENT_EMAIL=firebase-client-email:latest,FIREBASE_PRIVATE_KEY=firebase-private-key:latest
```

(Store the Firebase credentials in Secret Manager rather than passing them
as plain env vars on a public-ish Cloud Run service — `--set-secrets` above
assumes you've created those two secrets first via `gcloud secrets create`.)

Switch to `--no-allow-unauthenticated` once Express is calling this
service-to-service with an identity token, rather than you testing it
directly from curl.

## Next steps (not in this step)

1. Wire Express's `/api/research` to call this service instead of Groq —
   but only after more agents exist; right now this only does SCOUT.
2. Add ORCHESTRATOR next (it's the one that gates everything downstream).
3. Add the `firestore.ts` `onSnapshot` listener + dashboard wiring so the
   live-fill-in effect is visible end to end, even with just SCOUT live.
4. Then the parallel five (CLASSIFIER, GRAPH_ARCHITECT, ADVOCATE, SKEPTIC,
   EMPIRICIST), then SYNTHESIS last.
5. Build `/agents/command` for the four on-demand commands (logic_lab,
   expand_gap, show_analogy, set_level) as their own lightweight calls.
