import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import type { ReferencedSource } from "@/lib/types";

/* ─────────────────────────────────────────────────
 * CATEGORY COLOR SYSTEM
 * ───────────────────────────────────────────────── */
const CATEGORY_STYLES: Record<
  ReferencedSource["category"],
  { color: string; borderColor: string; backgroundColor: string }
> = {
  FOUNDATION: {
    color: "var(--text-primary)",
    borderColor: "var(--border-primary)",
    backgroundColor: "var(--bg-hover)",
  },
  EMPIRICAL: {
    color: "var(--accent-signal)",
    borderColor: "var(--border-primary)",
    backgroundColor: "var(--bg-hover)",
  },
  METHODOLOGY: {
    color: "var(--text-mono)",
    borderColor: "var(--border-primary)",
    backgroundColor: "var(--bg-hover)",
  },
  REVIEW: {
    color: "var(--accent-alert)",
    borderColor: "var(--border-primary)",
    backgroundColor: "var(--bg-hover)",
  },
  FRONTIER: {
    color: "var(--accent-primary)",
    borderColor: "var(--border-accent)",
    backgroundColor: "var(--bg-hover)",
  },
};

/* ─────────────────────────────────────────────────
 * SOURCE VAULT DRAWER
 * ───────────────────────────────────────────────── */
