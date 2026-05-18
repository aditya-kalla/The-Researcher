import { motion, AnimatePresence } from "framer-motion";
import { RetroWindow } from "./RetroWindow";
import { PixelProgressBar } from "./PixelProgressBar";
import type { SpecialResponse } from "@/lib/types";

export function SpecialPanelModal({
  special,
  onClose,
}: {
  special: SpecialResponse | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {special && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto"
          >
            {special.type === "logic_lab" && <LogicLabPanel s={special} onClose={onClose} />}
            {special.type === "gap_expansion" && <GapExpansionPanel s={special} onClose={onClose} />}
            {special.type === "level_change" && <LevelChangePanel s={special} onClose={onClose} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LogicLabPanel({
  s,
  onClose,
}: {
  s: Extract<SpecialResponse, { type: "logic_lab" }>;
  onClose: () => void;
}) {
  const ruling = s.round_4_empiricist_verdict.ruling;
  return (
    <RetroWindow title="◈ LOGIC_LAB.debate" variant="accent" onClose={onClose}>
      <div className="space-y-4">
        <DebateRound n={1} agent="ADVOCATE" color="#D4F87A" text={s.round_1_advocate} />
        <DebateRound n={2} agent="SKEPTIC" color="#FFB7C5" text={s.round_2_skeptic} />
        <DebateRound n={3} agent="ADVOCATE" color="#D4F87A" text={s.round_3_advocate_response} />
        <div className="border-t border-pixel-border pt-4">
          <p className="font-pixel text-[9px] tracking-wider text-electric-accent">
            ROUND 4 · EMPIRICIST VERDICT
          </p>
          <p className="mt-2 font-body text-[14px] leading-[1.7] text-mono-white">
            {s.round_4_empiricist_verdict.text}
          </p>
          <div className="mt-3">
            <PixelProgressBar
              value={s.round_4_empiricist_verdict.confidence}
              label="VERDICT CONFIDENCE"
              color="electric"
            />
          </div>
          <div
            className={`mt-4 inline-block border-2 px-3 py-1.5 font-pixel text-[10px] ${
              ruling === "CONSENSUS"
                ? "border-lime-signal bg-lime-signal/10 text-lime-signal"
                : "border-sakura-alert bg-sakura-alert/10 text-sakura-alert"
            }`}
          >
            ⚖ RULING: {ruling.replace("_", " ")}
          </div>
        </div>
      </div>
    </RetroWindow>
  );
}

function DebateRound({ n, agent, color, text }: { n: number; agent: string; color: string; text: string }) {
  return (
    <div className="border-l-2 border-pixel-border pl-3">
      <p className="font-pixel text-[8px] tracking-wider" style={{ color }}>
        ROUND {n} · {agent}
      </p>
      <p className="mt-1.5 font-body text-[13px] leading-[1.7] text-mono-white">{text}</p>
    </div>
  );
}

function GapExpansionPanel({
  s,
  onClose,
}: {
  s: Extract<SpecialResponse, { type: "gap_expansion" }>;
  onClose: () => void;
}) {
  return (
    <RetroWindow title={`◇ GAP_EXPANSION_#${s.gap_id}.dat`} variant="alert" onClose={onClose}>
      <p className="font-body text-[15px] italic leading-[1.7] text-sakura-alert">{s.gap_text}</p>
      <div className="mt-5 space-y-4">
        <Section label="WHY IT EXISTS" body={s.why_it_exists} />
        <Section label="CLOSEST TO SOLVING" body={s.closest_to_solving} />
        <Section label="WHAT IT TAKES" body={s.what_it_takes} />
        <div>
          <p className="font-pixel text-[8px] tracking-wider text-electric-accent">
            ▷ RESEARCH PROPOSAL
          </p>
          <div className="graph-paper mt-2 border border-electric-accent bg-black/30 p-3">
            <p className="font-mono text-[12px] leading-[1.7] text-mono-white whitespace-pre-line">
              {s.research_proposal}
            </p>
          </div>
        </div>
      </div>
    </RetroWindow>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">{label}</p>
      <p className="mt-1.5 font-body text-[13px] leading-[1.7] text-mono-white">{body}</p>
    </div>
  );
}

function LevelChangePanel({
  s,
  onClose,
}: {
  s: Extract<SpecialResponse, { type: "level_change" }>;
  onClose: () => void;
}) {
  return (
    <RetroWindow title="◆ LEVEL_RECALIBRATION.sys" onClose={onClose}>
      <p className="font-pixel text-[11px] text-electric-accent">
        L{s.from_level} → L{s.to_level}
      </p>
      <p className="mt-3 font-body text-[14px] leading-[1.7] text-mono-white">{s.note}</p>
    </RetroWindow>
  );
}
