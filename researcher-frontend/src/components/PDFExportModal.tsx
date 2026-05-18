import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RetroWindow } from "./RetroWindow";
import { PixelProgressBar } from "./PixelProgressBar";
import type { ResearchResponse } from "@/lib/types";

export function PDFExportModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ResearchResponse | null;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setDone(false);
      return;
    }

    let p = 0;
    const id = setInterval(() => {
      p += 8;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(id);
        setDone(true);
      }
    }, 120);

    return () => clearInterval(id);
  }, [open]);

  return (
    <AnimatePresence>
      {open && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <RetroWindow title="EXPORT_RESEARCH.exe" onClose={onClose} variant="accent">
              <div className="max-h-[68vh] overflow-y-auto bg-mono-white p-6 text-research-navy">
                <p className="font-pixel text-[10px] text-electric-accent">◆ THE RESEARCHER</p>
                <h1 className="mt-3 font-body text-2xl font-bold">{data.session.topic}</h1>
                <p className="mt-1 font-mono text-[11px] text-mouse-gray">
                  L{data.session.level} · {data.session.level_name} · {new Date(data.session.timestamp).toLocaleString()}
                </p>
                <hr className="my-4 border-research-navy/20" />
                <Section title="EXECUTIVE SUMMARY" body={data.dashboard.executive_summary.text} />
                <Section title="CORE MECHANISMS" body={data.dashboard.core_mechanisms.text} />
                <Section
                  title="KEY CLAIMS"
                  body={data.dashboard.key_claims.map((c) => `• ${c.claim} [${c.confidence}%]`).join("\n\n")}
                />
                <Section
                  title="EPISTEMIC DECAY"
                  body={[
                    ...data.dashboard.epistemic_decay.stale.map(
                      (s) => `Stale: ${s.claim} — superseded by ${s.superseded_by}`
                    ),
                    ...data.dashboard.epistemic_decay.fresh.map((f) => `Fresh: ${f.claim}`),
                  ].join("\n\n")}
                />
                <Section
                  title="CROSS DOMAIN LINK"
                  body={`${data.dashboard.cross_domain_analogy.domain_a} ↔ ${data.dashboard.cross_domain_analogy.domain_b}\n\n${data.dashboard.cross_domain_analogy.structural_isomorphism}\n\nTransferable technique: ${data.dashboard.cross_domain_analogy.transferable_technique}`}
                />
                <Section
                  title="RESEARCH GAPS"
                  body={data.dashboard.research_gaps.map((g) => `${g.type}: ${g.gap}`).join("\n\n")}
                />
                {data.dashboard.novel_hypothesis && (
                  <Section title="NOVEL HYPOTHESIS" body={data.dashboard.novel_hypothesis} />
                )}
                <Section
                  title="COUNCIL CONSENSUS"
                  body={`Advocate score: ${data.council_consensus.advocate_score}\nEmpirical strength: ${data.council_consensus.empirical_strength}\nFinal confidence: ${data.council_consensus.final_confidence}\n\nCaveat: ${data.council_consensus.key_caveat}`}
                />
              </div>

              <div className="mt-4 space-y-3">
                <PixelProgressBar
                  value={progress}
                  label={done ? "READY ✓" : "GENERATING PDF..."}
                  color={done ? "lime" : "electric"}
                  animated={false}
                />
                <div className="flex gap-2">
                  <button
                    disabled={!done}
                    onClick={() => window.print()}
                    className="flex-1 border-2 border-black bg-electric-accent py-2.5 font-pixel text-[10px] text-black shadow-[3px_3px_0_#000] disabled:opacity-50"
                  >
                    ▶ DOWNLOAD PDF
                  </button>
                  <button
                    onClick={onClose}
                    className="border border-mouse-gray px-4 py-2.5 font-pixel text-[9px] text-mouse-gray hover:bg-white/5"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </RetroWindow>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-5">
      <h2 className="font-pixel text-[10px] text-electric-accent">{title}</h2>
      <p className="mt-2 whitespace-pre-line font-body text-[13px] leading-[1.7] text-research-navy">
        {body}
      </p>
    </section>
  );
}
