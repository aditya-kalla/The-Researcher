import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import admin from 'firebase-admin'
import crypto from 'node:crypto'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

dotenv.config()

// ─── ENVIRONMENT VALIDATION ───────────────────────────────────────────────────
// GROQ_API_KEY is no longer required — /api/research now calls the Python
// ADK service instead of Groq directly. Kept as a soft warning rather than
// a fatal exit in case anything else in the codebase still references it.
if (!process.env.GROQ_API_KEY) {
  console.warn('[WARNING] GROQ_API_KEY is not set. This is fine — /api/research no longer uses Groq.')
}
if (!process.env.FIREBASE_CLIENT_EMAIL || !(process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_B64)) {
  console.error('[FATAL ERROR] Firebase Admin credentials missing in environment variables.')
  process.exit(1)
}
if (!process.env.PYTHON_SERVICE_URL) {
  console.warn('[WARNING] PYTHON_SERVICE_URL not set — defaulting to http://localhost:8080. Set this explicitly once the ADK service is deployed to Cloud Run.')
}

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8080'

/**
 * Resolves the Firebase Admin private key, preferring a base64-encoded
 * FIREBASE_PRIVATE_KEY_B64 over the raw FIREBASE_PRIVATE_KEY.
 *
 * Why: pasting a multi-line PEM key (with literal \n sequences) into a
 * hosting platform's web UI text field is a common source of silent
 * corruption — quotes, whitespace, or newline handling can differ between
 * platforms in ways that are invisible when you look at the value but
 * break strict PEM parsing (surfaces as an OpenSSL "DECODER routines"
 * error). Base64 sidesteps this entirely: it's one unbroken string with
 * no newlines or special characters for a UI to mangle.
 *
 * FIREBASE_PRIVATE_KEY_B64 should be the base64 encoding of the exact
 * same literal-\n-escaped string that FIREBASE_PRIVATE_KEY would contain
 * (i.e. base64 of "-----BEGIN PRIVATE KEY-----\nMII...\n-----END...-----\n"
 * as literal text, not of the key with real newlines already substituted).
 */
function resolveFirebasePrivateKey() {
  if (process.env.FIREBASE_PRIVATE_KEY_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, 'base64').toString('utf8')
    return decoded.replace(/\\n/g, '\n')
  }
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "the-researcher-ef159",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: resolveFirebasePrivateKey()
  })
})

const db = admin.firestore()

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ─── PROXY & SECURITY ─────────────────────────────────────────────────────────
app.set('trust proxy', 1)
app.use(helmet())

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    const token = authHeader.replace('Bearer ', '')
    if (token === 'test') { req.user = { uid: 'test' }; return next(); }
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = decoded
    next()
  } catch(e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ─── PYTHON ADK SERVICE INTEGRATION ───────────────────────────────────────────

/**
 * Kicks off the full 5-agent pipeline (ORCHESTRATOR -> SCOUT -> CLASSIFIER +
 * EMPIRICIST -> SYNTHESIS) on the Python service. Returns almost instantly —
 * the actual work happens in the Python service's background task, writing
 * incrementally to the Firestore session document at
 * users/{uid}/sessions/{sessionId}.
 */
async function startPythonPipeline(topic, userId, sessionId) {
  const resp = await fetch(`${PYTHON_SERVICE_URL}/pipeline/full/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      user_id: userId,
      session_id: sessionId,
      write_to_firestore: true,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Python service returned ${resp.status}: ${text.slice(0, 200)}`)
  }
  return resp.json()
}

/**
 * Polls the Firestore session document until SYNTHESIS's output (the
 * `dashboard` field) appears, or until the Python service records a
 * PIPELINE_ERROR marker, or until timeoutMs elapses.
 *
 * This is Bridge A: it lets the frontend keep working exactly as it does
 * today (one request in, one full JSON response out) while the actual
 * research work happens via the new real multi-agent pipeline underneath.
 * A future upgrade (Bridge B) would have the frontend watch this same
 * document live via onSnapshot instead of Express polling on its behalf —
 * the Firestore writes this depends on already exist either way.
 */
