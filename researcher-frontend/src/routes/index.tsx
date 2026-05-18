import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Sparkles } from "@/components/Sparkles";
import { Typewriter } from "@/components/Typewriter";
import { RetroWindow } from "@/components/RetroWindow";
import { AgentStateTerminal } from "@/components/AgentStateTerminal";
import { PixelProgressBar } from "@/components/PixelProgressBar";
import { PixelLandscape } from "@/components/PixelLandscape";
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

function LandingPage() {
  return (
    <div className="min-h-screen bg-research-navy text-mono-white">
      <Navigation />
      <Hero />
      <FeatureStrip />
      <HowItWorks />
      <Differentiators />
      <StatsBar />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section
      className="graph-paper relative min-h-[calc(100vh-3rem)] overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0D0F1A 0%, #1A1D35 100%)" }}
    >
      <Sparkles count={28} />
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-5 lg:px-12">
        {/* Left column */}
        <div className="lg:col-span-3">
          <p className="font-pixel text-[11px] text-cream-terminal">◆ THE RESEARCHER</p>
          <div className="mt-16 space-y-2">
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
        className="rounded-[8px] border-[3px] border-[#4A3A6A] bg-[#2A2040] p-3"
        style={{ boxShadow: "0 0 40px rgba(123,111,255,0.3), 0 20px 0 #1A1030" }}
      >
        <div className="aspect-[4/3] overflow-hidden bg-black">
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
    <section id="features" className="border-y border-pixel-border bg-research-navy px-6 py-16 lg:px-12">
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
            <RetroWindow title={f.title}>
              <div className="font-pixel text-3xl text-electric-accent">{f.icon}</div>
              <h3 className="mt-4 font-pixel text-[10px] text-cream-terminal">{f.heading}</h3>
              <p className="mt-3 font-body text-[13px] leading-[1.6] text-mono-white/80">{f.body}</p>
            </RetroWindow>
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
    <section className="relative overflow-hidden bg-mono-white px-6 py-20 text-research-navy graph-paper-dark lg:px-12">
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

function Differentiators() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -80]);

  const items = [
    { icon: "◆", title: "DEPTH AT ANY LEVEL", body: "The same topic, rendered for a curious teen or a tenured professor." },
    { icon: "◇", title: "EPISTEMIC HONESTY", body: "Stale claims flagged. Confidence intervals shown. No hallucinated citations." },
    { icon: "◈", title: "KNOWLEDGE MAPPING", body: "Cross-domain analogies and prerequisite chains, not just text." },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden bg-research-navy px-6 py-24 lg:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="border border-pixel-border bg-session-dark p-6">
            <p className="font-pixel text-2xl text-electric-accent">{it.icon}</p>
            <h3 className="mt-3 font-pixel text-[10px] text-cream-terminal">{it.title}</h3>
            <p className="mt-3 font-body text-[14px] leading-[1.7] text-mono-white/80">{it.body}</p>
          </div>
        ))}
      </div>
      <motion.div style={{ y }} className="mt-16">
        <PixelLandscape className="h-[300px] w-full" />
      </motion.div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="border-t border-pixel-border bg-session-dark px-6 py-16 lg:px-12">
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
    <footer className="border-t border-pixel-border bg-research-navy px-6 py-10 text-center lg:px-12">
      <p className="font-pixel text-[8px] text-mouse-gray">
        ◆ THE RESEARCHER · A COGNITIVE ARCHITECTURE FOR DEEP WORK
      </p>
    </footer>
  );
}
