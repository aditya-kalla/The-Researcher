import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import multer from 'multer'

dotenv.config()

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))

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

THE 7-AGENT COUNCIL:
ORCHESTRATOR (electric) — Terse, executive. Decomposes the query into tasks.
SCOUT (lime) — Citation-heavy. Finds papers, maps the literature.
CLASSIFIER (periwinkle) — Precise. Routes complexity, maps prerequisite chain.
GRAPH_ARCHITECT (periwinkle) — Structural. Finds analogies, builds knowledge graph.
ADVOCATE (cream) — Confident. Marshals evidence, never hedges.
SKEPTIC (sakura) — Adversarial. Finds epistemic decay, attacks claims.
EMPIRICIST (cream) — Quantitative. Confidence-scores every claim.
SYNTHESIS (electric) — Final writer. Adapts output depth to level.

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
    { "agent": "ORCHESTRATOR", "color": "electric", "lines": ["→ Task 1: ...", "→ Task 2: ...", "→ Task 3: ...", "→ Task 4: ...", "→ Task 5: ..."] },
    { "agent": "SCOUT", "color": "lime", "lines": ["✓ Found: [Title], [Author et al.], [Year] — [note]", "✓ Found: [Title], [Author et al.], [Year] — [note]", "✓ Found: [Title], [Author et al.], [Year] — [note]", "✓ Found: [Title], [Author et al.], [Year] — [note]", "⚑ Extracting LaTeX from [paper]... DONE", "⚑ Parsing lecture slides: [source]... DONE"] },
    { "agent": "CLASSIFIER", "color": "periwinkle", "lines": ["→ Tier [X]: [Name]", "→ Prerequisite graph: [A] → [B] → [C] → TOPIC", "→ Estimated user gap: [what user likely doesn't know]"] },
    { "agent": "GRAPH_ARCHITECT", "color": "periwinkle", "lines": ["PREREQUISITE: [A] → [B]", "CAUSAL: [X] causes [Y]", "◈ CROSS-DOMAIN LINK DETECTED: [DomainA] ↔ [DomainB] — [reason]"] },
    { "agent": "ADVOCATE", "color": "cream", "lines": ["Primary claim: [claim]", "Best evidence: [Author et al., Year] demonstrated [finding]", "Logical chain: [A] → [B] → [conclusion]", "Strength: HIGH"] },
    { "agent": "SKEPTIC", "color": "sakura", "lines": ["Challenge: [specific challenge]", "⚠ EPISTEMIC DECAY DETECTED: [outdated claim]", "↳ Was true as of [Year]. Superseded by [Author et al., Year]: [new finding].", "Citation gap: [missing citation]", "Weakness: [methodological weakness]"] },
    { "agent": "EMPIRICIST", "color": "cream", "lines": ["→ Claim verified: '[claim]' ✓ [N]%", "→ Claim verified: '[claim]' ✓ [N]%", "→ Claim flagged: '[claim]' — insufficient replication evidence", "→ Overall empirical strength: [N]%"] },
    { "agent": "SYNTHESIS", "color": "electric", "lines": ["Council deliberation complete. Composing output at Level [X]..."] }
  ],
  "council_consensus": {
    "advocate_score": 82,
    "skeptic_objections_total": 3,
    "skeptic_objections_resolved": 2,
    "empirical_strength": 78,
    "final_confidence": 80,
    "key_caveat": "string — the single most important limitation"
  },
  "dashboard": {
    "executive_summary": { "text": "A rich, multi-paragraph executive summary of 200-350 words. Must include: (1) a plain-language definition of the topic, (2) WHY it matters scientifically and practically, (3) the current state of the field, (4) the single most contested or uncertain aspect. Scaled by length_mode: Summary=150w, Detailed=300w, Deep Dive=500w. Never write fewer than 3 paragraphs.", "confidence": 82 },
    "core_mechanisms": { "text": "A structured multi-section explanation of HOW the topic works at a mechanistic level. Must include: (1) the primary mechanism in plain terms, (2) the key variables and what changing them does, (3) how sub-components interact, (4) where current models break down. Scaled by length_mode: Summary=200w, Detailed=400w, Deep Dive=700w+. For Level 3-4, include minimum 2 LaTeX-formatted equations in the equations array. Never reduce to a single paragraph.", "equations": [], "confidence": 80 },
    "key_claims": [
      { "claim": "string", "confidence": 88 },
      { "claim": "string", "confidence": 74 },
      { "claim": "string", "confidence": 91 },
      { "claim": "string", "confidence": 67 }
    ],
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
  "referenced_sources": [
    { "id": "src_001", "title": "Full paper title grounding a key claim", "authors": "Smith, J., Lee, K., et al.", "year": 2022, "venue": "Nature Machine Intelligence", "citations": 340, "abstract": "A 150-200 word abstract summarizing the paper's contribution, methodology, and key findings. Must feel like a real academic abstract.", "relevance_note": "One sentence explaining why the agents used this paper to support a specific claim.", "category": "FOUNDATION", "doi_hint": "10.1038/s42256-022-00001-1", "open_access": true },
    { "id": "src_002", "title": "Another grounding paper title", "authors": "Chen, W., Patel, R.", "year": 2023, "venue": "ICML 2023", "citations": 128, "abstract": "150-200 word abstract...", "relevance_note": "Why agents used this.", "category": "EMPIRICAL", "doi_hint": "10.xxxx/xxxxx", "open_access": false }
  ],
  "special_response": null
}