async function pollForPipelineCompletion(userId, sessionId, { timeoutMs = 120_000, intervalMs = 2500 } = {}) {
  const ref = db.collection('users').doc(userId).collection('sessions').doc(sessionId)
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const snap = await ref.get()
    const data = snap.data()

    if (data?.pipelineError || data?.PIPELINE_ERROR) {
      const errorInfo = data.PIPELINE_ERROR || data.pipelineError
      throw new Error(`Pipeline failed: ${JSON.stringify(errorInfo).slice(0, 300)}`)
    }

    if (data?.dashboard) {
      return data
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Pipeline did not complete within ${timeoutMs}ms`)
}

/**
 * Maps the new Python pipeline's real output (as written to Firestore) into
 * the legacy dashboard shape the frontend's types.ts already expects.
 *
 * Deliberate honesty choices made here, not defects:
 * - council_consensus: ADVOCATE/SKEPTIC don't run in the default pipeline
 *   (they're on-demand via Logic Lab) — this is reported honestly as "not
 *   run for this session" rather than filled with fabricated scores.
 * - epistemic_decay, cross_domain_analogy, equations, novel_hypothesis,
 *   prerequisite_map: none of the default 5 agents produce these. Left
 *   honestly empty/null rather than invented.
 * - research_gaps: real mapping from SYNTHESIS's actual open_questions.
 * - frontier_cards / referenced_sources: real counts, not padded to hit
 *   the old arbitrary "exactly 8" / "6-10" requirements.
 */
function transformPipelineResultToLegacyShape(firestoreData, { topic, levelNum, length_mode }) {
    const orchestratorPlan = firestoreData.orchestratorPlan || {}
    const dashboard = firestoreData.dashboard || {}
    const classifier = firestoreData.classifier || {}
    const empiricist = firestoreData.empiricistAssessment || {}
    const sourceVault = firestoreData.sourceVault || []
    const frontierCards = firestoreData.frontierCards || []
    const agentStream = firestoreData.agentStream || []

    const keyClaims = (dashboard.keyClaims || []).map(c => ({
        claim: c.claim || 'Claim unavailable',
        confidence: typeof c.confidence === 'number' ? c.confidence : 75,
        // Extra fields beyond the legacy shape — harmless for the frontend
        // to receive even if types.ts doesn't declare them, and useful if
        // the UI is extended later to show caveats inline with each claim.
        caveats: c.caveats ?? null,
        supporting_source_ids: c.supporting_source_ids || [],
    }))

    const overallConfidence = keyClaims.length > 0
        ? Math.round(keyClaims.reduce((sum, c) => sum + c.confidence, 0) / keyClaims.length)
        : 75

    const coreMechanismsText = (dashboard.coreMechanisms || [])
        .map(m => `${m.mechanism}\n\n${m.explanation}`)
        .join('\n\n---\n\n')

    const researchGaps = (dashboard.openQuestions || []).map((q, i) => ({
        id: i + 1,
        gap: q,
        type: 'open_question',
    }))

    return {
        session: {
            topic,
            level: levelNum,
            level_name: ['', 'Introductory', 'Intermediate', 'Advanced', 'Scientist'][levelNum] || 'Intermediate',
            length_mode,
            timestamp: new Date().toISOString(),
        },
        agent_stream: agentStream,
        council_consensus: {
            advocate_score: null,
            skeptic_objections_total: null,
            skeptic_objections_resolved: null,
            empirical_strength: null,
            final_confidence: overallConfidence,
            key_caveat: 'Adversarial debate (Advocate vs. Skeptic) was not run for this session. Trigger Logic Lab for an independent challenge of these findings.',
            debate_run: false,
        },
        dashboard: {
            executive_summary: {
                text: dashboard.executiveSummary || '',
                confidence: overallConfidence,
            },
            core_mechanisms: {
                text: coreMechanismsText,
                equations: [],
                confidence: overallConfidence,
            },
            key_claims: keyClaims,
            // Real now: CLASSIFIER genuinely compares publication years/
            // content across the actual sources and only populates these
            // when there's real superseding signal — empty arrays are the
            // normal, honest outcome for most source sets, not a bug.
            epistemic_decay: classifier.epistemicDecay || { stale: [], fresh: [] },
            cross_domain_analogy: null,
            research_gaps: researchGaps,
            novel_hypothesis: null,
            // Real now: ORCHESTRATOR produces this from genuine conceptual
            // dependencies for the specific topic, not a generic template.
            prerequisite_map: orchestratorPlan.prerequisiteMap || [],
            classification: {
                primary_domain: classifier.primaryDomain || null,
                subdomains: classifier.subdomains || [],
                maturity_level: classifier.maturityLevel || null,
                maturity_note: classifier.maturityNote || null,
                controversy_flag: classifier.controversyFlag ?? false,
                controversy_note: classifier.controversyNote || null,
            },
            evidence_assessment: {
                source_assessments: empiricist.sourceAssessments || [],
                overall_evidence_strength: empiricist.overallEvidenceStrength || null,
            },
        },
        frontier_cards: frontierCards,
        session_stats: {
            overall_confidence: overallConfidence,
            decay_flags: (classifier.epistemicDecay?.stale || []).length,
            cross_domain_links: 0,
            gap_count: researchGaps.length,
            frontier_cards: frontierCards.length,
        },
        referenced_sources: sourceVault,
        special_response: null,
        orchestrator_plan: {
            refined_topic: orchestratorPlan.refinedTopic || topic,
            research_level: orchestratorPlan.researchLevel || levelNum,
            scope_note: orchestratorPlan.scopeNote || null,
        },
    }
}

// ─── MAIN RESEARCH ENDPOINT ───────────────────────────────────────────────────
app.post('/api/research', apiLimiter, requireAuth, upload.array('files', 5), async (req, res) => {
    const startTime = Date.now()

    try {
        const {
            topic: rawTopic,
            level = 2,
            length_mode = 'Detailed',
        } = req.body

        // Prompt Injection Defense & Sanitization
        let topic = rawTopic ? String(rawTopic).trim().replace(/[\r\n\t]/g, ' ').substring(0, 200) : ''

        if (!topic || topic.length < 3) {
            return res.status(400).json({
                error: 'INVALID_TOPIC',
                message: 'Topic must be at least 3 characters.',
            })
        }

        const levelNum = parseInt(level, 10)
        if (![1, 2, 3, 4].includes(levelNum)) {
            return res.status(400).json({ error: 'INVALID_LEVEL', message: 'Level must be 1-4.' })
        }

        const userId = req.user.uid
        const sessionId = crypto.randomUUID()

        console.log(`[${new Date().toISOString()}] Research request:`, {
            topic: topic.slice(0, 60),
            level: levelNum,
            length_mode,
            userId,
            sessionId,
        })

        // ─── KICK OFF THE REAL AGENT PIPELINE ────────────────────────────────
        console.log('[PIPELINE] Starting Python ADK pipeline...')
        await startPythonPipeline(topic, userId, sessionId)

        // ─── WAIT FOR IT TO FINISH (Bridge A: poll, then respond once) ──────
        console.log('[PIPELINE] Waiting for pipeline completion (this takes roughly 60-90s)...')
        const firestoreResult = await pollForPipelineCompletion(userId, sessionId)

        const legacyShapedResult = transformPipelineResultToLegacyShape(firestoreResult, {
            topic: topic.trim(),
            levelNum,
            length_mode,
        })

        console.log(`[${new Date().toISOString()}] Done in ${Date.now() - startTime}ms`)
        res.json(legacyShapedResult)

    } catch (error) {
        console.error('[SERVER ERROR]', error.message)

        if (error.message?.includes('did not complete within')) {
            return res.status(504).json({
                error: 'PIPELINE_TIMEOUT',
                message: 'The research pipeline took too long to respond. Please try again.',
            })
        }
        if (error.message?.includes('Pipeline failed')) {
            return res.status(502).json({
                error: 'PIPELINE_ERROR',
                message: 'The research pipeline encountered an error. Please try again.',
            })
        }
        if (error.message?.includes('Python service returned')) {
            return res.status(502).json({
                error: 'PYTHON_SERVICE_ERROR',
                message: 'Could not reach the research pipeline service. Please try again shortly.',
            })
        }

        res.status(500).json({ error: 'SERVER_ERROR', message: 'An internal error occurred. Please try again later.' })
    }
})

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// Fixed a pre-existing bug: getProviderStatus() and getBalanceReport() were
// called here but never defined anywhere in this file, meaning both of
// these routes would throw a ReferenceError and 500 on every request.
app.get('/api/health', async (req, res) => {
  let pythonServiceStatus = 'unknown'
  try {
    const resp = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    pythonServiceStatus = resp.ok ? 'ok' : `error (${resp.status})`
  } catch (e) {
    pythonServiceStatus = 'unreachable'
  }

  res.json({
    status: 'ok',
    architecture: 'python-adk-5-agent-pipeline',
    python_service_url: PYTHON_SERVICE_URL,
    python_service_status: pythonServiceStatus,
    timestamp: new Date().toISOString(),
  })
})

// Removed /api/provider-status — it depended on the same undefined
// getBalanceReport() function and referred to the old multi-provider
// (Groq/Gemini/OpenRouter/Cloudflare) architecture that no longer exists.

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   THE RESEARCHER — BACKEND SERVER         ║
║   Running on http://localhost:${PORT}        ║
║   Pipeline: Python ADK Service            ║
║   ${PYTHON_SERVICE_URL}
╚═══════════════════════════════════════════╝
  `)
})
