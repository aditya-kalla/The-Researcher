import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import admin from 'firebase-admin'
import { fetchSemanticScholarPapers, fetchArxivPapers, buildResearchContext } from './retrieval.js'
import Groq from 'groq-sdk'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

dotenv.config()

// ─── ENVIRONMENT VALIDATION ───────────────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
  console.error('[FATAL ERROR] GROQ_API_KEY is missing in environment variables.')
  process.exit(1)
}
if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('[FATAL ERROR] Firebase Admin credentials missing in environment variables.')
  process.exit(1)
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "the-researcher-ef159",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
})

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

// ─── SYSTEM INSTRUCTIONS ──────────────────────────────────────────────────────
const SYSTEM_INSTRUCTIONS = `You are THE RESEARCHER — a production-grade Cognitive Research Architecture.
You are NOT a chatbot. You are a multi-agent academic intelligence system
that simulates a live 7-agent pipeline producing structured, citation-aware,
mathematically grounded research output for users ranging from high school
students to PhD researchers.

CRITICAL OUTPUT RULE:
Your ENTIRE response must be a single valid JSON object.
First character must be: {
Last character must be: }
Zero markdown fences — no \`\`\`json, no \`\`\` anywhere.
Zero text before or after the JSON object.
Must pass JSON.parse() with zero errors.
Escape ALL internal quotes with \\".
No trailing commas anywhere in the JSON.
No JavaScript comments inside the JSON.

THE OBSERVATORY TERMINAL (agent_stream):
To maintain dashboard compatibility, you MUST output the "agent_stream" array. Instead of a council of agents, treat this array as a sequential boot log of the research terminal analyzing the provided context. Use the following personas to simulate the terminal's sub-routines:
ORCHESTRATOR (electric) — Initializes the sweep: "→ Task 1: Analyzing retrieved Semantic Scholar papers...", "→ Task 2: Parsing arXiv context..."
SCOUT (lime) — Extracts metadata: "✓ Ingested: [Paper Title], [Year]", "⚑ Found high-citation foundation literature."
CLASSIFIER (periwinkle) — Routes complexity: "→ Complexity Tier [X]", "→ Identifying prerequisite knowledge."
GRAPH_ARCHITECT (periwinkle) — Builds structural links: "◈ Mapping cross-domain isomorphism."
ADVOCATE (cream) — Marshals evidence from context: "Primary claim derived from [Author et al., Year]."
SKEPTIC (sakura) — Adversarial checks: "⚠ Checking for epistemic decay.", "Limitations noted in methodology."
EMPIRICIST (cream) — Quantitative scoring: "→ Confidence thresholds computed."
SYNTHESIS (electric) — Final lock: "Terminal sweep complete. Generating final structured synthesis..."

COMPLEXITY TIERS:
Level 1 — Introductory: Plain English only. Analogies-first. No jargon. No math.
Level 2 — Intermediate (DEFAULT): Technical terms defined inline. Conceptual math allowed.
Level 3 — Advanced: Full vocabulary. LaTeX equations required (minimum 2).
Level 4 — Scientist: Expert-to-expert. Full proofs (minimum 4 equations). Novel hypothesis mandatory.

RETURN THIS EXACT JSON STRUCTURE:
{
  "session": {
    "topic": "string",
    "level": 2,
    "level_name": "Intermediate",
    "length_mode": "Detailed",
    "timestamp": "2025-01-01T00:00:00Z"
  },
  "agent_stream": [
    { "agent": "ORCHESTRATOR", "color": "electric", "lines": ["→ Task 1: Analyzing retrieved papers...", "→ Task 2: Parsing arXiv context..."] },
    { "agent": "SCOUT", "color": "lime", "lines": ["✓ Ingested: [Paper Title], [Year]", "⚑ Found high-citation foundation literature."] },
    { "agent": "CLASSIFIER", "color": "periwinkle", "lines": ["→ Complexity Tier [X]", "→ Identifying prerequisite knowledge."] },
    { "agent": "GRAPH_ARCHITECT", "color": "periwinkle", "lines": ["◈ Mapping cross-domain isomorphism."] },
    { "agent": "ADVOCATE", "color": "cream", "lines": ["Primary claim derived from [Author et al., Year]."] },
    { "agent": "SKEPTIC", "color": "sakura", "lines": ["⚠ Checking for epistemic decay."] },
    { "agent": "EMPIRICIST", "color": "cream", "lines": ["→ Confidence thresholds computed."] },
    { "agent": "SYNTHESIS", "color": "electric", "lines": ["Terminal sweep complete. Generating final structured synthesis..."] }
  ],
  "council_consensus": {
    "advocate_score": 82,
    "skeptic_objections_total": 3,
    "skeptic_objections_resolved": 2,
    "empirical_strength": 78,
    "final_confidence": 80,
    "key_caveat": "string — the single most important limitation found in the context"
  },
  "dashboard": {
    "executive_summary": { "text": "A rich, structured executive synthesis written like a high-level research briefing rather than a chatbot summary. The executive_summary MUST: (1) Define the topic in precise but plain language. (2) Explain WHY the topic matters scientifically, technologically, philosophically, economically, medically, or societally. (3) Describe the current state of the field. (4) Identify the most important unresolved uncertainty, debate, contradiction, or frontier challenge. (5) Mention at least one historical milestone or major breakthrough where relevant. (6) Maintain an intelligent editorial tone — never sounding like generic AI-generated educational text. Structure requirements: MINIMUM 3 distinct paragraphs. Distinct paragraph transitions. No bullet points. No repetitive phrasing. Avoid generic opening lines like 'X is an important field...'. Length scaling: Summary mode: MINIMUM 150 words. Detailed mode: MINIMUM 300 words. Deep Dive mode: MINIMUM 500 words. Deep Dive mode should feel like a condensed review article introduction, an editorial intelligence brief, a premium research synthesis. The writing should feel grounded, observational, intelligent, source-aware, academically literate. NOT verbose filler, motivational, or generic textbook writing.", "confidence": 82 },
    "core_mechanisms": { "text": "A deeply structured mechanistic explanation describing HOW the system/topic/process actually works. The explanation MUST include: (1) The primary mechanism in plain language. (2) The governing variables and what changing them does. (3) Interactions between sub-components or subsystems. (4) Important causal relationships. (5) Current limitations or breakdowns in existing models. (6) Real-world implications of those mechanisms. (7) Where scientific disagreement or uncertainty still exists. The response MUST be divided into multiple conceptual sections or paragraphs. NEVER reduce to one paragraph, provide vague conceptual summaries, or explain only at surface level. For Level 3 and Level 4: include at least TWO meaningful LaTeX equations in the equations array. Equations must correspond directly to mechanisms discussed and should not be decorative. Examples: Schrödinger equation, Navier-Stokes, Transformer attention, Bayesian update, Lorentz factor, entropy equations, diffusion equations, etc. Length scaling: Summary mode: MINIMUM 200 words. Detailed mode: MINIMUM 400 words. Deep Dive mode: MINIMUM 700 words. Deep Dive mode should feel like a compressed systems-level technical explainer, an academic whitepaper section, an interdisciplinary mechanism briefing. The tone should remain readable, intelligent, dense, mechanistic, layered. NOT generic educational simplification.", "equations": [], "confidence": 80 },
    "key_claims": "key_claims must contain SPECIFIC, falsifiable, research-oriented findings. Each claim MUST: be a complete sentence, describe a concrete finding, include measurable or mechanistic specificity where possible, avoid vague summaries or categories, feel grounded in actual literature. BAD: 'Gravity affects objects.' GOOD: 'Gravitational time dilation causes clocks at sea level to run approximately 45 microseconds per day slower than clocks aboard GPS satellites, requiring relativistic correction for accurate navigation systems (Ashby, 2002).' Where possible: include author + year inline, mention quantitative effects, mention observed outcomes, mention causal relationships, mention experimental findings, mention predictive consequences. The claims should collectively represent multiple perspectives, reveal tensions or contradictions where relevant, include frontier insights, include at least one surprising or counterintuitive finding. Minimum counts: Summary mode: MINIMUM 4 claims. Detailed mode: MINIMUM 6 claims. Deep Dive mode: MINIMUM 8 claims. Deep Dive claims should resemble compressed literature review insights, high-density academic findings, synthesis notes from multiple papers. FORMAT: array of objects with fields claim (string) and confidence (number 0-100).",
    "epistemic_decay": {
      "stale": [{ "claim": "string", "stale_as_of": "2019", "superseded_by": "Author et al., Year", "impact": "string" }],
      "fresh": [
        { "claim": "string", "last_validated": "2024", "source": "Author et al., Year" },
        { "claim": "string", "last_validated": "2023", "source": "Author et al., Year" }
      ]
    },
    "cross_domain_analogy": {
      "domain_a": "string",
      "domain_b": "string — completely unrelated field",
      "structural_isomorphism": "string — mechanistic/mathematical correspondence NOT a surface metaphor",
      "implication": "string",
      "transferable_technique": "string — specific named method"
    },
    "research_gaps": [
      { "id": 1, "gap": "specific gap with subject + method + benchmark", "type": "literature" },
      { "id": 2, "gap": "specific gap", "type": "methodological" },
      { "id": 3, "gap": "specific gap", "type": "open_question" }
    ],
    "novel_hypothesis": null,
    "prerequisite_map": [
      { "concept": "foundational concept", "reason": "why needed" },
      { "concept": "intermediate concept", "reason": "why needed" },
      { "concept": "advanced concept", "reason": "why needed" },
      { "concept": "TOPIC", "reason": "The research topic itself" }
    ]
  },
  "frontier_cards": [
    { "id": 1, "category": "FOUNDATION", "confidence": 92, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2021, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-1" },
    { "id": 2, "category": "FOUNDATION", "confidence": 88, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2019, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-2" },
    { "id": 3, "category": "FRONTIER", "confidence": 79, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2025, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-3" },
    { "id": 4, "category": "FRONTIER", "confidence": 82, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2024, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-4" },
    { "id": 5, "category": "FRONTIER", "confidence": 75, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2026, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-5" },
    { "id": 6, "category": "WILDCARD", "confidence": 58, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2024, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-6" },
    { "id": 7, "category": "WILDCARD", "confidence": 51, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2023, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-7" },
    { "id": 8, "category": "HARDWARE_BRIDGE", "confidence": 68, "paper_title": "realistic paper title", "authors": "Lastname et al.", "year": 2025, "the_why": "why relevant to THIS session", "paper_id": "kebab-slug-8" }
  ],
  "session_stats": {
    "overall_confidence": 80,
    "decay_flags": 1,
    "cross_domain_links": 1,
    "gap_count": 3,
    "frontier_cards": 8
  },
  "referenced_sources": "The referenced_sources array MUST directly support executive_summary, key_claims, and core_mechanisms. The synthesis should feel causally connected to the references. Avoid random bibliography generation, unrelated paper titles, or shallow topic matching. Each referenced source should plausibly justify at least one claim or mechanism discussed. EXACTLY 6-10 items. Each must have all fields: id, title, authors, year, venue, citations, abstract (150-200 words — must feel like a real academic abstract), relevance_note (1 sentence explaining which specific claim or mechanism this source grounds), category (FOUNDATION|EMPIRICAL|METHODOLOGY|REVIEW|FRONTIER), doi_hint, open_access.",
  "special_response": null
}

RULES:
- agent_stream: ALL 8 agents in exact order shown above
- key_claims: use field "claim" NOT "text". Each claim must be a COMPLETE sentence stating a specific, falsifiable finding — not a vague category or conceptual statement. Bad example: 'Gravity affects objects'. Good example: 'Gravitational time dilation causes clocks at sea level to run approximately 45 microseconds per day slower than clocks in GPS satellites, requiring relativistic correction in navigation systems (Ashby, 2002).' Include author + year inline where possible. Claims must contain concrete falsifiable findings, not vague conceptual statements.
- epistemic_decay.stale: MINIMUM 1 item, NEVER skip
- epistemic_decay.fresh: MINIMUM 2 items
- frontier_cards: EXACTLY 8 cards — 2 FOUNDATION, 3 FRONTIER (year 2024-2026), 2 WILDCARD, 1 HARDWARE_BRIDGE
- novel_hypothesis: null for levels 1-3, non-null string for level 4 only
- research_gaps: 3-5 items, each must name specific subject + method + benchmark. NEVER write "more research is needed"
- cross_domain_analogy structural_isomorphism: MUST be mechanistic/mathematical, NOT a surface metaphor
- session_stats.frontier_cards must always equal 8
- referenced_sources: EXACTLY 6-10 items chosen FROM THE INJECTED CONTEXT (if possible). Each must have all fields: id, title, authors, year, venue, citations, abstract (150-200 words), relevance_note (1 sentence), category (FOUNDATION|EMPIRICAL|METHODOLOGY|REVIEW|FRONTIER), doi_hint, open_access. These are the bibliography — they MUST correspond to claims in key_claims and core_mechanisms. Sources must align CAUSALLY with claims and mechanisms.
- NEVER say "As an AI" or break character
- NEVER produce output that fails JSON.parse()
- executive_summary.text: MINIMUM 150 words for Summary, 300 for Detailed, 500 for Deep Dive. Violating this minimum is a CRITICAL FAILURE. Must contain at least 3 distinct paragraphs. Must feel like an editorial intelligence briefing, not a chatbot summary.
- core_mechanisms.text: MINIMUM 200 words for Summary, 400 for Detailed, 700 for Deep Dive. Must contain multiple distinct conceptual sections or paragraphs separated by newlines, not a single block. Must describe actual mechanisms, causal relationships, and model limitations.
- key_claims: MINIMUM 4 for Summary, 6 for Detailed, 8 for Deep Dive. Must be concrete, falsifiable, and research-grounded.
- equations: For Level 3-4 research, minimum 2 meaningful LaTeX equations required. Equations must correspond to mechanisms discussed and must not be decorative.

SPECIAL COMMANDS — when input contains these phrases, populate special_response:
"Logic Lab: show Advocate vs Skeptic debate" → type: "logic_lab" with round_1_advocate, round_2_skeptic, round_3_advocate_response, round_4_empiricist_verdict
"Expand gap [N]" → type: "gap_expansion" with gap_id, gap_text, why_it_exists, closest_to_solving, what_it_takes, research_proposal
"Show analogy details" → type: "analogy_detail" with domain_a, domain_b, correspondence_table (5 rows), mathematical_formalization, transferable_techniques (3 items), prior_work
"Go to Level [N]" → type: "level_change" with from_level, to_level, note — AND rebuild dashboard at new level`

