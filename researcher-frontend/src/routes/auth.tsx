import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Observatory Access — THE RESEARCHER" }] }),
  beforeLoad: () => {
    const isAuthenticated = useStore.getState().isAuthenticated;
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
});

/* ─────────────────────────────────────────────────
 * BACKGROUND — Pixel-Glass Atmosphere (simplified)
 * Stationary holographic cubes with cursor-reactive
 * illumination, consistent with landing page.
 * ───────────────────────────────────────────────── */
function AuthAtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const CUBE = 72;
    const GAP = 8;
    const TOTAL = CUBE + GAP;
    const DEEP = [13, 15, 26];
    const BLOOM = [255, 236, 190]; // Warm observatory gold
    const INDIGO = [255, 244, 214]; // Intelligent parchment glow

    let cols = 0, rows = 0;
    let cells: { x: number; y: number; cx: number; cy: number; r: number; g: number; b: number; density: number; energy: number; baseOffset: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / TOTAL) + 1;
      rows = Math.ceil(window.innerHeight / TOTAL) + 1;
      cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x / cols, ny = y / rows;
          const inf = Math.max(0, 1 - Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) / 0.8);
          // Subdued base color influence so background remains mostly navy, but with a warm atmospheric tint near center
          const r = DEEP[0] + (INDIGO[0] - DEEP[0]) * inf * 0.15 + (BLOOM[0] - DEEP[0]) * 0.08;
          const g = DEEP[1] + (INDIGO[1] - DEEP[1]) * inf * 0.15 + (BLOOM[1] - DEEP[1]) * 0.08;
          const b = DEEP[2] + (INDIGO[2] - DEEP[2]) * inf * 0.15 + (BLOOM[2] - DEEP[2]) * 0.08;
          const lowFreq = Math.sin(nx * Math.PI * 3) * Math.cos(ny * Math.PI * 3);
          const density = Math.max(0, Math.min(1, lowFreq * 0.5 + 0.5));
          cells.push({ x: x * TOTAL, y: y * TOTAL, cx: x * TOTAL + CUBE / 2, cy: y * TOTAL + CUBE / 2, r, g, b, density, energy: 0, baseOffset: Math.random() * Math.PI * 2 });
        }
      }
    };
    init();
    window.addEventListener("resize", init);

    const drawRound = (x: number, y: number, w: number, h: number, rad: number) => {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + w - rad, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
      ctx.lineTo(x + w, y + h - rad);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      ctx.lineTo(x + rad, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
    };

    let raf: number;
    const render = () => {
      ctx.fillStyle = `rgb(${DEEP[0]},${DEEP[1]},${DEEP[2]})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      const cx = cursorRef.current.x, cy = cursorRef.current.y;
      const time = Date.now() * 0.0005;
      for (const cell of cells) {
        // Cursor interaction
        const dist = Math.hypot(cell.cx - cx, cell.cy - cy);
        if (dist < 400) {
          const power = Math.pow((400 - dist) / 400, 2);
          cell.energy += power * (0.04 + cell.density * 0.12);
        }
        
        // Panel radiant illumination
        const centerDist = Math.hypot(cell.cx - window.innerWidth / 2, cell.cy - window.innerHeight / 2);
        if (centerDist < 600) {
          const centerPower = Math.pow((600 - centerDist) / 600, 2);
          cell.energy += centerPower * (0.015 + cell.density * 0.02);
        }

        cell.energy += (0 - cell.energy) * 0.03;
        const ay = Math.sin(time + cell.baseOffset) * 1.5;
        const ax = Math.cos(time + cell.baseOffset) * 1.5;
        const dx = cell.x + ax, dy = cell.y + ay;
        const dimR = cell.r * (0.03 + cell.density * 0.12);
        const dimG = cell.g * (0.03 + cell.density * 0.12);
        const dimB = cell.b * (0.03 + cell.density * 0.12);
        const glow = Math.min(cell.energy * 2, 3);
        const wm = Math.max(0, glow - 1.5) * 30;
        const fR = Math.min(255, dimR + (cell.r - dimR) * glow + wm);
        const fG = Math.min(255, dimG + (cell.g - dimG) * glow + wm);
        const fB = Math.min(255, dimB + (cell.b - dimB) * glow + wm);
        const ba = 0.01 + cell.density * 0.06;
        const ga = 0.08 + cell.density * 0.2;
        drawRound(dx, dy, CUBE, CUBE, 20);
        const fill = ctx.createLinearGradient(dx, dy, dx, dy + CUBE);
        fill.addColorStop(0, `rgba(${fR},${fG},${fB},${ba + glow * ga})`);
        fill.addColorStop(1, `rgba(${fR},${fG},${fB},${ba * 0.2 + glow * ga * 0.2})`);
        ctx.fillStyle = fill;
        ctx.fill();
        const ea = 0.01 + cell.density * 0.02;
        const eg = 0.06 + cell.density * 0.12;
        ctx.strokeStyle = `rgba(255,255,255,${ea + glow * eg})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", init);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

/* ─────────────────────────────────────────────────
 * AMBIENT PARTICLES — drifting glyphs
 * ───────────────────────────────────────────────── */
function AmbientGlyphs() {
  const items = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        char: ["◈", "✦", "◇", "+", "◆", "▣"][i % 6],
        color: i % 3 === 0 ? "rgba(123,111,255,0.08)" : i % 3 === 1 ? "rgba(168,180,255,0.06)" : "rgba(245,237,211,0.05)",
        size: 8 + Math.random() * 8,
        drift: 30 + Math.random() * 40,
        duration: 20 + Math.random() * 15,
        delay: Math.random() * 10,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {items.map((s) => (
        <motion.span
          key={s.id}
          className="absolute font-pixel"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, color: s.color }}
          animate={{ y: [0, -s.drift, 0] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        >
          {s.char}
        </motion.span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────
 * BOOT SEQUENCE — terminal log lines
 * ───────────────────────────────────────────────── */
const BOOT_LINES = [
  "INITIALIZING OBSERVATORY CORE...",
  "LOADING EPISTEMIC INSTRUMENTS ✓",
  "SCOUT MODULE: STANDBY",
  "ORCHESTRATOR MODULE: STANDBY",
  "SKEPTIC MODULE: STANDBY",
  "EMPIRICIST MODULE: STANDBY",
  "COGNITIVE GRAPH: CALIBRATING",
  "AWAITING ARCHIVE CLEARANCE...",
];

/* ─────────────────────────────────────────────────
 * OBSERVATORY EYE — central artifact
 * ───────────────────────────────────────────────── */
function ObservatoryEye() {
  return (
    <div className="relative">
      {/* Soft radial bloom behind the eye */}
      <div
        className="absolute inset-0 -m-16 rounded-full mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(255,236,190,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* The eye SVG — observatory glyph */}
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 32 32"
        className="relative z-10 pulse-glow"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, scale: 0.8, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <rect x="14" y="14" width="4" height="4" fill="#0D0F1A" />
        <rect x="15" y="15" width="2" height="2" fill="#D4F87A" />
        <rect x="15" y="2" width="2" height="8" fill="#7B6FFF" />
        <rect x="15" y="22" width="2" height="8" fill="#7B6FFF" />
        <rect x="2" y="15" width="8" height="2" fill="#7B6FFF" />
        <rect x="22" y="15" width="8" height="2" fill="#7B6FFF" />
        <rect x="6" y="6" width="2" height="2" fill="#7B6FFF" />
        <rect x="24" y="6" width="2" height="2" fill="#7B6FFF" />
        <rect x="6" y="24" width="2" height="2" fill="#7B6FFF" />
        <rect x="24" y="24" width="2" height="2" fill="#7B6FFF" />
        <rect x="12" y="10" width="8" height="2" fill="#7B6FFF" />
        <rect x="12" y="20" width="8" height="2" fill="#7B6FFF" />
        <rect x="10" y="12" width="2" height="8" fill="#7B6FFF" />
        <rect x="20" y="12" width="2" height="8" fill="#7B6FFF" />
      </motion.svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────
 * MAIN AUTH PAGE
 * ───────────────────────────────────────────────── */
function AuthPage() {
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const navigate = useNavigate();

  // Staggered boot sequence lines
  useEffect(() => {
    const timers = BOOT_LINES.map((_, i) =>
      setTimeout(() => setVisibleLines(i + 1), 200 + i * 280)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ─── AUTH HANDLERS ─────────────────────────── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    // Mock sign in
    setTimeout(() => {
      useStore.getState().setUser({
        id: "mock-user-123",
        email: email,
        username: email.split("@")[0],
      });
      navigate({ to: "/dashboard" });
    }, 1000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    
    // Mock sign up
    setTimeout(() => {
      setSuccess("CONFIRMATION DISPATCHED — CHECK YOUR EMAIL TO COMPLETE ARCHIVE CLEARANCE");
      setLoading(false);
    }, 1500);
  };

  const handleGoogleOAuth = async () => {
    setError(null);
    
    // Mock Google OAuth
    useStore.getState().setUser({
      id: "mock-google-123",
      email: "researcher@example.com",
      username: "researcher",
    });
    navigate({ to: "/dashboard" });
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    if (!email) { setError("Enter your email address first"); return; }
    
    // Mock reset
    setTimeout(() => {
      setSuccess("PASSWORD RESET DISPATCH SENT — CHECK YOUR EMAIL");
    }, 1000);
  };

  const submit = tab === "signin" ? handleSignIn : handleSignUp;

  return (
    <div className="relative min-h-screen overflow-hidden crt-overlay">
      {/* LAYER 0 — Pixel-glass atmosphere */}
      <AuthAtmosphereCanvas />
      <AmbientGlyphs />

      {/* LAYER 1 — CRT scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)",
        }}
      />

      {/* LAYER 2 — Vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-[3]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,12,20,0.7) 100%)",
        }}
      />

      {/* MAIN CONTENT — artifact-centered composition */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">

        {/* TOP — Observatory header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="font-pixel text-[7px] tracking-[0.4em] text-mouse-gray/50">
            {"{ OBSERVATORY ACCESS PROTOCOL }"}
          </p>
        </motion.div>

        {/* CENTER — Eye artifact + Form (spatial composition) */}
        <div className="flex w-full max-w-lg flex-col items-center">

          {/* Observatory Eye Glyph */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, scale: 0.7, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ObservatoryEye />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="mb-2 font-pixel text-[14px] text-cream-terminal tracking-[0.15em]"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.6 }}
          >
            THE RESEARCHER
          </motion.h1>
          <motion.p
            className="mb-10 font-pixel text-[7px] tracking-[0.3em] text-periwinkle-soft/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9 }}
          >
            COGNITIVE RESEARCH OBSERVATORY
          </motion.p>

          {/* AUTH TERMINAL — solid beige retro panel */}
          <motion.div
            className="w-full max-w-md relative z-10"
            initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.4, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div
              className="relative overflow-hidden border-[2px] border-[#1A1A1A] bg-[#ECE2C7]"
              style={{
                boxShadow: "inset -2px -2px 0px rgba(0,0,0,0.1), inset 2px 2px 0px rgba(255,255,255,0.4), 0 0 60px rgba(255, 236, 190, 0.15), 0 20px 40px rgba(0,0,0,0.4)",
              }}
            >
              {/* Top bar — retro terminal header */}
              <div className="flex h-[38px] items-center justify-between border-b-[2px] border-[#1A1A1A] bg-[#DDD3BA] px-3">
                <div className="flex items-center gap-1.5">
                  <WindowDot color="#FFBD2E" symbol="─" />
                  <WindowDot color="#28C940" symbol="□" />
                  <WindowDot color="#FF5F57" symbol="✕" />
                </div>
                <div className="font-pixel text-[8px] tracking-[0.2em] text-[#1A1A1A]">
                  ARCHIVE_CLEARANCE.exe
                </div>
                <div className="w-[42px]"></div> {/* Spacer to balance dots */}
              </div>

              <div className="p-8">
                {/* Tab switcher */}
                <div className="mb-8 flex gap-2">
                  {(["signin", "register"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                      className={`flex-1 border-b-[3px] pb-3 font-pixel text-[8px] tracking-[0.2em] uppercase transition-all duration-300 ${
                        tab === t
                          ? "border-[#1A1A1A] text-[#1A1A1A]"
                          : "border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70"
                      }`}
                    >
                      {t === "signin" ? "◈ SIGN IN" : "◇ CREATE ARCHIVE"}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={submit} className="space-y-5">
                  <AnimatePresence mode="wait">
                    {tab === "register" && (
                      <motion.div
                        key="username-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <AuthField label="CALLSIGN" value={username} onChange={setUsername} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AuthField label="EMAIL" type="email" value={email} onChange={setEmail} required />
                  <AuthField label="PASSPHRASE" type="password" value={password} onChange={setPassword} required />

                  <AnimatePresence mode="wait">
                    {tab === "register" && (
                      <motion.div
                        key="confirm-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <AuthField label="CONFIRM PASSPHRASE" type="password" value={confirm} onChange={setConfirm} required />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.3 }}
                        className="border-[2px] border-[#B73A3A] bg-[#F4D4D4] px-4 py-3 shadow-[2px_2px_0_0_#B73A3A]"
                      >
                        <p className="font-pixel text-[8px] text-[#B73A3A] leading-relaxed">⚠ {error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success */}
                  <AnimatePresence>
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.3 }}
                        className="border-[2px] border-[#3F6A35] bg-[#D6E6D1] px-4 py-3 shadow-[2px_2px_0_0_#3F6A35]"
                      >
                        <p className="font-pixel text-[8px] text-[#3F6A35] leading-relaxed">✓ {success}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Loading state */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 pt-2"
                      >
                        <p className="font-mono text-[11px] text-[#1A1A1A]/70">VERIFYING CLEARANCE...</p>
                        <div className="h-[4px] w-full overflow-hidden border border-[#1A1A1A] bg-[#DDD3BA]">
                          <motion.div
                            className="h-full bg-[#1A1A1A]"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative mt-2 w-full border-[2px] border-[#1A1A1A] bg-[#1A1A1A] py-4 font-pixel text-[9px] tracking-[0.15em] text-[#ECE2C7] transition-all duration-300 hover:bg-[#2A2A2A] hover:shadow-[0_0_20px_rgba(255,236,190,0.3)] disabled:opacity-60"
                  >
                    <span className="relative z-10">
                      {loading ? "···" : tab === "signin" ? "▶ AUTHORIZE ACCESS" : "▶ REQUEST CLEARANCE"}
                    </span>
                  </button>
                </form>

                {/* Forgot password */}
                {tab === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="mt-6 block w-full text-left font-pixel text-[7px] tracking-[0.15em] text-[#1A1A1A]/50 transition-colors duration-300 hover:text-[#1A1A1A]"
                  >
                    LOST PASSPHRASE? REQUEST RESET
                  </button>
                )}

                {/* Divider */}
                <div className="my-8 flex items-center gap-4">
                  <div className="flex-1 border-t-2 border-[#1A1A1A]/10" />
                  <span className="font-pixel text-[7px] tracking-[0.3em] text-[#1A1A1A]/30">OR</span>
                  <div className="flex-1 border-t-2 border-[#1A1A1A]/10" />
                </div>

                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleOAuth}
                  className="w-full border-[2px] border-[#1A1A1A] bg-transparent px-4 py-3.5 font-pixel text-[8px] tracking-[0.15em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A]/5 hover:shadow-[0_0_15px_rgba(255,236,190,0.2)]"
                >
                  ◆ CONTINUE WITH GOOGLE
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOOT LOG — floating beneath the form, faint terminal lines */}
        <motion.div
          className="mt-16 w-full max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 1.5 }}
        >
          <div className="space-y-[4px]">
            {BOOT_LINES.map((line, i) => (
              <motion.p
                key={line}
                className="font-mono text-[9px] text-[#ECE2C7]/30 transition-opacity duration-700"
                style={{ opacity: i < visibleLines ? 0.3 : 0 }}
              >
                {"> "}{line}
              </motion.p>
            ))}
          </div>
        </motion.div>

        {/* BOTTOM — status line */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.5 }}
        >
          <p className="font-pixel text-[6px] tracking-[0.4em] text-mouse-gray/25">
            ◆ THE RESEARCHER · COGNITIVE RESEARCH OBSERVATORY · v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
 * FIELD — retro input
 * ───────────────────────────────────────────────── */
function AuthField({
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
      <span className="mb-2 block font-pixel text-[7px] tracking-[0.2em] text-[#1A1A1A]/80">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full border-[2px] border-[#1A1A1A]/20 bg-[#F5F0E1] px-4 py-3 font-mono text-[13px] text-[#1A1A1A] outline-none transition-all duration-300 placeholder:text-[#1A1A1A]/30 focus:border-[#1A1A1A] focus:bg-[#FFFFFF]"
      />
    </label>
  );
}

function WindowDot({ color, symbol }: { color: string; symbol: string }) {
  return (
    <div
      className="flex items-center justify-center border border-[#1A1A1A]"
      style={{
        width: 12,
        height: 12,
        backgroundColor: color,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 7,
        lineHeight: 1,
        color: "#1A1A1A",
      }}
    >
      <span className="block -mt-[1px]">{symbol}</span>
    </div>
  );
}
