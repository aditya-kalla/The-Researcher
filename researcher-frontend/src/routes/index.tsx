import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useMotionValue, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Sparkles } from "@/components/Sparkles";
import { Typewriter } from "@/components/Typewriter";
import { RetroWindow } from "@/components/RetroWindow";
import { AgentStateTerminal } from "@/components/AgentStateTerminal";
import { PixelProgressBar } from "@/components/PixelProgressBar";
import type { AgentStreamEntry } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const DEMO_STREAM: AgentStreamEntry[] = [
  { agent: "ORCHESTRATOR", color: "electric", lines: ["Booting 7-agent pipeline…", "Scout, Skeptic, Empiricist online."] },
  { agent: "SCOUT", color: "periwinkle", lines: ["Sweeping arXiv 2024-2026…", "412 candidate papers found."] },
  { agent: "SKEPTIC", color: "sakura", lines: ["Stress-testing claims.", "2 decay flags raised."] },
  { agent: "EMPIRICIST", color: "lime", lines: ["Reproducibility score: 0.81 ✓"] },
  { agent: "ADVOCATE", color: "cream", lines: ["Synthesizing dashboard."] },
];

function PixelAtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: -1000, y: -1000 });
  const scrollRef = useRef(0);
  const cellsRef = useRef<any[]>([]);
  const animFrameRef = useRef<number>(0);
  const baseColorRef = useRef<number[]>([13, 15, 26]);

  function getThemeCanvasColors() {
    const style = getComputedStyle(document.documentElement);
    const get = (v: string) => parseInt(style.getPropertyValue(v).trim()) || 0;
    return {
      base:    [get('--canvas-base-r'),    get('--canvas-base-g'),    get('--canvas-base-b')],
      bloom:   [get('--canvas-bloom-r'),   get('--canvas-bloom-g'),   get('--canvas-bloom-b')],
      diffuse: [get('--canvas-diffuse-r'), get('--canvas-diffuse-g'), get('--canvas-diffuse-b')],
      haze:    [get('--canvas-haze-r'),    get('--canvas-haze-g'),    get('--canvas-haze-b')],
      ghost:   [get('--canvas-ghost-r'),   get('--canvas-ghost-g'),   get('--canvas-ghost-b')],
    };
  }

  function initializeCells(colors: ReturnType<typeof getThemeCanvasColors>) {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const dpr = window.devicePixelRatio || 1;
    const CUBE_SIZE = 72;
    const GAP = 8;
    const TOTAL_SIZE = CUBE_SIZE + GAP;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const cols = Math.ceil(window.innerWidth / TOTAL_SIZE) + 1;
    const rows = Math.ceil(window.innerHeight / TOTAL_SIZE) + 1;

    const BASE = colors.base;
    const BLOOM = colors.bloom;
    const DIFFUSE = colors.diffuse;
    const HAZE = colors.haze;
    const GHOST = colors.ghost;
    const MID = [
      Math.round((BLOOM[0] + DIFFUSE[0]) / 2),
      Math.round((BLOOM[1] + DIFFUSE[1]) / 2),
      Math.round((BLOOM[2] + DIFFUSE[2]) / 2),
    ];

    baseColorRef.current = BASE;

    const getInfluence = (nx: number, ny: number, cx: number, cy: number, maxDist: number) => {
      const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
      return Math.max(0, 1 - dist / maxDist);
    };

    const cells: any[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        const ny = y / rows;

        let r = BASE[0];
        let g = BASE[1];
        let b = BASE[2];

        const inf1 = getInfluence(nx, ny, 0, 0, 0.7);
        r += (BLOOM[0] - BASE[0]) * inf1;
        g += (BLOOM[1] - BASE[1]) * inf1;
        b += (BLOOM[2] - BASE[2]) * inf1;

        const inf2 = getInfluence(nx, ny, 0, 1, 0.6);
        r += (HAZE[0] - BASE[0]) * inf2;
        g += (HAZE[1] - BASE[1]) * inf2;
        b += (HAZE[2] - BASE[2]) * inf2;

        const inf3 = getInfluence(nx, ny, 0.5, 0.5, 0.5);
        r += (MID[0] - BASE[0]) * inf3;
        g += (MID[1] - BASE[1]) * inf3;
        b += (MID[2] - BASE[2]) * inf3;

        const inf4 = getInfluence(nx, ny, 1, 0, 0.6);
        r += (DIFFUSE[0] - BASE[0]) * inf4;
        g += (DIFFUSE[1] - BASE[1]) * inf4;
        b += (DIFFUSE[2] - BASE[2]) * inf4;

        const inf5 = getInfluence(nx, ny, 1, 1, 0.6);
        r += (GHOST[0] - BASE[0]) * inf5;
        g += (GHOST[1] - BASE[1]) * inf5;
        b += (GHOST[2] - BASE[2]) * inf5;

        r += (BLOOM[0] - BASE[0]) * 0.05;
        g += (BLOOM[1] - BASE[1]) * 0.05;
        b += (BLOOM[2] - BASE[2]) * 0.05;

        const lowFreq = Math.sin(nx * Math.PI * 3) * Math.cos(ny * Math.PI * 3);
        const highFreq = Math.sin(nx * Math.PI * 8 + ny * Math.PI * 4) * 0.5;
        const density = Math.max(0, Math.min(1, (lowFreq + highFreq) * 0.5 + 0.5));

        cells.push({
          x: x * TOTAL_SIZE,
          y: y * TOTAL_SIZE,
          cx: x * TOTAL_SIZE + CUBE_SIZE / 2,
          cy: y * TOTAL_SIZE + CUBE_SIZE / 2,
          targetR: Math.min(255, Math.max(0, r)),
          targetG: Math.min(255, Math.max(0, g)),
          targetB: Math.min(255, Math.max(0, b)),
          density,
          energy: 0,
          offsetX: 0,
          offsetY: 0,
          baseOffset: Math.random() * Math.PI * 2,
        });
      }
    }
    return cells;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CUBE_SIZE = 72;

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    scrollRef.current = window.scrollY;

    // Initialize cells from theme CSS variables
    cellsRef.current = initializeCells(getThemeCanvasColors());

    const handleResize = () => {
      cellsRef.current = initializeCells(getThemeCanvasColors());
    };
    window.addEventListener("resize", handleResize);

    // Watch for theme changes via data-theme attribute
    const observer = new MutationObserver(() => {
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'opacity 200ms ease';
        canvasRef.current.style.opacity = '0';
        setTimeout(() => {
          const newColors = getThemeCanvasColors();
          cellsRef.current = initializeCells(newColors);
          if (canvasRef.current) {
            canvasRef.current.style.opacity = '1';
          }
        }, 220);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const render = () => {
      const BASE = baseColorRef.current;
      ctx.fillStyle = `rgb(${BASE[0]}, ${BASE[1]}, ${BASE[2]})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const scrollY = scrollRef.current;
      const time = Date.now() * 0.0005;
      const cells = cellsRef.current;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        const dist = Math.hypot(cell.cx - cx, cell.cy - cy);
        const influenceRadius = 450;

        if (dist < influenceRadius) {
          const power = Math.pow((influenceRadius - dist) / influenceRadius, 2);
          const densityMultiplier = 0.04 + cell.density * 0.14;
          cell.energy += power * densityMultiplier;
        }

        cell.energy += (0 - cell.energy) * 0.03;

        const ambientY = Math.sin(time + cell.baseOffset) * 1.5 - (scrollY * 0.05);
        const ambientX = Math.cos(time + cell.baseOffset) * 1.5;

        const drawX = cell.x + ambientX;
        const drawY = cell.y + ambientY;

        const dimR = cell.targetR * (0.03 + cell.density * 0.15);
        const dimG = cell.targetG * (0.03 + cell.density * 0.15);
        const dimB = cell.targetB * (0.03 + cell.density * 0.15);

        const glow = Math.min(cell.energy * 2.2, 3.5);

        const whiteMix = Math.max(0, glow - 1.5) * 35;

        const finalR = Math.min(255, dimR + (cell.targetR - dimR) * glow + whiteMix);
        const finalG = Math.min(255, dimG + (cell.targetG - dimG) * glow + whiteMix);
        const finalB = Math.min(255, dimB + (cell.targetB - dimB) * glow + whiteMix);

        let gradX1, gradY1, gradX2, gradY2;

        if (dist < influenceRadius * 2) {
          const angleToCursor = Math.atan2(cy - cell.cy, cx - cell.cx);
          const nx = Math.cos(angleToCursor);
          const ny = Math.sin(angleToCursor);

          const centerX = drawX + CUBE_SIZE / 2;
          const centerY = drawY + CUBE_SIZE / 2;

          gradX1 = centerX + nx * (CUBE_SIZE / 2);
          gradY1 = centerY + ny * (CUBE_SIZE / 2);
          gradX2 = centerX - nx * (CUBE_SIZE / 2);
          gradY2 = centerY - ny * (CUBE_SIZE / 2);
        } else {
          gradX1 = drawX;
          gradY1 = drawY;
          gradX2 = drawX;
          gradY2 = drawY + CUBE_SIZE;
        }

        drawRoundRect(drawX, drawY, CUBE_SIZE, CUBE_SIZE, 20);

        const fillGradient = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);

        const baseAlpha = 0.01 + cell.density * 0.08;
        const glowAlpha = 0.1 + cell.density * 0.25;

        fillGradient.addColorStop(0, `rgba(${finalR}, ${finalG}, ${finalB}, ${baseAlpha + glow * glowAlpha})`);
        fillGradient.addColorStop(1, `rgba(${finalR}, ${finalG}, ${finalB}, ${baseAlpha * 0.2 + glow * glowAlpha * 0.2})`);

        ctx.fillStyle = fillGradient;
        ctx.fill();

        const strokeGradient = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);

        const edgeBase = 0.01 + cell.density * 0.03;
        const edgeGlowMultiplier = 0.08 + cell.density * 0.15;

        strokeGradient.addColorStop(0, `rgba(255, 255, 255, ${edgeBase + glow * edgeGlowMultiplier})`);
        strokeGradient.addColorStop(1, `rgba(255, 255, 255, ${edgeBase * 0.2 + glow * edgeGlowMultiplier * 0.2})`);

        ctx.strokeStyle = strokeGradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-research-navy text-mono-white crt-overlay">
      <PixelAtmosphereCanvas />
      <Navigation />
      <Hero />
      <FeatureStrip />
      <HowItWorks />
      <ObservatoryScrollStory />
      <StatsBar />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section
      className="homepage-section graph-paper relative min-h-[calc(100vh-3rem)] overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(123,111,255,0.05), rgba(13,15,26,0.96))" }}
    >
      <Sparkles count={28} />
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-5 lg:px-12">
        {/* Left column */}
        <div className="lg:col-span-3">
          <p className="font-pixel text-[11px] text-cream-terminal">◆ THE RESEARCHER</p>
          <div className="mt-16 space-y-2">
            <svg width="64" height="64" viewBox="0 0 32 32" className="pulse-glow mb-6 block" xmlns="http://www.w3.org/2000/svg">
              {/* Central eye */}
              <rect x="14" y="14" width="4" height="4" fill="#0D0F1A" />
              {/* Iris */}
              <rect x="15" y="15" width="2" height="2" fill="#D4F87A" />
              {/* 8 Rays */}
              <rect x="15" y="2" width="2" height="8" fill="#7B6FFF" />
              <rect x="15" y="22" width="2" height="8" fill="#7B6FFF" />
              <rect x="2" y="15" width="8" height="2" fill="#7B6FFF" />
              <rect x="22" y="15" width="8" height="2" fill="#7B6FFF" />
              {/* Diagonals using 2x2 dots */}
              <rect x="6" y="6" width="2" height="2" fill="#7B6FFF" />
              <rect x="24" y="6" width="2" height="2" fill="#7B6FFF" />
              <rect x="6" y="24" width="2" height="2" fill="#7B6FFF" />
              <rect x="24" y="24" width="2" height="2" fill="#7B6FFF" />
              {/* Surrounding ring */}
              <rect x="12" y="10" width="8" height="2" fill="#7B6FFF" />
              <rect x="12" y="20" width="8" height="2" fill="#7B6FFF" />
              <rect x="10" y="12" width="2" height="8" fill="#7B6FFF" />
              <rect x="20" y="12" width="2" height="8" fill="#7B6FFF" />
            </svg>
            <h1 className="font-pixel text-[clamp(28px,5vw,56px)] leading-[1.1]">
              <span className="block text-cream-terminal">
                <Typewriter text="INTELLIGENCE" speed={45} />
              </span>
              <span className="block text-periwinkle-soft">
                <Typewriter text="FOR EVERY" speed={45} delay={950} />
              </span>
              <span className="block text-electric-accent">
                <Typewriter text="RESEARCHER." speed={45} delay={1700} cursor />
              </span>
            </h1>
          </div>
          <p className="mt-10 max-w-xl font-body text-[16px] leading-[1.7] text-mono-white/70">
            From high school essays to doctoral dissertations — THE RESEARCHER is a multi-agent
            AI intelligence system that reads, synthesizes, debates, and maps knowledge across any
            field. Not a search engine. Not a chatbot. A cognitive research architecture.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center border-2 border-black bg-electric-accent px-6 py-3.5 font-pixel text-[11px] text-black shadow-[3px_3px_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]"
            >
              ▶ PRESS START
            </Link>
            <a
              href="#features"
              className="inline-flex items-center border border-cream-terminal px-6 py-3.5 font-pixel text-[9px] text-cream-terminal hover:bg-cream-terminal/10"
            >
              EXPLORE FEATURES →
            </a>
          </div>
        </div>

        {/* Right column — retro monitor */}
        <div className="lg:col-span-2">
          <Monitor />
        </div>
      </div>
    </section>
  );
}

function Monitor() {
  return (
    <div className="relative mx-auto max-w-md">
      <p className="mb-2 font-pixel text-[8px] text-mouse-gray">THE RESEARCHER v1.0</p>
      <div
        className="rounded-[8px] border-[3px] border-[#4A3A6A] bg-[#2A2040] p-3 monitor-frame transition-colors duration-400"
        style={{ boxShadow: "0 0 40px rgba(123,111,255,0.10), 0 20px 0 #1A1030" }}
      >
        <div className="aspect-[4/3] overflow-hidden bg-black monitor-screen transition-colors duration-400">
          <AgentStateTerminal stream={DEMO_STREAM} isStreaming={true} loop height={320} speedMs={26} />
        </div>
      </div>
      {/* floating decorations */}
      <motion.span
        className="absolute -left-6 -top-4 font-pixel text-xl text-periwinkle-soft"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        ✦
      </motion.span>
      <motion.span
        className="absolute -right-4 top-10 font-pixel text-lg text-sakura-alert"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, delay: 0.5 }}
      >
        ♡
      </motion.span>
      <motion.span
        className="absolute -bottom-6 left-12 font-pixel text-lg text-lime-signal"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1 }}
      >
        +
      </motion.span>
    </div>
  );
}

function FeatureStrip() {
  const features = [
    {
      title: "AGENT_STATE.exe",
      heading: "7-Agent Pipeline",
      body: "Orchestrator, Scout, Skeptic, Empiricist, Advocate, Cartographer, Frontier. Watch them deliberate in real time.",
      icon: "◈",
    },
    {
      title: "LEVELS.sys",
      heading: "4 Complexity Tiers",
      body: "From L1 high-school casual to L4 doctoral expert. The same topic, calibrated to your depth.",
      icon: "▣",
    },
    {
      title: "EXPORT.bat",
      heading: "PDF Research Packs",
      body: "Every session exports to a typeset, citation-ready document. Bring it to your advisor.",
      icon: "▼",
    },
  ];
  return (
    <section id="features" className="homepage-section border-y border-pixel-border bg-research-navy px-6 py-16 lg:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <div className="atmosphere-glass">
              <RetroWindow title={f.title}>
                <div className="font-pixel text-3xl text-electric-accent">{f.icon}</div>
                <h3 className="mt-4 font-pixel text-[10px] text-cream-terminal">{f.heading}</h3>
                <p className="mt-3 font-body text-[13px] leading-[1.6] text-mono-white/80">{f.body}</p>
              </RetroWindow>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Choose a topic", body: "Any field. Any depth. Paste a question, a paper, or a vague hunch." },
    { n: "02", title: "Set your level", body: "L1 casual → L4 expert. Calibrate vocabulary and rigor." },
    { n: "03", title: "Agents deliberate", body: "Watch 7 specialized agents argue, cite, and converge live." },
    { n: "04", title: "Get your dashboard", body: "Summary, claims, gaps, analogies, frontier papers, export." },
  ];
  return (
    <section className="homepage-section pixel-grid-overlay relative overflow-hidden bg-mono-white px-6 py-20 text-research-navy graph-paper-dark lg:px-12">
      <h2 className="text-center font-pixel text-[14px] tracking-widest text-research-navy">HOW IT WORKS</h2>
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {steps.map((s) => (
          <div key={s.n} className="border-2 border-research-navy bg-cream-terminal p-6 shadow-[4px_4px_0_#0D0F1A]">
            <p className="font-pixel text-[10px] text-electric-accent">{s.n}</p>
            <h3 className="mt-3 font-pixel text-[12px]">{s.title}</h3>
            <p className="mt-3 font-body text-[14px] leading-[1.6]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ObservatoryScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [displayStage, setDisplayStage] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange((v) => {
      if (v >= 1) {
        setDisplayStage(3);
      } else {
        setDisplayStage(Math.floor(v / 0.25));
      }
    });
  }, [scrollYProgress]);

  const STAGES = [
    {
      label: "01 — THE SIGNAL",
      heading: "Start from curiosity.",
      body: "Ask anything — from science to philosophy to everyday questions. The observatory responds to any signal.",
      gif: "/assets/chemicalglasstube_transparent.gif",
      glowColor: "rgba(255, 60, 40, 0.4)",
      metadata: ["OBSERVATORY CORE", "LATENT CURIOSITY", "PROTOCOL: ALPHA-1"]
    },
    {
      label: "02 — THE MACHINE",
      heading: "Research without friction.",
      body: "Multiple AI agents organize, synthesize, and explain complex topics with depth and clarity.",
      gif: "/assets/computer_gif.gif",
      glowColor: "rgba(123, 111, 255, 0.35)",
      metadata: ["OBSERVATORY CORE", "AGENTIC SYNTHESIS", "PROTOCOL: BETA-4"]
    },
    {
      label: "03 — THE ARCANE REASONING",
      heading: "See the reasoning.",
      body: "Every answer is connected to claims, mechanisms, and source-backed evidence. Nothing is a black box.",
      gif: "/assets/minecraft_enchantmenttableandsword_transparent.gif",
      glowColor: "rgba(168, 180, 255, 0.35)",
      metadata: ["OBSERVATORY CORE", "EPISTEMIC GRAPH", "PROTOCOL: DELTA-7"]
    },
    {
      label: "04 — THE AWAKENING",
      heading: "Open the knowledge layer.",
      body: "Access references, reconstructed papers, and grounding literature directly. The observatory is fully awake.",
      gif: "/assets/eyevideo_gif.gif",
      glowColor: "rgba(212, 248, 122, 0.35)",
      metadata: ["OBSERVATORY CORE", "LATENT REASONING", "PROTOCOL: OMEGA-9"]
    }
  ];

  const currentStageData = STAGES[displayStage];

  return (
    <>
      <div className="relative z-10 border-t border-b border-pixel-border/30 bg-research-navy py-6 text-center">
        <p className="font-pixel text-[8px] text-mouse-gray tracking-[0.3em]">
          {"{ THE OBSERVATORY INTELLIGENCE SYSTEM }"}
        </p>
      </div>

      <section ref={containerRef} className="homepage-section relative h-[400vh] bg-transparent">
        <div
          className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden"
          style={{
            background: "rgba(13, 15, 26, 0.25)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)"
          }}
        >
          {/* Subtle background tint interaction matching the active artifact color */}
          <div
            className="absolute inset-0 z-0 pointer-events-none transition-colors duration-1000 ease-out"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${currentStageData.glowColor} 0%, transparent 50%)`,
              opacity: 0.4,
              mixBlendMode: "screen"
            }}
          ></div>

          {/* Edge fades */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              maskImage: "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)"
            }}
          ></div>

          {/* MAIN CENTRALISED LAYOUT */}
          <div className="relative z-20 w-full max-w-[1500px] h-full mx-auto flex flex-col justify-between py-12 px-6 md:px-12 pointer-events-none">

            {/* MASSIVE BACKGROUND ARTIFACT */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

              {/* Faint Glass Pedestal */}
              <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-[280px] md:w-[450px] h-[60px] rounded-[100%] border-t border-white/5 bg-gradient-to-t from-white/[0.03] to-transparent blur-[1px]"></div>

              <div className="relative w-[280px] h-[280px] md:w-[500px] md:h-[500px]">

                <AnimatePresence>
                  <motion.div
                    key={displayStage}
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(24px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(24px)' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {/* Radial Soft Glow Layer Behind Artifact */}
                    <div
                      className="absolute inset-0 rounded-full blur-[60px] opacity-60 mix-blend-screen"
                      style={{ background: `radial-gradient(circle, ${currentStageData.glowColor} 0%, transparent 70%)` }}
                    />

                    {/* Drifting Floating Pixel Particles */}
                    <div className="absolute inset-0">
                      {[...Array(6)].map((_, j) => (
                        <motion.div
                          key={`p-${displayStage}-${j}`}
                          className="absolute w-1 h-1 bg-white mix-blend-overlay"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            y: [0, -20 - Math.random() * 30],
                            opacity: [0, 0.4, 0],
                            scale: [0.5, 1, 0.5]
                          }}
                          transition={{
                            duration: 4 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 4,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>

                    {/* The Premium Pixel Art GIF */}
                    <motion.img
                      src={currentStageData.gif}
                      alt={currentStageData.label}
                      className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                      style={{ imageRendering: "pixelated" }}
                      animate={{ y: [-4, 4, -4] }}
                      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
                    />
                  </motion.div>
                </AnimatePresence>

              </div>
            </div>

            {/* FOREGROUND CONTENT ORBITING THE ARTIFACT */}

            {/* TOP MOBILE BREADCRUMB */}
            <div className="w-full flex justify-center md:hidden relative z-30 mb-8">
              <p className="font-pixel text-[10px] text-electric-accent tracking-[0.25em]">{currentStageData.label}</p>
            </div>

            {/* MIDDLE DESKTOP CONTENT (Left + Right flanking the artifact) */}
            <div className="hidden md:flex flex-1 w-full justify-between items-center relative z-30">

              {/* LEFT: ATMOSPHERIC METADATA */}
              <div className="w-[260px]">
                <p className="font-pixel text-[10px] text-electric-accent tracking-[0.25em] mb-4">{currentStageData.label}</p>
                <div className="w-12 h-[1px] bg-electric-accent/40 mb-4"></div>
                <p className="font-pixel text-[8px] text-mouse-gray/60 tracking-widest leading-[2.5]">
                  {currentStageData.metadata.map((m, idx) => (
                    <span key={idx}>{m}<br /></span>
                  ))}
                </p>
              </div>

              {/* RIGHT: MAIN HEADING & BODY */}
              <div className="w-[420px] pointer-events-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayStage}
                    initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <h3 className="font-pixel text-[34px] lg:text-[42px] text-cream-terminal leading-[1.1] mb-6 drop-shadow-[0_4px_20px_rgba(245,237,211,0.15)]">
                      {currentStageData.heading}
                    </h3>
                    <p className="font-body text-[16px] lg:text-[18px] text-cream-terminal/70 leading-[1.9]">
                      {currentStageData.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

            {/* BOTTOM PROGRESS SYSTEM & MOBILE TEXT */}
            <div className="w-full flex flex-col md:flex-row items-center md:items-end justify-between relative z-30 mt-auto md:mt-0 pb-6">

              {/* MOBILE TEXT */}
              <div className="w-full md:hidden text-center mb-12 pointer-events-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayStage}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                    transition={{ duration: 0.6 }}
                  >
                    <h3 className="font-pixel text-[24px] text-cream-terminal leading-tight mb-4">
                      {currentStageData.heading}
                    </h3>
                    <p className="font-body text-[14px] text-cream-terminal/70 leading-[1.7] max-w-[320px] mx-auto">
                      {currentStageData.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* PROGRESS DOTS */}
              <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-[2px] transition-all duration-700 ease-[0.25,0.46,0.45,0.94] ${displayStage === i
                        ? 'w-10 bg-electric-accent shadow-[0_0_12px_#7B6FFF]'
                        : 'w-3 bg-pixel-border'
                      }`}
                  />
                ))}
              </div>

              {/* SCROLL HINT (Desktop) */}
              <div className="hidden md:block">
                <p
                  className="font-pixel text-[8px] text-mouse-gray/40 tracking-widest transition-opacity duration-1000"
                  style={{ opacity: displayStage === 0 ? 1 : 0 }}
                >
                  {"{ SCROLL DOWN }"}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

function StatsBar() {
  return (
    <section className="homepage-section border-t border-pixel-border bg-session-dark px-6 py-16 lg:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
        <Stat label="SESSIONS" value="10,000+" />
        <div>
          <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">LEVELS</p>
          <p className="mt-2 font-pixel text-2xl text-cream-terminal">4 TIERS</p>
          <div className="mt-3">
            <PixelProgressBar value={100} color="electric" showValue={false} animated />
          </div>
        </div>
        <Stat label="AGENTS" value="7 ACTIVE" />
        <Stat label="STATUS" value="PDF READY ✓" color="lime" />
      </div>
    </section>
  );
}

function Stat({ label, value, color = "cream" }: { label: string; value: string; color?: "cream" | "lime" }) {
  return (
    <div>
      <p className="font-pixel text-[8px] tracking-wider text-mouse-gray">{label}</p>
      <p
        className={`mt-2 font-pixel text-2xl ${color === "lime" ? "text-lime-signal" : "text-cream-terminal"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="homepage-section border-t border-pixel-border bg-research-navy px-6 py-10 text-center lg:px-12">
      <p className="font-pixel text-[8px] text-mouse-gray">
        ◆ THE RESEARCHER · A COGNITIVE ARCHITECTURE FOR DEEP WORK
      </p>
    </footer>
  );
}
