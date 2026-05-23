import { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import type { ResearchSession } from "@/lib/types";

const LEVEL_COLORS: Record<number, string> = {
  1: "#F5EDD3",
  2: "#D4F87A",
  3: "#7B6FFF",
  4: "#FFB7C5",
};

const ACCEPTED = [".pdf", ".txt", ".md"];

interface UploadedFile {
  name: string;
  size: number;
}

export function DashboardSidebar({ onNewSession }: { onNewSession: () => void }) {
  const {
    sessions,
    currentSessionId,
    setCurrentSession,
    deleteAllSessions,
    user,
    logout,
    uploadedSources,
    addUploadedSource,
    removeUploadedSource,
  } = useStore();
  const [files, setFiles] = useState<UploadedFile[]>(
    uploadedSources.map((n) => ({ name: n, size: 0 }))
  );
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (incoming: FileList | File[]) => {
    setError(null);
    const arr = Array.from(incoming);
    const ok: UploadedFile[] = [];
    for (const f of arr) {
      const lower = f.name.toLowerCase();
      if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
        setError("⚠ UNSUPPORTED FORMAT");
        continue;
      }
      ok.push({ name: f.name, size: f.size });
      addUploadedSource(f.name);
    }
    if (ok.length) setFiles((p) => [...p, ...ok]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    accept(e.dataTransfer.files);
  };

  const fmt = (b: number) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-pixel-border bg-session-dark">
      <div className="flex items-center gap-2 border-b border-pixel-border px-3 py-4">
        <span className="text-electric-accent">◆</span>
        <span className="font-pixel text-[8px] tracking-wider text-mouse-gray">SYSTEM DOCK</span>
      </div>
      <button
        onClick={onNewSession}
        className="m-3 h-12 border-2 border-black bg-electric-accent font-pixel text-[10px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
      >
        ▶ NEW SESSION
      </button>

      <div className="flex-1 overflow-y-auto px-1">
        <div className="flex items-center justify-between px-3 pb-2 pt-2">
          <span className="font-pixel text-[8px] tracking-wider text-mouse-gray">SESSIONS</span>
          {sessions.length > 0 && (
            <button
              onClick={deleteAllSessions}
              className="font-pixel text-[7px] text-sakura-alert hover:underline"
            >
              CLEAR ALL
            </button>
          )}
        </div>
        {sessions.length === 0 && (
          <p className="px-3 font-mono text-[11px] text-mouse-gray">No sessions yet.</p>
        )}
        {sessions.map((s) => (
          <SessionRow key={s.id} s={s} active={s.id === currentSessionId} onClick={() => setCurrentSession(s.id)} />
        ))}

        <div className="px-3 pb-2 pt-6">
          <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">◉ RESEARCH VAULT</p>
          <p className="mt-1 font-mono text-[9px] text-mouse-gray">Feed papers as ground-truth context</p>
        </div>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mx-3 cursor-pointer border-2 border-dashed p-4 text-center transition-colors ${
            dragOver ? "border-electric-accent bg-electric-accent/10" : "border-pixel-border hover:border-mouse-gray"
          }`}
        >
          <p className="font-pixel text-2xl text-mouse-gray">▤</p>
          <p className="mt-1 font-pixel text-[8px] text-mouse-gray">DROP PDF / PAPER HERE</p>
          <p className="mt-1 font-mono text-[9px] text-mouse-gray">.pdf · .txt · .md</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => e.target.files && accept(e.target.files)}
          />
        </div>
        <div className="mx-3 mt-2 flex justify-center gap-2">
          <span className="border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray">.PDF</span>
          <span className="border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray">.TXT</span>
          <span className="border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray">.MD</span>
        </div>
        {error && (
          <p className="mx-3 mt-2 font-pixel text-[8px] text-sakura-alert">{error}</p>
        )}
        <ul className="mx-3 mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 border border-pixel-border bg-black/30 px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="border border-lime-signal px-1 font-pixel text-[7px] text-lime-signal">✓</span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] text-mono-white">{f.name}</p>
                  {f.size > 0 && (
                    <p className="font-mono text-[8px] text-mouse-gray">{fmt(f.size)}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  removeUploadedSource(f.name);
                  setFiles((p) => p.filter((x) => x.name !== f.name));
                }}
                className="font-pixel text-[8px] text-mouse-gray hover:text-sakura-alert"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-2 mb-2 border border-pixel-border bg-black/40 p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-electric-accent font-pixel text-[8px] text-black">
            {user?.username.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-mono-white">{user?.username ?? "guest"}</p>
            <p className="truncate font-mono text-[9px] text-mouse-gray">{user?.email ?? "guest@system.local"}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href="/settings"
            className="flex-1 border border-pixel-border px-2 py-1 text-center font-pixel text-[7px] text-mouse-gray transition-colors hover:text-cream-terminal"
          >
            ⚙ SETTINGS
          </a>
          <button
            onClick={logout}
            className="flex-1 border border-sakura-alert/30 px-2 py-1 text-center font-pixel text-[7px] text-sakura-alert transition-colors hover:underline"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </aside>
  );
}

function SessionRow({
  s,
  active,
  onClick,
}: {
  s: ResearchSession;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-start gap-2 border-l-[3px] px-3 py-2 text-left transition-colors ${
        active
          ? "border-electric-accent bg-electric-accent/10"
          : "border-transparent hover:bg-white/[0.03]"
      }`}
    >
      <span className="mt-0.5 font-pixel text-[10px]">📄</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px] text-mono-white">{s.title}</p>
        <p className="mt-0.5 font-pixel text-[7px] text-mouse-gray">
          {new Date(s.createdAt).toLocaleDateString()}
        </p>
      </div>
      <span
        className="shrink-0 px-1.5 py-0.5 font-pixel text-[7px] text-black"
        style={{ backgroundColor: LEVEL_COLORS[s.level] }}
      >
        L{s.level}
      </span>
    </button>
  );
}