RULES:
- agent_stream: ALL 8 agents in exact order shown above
- key_claims: use field "claim" NOT "text". Minimum 4 for Summary, 6 for Detailed, 8 for Deep Dive. Each claim must be a COMPLETE sentence stating a specific, falsifiable finding — not a vague category. Bad example: 'Gravity affects objects'. Good example: 'Gravitational time dilation causes clocks at sea level to run approximately 45 microseconds per day slower than clocks in GPS satellites, requiring relativistic correction in navigation systems (Ashby, 2002).' Include author + year inline where possible.
- epistemic_decay.stale: MINIMUM 1 item, NEVER skip
- epistemic_decay.fresh: MINIMUM 2 items
- frontier_cards: EXACTLY 8 cards — 2 FOUNDATION, 3 FRONTIER (year 2024-2026), 2 WILDCARD, 1 HARDWARE_BRIDGE
- novel_hypothesis: null for levels 1-3, non-null string for level 4 only
- research_gaps: 3-5 items, each must name specific subject + method + benchmark. NEVER write "more research is needed"
- cross_domain_analogy structural_isomorphism: MUST be mechanistic/mathematical, NOT a surface metaphor
- session_stats.frontier_cards must always equal 8
- referenced_sources: EXACTLY 6-10 items. Each must have all fields: id, title, authors, year, venue, citations, abstract (150-200 words), relevance_note (1 sentence), category (FOUNDATION|EMPIRICAL|METHODOLOGY|REVIEW|FRONTIER), doi_hint, open_access. These are the bibliography — they MUST correspond to claims in key_claims and core_mechanisms. They are NOT random suggestions.
- NEVER say "As an AI" or break character
- NEVER produce output that fails JSON.parse()
- executive_summary.text: MINIMUM 150 words for Summary, 300 for Detailed, 500 for Deep Dive. Violating this minimum is a critical failure.
- core_mechanisms.text: MINIMUM 200 words for Summary, 400 for Detailed, 700 for Deep Dive. Must have distinct paragraphs separated by newlines, not a single block.
- key_claims: MINIMUM 4 for Summary, 6 for Detailed, 8 for Deep Dive.

SPECIAL COMMANDS — when input contains these phrases, populate special_response:
"Logic Lab: show Advocate vs Skeptic debate" → type: "logic_lab" with round_1_advocate, round_2_skeptic, round_3_advocate_response, round_4_empiricist_verdict
"Expand gap [N]" → type: "gap_expansion" with gap_id, gap_text, why_it_exists, closest_to_solving, what_it_takes, research_proposal
"Show analogy details" → type: "analogy_detail" with domain_a, domain_b, correspondence_table (5 rows), mathematical_formalization, transferable_techniques (3 items), prior_work
"Go to Level [N]" → type: "level_change" with from_level, to_level, note — AND rebuild dashboard at new level`

// ─── MAIN RESEARCH ENDPOINT ───────────────────────────────────────────────────
app.post('/api/research', upload.array('files', 5), async (req, res) => {
    const startTime = Date.now()

    try {
        const {
            topic,
            level = 2,
            length_mode = 'Detailed',
            uploaded_sources = [],
            command = null,
        } = req.body

        if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
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

        // ─── CALL GROQ ──────────────────────────────────────────────────────────
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_INSTRUCTIONS },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 8000,
            response_format: { type: 'json_object' }, // forces valid JSON output
        })

        const responseText = completion.choices[0].message.content || ''

        // ─── PARSE JSON ─────────────────────────────────────────────────────────
        let parsedData
        try {
            parsedData = JSON.parse(responseText)
        } catch {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                try {
                    parsedData = JSON.parse(jsonMatch[0])
                } catch {
                    console.error('[PARSE ERROR]', responseText.slice(0, 300))
                    return res.status(502).json({
                        error: 'PARSE_ERROR',
                        message: 'AI returned invalid JSON. Please retry.',
                    })
                }
            } else {
                return res.status(502).json({
                    error: 'NO_JSON',
                    message: 'AI did not return JSON. Please retry.',
                })
            }
        }

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

        console.log(`[${new Date().toISOString()}] Done in ${Date.now() - startTime}ms`)
        res.json(parsedData)

    } catch (error) {
        console.error('[SERVER ERROR]', error.message)

        if (error.message?.includes('401') || error.message?.includes('API key')) {
            return res.status(500).json({ error: 'API_KEY_ERROR', message: 'Groq API key invalid. Check your .env file.' })
        }
        if (error.message?.includes('429') || error.message?.includes('rate')) {
            return res.status(429).json({ error: 'RATE_LIMIT', message: 'Rate limit hit. Wait a moment and retry.' })
        }

        res.status(500).json({ error: 'SERVER_ERROR', message: error.message || 'Unknown error. Please retry.' })
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
    res.json({ status: 'ok', model: 'llama-3.3-70b-versatile (Groq)', timestamp: new Date().toISOString() })
})

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   THE RESEARCHER — BACKEND SERVER         ║
║   Running on http://localhost:${PORT}        ║
║   Model: llama-3.3-70b-versatile (Groq)   ║
╚═══════════════════════════════════════════╝
  `)
})
