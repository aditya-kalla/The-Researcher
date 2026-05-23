import { useState } from "react";
import { RetroWindow } from "./RetroWindow";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";

type Level = 1 | 2 | 3 | 4;
type LengthMode = "Summary" | "Detailed" | "Deep Dive";

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

  const {
    dateRangeFilter,
    countryFilter,
    journalRankFilter,
    minCitationsFilter,
    setDateRangeFilter,
    setCountryFilter,
    setJournalRankFilter,
    setMinCitationsFilter,
  } = useStore();

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
                className={`h-10 w-12 font-pixel text-[9px] transition-colors ${
                  level === l
                    ? "bg-electric-accent text-black"
                    : "border border-pixel-border text-mouse-gray hover:text-mono-white"
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
                className={`h-10 px-3 font-pixel text-[8px] transition-colors ${
                  lengthMode === m
                    ? "bg-electric-accent text-black"
                    : "border border-pixel-border text-mouse-gray hover:text-mono-white"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="font-pixel text-[8px] text-mouse-gray hover:text-cream-terminal"
          >
            {showFilters ? "▲ INGESTION FILTERS" : "▼ INGESTION FILTERS"}
          </button>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 border-t border-pixel-border pt-4">
                  {/* CONTROL A */}
                  <div>
                    <p className="mb-1.5 font-pixel text-[8px] text-mouse-gray">TEMPORAL HORIZON</p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <input
                        type="number"
                        value={dateRangeFilter.from}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, from: parseInt(e.target.value) || 2000 })}
                        className="w-20 bg-black/30 border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none"
                      />
                      <span className="font-mono text-mouse-gray">TO</span>
                      <input
                        type="number"
                        value={dateRangeFilter.to}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, to: parseInt(e.target.value) || 2026 })}
                        className="w-20 bg-black/30 border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "SOTA (2023–2026)", range: { from: 2023, to: 2026 } },
                        { label: "MODERN (2015–2022)", range: { from: 2015, to: 2022 } },
                        { label: "LEGACY (2001–2014)", range: { from: 2001, to: 2014 } },
                        { label: "ALL TIME", range: { from: 1900, to: 2026 } },
                      ].map((btn) => {
                        const isActive = dateRangeFilter.from === btn.range.from && dateRangeFilter.to === btn.range.to;
                        return (
                          <button
                            key={btn.label}
                            onClick={() => setDateRangeFilter(btn.range)}
                            className={`px-2 py-1.5 font-pixel text-[8px] transition-colors ${
                              isActive ? "bg-electric-accent text-black" : "border border-pixel-border text-mouse-gray hover:text-mono-white"
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONTROL B */}
                  <div>
                    <p className="mb-1.5 font-pixel text-[8px] text-mouse-gray">ORIGIN COUNTRY</p>
                    <input
                      type="text"
                      placeholder="e.g. USA, China, UK — leave blank for all"
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      className="w-full bg-transparent border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none"
                    />
                  </div>

                  {/* CONTROL C */}
                  <div>
                    <p className="mb-1.5 font-pixel text-[8px] text-mouse-gray">JOURNAL RANK (SCIMAGO)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["ANY", "Q1", "Q2", "Q3", "Q4"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setJournalRankFilter(r === "ANY" ? "any" : r)}
                          className={`px-3 py-1.5 font-pixel text-[8px] transition-colors ${
                            (journalRankFilter.toUpperCase() === r)
                              ? "bg-electric-accent text-black"
                              : "border border-pixel-border text-mouse-gray hover:text-mono-white"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CONTROL D */}
                  <div>
                    <p className="mb-1.5 font-pixel text-[8px] text-mouse-gray">MIN CITATIONS</p>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={minCitationsFilter}
                      onChange={(e) => setMinCitationsFilter(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent border border-pixel-border font-mono text-[12px] text-mono-white px-2 py-1.5 outline-none mb-1"
                    />
                    <p className="font-mono text-[9px] text-mouse-gray">≥ {minCitationsFilter} citations required</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={submit}
          disabled={loading || !topic.trim()}
          className="mt-2 block h-[52px] w-full font-pixel text-[11px] text-black transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #7B6FFF, #A8B4FF)" }}
        >
          {loading ? "⣾ AGENTS DELIBERATING…" : "▶ INITIATE RESEARCH"}
        </button>
      </div>
    </RetroWindow>
  );
}
