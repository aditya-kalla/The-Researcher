import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "@/components/Sparkles";
import { RetroWindow } from "@/components/RetroWindow";
import { PixelProgressBar } from "@/components/PixelProgressBar";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign In — THE RESEARCHER" }] }),
});

const BG_LINES = [
  "LOADING AGENT MODULES...",
  "SCOUT ONLINE ✓",
  "ORCHESTRATOR ONLINE ✓",
  "SKEPTIC ONLINE ✓",
  "EMPIRICIST ONLINE ✓",
  "COGNITIVE GRAPH READY ✓",
  "AWAITING USER AUTHENTICATION...",
];

function AuthPage() {
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "register" && password !== confirm) return;
    setLoading(true);
    setTimeout(() => {
      const u = username || email.split("@")[0] || "researcher";
      login(u, email || `${u}@researcher.ai`);
      navigate({ to: "/dashboard" });
    }, 1500);
  };

  return (
    <div
      className="graph-paper relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "linear-gradient(135deg, #0D0F1A 0%, #1A1D35 100%)" }}
    >
      <Sparkles count={20} />
      {/* Background terminal text */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center p-8 font-mono text-[12px] text-lime-signal/[0.08]">
        {BG_LINES.map((l, i) => (
          <motion.span
            key={l}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.2] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 8 }}
          >
            {l}
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <RetroWindow title="THE RESEARCHER — LOGIN.exe" variant="cream" hoverShadow={false}>
          <div className="-m-4 bg-cream-terminal p-6 text-research-navy">
            {/* Tabs */}
            <div className="mb-6 flex border-b-2 border-research-navy/20">
              {(["signin", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 pb-3 font-pixel text-[9px] uppercase tracking-wider ${
                    tab === t
                      ? "border-b-[3px] border-electric-accent text-research-navy"
                      : "text-research-navy/40"
                  }`}
                >
                  {t === "signin" ? "SIGN IN" : "REGISTER"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {tab === "register" && (
                <Field label="USERNAME" value={username} onChange={setUsername} required />
              )}
              <Field label="EMAIL" type="email" value={email} onChange={setEmail} required />
              <Field label="PASSWORD" type="password" value={password} onChange={setPassword} required />
              {tab === "register" && (
                <Field label="CONFIRM PASSWORD" type="password" value={confirm} onChange={setConfirm} required />
              )}

              {loading && (
                <div className="space-y-2 pt-2">
                  <p className="font-mono text-[11px] text-research-navy">AUTHENTICATING USER...</p>
                  <PixelProgressBar value={100} color="electric" animated showValue={false} />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-research-navy py-3.5 font-pixel text-[11px] text-cream-terminal disabled:opacity-60"
              >
                {loading ? "..." : "OK ▶"}
              </button>
            </form>
            <p className="mt-4 font-mono text-[10px] text-research-navy/60">
              {tab === "signin" ? "No account? Click REGISTER above." : "Already have one? Click SIGN IN."}
            </p>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-pixel text-[8px] text-research-navy">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full border-2 border-research-navy bg-cream-terminal px-3 py-2.5 font-mono text-[13px] text-research-navy outline-none focus:border-electric-accent"
      />
    </label>
  );
}
