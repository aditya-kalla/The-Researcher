import { useState, useMemo, useEffect } from "react";
import { RetroWindow } from "./RetroWindow";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { loadFilterPresets, saveFilterPreset } from "@/lib/firestore";

type Level = 1 | 2 | 3 | 4;
type LengthMode = "Summary" | "Detailed" | "Deep Dive";

const TEMPORAL_PRESETS = [
  { label: "SOTA (2023–2026)", range: { from: 2023, to: 2026 } },
  { label: "MODERN (2015–2022)", range: { from: 2015, to: 2022 } },
  { label: "LEGACY (2001–2014)", range: { from: 2001, to: 2014 } },
  { label: "ALL TIME", range: { from: 1900, to: 2026 } },
] as const;

const JOURNAL_RANKS = ["ANY", "Q1", "Q2", "Q3", "Q4"] as const;

const clampYear = (v: string) => Math.max(1900, Math.min(2026, parseInt(v) || 1900));
const clampCitations = (v: string) => Math.max(0, Math.min(100000, parseInt(v) || 0));

export function QueryInput({
  onSubmit,
  loading,
  defaultLevel,
  defaultLengthMode,
}: {
  onSubmit: (
    topic: string,
    level: Level,
    lengthMode: LengthMode,
    filters: {
      dateRange: { from: number; to: number };
      country: string;
      journalRank: string;
      minCitations: number;
    }
  ) => void;
  loading: boolean;
  defaultLevel: Level;
  defaultLengthMode: LengthMode;
}) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [lengthMode, setLengthMode] = useState<LengthMode>(defaultLengthMode);
  const [showFilters, setShowFilters] = useState(false);
  const [presets, setPresets] = useState<any[]>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  const {
    user,
    dateRangeFilter,
    countryFilter,
    journalRankFilter,
    minCitationsFilter,
    setDateRangeFilter,
    setCountryFilter,
    setJournalRankFilter,
    setMinCitationsFilter,
  } = useStore();

  useEffect(() => {
    if (user?.id) {
      loadFilterPresets(user.id).then(setPresets);
    }
  }, [user?.id]);

  const handleSavePreset = async () => {
    const trimmed = presetName.trim();
    if (!user?.id || !trimmed) {
      setShowPresetInput(false);
      return;
    }
    
    const finalName = trimmed.slice(0, 24);
    const existing = presets.find(p => p.name.toLowerCase() === finalName.toLowerCase());

    await saveFilterPreset(user.id, {
      id: existing?.id,
      name: finalName,
      dateRange: dateRangeFilter,
      country: countryFilter,
      journalRank: journalRankFilter,
      minCitations: minCitationsFilter,
    });
    setPresetName("");
    setShowPresetInput(false);
    const newPresets = await loadFilterPresets(user.id);
    setPresets(newPresets);
  };

  /* ── Derived: are any filters non-default? ── */
  const filtersActive = useMemo(() => {
    return (
      dateRangeFilter.from !== 2001 ||
      dateRangeFilter.to !== 2026 ||
      countryFilter !== "" ||
      journalRankFilter !== "any" ||
      minCitationsFilter !== 0
    );
  }, [dateRangeFilter, countryFilter, journalRankFilter, minCitationsFilter]);

  /* ── Derived: human-readable summary strip ── */
  const filterSummary = useMemo(() => {
    if (!filtersActive) return null;
    const parts: string[] = [];
    if (dateRangeFilter.from !== 2001 || dateRangeFilter.to !== 2026) {
      // Check if it matches a preset label
      const preset = TEMPORAL_PRESETS.find(
        (p) => p.range.from === dateRangeFilter.from && p.range.to === dateRangeFilter.to
      );
      parts.push(preset ? preset.label.split(" ")[0] : `${dateRangeFilter.from}–${dateRangeFilter.to}`);
    }
    if (countryFilter) parts.push(countryFilter);
    if (journalRankFilter !== "any") parts.push(journalRankFilter.toUpperCase());
    if (minCitationsFilter > 0) parts.push(`≥${minCitationsFilter} citations`);
    return parts.join(" · ");
  }, [dateRangeFilter, countryFilter, journalRankFilter, minCitationsFilter, filtersActive]);

  const submit = () => {
    if (!topic.trim() || loading) return;
    onSubmit(topic.trim(), level, lengthMode, {
      dateRange: dateRangeFilter,
      country: countryFilter,
      journalRank: journalRankFilter,
      minCitations: minCitationsFilter,
    });
  };

  return (
    <RetroWindow title="QUERY_INPUT.exe">
      <div className="graph-paper border border-pixel-border bg-black/30 p-3">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What do you want to understand? e.g. 'mechanistic interpretability of LLMs'"
          rows={3}
          className="w-full resize-none bg-transparent font-mono text-[13px] text-mono-white placeholder-mouse-gray outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 font-pixel text-[8px] tracking-wider text-mouse-gray">LEVEL</p>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`h-10 w-12 font-pixel text-[9px] transition-all duration-150 ${
                  level === l
                    ? "bg-electric-accent text-black border border-electric-accent level-btn-active"
                    : "border border-pixel-border text-mouse-gray hover:text-cream-terminal level-btn-inactive"
                }`}
              >
                L{l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-pixel text-[8px] tracking-wider text-mouse-gray">LENGTH</p>
          <div className="flex flex-wrap gap-1.5">
            {(["Summary", "Detailed", "Deep Dive"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLengthMode(m)}
                className={`h-10 px-3 font-pixel text-[8px] transition-all duration-150 ${
                  lengthMode === m
                    ? "bg-electric-accent text-black border border-electric-accent level-btn-active"
                    : "border border-pixel-border text-mouse-gray hover:text-cream-terminal level-btn-inactive"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── INGESTION FILTERS ── */}
        <div className="pt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="font-pixel text-[8px] tracking-[0.15em] text-mouse-gray hover:text-cream-terminal transition-colors duration-150"
          >
            {showFilters ? "▲ INGESTION FILTERS" : "▼ INGESTION FILTERS"}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 border border-pixel-border/40 bg-black/20 px-3 py-3">
                  {/* PRESETS ROW */}
                  <div className="mb-4">
                    <p className="font-pixel text-[7px] text-mouse-gray mb-1">SAVED PRESETS</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                      {presets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setDateRangeFilter(p.dateRange);
                            setCountryFilter(p.country);
                            setJournalRankFilter(p.journalRank);
                            setMinCitationsFilter(p.minCitations);
                          }}
                          className="shrink-0 whitespace-nowrap border border-pixel-border px-2 py-1 font-pixel text-[7px] text-mouse-gray hover:text-cream-terminal cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                      {showPresetInput ? (
                        <input
                          autoFocus
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          onBlur={() => setShowPresetInput(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSavePreset();
                            if (e.key === "Escape") setShowPresetInput(false);
                          }}
                          placeholder="preset name"
                          className="shrink-0 bg-transparent border-b border-lime-signal font-mono text-[11px] text-lime-signal w-24 outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => setShowPresetInput(true)}
                          className="shrink-0 font-pixel text-[7px] text-lime-signal border border-lime-signal/30 px-2 py-1"
                        >
                          + SAVE CURRENT
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CONTROL A — TEMPORAL HORIZON */}
                  <div className="mb-4">
                    <p className="mb-1.5 font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">
                      TEMPORAL HORIZON
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={1900}
                        max={2026}
                        value={dateRangeFilter.from}
                        onChange={(e) =>
                          setDateRangeFilter({ ...dateRangeFilter, from: clampYear(e.target.value) })
                        }
                        className="w-20 bg-black/30 border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none focus:border-electric-accent/50 transition-colors duration-150"
                      />
                      <span className="font-pixel text-[7px] text-mouse-gray tracking-wider">TO</span>
                      <input
                        type="number"
                        min={1900}
                        max={2026}
                        value={dateRangeFilter.to}
                        onChange={(e) =>
                          setDateRangeFilter({ ...dateRangeFilter, to: clampYear(e.target.value) })
                        }
                        className="w-20 bg-black/30 border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none focus:border-electric-accent/50 transition-colors duration-150"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPORAL_PRESETS.map((btn) => {
                        const isActive =
                          dateRangeFilter.from === btn.range.from && dateRangeFilter.to === btn.range.to;
                        return (
                          <button
                            key={btn.label}
                            onClick={() => setDateRangeFilter({ from: btn.range.from, to: btn.range.to })}
                            className={`px-2 py-1.5 font-pixel text-[8px] transition-all duration-150 ${
                              isActive
                                ? "bg-electric-accent text-black border border-electric-accent level-btn-active"
                                : "bg-transparent border border-pixel-border text-mouse-gray hover:text-cream-terminal level-btn-inactive"
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONTROL B — ORIGIN COUNTRY */}
                  <div className="mb-4">
                    <p className="mb-1.5 font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">
                      ORIGIN COUNTRY
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. USA, China, UK — leave blank for all"
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      className="w-full bg-transparent border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none placeholder:text-mouse-gray/50 focus:border-electric-accent/50 transition-colors duration-150"
                    />
                  </div>

                  {/* CONTROL C — JOURNAL RANK */}
                  <div className="mb-4">
                    <p className="mb-1.5 font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">
                      JOURNAL RANK (SCIMAGO)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {JOURNAL_RANKS.map((r) => {
                        const val = r === "ANY" ? "any" : r;
                        const isActive = journalRankFilter === val;
                        return (
                          <button
                            key={r}
                            onClick={() => setJournalRankFilter(val as typeof journalRankFilter)}
                            className={`px-3 py-1.5 font-pixel text-[8px] transition-all duration-150 ${
                              isActive
                                ? "bg-electric-accent text-black border border-electric-accent level-btn-active"
                                : "bg-transparent border border-pixel-border text-mouse-gray hover:text-cream-terminal level-btn-inactive"
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONTROL D — MIN CITATIONS */}
                  <div>
                    <p className="mb-1.5 font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">
                      MIN CITATIONS
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step={10}
                      value={minCitationsFilter}
                      onChange={(e) => setMinCitationsFilter(clampCitations(e.target.value))}
                      className="w-full bg-transparent border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none focus:border-electric-accent/50 transition-colors duration-150 mb-1"
                    />
                    <p className="font-mono text-[9px] text-mouse-gray">
                      ≥ {minCitationsFilter} citations required
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FILTER SUMMARY STRIP ── */}
          {filtersActive && filterSummary && (
            <p className="mt-2 font-mono text-[10px] text-electric-accent/70">
              FILTERING: {filterSummary}
            </p>
          )}
        </div>

        {/* ── SUBMIT ── */}
        <button
          onClick={submit}
          disabled={loading || !topic.trim()}
          className="initiate-btn mt-2 block h-[52px] w-full font-pixel text-[11px] text-black transition-all hover:brightness-110 disabled:opacity-50"
          style={
            filtersActive
              ? { boxShadow: "0 0 12px var(--accent-glow), inset 0 0 0 1px var(--border-accent)" }
              : undefined
          }
        >
          {loading ? "⣾ AGENTS DELIBERATING…" : "▶ INITIATE RESEARCH"}
        </button>
      </div>
    </RetroWindow>
  );
}
