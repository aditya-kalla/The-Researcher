import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/useStore";
import type { ResearchSession } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { loadFullSession } from "@/lib/firestore";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const LEVEL_COLORS: Record<number, string> = {
  1: "var(--text-primary)",
  2: "var(--accent-signal)",
  3: "var(--accent-primary)",
  4: "var(--accent-alert)",
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
    uploadedSources,
    addUploadedSource,
    removeUploadedSource,
    loadSessions,
    sessionsLoading,
    deleteSession,
    setResearchData,
  } = useStore();
  const navigate = useNavigate();

  const handleClearAll = () => {
    deleteAllSessions();
  }

  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const handleSessionClick = async (session: ResearchSession) => {
    if (session.id === currentSessionId) return;
    if (!user) return;
    
    setLoadingSessionId(session.id);
    try {
      const full = await loadFullSession(user.id, session.id);
      if (full) {
        setResearchData(full.researchData as any);
        setCurrentSession(session.id);
      }
    } finally {
      setLoadingSessionId(null);
    }
  }
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
      {/* SECTION 1 — TOP HEADER */}
      <div className="flex items-center gap-2 border-b border-pixel-border/40 bg-black/20 px-3 py-2">
        <span className="text-electric-accent font-pixel text-[8px]">◆</span>
        <span className="font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">SYSTEM DOCK</span>
      </div>

      {/* SECTION 2 — NEW SESSION */}
      <div className="px-3 py-3">
        <button
          onClick={onNewSession}
          className="h-10 w-full border-2 border-black bg-electric-accent font-pixel text-[10px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
        >
          ▶ NEW SESSION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {/* SECTION 3 — SESSION HISTORY */}
        <div className="mb-6 mt-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">SESSIONS</span>
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="font-pixel text-[7px] text-sakura-alert opacity-60 hover:opacity-100 transition-opacity duration-150"
              >
                CLEAR ALL
              </button>
            )}
          </div>
          {sessions.length === 0 && (
            <p className="px-1 font-mono text-[10px] text-mouse-gray/60">No sessions yet.</p>
          )}
          <div className="space-y-[1px]">
            {sessions.map((s) => (
              <SessionRow 
                key={s.id} 
                s={s} 
                active={s.id === currentSessionId} 
                isLoading={loadingSessionId === s.id}
                onClick={() => handleSessionClick(s)} 
                onDelete={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* SECTION 4 — VAULT */}
        <div className="mb-4">
          <div className="mb-2 px-1">
            <span className="font-pixel text-[8px] uppercase tracking-[0.15em] text-mouse-gray">◉ RESEARCH VAULT</span>
            <p className="mt-1 font-mono text-[9px] text-mouse-gray/60 leading-relaxed">Feed papers as ground-truth context</p>
          </div>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`mx-1 cursor-pointer border border-dashed p-3 text-center transition-colors duration-150 ${
              dragOver ? "border-electric-accent bg-electric-accent/5" : "border-pixel-border hover:border-mouse-gray"
            }`}
          >
            <p className="font-pixel text-xl text-mouse-gray">▤</p>
            <p className="mt-1 font-pixel text-[7px] text-mouse-gray uppercase tracking-wider">DROP PDF / PAPER HERE</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => e.target.files && accept(e.target.files)}
            />
          </div>
          <div className="mx-1 mt-2 flex gap-1.5">
            <span className="bg-transparent border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray uppercase tracking-wide">.PDF</span>
            <span className="bg-transparent border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray uppercase tracking-wide">.TXT</span>
            <span className="bg-transparent border border-pixel-border px-1.5 py-0.5 font-pixel text-[7px] text-mouse-gray uppercase tracking-wide">.MD</span>
          </div>
          {error && (
            <p className="mx-1 mt-2 font-pixel text-[7px] text-sakura-alert">{error}</p>
          )}
          <ul className="mx-1 mt-2 space-y-1">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border border-pixel-border bg-black/30 px-2 py-1.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="border border-lime-signal px-1 font-pixel text-[6px] text-lime-signal">✓</span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[9px] text-mono-white">{f.name}</p>
                    {f.size > 0 && (
                      <p className="font-mono text-[8px] text-mouse-gray">{fmt(f.size)}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeUploadedSource(f.name);
                    setFiles((p) => p.filter((x) => x.name !== f.name));
                  }}
                  className="relative z-20 font-pixel text-[7px] text-mouse-gray hover:text-sakura-alert"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* SECTION 5 — ACCOUNT FOOTER */}
      <div className="mx-2 mb-2 border border-pixel-border bg-black/40 p-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-electric-accent font-pixel text-[8px] text-black">
            {user?.username.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-mono-white">{user?.username ?? "guest"}</p>
            <p className="truncate font-mono text-[9px] text-mouse-gray/60">{user?.email ?? "guest@system.local"}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          <a
            href="/settings"
            className="flex-1 border border-pixel-border px-2 py-1 text-center font-pixel text-[7px] text-mouse-gray transition-colors hover:border-mouse-gray hover:text-cream-terminal"
          >
            ⚙ SETTINGS
          </a>
          <button
            onClick={async () => {
              await signOut(auth);
              // clearUser() is called automatically by onAuthStateChanged
              navigate({ to: '/' });
            }}
            className="flex-1 border border-pixel-border px-2 py-1 text-center font-pixel text-[7px] text-sakura-alert transition-colors hover:border-sakura-alert/60"
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
  isLoading,
  onClick,
  onDelete,
}: {
  s: ResearchSession;
  active: boolean;
  isLoading?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="group relative flex w-full">
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`flex w-full items-start gap-2 border-l-[3px] px-2 py-1.5 text-left transition-colors ${
          active
            ? "border-electric-accent bg-electric-accent/10"
            : "border-transparent hover:bg-white/[0.03]"
        } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
      >
        <span className="mt-0.5 font-pixel text-[8px]">📄</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] text-mono-white">
            {isLoading ? "LOADING..." : s.title}
          </p>
          <p className="mt-0.5 font-pixel text-[6px] text-mouse-gray">
            {new Date(s.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span
          className="shrink-0 px-1 py-0.5 font-pixel text-[6px] text-black"
          style={{ backgroundColor: LEVEL_COLORS[s.level] }}
        >
          L{s.level}
        </span>
      </button>
      <button
        onClick={onDelete}
        className="absolute right-1 top-1.5 hidden text-mouse-gray hover:text-sakura-alert group-hover:block font-pixel text-[7px]"
        title="Delete Session"
      >
        ✕
      </button>
    </div>
  );
}