export function SourceVaultDrawer({
  sources,
  isOpen,
  onClose,
}: {
  sources: ReferencedSource[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeVaultSource, setActiveVaultSource } = useStore();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[799] bg-black/30 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <motion.div
        animate={{ x: isOpen ? 0 : 420 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-[800] flex h-screen w-[420px] flex-col"
        style={{
          backgroundColor: "#0D0F1A",
          borderLeft: "1px solid var(--color-pixel-border)",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          className="flex h-12 shrink-0 items-center justify-between border-b px-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            borderColor: "var(--color-pixel-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[9px] text-electric-accent">◈</span>
            <span className="font-pixel text-[9px] tracking-[0.15em] text-cream-terminal">
              SOURCE VAULT
            </span>
            <span
              className="ml-2 border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray"
              style={{ borderColor: "var(--color-pixel-border)" }}
            >
              {sources.length} REFS
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-pixel text-[9px] text-mouse-gray transition-colors duration-200 hover:text-cream-terminal"
          >
            ✕
          </button>
        </div>

        {/* ═══ SUBHEADER ═══ */}
        <div
          className="flex h-8 shrink-0 items-center border-b px-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            borderColor: "rgba(var(--color-pixel-border-rgb, 42,45,74), 0.4)",
          }}
        >
          <span className="font-mono text-[10px] text-mouse-gray/70">
            Grounding literature used by the 7-agent council
          </span>
        </div>

        {/* ═══ BODY ═══ */}
        {sources.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <p className="font-pixel text-[8px] text-mouse-gray">◈ NO SOURCES LOADED</p>
              <p className="mt-2 font-mono text-[10px] text-mouse-gray/50">
                Run a research session to populate the vault.
              </p>
            </div>
          </div>
        ) : activeVaultSource ? (
          /* ═══ SPLIT VIEW ═══ */
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Condensed Source List (40%) */}
            <div
              className="flex w-[40%] flex-col overflow-y-auto"
              style={{ borderRight: "1px solid rgba(42,45,74,0.4)" }}
            >
              {sources.map((src) => (
                <SourceListItem
                  key={src.id}
                  source={src}
                  isActive={activeVaultSource.id === src.id}
                  compact
                  onClick={() => setActiveVaultSource(src)}
                />
              ))}
            </div>

            {/* RIGHT: Source Detail (60%) */}
            <div className="flex w-[60%] flex-col overflow-hidden">
              <SourceDetail
                source={activeVaultSource}
                onBack={() => setActiveVaultSource(null)}
              />
            </div>
          </div>
        ) : (
          /* ═══ FULL LIST ═══ */
          <div className="flex-1 overflow-y-auto">
            {sources.map((src) => (
              <SourceListItem
                key={src.id}
                source={src}
                isActive={false}
                compact={false}
                onClick={() => setActiveVaultSource(src)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────
 * SOURCE LIST ITEM
 * ───────────────────────────────────────────────── */
function SourceListItem({
  source,
  isActive,
  compact,
  onClick,
}: {
  source: ReferencedSource;
  isActive: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const style = CATEGORY_STYLES[source.category];

  return (
    <div
      onClick={onClick}
      className="cursor-pointer px-3 py-3 transition-colors duration-200 hover:bg-white/[0.03]"
      style={{
        borderBottom: "1px solid var(--border-primary)",
        borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
        backgroundColor: isActive ? "var(--bg-hover)" : undefined,
      }}
    >
      {/* ROW 1: Category + Year */}
      <div className="flex items-center justify-between">
        <span
          className="border px-1.5 py-0.5 font-pixel text-[6px]"
          style={{
            color: style.color,
            borderColor: style.borderColor,
            backgroundColor: style.backgroundColor,
          }}
        >
          {source.category}
        </span>
        <span className="font-mono text-[10px] text-mouse-gray">
          {source.year}
          {source.open_access && (
            <span className="ml-1 text-lime-signal">⊕</span>
          )}
        </span>
      </div>

      {/* ROW 2: Title */}
      <p
        className="mt-1 font-body text-[12px] leading-tight text-cream-terminal"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: compact ? 1 : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {source.title}
      </p>

      {/* ROW 3: Authors · Venue */}
      <p
        className="mt-1 truncate font-mono text-[9px] text-mouse-gray"
      >
        {source.authors} · {source.venue}
      </p>

      {!compact && (
        <>
          {/* ROW 4: Citations */}
          <p className="mt-1 font-mono text-[9px] text-mouse-gray/60">
            ◆ {source.citations} citations
          </p>

          {/* Relevance note */}
          <p
            className="mt-0.5 truncate font-mono text-[9px] italic text-electric-accent/70"
          >
            {source.relevance_note}
          </p>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
 * SOURCE DETAIL PANEL
 * ───────────────────────────────────────────────── */
function SourceDetail({
  source,
  onBack,
}: {
  source: ReferencedSource;
  onBack: () => void;
}) {
  const style = CATEGORY_STYLES[source.category];

  return (
    <>
      {/* BACK BUTTON */}
      <button
        onClick={onBack}
        className="flex h-8 shrink-0 items-center border-b px-4 font-pixel text-[7px] text-mouse-gray transition-colors hover:text-cream-terminal"
        style={{ borderColor: "rgba(42,45,74,0.4)" }}
      >
        ← BACK TO LIST
      </button>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* BADGES */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="border px-1.5 py-0.5 font-pixel text-[6px]"
            style={{
              color: style.color,
              borderColor: style.borderColor,
              backgroundColor: style.backgroundColor,
            }}
          >
            {source.category}
          </span>
          {source.open_access && (
            <span
              className="border px-1.5 py-0.5 font-pixel text-[7px] text-lime-signal"
              style={{ borderColor: "rgba(212,248,122,0.3)" }}
            >
              ⊕ OPEN ACCESS
            </span>
          )}
        </div>

        {/* TITLE */}
        <h4 className="mt-2 font-body text-[15px] font-bold leading-tight text-cream-terminal">
          {source.title}
        </h4>

        {/* AUTHORS */}
        <p className="mt-1 font-mono text-[10px] text-mouse-gray">
          {source.authors}
        </p>

        {/* VENUE · YEAR */}
        <p className="mt-0.5 font-mono text-[10px] text-mouse-gray/70">
          {source.venue} · {source.year}
        </p>

        {/* CITATIONS */}
        <p className="mt-1 font-pixel text-[7px] text-mouse-gray/60">
          ◆ {source.citations} CITATIONS
        </p>

        {/* WHY THIS WAS USED */}
        <div className="mt-5">
          <p className="mb-1 font-pixel text-[7px] tracking-wider text-electric-accent">
            WHY THIS WAS USED
          </p>
          <div
            className="pl-3"
            style={{ borderLeft: "2px solid var(--border-accent)" }}
          >
            <p className="font-mono text-[11px] italic leading-relaxed text-cream-terminal/80">
              {source.relevance_note}
            </p>
          </div>
        </div>

        {/* ABSTRACT */}
        <div className="mt-5">
          <p className="mb-2 font-pixel text-[7px] tracking-wider text-electric-accent">
            ABSTRACT
          </p>
          <p className="font-body text-[12px] leading-[1.85] text-cream-terminal/75">
            {source.abstract}
          </p>
        </div>

        {/* ACCESS */}
        <div className="mt-5">
          <p className="mb-2 font-pixel text-[7px] tracking-wider text-mouse-gray">
            ACCESS
          </p>
          <p className="font-mono text-[10px] text-mouse-gray/60">
            DOI: {source.doi_hint}
          </p>
          <button
            onClick={() =>
              window.open(
                `https://arxiv.org/search/?query=${encodeURIComponent(source.title)}`,
                "_blank"
              )
            }
            className="mt-2 w-full border py-2 font-pixel text-[7px] text-mouse-gray transition-colors duration-200 hover:border-cream-terminal hover:text-cream-terminal"
            style={{ borderColor: "var(--color-pixel-border)" }}
          >
            ⬆ SEARCH ON ARXIV
          </button>
          <button
            onClick={() =>
              window.open(
                `https://scholar.google.com/scholar?q=${encodeURIComponent(source.title)}`,
                "_blank"
              )
            }
            className="mt-2 w-full border py-2 font-pixel text-[7px] text-mouse-gray transition-colors duration-200 hover:border-cream-terminal hover:text-cream-terminal"
            style={{ borderColor: "var(--color-pixel-border)" }}
          >
            ⬆ SEARCH ON SCHOLAR
          </button>
        </div>
      </div>
    </>
  );
}
