import { RetroWindow } from "./RetroWindow";
import { PixelProgressBar } from "./PixelProgressBar";
import type { ResearchResponse } from "@/lib/types";

export function RightPanel({ data }: { data: ResearchResponse | null }) {
  return (
    <aside className="w-[300px] shrink-0 space-y-4 border-l border-pixel-border bg-session-dark p-4">
      <RetroWindow title="PREREQUISITE_MAP.sys" collapsible defaultCollapsed={false}>
        {data ? (
          <div className="flex flex-col items-center gap-2">
            {data.dashboard.prerequisite_map.map((n, i) => {
              const last = i === data.dashboard.prerequisite_map.length - 1;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`flex h-14 w-14 items-center justify-center border font-mono text-[8px] text-center leading-tight ${
                      last ? "border-electric-accent text-electric-accent pulse-glow" : "border-pixel-border text-mono-white"
                    }`}
                  >
                    {n.concept.slice(0, 18)}
                  </div>
                  {!last && <div className="my-1 h-4 w-px bg-pixel-border" />}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty />
        )}
      </RetroWindow>

      <RetroWindow title="CONFIDENCE_VECTOR.dat" collapsible>
        {data ? (
          <div className="space-y-3">
            <PixelProgressBar value={data.session_stats.overall_confidence} label="OVERALL" color="electric" />
            <PixelProgressBar value={data.council_consensus.empirical_strength} label="EMPIRICAL" color="lime" />
            <PixelProgressBar
              value={Math.min(100, data.dashboard.key_claims.length * 25)}
              label="CITATION DENSITY"
              color="periwinkle"
            />
          </div>
        ) : (
          <Empty />
        )}
      </RetroWindow>

      <RetroWindow title="SESSION_STATS.log" variant="terminal" collapsible>
        {data ? (
          <div className="space-y-1 font-mono text-[11px] text-lime-signal">
            <p>{`> Decay flags: ${data.session_stats.decay_flags}`}</p>
            <p>{`> Gaps found: ${data.session_stats.gap_count}`}</p>
            <p>{`> Cross-domain: ${data.session_stats.cross_domain_links}`}</p>
            <p>{`> Frontier: ${data.session_stats.frontier_cards}`}</p>
            <p>{`> Agents: 7`}</p>
            <p>{`> Level: L${data.session.level}`}</p>
          </div>
        ) : (
          <p className="font-mono text-[11px] text-mouse-gray">awaiting session…</p>
        )}
      </RetroWindow>
    </aside>
  );
}

function Empty() {
  return <p className="font-mono text-[11px] text-mouse-gray">No active session yet.</p>;
}
