import type { ResearchResponse, SpecialResponse, ResearchSession } from "./types";
import { auth } from "./firebase";

export interface ResearchRequest {
  topic: string;
  level: 1 | 2 | 3 | 4;
  length_mode: "Summary" | "Detailed" | "Deep Dive";
  uploaded_sources: string[];
  command?: string;
  filters?: {
    dateRange: { from: number; to: number };
    country: string;
    journalRank: string;
    minCitations: number;
  };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : "/api";
/**
 * Calls the AI research backend. If VITE_API_BASE_URL is not set we fall back
 * to a local mock so the whole UI is demoable end-to-end.
 */

export async function callResearchAPI(req: ResearchRequest): Promise<ResearchResponse> {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return mockResearch(req);
  }

  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  
  const token = await firebaseUser.getIdToken();

  const res = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as ResearchResponse;
}

function buildSpecial(req: ResearchRequest, t: string): SpecialResponse | null {
  const cmd = req.command ?? "";
  if (cmd.startsWith("logic_lab")) {
    return {
      type: "logic_lab",
      round_1_advocate: `The strongest case for "${t}": converging evidence from three independent labs, replication N=11, effect size d=0.82.`,
      round_2_skeptic:
        "Counter: 9 of 11 replications used overlapping populations. Effect size collapses to d=0.31 once stratified by collection year.",
      round_3_advocate_response:
        "Stratification artifact — collection year correlates with instrument calibration. Re-analysis using the calibrated subset restores d=0.74.",
      round_4_empiricist_verdict: {
        text:
          "Both sides cite the same dataset. Until pre-registered out-of-sample replication exists, treat the claim as plausible but unsettled.",
        confidence: 62,
        ruling: "HUNG_JURY",
      },
    };
  }
  if (cmd.startsWith("expand_gap")) {
    const id = Number(cmd.split(":")[1] ?? 1);
    return {
      type: "gap_expansion",
      gap_id: id,
      gap_text: `Mechanistic interpretability of ${t} at scale.`,
      why_it_exists:
        "Existing tools target sub-billion-parameter models; activations at frontier scale are too high-dimensional for current sparse-autoencoder pipelines.",
      closest_to_solving:
        "Anthropic's dictionary-learning work (2024) and DeepMind's Gemma Scope come closest, but only cover narrow circuits.",
      what_it_takes:
        "Compute-efficient sparse coding + a shared benchmark suite spanning 5 model families and 10 capability axes.",
      research_proposal:
        "Phase 1 (3mo): replicate dictionary learning on 7B / 70B / 400B checkpoints. Phase 2 (6mo): release a unified circuits-benchmark. Phase 3 (12mo): publish causal-intervention atlas.",
    };
  }
  if (cmd.startsWith("set_level")) {
    const to = Number(cmd.split(":")[1] ?? req.level) as 1 | 2 | 3 | 4;
    return {
      type: "level_change",
      from_level: req.level,
      to_level: to,
      note: `Recalibrated dashboard for L${to} (${["", "Casual", "Curious", "Specialist", "Expert"][to]}).`,
    };
  }
  return null;
}

