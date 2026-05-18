import { useEffect, useRef, useState } from "react";
import type { AgentStreamEntry, ResearchResponse } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  electric: "#7B6FFF",
  lime: "#D4F87A",
  periwinkle: "#A8B4FF",
  cream: "#F5EDD3",
  sakura: "#FFB7C5",
};

const SPINNER = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

interface RenderedLine {
  agentName: string;
  color: string;
  text: string;
  done: boolean;
}

interface Props {
  stream: AgentStreamEntry[];
  isStreaming: boolean;
  onComplete?: () => void;
  paperCards?: ResearchResponse["frontier_cards"];
  onPaperSelect?: (card: ResearchResponse["frontier_cards"][number]) => void;
  loop?: boolean;
  speedMs?: number;
  height?: number;
}

export function AgentStateTerminal({
  stream,
  isStreaming,
  onComplete,
  paperCards = [],
  onPaperSelect,
  loop = false,
  speedMs = 18,
  height = 280,
}: Props) {
  const [lines, setLines] = useState<RenderedLine[]>([]);
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isStreaming) return;

    let cancelled = false;
    type Item = { agent: string; color: string; text: string; lastOfAgent: boolean };
    const flat: Item[] = [];
    for (const entry of stream) {
      const lines = entry.lines;
      lines.forEach((t, idx) => {
        flat.push({
          agent: entry.agent,
          color: AGENT_COLORS[entry.color] ?? "#FAFAFA",
          text: t,
          lastOfAgent: idx === lines.length - 1,
        });
      });
    }

    async function run() {
      while (!cancelled) {
        setLines([]);
        for (let li = 0; li < flat.length; li++) {
          if (cancelled) return;
          const item = flat[li];
          setLines((prev) => [...prev, { agentName: item.agent, color: item.color, text: "", done: false }]);
          for (let ci = 1; ci <= item.text.length; ci++) {
            if (cancelled) return;
            await new Promise((r) => setTimeout(r, speedMs));
            setLines((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: item.text.slice(0, ci) };
              return copy;
            });
          }
          setLines((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], done: true };
            return copy;
          });
          await new Promise((r) => setTimeout(r, item.lastOfAgent ? 400 : 150));
        }
        onCompleteRef.current?.();
        if (!loop) return;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, isStreaming, loop, speedMs]);

  useEffect(() => {
    const id = setInterval(() => setSpinnerIdx((i) => (i + 1) % SPINNER.length), 90);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={scrollRef}
      className="terminal-scroll overflow-y-auto bg-black p-3 font-mono text-[11px] leading-relaxed"
      style={{ height, maxHeight: height }}
    >
      {lines.map((l, i) => {
        const isLast = i === lines.length - 1;
        const scoutMatches =
          l.agentName === "SCOUT" && onPaperSelect
            ? paperCards.filter((card) => l.text.includes(card.paper_title))
            : [];
        return (
          <div key={i} className="whitespace-pre-wrap">
            <span style={{ color: l.color }}>[{l.agentName}]</span>{" "}
            <span className="text-mono-white">{l.text}</span>
            {scoutMatches.length > 0 && (
              <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                {scoutMatches.map((card) => (
                  <button
                    key={card.paper_id}
                    type="button"
                    title={card.paper_title}
                    onClick={() => onPaperSelect(card)}
                    className="inline-flex h-4 items-center justify-center border border-periwinkle-soft px-1 font-pixel text-[7px] text-periwinkle-soft hover:bg-periwinkle-soft/10"
                  >
                    ◈
                  </button>
                ))}
              </span>
            )}
            {isLast && !l.done && <span style={{ color: l.color }}> {SPINNER[spinnerIdx]}</span>}
          </div>
        );
      })}
      <span className="cursor-blink text-lime-signal">█</span>
    </div>
  );
}