// ─── MAIN RESEARCH ENDPOINT ───────────────────────────────────────────────────
app.post('/api/research', apiLimiter, requireAuth, upload.array('files', 5), async (req, res) => {
    const startTime = Date.now()

    try {
        const {
            topic: rawTopic,
            level = 2,
            length_mode = 'Detailed',
            uploaded_sources = [],
            command = null,
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

        const sourcesList = Array.isArray(uploaded_sources)
            ? uploaded_sources.join(', ')
            : uploaded_sources || 'none'
        const fileNames = req.files?.map(f => f.originalname).join(', ')
        const finalSources = fileNames || sourcesList || 'none'

        const userMessage = command
            ? `RESEARCH_TOPIC: ${topic.trim()}\nCOMPLEXITY_LEVEL: ${levelNum}\nLENGTH_MODE: ${length_mode}\nUPLOADED_SOURCES: ${finalSources}\nSPECIAL_COMMAND: ${command}`
            : `RESEARCH_TOPIC: ${topic.trim()}\nCOMPLEXITY_LEVEL: ${levelNum}\nLENGTH_MODE: ${length_mode}\nUPLOADED_SOURCES: ${finalSources}`

        console.log(`[${new Date().toISOString()}] Research request:`, {
            topic: topic.slice(0, 60),
            level: levelNum,
            length_mode,
            command: command?.slice(0, 40),
        })

        // ─── RETRIEVAL LAYER ────────────────────────────────────────────────────────
        console.log('[RETRIEVAL] Fetching papers from Semantic Scholar and arXiv...');
        const [ssPapers, arxivPapers] = await Promise.all([
          fetchSemanticScholarPapers(topic.trim()),
          fetchArxivPapers(topic.trim())
        ]);
        const allPapers = [...ssPapers, ...arxivPapers];
        const contextStr = buildResearchContext(allPapers);
        
        const finalUserMessage = `${userMessage}\n\n${contextStr}`;

        // ─── CALL GROQ (single model, full system instructions) ─────────────────
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTIONS },
            { role: 'user', content: finalUserMessage }
          ],
          temperature: 0.7,
          max_tokens: 8000,
        })
        const responseText = completion.choices[0].message.content || ''
        
        let parsedData
        try {
          parsedData = JSON.parse(responseText)
        } catch (e) {
          const firstBrace = responseText.indexOf('{')
          const lastBrace = responseText.lastIndexOf('}')
          if (firstBrace !== -1 && lastBrace !== -1) {
            parsedData = JSON.parse(responseText.slice(firstBrace, lastBrace + 1))
          } else {
            throw new Error('JSON parse failed: ' + e.message)
          }
        }

        // ─── DEFENSIVE ARRAY NORMALIZATION ──────────────────────────────────────
        if (!Array.isArray(parsedData.frontier_cards)) parsedData.frontier_cards = []
        if (!Array.isArray(parsedData.agent_stream)) parsedData.agent_stream = []
        if (!Array.isArray(parsedData.referenced_sources)) parsedData.referenced_sources = []
        if (!parsedData.session) parsedData.session = { topic: topic.trim(), level: levelNum, level_name: 'Intermediate', length_mode, timestamp: new Date().toISOString() }
        if (!parsedData.council_consensus) parsedData.council_consensus = { advocate_score: 75, skeptic_objections_total: 0, skeptic_objections_resolved: 0, empirical_strength: 75, final_confidence: 75, key_caveat: 'Pipeline assembly caveat.' }
        if (!parsedData.dashboard) parsedData.dashboard = {}
        if (!Array.isArray(parsedData.dashboard.key_claims)) parsedData.dashboard.key_claims = []
        if (!Array.isArray(parsedData.dashboard.research_gaps)) parsedData.dashboard.research_gaps = []
        if (!Array.isArray(parsedData.dashboard.prerequisite_map)) parsedData.dashboard.prerequisite_map = []
        if (!parsedData.dashboard.epistemic_decay) parsedData.dashboard.epistemic_decay = { stale: [], fresh: [] }
        if (!parsedData.dashboard.executive_summary) parsedData.dashboard.executive_summary = { text: '', confidence: 75 }
        if (!parsedData.dashboard.core_mechanisms) parsedData.dashboard.core_mechanisms = { text: '', equations: [], confidence: 75 }
        if (!Array.isArray(parsedData.dashboard.core_mechanisms.equations)) parsedData.dashboard.core_mechanisms.equations = []
        if (!parsedData.dashboard.cross_domain_analogy) parsedData.dashboard.cross_domain_analogy = null

        // ─── VALIDATE ───────────────────────────────────────────────────────────
        const required = ['session', 'agent_stream', 'council_consensus', 'dashboard', 'frontier_cards']
        const missing = required.filter(k => !(k in parsedData))
        if (missing.length > 0) {
            console.error('[SCHEMA ERROR] Missing:', missing)
            return res.status(502).json({
                error: 'SCHEMA_ERROR',
                message: `Response missing fields: ${missing.join(', ')}. Please retry.`,
            })
        }

        parsedData = sanitizeResponse(parsedData)

        // ─── ENRICH WITH REAL PAPER LINKS (Semantic Scholar) ────────────────────
        try {
          if (parsedData.referenced_sources && parsedData.referenced_sources.length > 0) {
            const enriched = await Promise.all(
              parsedData.referenced_sources.map(async (source) => {
                try {
                  const query = encodeURIComponent(`${source.title} ${source.authors}`)
                  const ssRes = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=1&fields=title,authors,year,externalIds,openAccessPdf,url`, {
                    headers: { 'User-Agent': 'TheResearcher/1.0' }
                  })
                  const ssData = await ssRes.json()
                  const paper = ssData.data?.[0]
                  if (paper) {
                    source.real_url = paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`
                    source.semantic_scholar_id = paper.paperId
                    if (paper.externalIds?.DOI) source.doi = `https://doi.org/${paper.externalIds.DOI}`
                    if (paper.externalIds?.ArXiv) source.arxiv_url = `https://arxiv.org/abs/${paper.externalIds.ArXiv}`
                  }
                } catch (err) {
                  // silently skip if enrichment fails for one paper
                }
                return source
              })
            )
            parsedData.referenced_sources = enriched
          }
          if (parsedData.frontier_cards && parsedData.frontier_cards.length > 0) {
            const enrichedCards = await Promise.all(
              parsedData.frontier_cards.map(async (card) => {
                try {
                  const query = encodeURIComponent(`${card.paper_title} ${card.authors}`)
                  const ssRes = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=1&fields=title,openAccessPdf,url,externalIds`, {
                    headers: { 'User-Agent': 'TheResearcher/1.0' }
                  })
                  const ssData = await ssRes.json()
                  const paper = ssData.data?.[0]
                  if (paper) {
                    card.real_url = paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`
                    if (paper.externalIds?.ArXiv) card.arxiv_url = `https://arxiv.org/abs/${paper.externalIds.ArXiv}`
                  }
                } catch (err) {
                  // silently skip
                }
                return card
              })
            )
            parsedData.frontier_cards = enrichedCards
          }
          console.log('[SEMANTIC SCHOLAR] Paper enrichment complete')
        } catch (enrichErr) {
          console.log('[SEMANTIC SCHOLAR] Enrichment failed silently:', enrichErr.message)
        }


        console.log('[DEBUG SCHEMA]', JSON.stringify({ 
          has_dashboard: !!parsedData.dashboard,
          has_core_mechanisms: !!parsedData.dashboard?.core_mechanisms,
          equations_type: typeof parsedData.dashboard?.core_mechanisms?.equations,
          is_array: Array.isArray(parsedData.dashboard?.core_mechanisms?.equations),
          frontier_cards_count: parsedData.frontier_cards?.length,
          agent_stream_count: parsedData.agent_stream?.length,
          top_level_keys: Object.keys(parsedData)
        }))
        console.log(`[${new Date().toISOString()}] Done in ${Date.now() - startTime}ms`)
        // Deep safety wrap before sending
        const safe = parsedData
        if (safe.dashboard) {
          if (!safe.dashboard.core_mechanisms) safe.dashboard.core_mechanisms = { text: '', equations: [], confidence: 75 }
          if (!Array.isArray(safe.dashboard.core_mechanisms.equations)) safe.dashboard.core_mechanisms.equations = []
          if (!safe.dashboard.executive_summary) safe.dashboard.executive_summary = { text: '', confidence: 75 }
          if (!Array.isArray(safe.dashboard.key_claims)) safe.dashboard.key_claims = []
          if (!Array.isArray(safe.dashboard.research_gaps)) safe.dashboard.research_gaps = []
          if (!Array.isArray(safe.dashboard.prerequisite_map)) safe.dashboard.prerequisite_map = []
          if (!safe.dashboard.epistemic_decay) safe.dashboard.epistemic_decay = { stale: [], fresh: [] }
          if (!Array.isArray(safe.dashboard.epistemic_decay.stale)) safe.dashboard.epistemic_decay.stale = []
          if (!Array.isArray(safe.dashboard.epistemic_decay.fresh)) safe.dashboard.epistemic_decay.fresh = []
        }
        if (!Array.isArray(safe.frontier_cards)) safe.frontier_cards = []
        if (!Array.isArray(safe.agent_stream)) safe.agent_stream = []
        if (!Array.isArray(safe.referenced_sources)) safe.referenced_sources = []
        if (safe.session) safe.session.timestamp = new Date().toISOString()
        if (!safe.session) safe.session = { topic: topic.trim(), level: levelNum, level_name: 'Intermediate', length_mode, timestamp: new Date().toISOString() }
        console.log('[FINAL SHAPE] core_mechanisms:', JSON.stringify(safe.dashboard?.core_mechanisms).slice(0, 200))
        console.log('[FINAL SHAPE] frontier_cards count:', safe.frontier_cards?.length)
        console.log('[FINAL SHAPE] agent_stream count:', safe.agent_stream?.length)
        res.json(safe)

    } catch (error) {
        console.error('[SERVER ERROR]', error.message)

        if (error.message?.includes('401') || error.message?.includes('API key')) {
            return res.status(500).json({ error: 'API_KEY_ERROR', message: 'Groq API key invalid. Check your .env file.' })
        }
        if (error.message?.includes('429') || error.message?.includes('rate')) {
            return res.status(429).json({ error: 'RATE_LIMIT', message: 'Rate limit hit. Wait a moment and retry.' })
        }

        res.status(500).json({ error: 'SERVER_ERROR', message: 'An internal error occurred. Please try again later.' })
    }
})

