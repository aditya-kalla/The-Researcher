import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { RetroWindow } from "@/components/RetroWindow";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — THE RESEARCHER" }] }),
});

type Level = 1 | 2 | 3 | 4;
type LengthMode = "Summary" | "Detailed" | "Deep Dive";

function SettingsPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    user,
    defaultLevel,
    defaultLengthMode,
    geminiApiKey,
    setPreferences,
    sessions,
    deleteAllSessions,
    logout,
  } = useStore();

  const [level, setLevel] = useState<Level>(defaultLevel);
  const [lengthMode, setLengthMode] = useState<LengthMode>(defaultLengthMode);
  const [apiKey, setApiKey] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-research-navy">
        <Navigation />
        <div className="mx-auto max-w-3xl px-6 py-16">
          <RetroWindow title="ACCESS_DENIED.exe" variant="alert">
            <p className="font-mono text-[13px] text-mono-white">Sign in to manage settings.</p>
          </RetroWindow>
        </div>
      </div>
    );
  }

  const save = () => {
    setPreferences({ defaultLevel: level, defaultLengthMode: lengthMode, geminiApiKey: apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="min-h-screen bg-research-navy">
      <Navigation />
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-12">
        <div>
          <p className="font-pixel text-[9px] tracking-wider text-mouse-gray">◇ CONFIG</p>
          <h1 className="mt-1 font-pixel text-[18px] text-cream-terminal">CONTROL_PANEL.exe</h1>
        </div>

        <RetroWindow title="ACCOUNT.dat">
          <div className="grid grid-cols-2 gap-4">
            <Field label="USERNAME" value={user?.username ?? ""} />
            <Field label="EMAIL" value={user?.email ?? ""} />
          </div>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            className="mt-5 border-2 border-sakura-alert px-4 py-2 font-pixel text-[9px] text-sakura-alert hover:bg-sakura-alert/10"
          >
            ▷ SIGN OUT
          </button>
        </RetroWindow>

        <RetroWindow title="DEFAULTS.cfg">
          <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">DEFAULT LEVEL</p>
          <div className="mt-2 flex gap-1.5">
            {([1, 2, 3, 4] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`h-10 w-14 font-pixel text-[9px] transition-colors ${
                  level === l
                    ? "bg-electric-accent text-black"
                    : "border border-pixel-border text-mouse-gray hover:text-mono-white"
                }`}
              >
                L{l}
              </button>
            ))}
          </div>
          <p className="mt-1 font-mono text-[10px] text-mouse-gray">
            {["", "Casual", "Curious", "Specialist", "Expert"][level]}
          </p>

          <p className="mt-5 font-pixel text-[8px] tracking-wider text-mouse-gray">DEFAULT LENGTH</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
        </RetroWindow>

        <RetroWindow title="GEMINI_API_KEY.secret" variant="alert">
          <p className="font-body text-[13px] leading-[1.7] text-mono-white/80">
            Optional. Stored locally in your browser only. Required when{" "}
            <span className="font-mono text-[12px] text-sakura-alert">VITE_API_BASE_URL</span> is wired
            to a backend that proxies your own key.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
              className="flex-1 border border-pixel-border bg-black/40 px-3 py-2 font-mono text-[12px] text-mono-white outline-none focus:border-electric-accent"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="border border-pixel-border px-3 font-pixel text-[8px] text-mouse-gray hover:text-mono-white"
            >
              {showKey ? "HIDE" : "SHOW"}
            </button>
          </div>
        </RetroWindow>

        <RetroWindow title="DATA.zone" variant="alert">
          <p className="font-mono text-[12px] text-mono-white">
            Sessions stored: <span className="text-electric-accent">{sessions.length}</span>
          </p>
          <button
            onClick={() => {
              if (confirm("Permanently delete all research sessions?")) deleteAllSessions();
            }}
            className="mt-4 border-2 border-sakura-alert bg-sakura-alert/10 px-4 py-2 font-pixel text-[9px] text-sakura-alert hover:bg-sakura-alert/20"
          >
            ⌫ DELETE ALL SESSIONS
          </button>
        </RetroWindow>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="border-2 border-black bg-electric-accent px-5 py-2.5 font-pixel text-[10px] text-black shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
          >
            ▶ SAVE PREFERENCES
          </button>
          {saved && <span className="font-pixel text-[9px] text-lime-signal">✓ SAVED</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">{label}</p>
      <p className="mt-1 font-mono text-[13px] text-mono-white">{value || "—"}</p>
    </div>
  );
}
