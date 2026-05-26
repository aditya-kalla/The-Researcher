import { motion } from "framer-motion";
import { RetroWindow } from "./RetroWindow";
import type { ResearchResponse } from "@/lib/types";

const CAT_STYLE: Record<
  ResearchResponse["frontier_cards"][number]["category"],
  { bar: string; text: string; border: string; label: string }
> = {
  FOUNDATION: { bar: "var(--text-primary)", text: "var(--bg-primary)", border: "var(--border-secondary)", label: "FOUNDATION" },
  FRONTIER: { bar: "var(--accent-primary)", text: "var(--bg-primary)", border: "var(--accent-primary)", label: "FRONTIER" },
  WILDCARD: { bar: "var(--accent-signal)", text: "var(--bg-primary)", border: "var(--accent-signal)", label: "WILDCARD" },
  HARDWARE_BRIDGE: { bar: "var(--accent-alert)", text: "var(--bg-primary)", border: "var(--accent-alert)", label: "HARDWARE" },
};

export function FrontierCard({
  card,
  onDeepDive,
}: {
  card: ResearchResponse["frontier_cards"][number];
  onDeepDive: (card: ResearchResponse["frontier_cards"][number]) => void;
}) {
  const s = CAT_STYLE[card.category];
  const isNew = card.year >= 2024;
  return (
    <motion.div whileHover={{ y: -4, boxShadow: "2px 2px 0 var(--accent-primary)" }} className="group">
      <RetroWindow
        title={s.label}
        titleBarColor={s.bar}
        titleTextColor={s.text}
        borderColor={s.border}
        hoverShadow={false}
      >
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-mouse-gray">{card.confidence}% conf</span>
          {isNew && (
            <span className="border border-lime-signal px-1.5 py-0.5 font-pixel text-[7px] text-lime-signal">
              NEW
            </span>
          )}
        </div>
        <h4 className="mt-3 font-mono text-[13px] font-bold leading-tight text-mono-white">
          {card.paper_title}
        </h4>
        <p className="mt-1 font-mono text-[10px] text-mouse-gray">
          {card.authors} · {card.year}
        </p>
        <p className="mt-3 font-body text-[12px] leading-[1.6] text-mono-white/80">{card.the_why}</p>
        <div className="relative mt-4">
          <button
            onClick={() => onDeepDive(card)}
            className="w-full border-2 border-black bg-electric-accent px-3 py-2 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
          >
            ▶ DEEP DIVE
          </button>
          <motion.span
            className="pointer-events-none absolute -right-3 -top-3 font-pixel text-sm text-periwinkle-soft opacity-0 group-hover:opacity-100"
            initial={{ scale: 0.5 }}
            whileHover={{ scale: 1 }}
            animate={{ rotate: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✦
          </motion.span>
        </div>
      </RetroWindow>
    </motion.div>
  );
}
