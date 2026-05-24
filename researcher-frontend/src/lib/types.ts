export type AgentColor = "electric" | "lime" | "periwinkle" | "cream" | "sakura";

export interface AgentStreamEntry {
  agent: string;
  color: AgentColor;
  lines: string[];
}

export interface KeyClaim {
  claim: string;
  confidence: number;
}

export interface ReferencedSource {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  citations: number;
  abstract: string;
  relevance_note: string;
  category: 'FOUNDATION' | 'EMPIRICAL' | 'METHODOLOGY' | 'REVIEW' | 'FRONTIER';
  doi_hint: string;
  open_access: boolean;
}

export interface ResearchResponse {
  session: {
    topic: string;
    level: 1 | 2 | 3 | 4;
    level_name: string;
    length_mode: string;
    timestamp: string;
  };
  agent_stream: AgentStreamEntry[];
  council_consensus: {
    advocate_score: number;
    skeptic_objections_total: number;
    skeptic_objections_resolved: number;
    empirical_strength: number;
    final_confidence: number;
    key_caveat: string;
  };
  dashboard: {
    executive_summary: { text: string; confidence: number };
    core_mechanisms: { text: string; equations: string[]; confidence: number };
    key_claims: KeyClaim[];
    epistemic_decay: {
      stale: Array<{ claim: string; stale_as_of: string; superseded_by: string; impact: string }>;
      fresh: Array<{ claim: string; last_validated: string; source: string }>;
    };
    cross_domain_analogy: {
      domain_a: string;
      domain_b: string;
      structural_isomorphism: string;
      implication: string;
      transferable_technique: string;
    };
    research_gaps: Array<{ id: number; gap: string; type: string }>;
    novel_hypothesis: string | null;
    prerequisite_map: Array<{ concept: string; reason: string }>;
  };
  frontier_cards: Array<{
    id: number;
    category: "FOUNDATION" | "FRONTIER" | "WILDCARD" | "HARDWARE_BRIDGE";
    confidence: number;
    paper_title: string;
    authors: string;
    year: number;
    the_why: string;
    paper_id: string;
  }>;
  session_stats: {
    overall_confidence: number;
    decay_flags: number;
    cross_domain_links: number;
    gap_count: number;
    frontier_cards: number;
  };
  referenced_sources?: ReferencedSource[];
  special_response: SpecialResponse | null;
}

export type SpecialResponse =
  | { type: "level_change"; from_level: number; to_level: number; note: string }
  | {
      type: "logic_lab";
      round_1_advocate: string;
      round_2_skeptic: string;
      round_3_advocate_response: string;
      round_4_empiricist_verdict: { text: string; confidence: number; ruling: "CONSENSUS" | "HUNG_JURY" };
    }
  | {
      type: "gap_expansion";
      gap_id: number;
      gap_text: string;
      why_it_exists: string;
      closest_to_solving: string;
      what_it_takes: string;
      research_proposal: string;
    };

export interface ResearchSession {
  id: string;
  title: string;
  topic: string;
  level: 1 | 2 | 3 | 4;
  lengthMode: "Summary" | "Detailed" | "Deep Dive";
  createdAt: string;
  researchData?: ResearchResponse;
}
