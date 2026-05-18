import { useState } from "react";
import { RetroWindow } from "./RetroWindow";

type Level = 1 | 2 | 3 | 4;
type LengthMode = "Summary" | "Detailed" | "Deep Dive";

export function QueryInput({
  onSubmit,
  loading,
  defaultLevel,
  defaultLengthMode,
}: {
  onSubmit: (topic: string, level: Level, lengthMode: LengthMode) => void;
  loading: boolean;
  defaultLevel: Level;
  defaultLengthMode: LengthMode;
}) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [lengthMode, setLengthMode] = useState<LengthMode>(defaultLengthMode);

  const submit = () => {
    if (!topic.trim() || loading) return;
    onSubmit(topic.trim(), level, lengthMode);
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
