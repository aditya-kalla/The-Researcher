import { RetroWindow } from "./RetroWindow";
import { PixelProgressBar } from "./PixelProgressBar";
import { motion } from "framer-motion";
import type { ResearchResponse } from "@/lib/types";

const stagger = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export function DashboardPanels({
  data,
  onExpandGap,
  onAnalogyDetail,
  onExport,
  annotations,
  onToggleBookmark,
}: {
  data: ResearchResponse;
  onExpandGap?: (id: number) => void;
  onAnalogyDetail?: () => void;
  onExport?: () => void;
  annotations?: { bookmarkedClaims: string[] };
  onToggleBookmark?: (claim: string) => void;
}) {
  const d = data.dashboard;
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <p className="font-pixel text-[9px] text-mouse-gray">SESSION COMPLETE</p>
          <h2 className="mt-1 font-pixel text-[13px] text-cream-terminal">
            ◆ {data.session.topic}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-mouse-gray">
            L{data.session.level} · {data.session.level_name} · {data.session.length_mode}
          </p>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="border-2 border-black bg-electric-accent px-4 py-2 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
          >
            ▼ EXPORT PDF
          </button>
        )}
      </motion.div>

      {/* Executive summary */}
      <motion.div variants={item}>
        <RetroWindow title="EXECUTIVE_SUMMARY.exe">
          <p className="whitespace-pre-line font-body text-[16px] leading-[1.9] text-[rgba(245,237,211,0.9)]">{d.executive_summary.text}</p>
          <div className="mt-4">
            <PixelProgressBar value={d.executive_summary.confidence} label="CONFIDENCE" color="electric" />
          </div>
        </RetroWindow>
      </motion.div>

      {/* Core mechanisms */}
      <motion.div variants={item}>
        <RetroWindow title="CORE_MECHANISMS.sys">
          <p className="whitespace-pre-line font-body text-[14px] leading-[1.8] text-[rgba(245,237,211,0.8)]">{d.core_mechanisms.text}</p>
          {d.core_mechanisms.equations.length > 0 && (
            <div className="mt-3 space-y-2 border border-pixel-border bg-black p-3">
              {d.core_mechanisms.equations.map((eq, i) => (
                <p key={i} className="font-mono text-[12px] text-lime-signal">
                  {eq}
                </p>
              ))}
            </div>
          )}
          <div className="mt-4">
            <PixelProgressBar value={d.core_mechanisms.confidence} label="CONFIDENCE" color="periwinkle" />
          </div>
        </RetroWindow>
      </motion.div>

      {/* Key claims */}
      <motion.div variants={item}>
        <h3 className="mb-3 font-pixel text-[10px] tracking-wider text-cream-terminal">KEY_CLAIMS.dat</h3>
        <motion.div variants={stagger} className="space-y-3">
          {d.key_claims.map((c, i) => {
            const claimId = c.claim.slice(0, 60);
            const isBookmarked = annotations?.bookmarkedClaims.includes(claimId);
            return (
              <motion.div key={i} variants={item}>
                <RetroWindow title={`◆ CLAIM [${c.confidence}%]`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleBookmark?.(claimId)}
                      className={`shrink-0 mt-1 font-pixel text-[10px] transition-all duration-200 ${
                        isBookmarked
                          ? "text-lime-signal opacity-100"
                          : "text-mouse-gray opacity-40 hover:opacity-100 hover:scale-110 hover:text-lime-signal hover:drop-shadow-[0_0_8px_rgba(212,248,122,0.8)]"
                      }`}
                    >
                      ◆
                    </button>
                    <div className="flex-1">
                      <p className="font-body text-[13px] leading-[1.7] text-[rgba(245,237,211,0.85)]">{c.claim}</p>
                      <div className="mt-3">
                        <PixelProgressBar value={c.confidence} color="lime" size="sm" showValue={false} />
                      </div>
                    </div>
                  </div>
                </RetroWindow>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Epistemic decay */}
      <motion.div variants={item}>
        <RetroWindow title="⚠ EPISTEMIC_DECAY.log" variant="alert">
          {d.epistemic_decay.stale.map((s, i) => (
            <div key={`s${i}`} className="mb-3">
              <p className="font-mono text-[12px] text-sakura-alert line-through opacity-80">{s.claim}</p>
              <p className="mt-1 font-mono text-[10px] text-mouse-gray">
                stale as of {s.stale_as_of} · superseded by {s.superseded_by}
              </p>
              <p className="mt-1 font-body text-[12px] italic text-mono-white/70">impact: {s.impact}</p>
            </div>
          ))}
          {d.epistemic_decay.fresh.map((f, i) => (
            <div key={`f${i}`} className="border-t border-pixel-border pt-3">
              <p className="font-mono text-[12px] text-lime-signal">✓ {f.claim}</p>
              <p className="mt-1 font-mono text-[10px] text-mouse-gray">
                validated {f.last_validated} · {f.source}
              </p>
            </div>
          ))}
        </RetroWindow>
      </motion.div>

      {/* Cross-domain analogy */}
      <motion.div variants={item}>
        <RetroWindow title="◈ CROSS_DOMAIN_LINK.dat" variant="accent">
          <div className="flex items-center justify-around py-2">
            <PixelNode label={d.cross_domain_analogy.domain_a} color="var(--accent-primary)" />
            <DashedArrow />
            <PixelNode label={d.cross_domain_analogy.domain_b} color="var(--accent-signal)" />
          </div>
          <p className="mt-4 font-body text-[13px] italic leading-[1.7] text-[rgba(245,237,211,0.85)]">
            {d.cross_domain_analogy.structural_isomorphism}
          </p>
          <p className="mt-2 font-mono text-[11px] text-periwinkle-soft">
            → {d.cross_domain_analogy.implication}
          </p>
          <p className="mt-1 font-mono text-[11px] text-lime-signal">
            ⟡ transferable: {d.cross_domain_analogy.transferable_technique}
          </p>
          {onAnalogyDetail && (
            <button
              onClick={onAnalogyDetail}
              className="mt-4 border border-periwinkle-soft px-3 py-1.5 font-pixel text-[8px] text-periwinkle-soft hover:bg-periwinkle-soft/10"
            >
              ◈ DETAILS
            </button>
          )}
        </RetroWindow>
      </motion.div>

      {/* Research gaps */}
      <motion.div variants={item}>
        <RetroWindow title="RESEARCH_GAPS.log">
          <ul className="space-y-3">
            {d.research_gaps.map((g) => (
              <li
                key={g.id}
                className="flex items-start justify-between gap-3 border-l-2 border-sakura-alert pl-3"
              >
                <div>
                  <p className="font-body text-[13px] leading-[1.6] text-[rgba(245,237,211,0.85)]">{g.gap}</p>
                  <p className="mt-1 inline-flex border border-pixel-border px-2 py-0.5 font-pixel text-[8px] uppercase text-mouse-gray">{g.type}</p>
                </div>
                {onExpandGap && (
                  <button
                    onClick={() => onExpandGap(g.id)}
                    className="shrink-0 border border-electric-accent px-2 py-1 font-pixel text-[8px] text-electric-accent hover:bg-electric-accent/10"
                  >
                    EXPAND
                  </button>
                )}
              </li>
            ))}
          </ul>
        </RetroWindow>
      </motion.div>

      {/* Novel hypothesis */}
      {d.novel_hypothesis && (
        <motion.div variants={item}>
          <RetroWindow title="💡 NOVEL_HYPOTHESIS.gen">
            <p className="font-body text-[14px] italic leading-[1.8] text-lime-signal">
              {d.novel_hypothesis}
            </p>
          </RetroWindow>
        </motion.div>
      )}

      {/* Council consensus */}
      <motion.div variants={item}>
        <RetroWindow title="◈ COUNCIL_CONSENSUS.dat">
          <div className="space-y-3">
            <PixelProgressBar value={data.council_consensus.advocate_score} label="ADVOCATE SCORE" color="cream" />
            <PixelProgressBar value={data.council_consensus.empirical_strength} label="EMPIRICAL STRENGTH" color="lime" />
            <PixelProgressBar value={data.council_consensus.final_confidence} label="FINAL CONFIDENCE" color="electric" />
          </div>
          <p className="mt-4 font-body text-[13px] italic text-mouse-gray">
            caveat: {data.council_consensus.key_caveat}
          </p>
        </RetroWindow>
      </motion.div>
    </motion.div>
  );
}

function PixelNode({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center border-2 font-pixel text-[7px]"
        style={{ borderColor: color, color }}
      >
        ◆
      </div>
      <p className="mt-2 max-w-[120px] font-mono text-[10px] text-mono-white">{label}</p>
    </div>
  );
}

function DashedArrow() {
  return (
    <svg width="80" height="20" viewBox="0 0 80 20">
      <motion.line
        x1="0"
        y1="10"
        x2="72"
        y2="10"
        stroke="var(--accent-secondary)"
        strokeWidth="2"
        strokeDasharray="6 4"
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <polygon points="72,4 80,10 72,16" fill="var(--accent-secondary)" />
    </svg>
  );
}
