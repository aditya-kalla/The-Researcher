import 'dotenv/config';
import { runAgentPipeline } from './agentOrchestrator.js';

async function test() {
  console.log("Starting test...");
  const reqBody = { topic: "supernatural phenomenon", level: 2, length_mode: "Detailed" };
  const parsedData = await runAgentPipeline(reqBody.topic, reqBody.level, reqBody.length_mode, null, reqBody);
  
  const safe = parsedData || {};
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
  
  const cmStr = JSON.stringify(safe.dashboard?.core_mechanisms) || "undefined";
  console.log('[FINAL SHAPE] core_mechanisms:', cmStr.slice(0, 200))
  console.log('[FINAL SHAPE] frontier_cards count:', safe.frontier_cards?.length)
  console.log('[FINAL SHAPE] agent_stream count:', safe.agent_stream?.length)
}

test().catch(console.error);