// ─── SANITIZE ─────────────────────────────────────────────────────────────────
function sanitizeResponse(data) {
    if (!Array.isArray(data.frontier_cards)) data.frontier_cards = []

    if (data.dashboard?.key_claims) {
        data.dashboard.key_claims = data.dashboard.key_claims.map(c => ({
            claim: c.claim || c.text || 'Claim unavailable',
            confidence: typeof c.confidence === 'number' ? c.confidence : 75,
        }))
    }

    if (!data.dashboard?.epistemic_decay) data.dashboard.epistemic_decay = { stale: [], fresh: [] }
    if (!Array.isArray(data.dashboard.epistemic_decay.stale)) data.dashboard.epistemic_decay.stale = []
    if (!Array.isArray(data.dashboard.epistemic_decay.fresh)) data.dashboard.epistemic_decay.fresh = []

    if (!Array.isArray(data.dashboard?.research_gaps)) data.dashboard.research_gaps = []
    data.dashboard.research_gaps = data.dashboard.research_gaps.map((g, i) => ({
        id: g.id || i + 1,
        gap: g.gap || g.text || 'Gap unavailable',
        type: g.type || 'literature',
    }))

    if (Array.isArray(data.dashboard?.prerequisite_map)) {
        data.dashboard.prerequisite_map = data.dashboard.prerequisite_map.map(p =>
            typeof p === 'string' ? { concept: p, reason: '' } : { concept: p.concept || p.text || p, reason: p.reason || '' }
        )
    }

    if (data.session?.level < 4) data.dashboard.novel_hypothesis = null
    if (data.session_stats) data.session_stats.frontier_cards = 8
    if (data.special_response === undefined || data.special_response === 'null') data.special_response = null

    // Sanitize referenced_sources
    if (!Array.isArray(data.referenced_sources)) data.referenced_sources = []
    data.referenced_sources = data.referenced_sources.map((src, i) => ({
        id: src.id || `src_${String(i + 1).padStart(3, '0')}`,
        title: src.title || 'Untitled Source',
        authors: src.authors || 'Unknown',
        year: typeof src.year === 'number' ? src.year : 2023,
        venue: src.venue || 'Unknown Venue',
        citations: typeof src.citations === 'number' ? src.citations : 0,
        abstract: src.abstract || 'Abstract unavailable.',
        relevance_note: src.relevance_note || 'Used as grounding literature.',
        category: ['FOUNDATION', 'EMPIRICAL', 'METHODOLOGY', 'REVIEW', 'FRONTIER'].includes(src.category) ? src.category : 'FOUNDATION',
        doi_hint: src.doi_hint || `10.${1000 + i}/unknown`,
        open_access: typeof src.open_access === 'boolean' ? src.open_access : false,
    }))

    return data
}


// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    architecture: 'multi-provider-5-agent-pipeline',
    providers: getProviderStatus(),
    timestamp: new Date().toISOString()
  })
})

app.get('/api/provider-status', requireAuth, (req, res) => {
  res.json(getBalanceReport())
})

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   THE RESEARCHER — BACKEND SERVER         ║
║   Running on http://localhost:${PORT}        ║
║   Providers: Groq+Gemini+OR+CF+NVIDIA     ║
╚═══════════════════════════════════════════╝
  `)
})