async function mockResearch(req: ResearchRequest): Promise<ResearchResponse> {
  await new Promise((r) => setTimeout(r, 400));
  const t = req.topic || "Selected Topic";
  const special = buildSpecial(req, t);

  return {
    session: {
      topic: t,
      level: req.level,
      level_name: ["", "Casual", "Curious", "Specialist", "Expert"][req.level],
      length_mode: req.length_mode,
      timestamp: new Date().toISOString(),
    },
    agent_stream: [
      { agent: "ORCHESTRATOR", color: "electric", lines: [`Booting cognitive pipeline for "${t}"…`, "Allocating 8 agents.", "Topology: parallel-then-converge."] },
      { agent: "SCOUT", color: "lime", lines: ["Sweeping arXiv + Nature + Semantic Scholar.", "412 candidate papers found.", "Filtering by relevance > 0.78… 96 retained."] },
      { agent: "CLASSIFIER", color: "periwinkle", lines: ["Tagging by subfield, method, recency.", "Discovered 4 sub-clusters."] },
      { agent: "GRAPH_ARCHITECT", color: "periwinkle", lines: ["Building citation + concept graph.", "1,284 edges · 96 nodes.", "Identifying chokepoints…"] },
      { agent: "ADVOCATE", color: "cream", lines: ["Drafting strongest narrative.", "Anchored to 6 high-confidence claims."] },
      { agent: "SKEPTIC", color: "sakura", lines: ["Stress-testing 6 dominant claims.", "Flagged 2 epistemic decay candidates.", "Demanding pre-registered replications."] },
      { agent: "EMPIRICIST", color: "cream", lines: ["Cross-referencing reproducibility scores.", "Empirical strength: 0.81"] },
      { agent: "SYNTHESIS", color: "electric", lines: ["Council consensus reached.", "Compiling dashboard panels.", "Ready."] },
    ],
    council_consensus: {
      advocate_score: 86,
      skeptic_objections_total: 6,
      skeptic_objections_resolved: 5,
      empirical_strength: 81,
      final_confidence: 84,
      key_caveat: "Findings hold under current methodology but assume access to large compute.",
    },
    dashboard: {
      executive_summary: {
        text: `${t} sits at the intersection of multiple converging research programs. The dominant view holds, but a small frontier of dissenting work has gained measurable traction in the last 18 months.`,
        confidence: 84,
      },
      core_mechanisms: {
        text: "The underlying mechanism can be decomposed into three coupled processes operating across distinct timescales.",
        equations: req.level >= 3 ? ["dX/dt = α·X·(1 − X/K)", "L = E_q[log p(x|z)] − KL(q‖p)"] : [],
        confidence: 78,
      },
      key_claims: [
        { claim: `Recent work shows ${t} scales sub-linearly with parameter count.`, confidence: 88 },
        { claim: "Cross-task transfer dominates single-task fine-tuning under matched FLOPs.", confidence: 74 },
        { claim: "Emergent behaviors appear above ~10²² FLOPs — but the threshold is metric-dependent.", confidence: 62 },
      ],
      epistemic_decay: {
        stale: [
          { claim: "Earlier 2019 scaling laws are universal.", stale_as_of: "2024", superseded_by: "Hoffmann et al. (Chinchilla)", impact: "Replanned compute budgets across the field." },
        ],
        fresh: [
          { claim: "Inference-time compute trades off favorably with model size.", last_validated: "2025", source: "OpenAI o-series technical reports" },
        ],
      },
      cross_domain_analogy: {
        domain_a: t,
        domain_b: "Statistical mechanics of disordered systems",
        structural_isomorphism: "Both exhibit phase transitions driven by a scalar control parameter and freezing of micro-configurations below a critical threshold.",
        implication: "Tools from spin-glass theory may apply directly.",
        transferable_technique: "Replica method for averaging over disorder.",
      },
      research_gaps: [
        { id: 1, gap: `Mechanistic interpretability of ${t} at scale remains underdeveloped.`, type: "methodological" },
        { id: 2, gap: "No agreed-upon benchmark isolates causal reasoning from pattern completion.", type: "empirical" },
        { id: 3, gap: "Theoretical limits of in-context learning are unknown.", type: "theoretical" },
      ],
      novel_hypothesis:
        req.level === 4
          ? `If ${t} truly behaves like a disordered system near criticality, then targeted noise injection should produce measurable improvements in generalization at the critical temperature.`
          : null,
      prerequisite_map: [
        { concept: "Probability & information theory", reason: "Foundation for likelihood-based reasoning." },
        { concept: "Optimization", reason: "Required to interpret loss landscapes." },
        { concept: "Statistical learning theory", reason: "Generalization bounds." },
        { concept: t, reason: "Subject under study." },
      ],
    },
    frontier_cards: [
      { id: 1, category: "FOUNDATION", confidence: 95, paper_title: `Foundations of ${t}`, authors: "Sutton & Barto", year: 2018, the_why: "The canonical reference. Read first.", paper_id: "f1" },
      { id: 2, category: "FRONTIER", confidence: 82, paper_title: `Scaling ${t} to 10⁵ agents`, authors: "Park et al.", year: 2025, the_why: "First demonstration of multi-agent emergence at population scale.", paper_id: "f2" },
      { id: 3, category: "WILDCARD", confidence: 58, paper_title: "Compositional priors from neuroscience", authors: "Lake & Tenenbaum", year: 2024, the_why: "Heretical but worth your weekend.", paper_id: "f3" },
      { id: 4, category: "HARDWARE_BRIDGE", confidence: 71, paper_title: "Analog substrates for inference", authors: "Mythic AI Lab", year: 2024, the_why: "Where the silicon meets the math.", paper_id: "f4" },
      { id: 5, category: "FOUNDATION", confidence: 90, paper_title: "A Theory of Generalization", authors: "Vapnik", year: 1998, the_why: "PAC-learning bedrock.", paper_id: "f5" },
      { id: 6, category: "FRONTIER", confidence: 79, paper_title: `${t} under distribution shift`, authors: "Koh et al.", year: 2025, the_why: "The OOD problem reframed.", paper_id: "f6" },
      { id: 7, category: "WILDCARD", confidence: 51, paper_title: "Free-energy and minds", authors: "Friston", year: 2024, the_why: "Cosmic, contested, and oddly predictive.", paper_id: "f7" },
      { id: 8, category: "HARDWARE_BRIDGE", confidence: 68, paper_title: "Optical neural primitives", authors: "Lightmatter", year: 2025, the_why: "Photons doing matmuls in nanoseconds.", paper_id: "f8" },
    ],
    session_stats: {
      overall_confidence: 84,
      decay_flags: 2,
      cross_domain_links: 1,
      gap_count: 3,
      frontier_cards: 8,
    },
    special_response: special,
  };
}
