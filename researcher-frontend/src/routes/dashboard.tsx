import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { callResearchAPI } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { RightPanel } from "@/components/RightPanel";
import { QueryInput } from "@/components/QueryInput";
import { AgentStateTerminal } from "@/components/AgentStateTerminal";
import { DashboardPanels } from "@/components/DashboardPanels";
import { FrontierCard } from "@/components/FrontierCard";
import { RetroWindow } from "@/components/RetroWindow";
import { PixelProgressBar } from "@/components/PixelProgressBar";
import { Typewriter } from "@/components/Typewriter";
import { PDFExportModal } from "@/components/PDFExportModal";
import { SpecialPanelModal } from "@/components/SpecialPanels";
import { SourceVaultDrawer } from "@/components/SourceVaultDrawer";
import type { ResearchResponse, ResearchSession, SpecialResponse } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — THE RESEARCHER" }] }),
});

/* ─────────────────────────────────────────────────
 * OBSERVATORY OVERLAY — full-screen boot sequence
 * ───────────────────────────────────────────────── */

const OBSERVER_AGENTS = [
  "ORCHESTRATOR",
  "SCOUT",
  "CLASSIFIER",
  "GRAPH_ARCHITECT",
  "ADVOCATE",
  "SKEPTIC",
  "EMPIRICIST",
];

function ObservatoryOverlay() {
  const { isBooting, setIsBooting } = useStore();
  const [activeAgents, setActiveAgents] = useState<number[]>([]);

  // Auto-dismiss after 3.5 seconds to keep it a brief, cinematic awakening
  useEffect(() => {
    if (!isBooting) return;
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isBooting, setIsBooting]);

  // Reset pill state each time isBooting flips to true
  useEffect(() => {
    if (isBooting) setActiveAgents([]);
  }, [isBooting]);

  // Stagger agent activation at 500ms intervals
  useEffect(() => {
    const timers = OBSERVER_AGENTS.map((_, i) =>
      setTimeout(() => {
        setActiveAgents((prev) => [...prev, i]);
      }, i * 500),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      key="observatory-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(10, 12, 24, 0.75)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      {/* LAYER 2 — SUNNY EYE VIDEO */}
      <div 
        className="rounded-xl overflow-hidden" 
        style={{ position: "relative", width: 320, height: 320 }}
      >
        {/* E. Glow behind video (z-index 0) */}
        <div
          className="observatory-glow"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background:
              "radial-gradient(ellipse at center, rgba(123, 111, 255, 0.08) 0%, transparent 70%)",
          }}
        />

        {/* A. Video */}
        <video
          src="/assets/eyevideo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="crt-video video-pixelated"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
            opacity: 0.88,
            mixBlendMode: "screen",
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* B. CRT scanline overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.12) 3px, rgba(0, 0, 0, 0.12) 4px)",
            zIndex: 2,
          }}
        />

        {/* C. Vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(13, 15, 26, 0.75) 100%)",
            zIndex: 3,
          }}
        />
      </div>

      {/* LAYER 3 — TYPEWRITER STATUS LINE */}
      <div className="mt-8">
        <Typewriter
          text="AWAKENING 7-AGENT COUNCIL... CALIBRATING EPISTEMIC INSTRUMENTS..."
          className="font-mono text-[11px] text-lime-signal tracking-wider"
          speed={35}
        />
      </div>

      {/* LAYER 4 — AGENT ACTIVATION PILLS */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {OBSERVER_AGENTS.map((agent, i) => {
          const active = activeAgents.includes(i);
          return (
            <span
              key={agent}
              className={`border px-2 py-1 font-pixel text-[7px] tracking-wider transition-all duration-700 ${
                active
                  ? "text-lime-signal border-lime-signal/30 bg-lime-signal/5"
                  : "text-mouse-gray border-pixel-border/40"
              }`}
            >
              {active ? `● ${agent}` : `○ ${agent}`}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

function DashboardPage() {
  const isMobile = useIsMobile();
  const {
    user,
    isAuthenticated,
    sidebarCollapsed,
    rightPanelCollapsed,
    toggleSidebar,
    toggleRightPanel,
    activeTab,
    setActiveTab,
    addSession,
    currentSessionId,
    sessions,
    setCurrentSession,
    defaultLevel,
    defaultLengthMode,
    showExportModal,
    setShowExportModal,
    isBooting,
    setIsBooting,
    sourceVaultOpen,
    setSourceVaultOpen,
    setActiveVaultSource,
  } = useStore();

  // Trigger boot sequence when first entering the dashboard
  useEffect(() => {
    setIsBooting(true);
  }, [setIsBooting]);

  const [isResearching, setIsResearching] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [researchData, setResearchData] = useState<ResearchResponse | null>(null);
  const [pendingSession, setPendingSession] = useState<ResearchSession | null>(null);
  const [special, setSpecial] = useState<SpecialResponse | null>(null);
  const [specialLoading, setSpecialLoading] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<ResearchResponse["frontier_cards"][number] | null>(null);
  const uploadedSources = useStore((s) => s.uploadedSources);

  // when switching session
  const current = sessions.find((s) => s.id === currentSessionId);
  const activeData = researchData ?? current?.researchData ?? null;
  const dashboardReady = !!activeData && (!showStream || streamComplete);

  const runResearch = async (
    topic: string, 
    level: 1 | 2 | 3 | 4, 
    lengthMode: "Summary" | "Detailed" | "Deep Dive",
    filters?: {
      dateRange: { from: number; to: number };
      country: string;
      journalRank: string;
      minCitations: number;
    }
  ) => {
    if (filters) console.log('[FILTERS]', filters);
    setIsBooting(true);
    setIsResearching(true);
    setStreamComplete(false);
    setShowStream(true);
    setResearchData(null);
    setPendingSession(null);
    setSelectedPaper(null);
    try {
      const data = await callResearchAPI({
        topic,
        level,
        length_mode: lengthMode,
        uploaded_sources: uploadedSources,
        filters,
      });
      const session: ResearchSession = {
        id: crypto.randomUUID(),
        title: topic.slice(0, 48),
        topic,
        level,
        lengthMode,
        createdAt: new Date().toISOString(),
        researchData: data,
      };
      setResearchData(data);
      setPendingSession(session);
      setIsBooting(false);
    } catch {
      setIsResearching(false);
      setShowStream(false);
      setIsBooting(false);
    }
  };

  const handleStreamComplete = () => {
    if (pendingSession) {
      addSession(pendingSession);
      setPendingSession(null);
    }
    setStreamComplete(true);
    setIsResearching(false);
  };

  const newSession = () => {
    setCurrentSession(null);
    setResearchData(null);
    setShowStream(false);
    setStreamComplete(false);
    setSelectedPaper(null);
  };

  const openPaperSidebar = (paper: ResearchResponse["frontier_cards"][number]) => {
    setSelectedPaper(paper);
  };

  const closePaperSidebar = () => setSelectedPaper(null);

  const researchPaper = (paper: ResearchResponse["frontier_cards"][number]) => {
    setSelectedPaper(null);
    setActiveTab("research");
    runResearch(paper.paper_title, defaultLevel, defaultLengthMode);
  };

  const runCommand = async (command: string) => {
    if (!activeData) return;
    setSpecialLoading(command);
    try {
      const data = await callResearchAPI({
        topic: activeData.session.topic,
        level: activeData.session.level,
        length_mode: activeData.session.length_mode as "Summary" | "Detailed" | "Deep Dive",
        uploaded_sources: uploadedSources,
        command,
      });
      if (data.special_response) setSpecial(data.special_response);
    } finally {
      setSpecialLoading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-research-navy p-6">
        <RetroWindow title="ACCESS_DENIED.exe" variant="alert">
          <p className="font-mono text-[13px] text-mono-white">You must sign in to access the dashboard.</p>
          <a
            href="/auth"
            className="mt-4 inline-block border-2 border-black bg-electric-accent px-4 py-2 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000]"
          >
            ▶ SIGN IN
          </a>
        </RetroWindow>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-research-navy text-mono-white">
      {/* OBSERVATORY OVERLAY */}
      <AnimatePresence>
        {isBooting && <ObservatoryOverlay />}
      </AnimatePresence>
      {/* TOP NAV */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-pixel-border bg-[#0A0C18] px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="font-pixel text-[10px] text-mouse-gray hover:text-mono-white"
            title="Toggle sidebar"
          >
            {sidebarCollapsed ? "▷" : "◁"}
          </button>
          <a href="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" className="pulse-glow" xmlns="http://www.w3.org/2000/svg">
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
            </svg>
            <span className="font-pixel text-[11px] text-cream-terminal">THE RESEARCHER</span>
          </a>
        </div>
        <div className="font-mono text-[12px] text-periwinkle-soft">
          {current?.title ?? "Untitled Session"}
        </div>
        <div className="flex items-center gap-4">
          {activeData && (
            <button
              onClick={() => setShowExportModal(true)}
              title="Export research as PDF"
              className="font-pixel text-[12px] text-periwinkle-soft hover:text-cream-terminal"
            >
              📄
            </button>
          )}
          {activeData && (
            <button
              onClick={() => {
                setSourceVaultOpen(!sourceVaultOpen);
                if (sourceVaultOpen) setActiveVaultSource(null);
              }}
              className={`border px-3 py-1.5 font-pixel text-[8px] transition-all duration-200 ${
                sourceVaultOpen
                  ? "border-electric-accent/50 bg-electric-accent/[0.08] text-electric-accent"
                  : "border-pixel-border text-mouse-gray hover:text-cream-terminal hover:border-cream-terminal/40"
              }`}
            >
              {sourceVaultOpen ? "◈ VAULT OPEN" : "◈ SOURCE VAULT"}
            </button>
          )}
          <a
            href="/settings"
            className="font-pixel text-[8px] tracking-wider text-mouse-gray hover:text-cream-terminal"
          >
            SETTINGS
          </a>
          <span className="font-mono text-[11px] text-periwinkle-soft">{user?.username}</span>
          <div className="flex h-7 w-7 items-center justify-center bg-electric-accent font-pixel text-[8px] text-black">
            {user?.username.slice(0, 2).toUpperCase()}
          </div>
          <button
            onClick={toggleRightPanel}
            className="font-pixel text-[10px] text-mouse-gray hover:text-mono-white"
            title="Toggle right panel"
          >
            {rightPanelCollapsed ? "◁" : "▷"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <DashboardSidebar onNewSession={newSession} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTRAL */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-6">
            {/* TABS */}
            <div className="mb-6 flex gap-6 border-b border-pixel-border">
              {(["research", "frontier"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`-mb-px border-b-2 pb-3 font-pixel text-[9px] tracking-[0.15em] transition-colors ${
                    activeTab === t
                      ? "border-electric-accent text-electric-accent"
                      : "border-transparent text-mouse-gray hover:text-mono-white"
                  }`}
                >
                  ◈ {t === "research" ? "RESEARCH" : "KNOWLEDGE FRONTIER"}
                </button>
              ))}
            </div>

            {activeTab === "research" ? (
              <div className="space-y-6">
                <QueryInput
                  onSubmit={runResearch}
                  loading={isResearching}
                  defaultLevel={defaultLevel}
                  defaultLengthMode={defaultLengthMode}
                />

                {showStream && researchData?.agent_stream && (
                  <RetroWindow
                    key={streamComplete ? "AGENT_STATE.exe-collapsed" : "AGENT_STATE.exe-live"}
                    title="AGENT_STATE.exe"
                    variant="terminal"
                    collapsible
                    defaultCollapsed={streamComplete}
                  >
                    <AgentStateTerminal
                      stream={researchData.agent_stream}
                      isStreaming
                      height={280}
                      speedMs={18}
                      onComplete={handleStreamComplete}
                      paperCards={activeData?.frontier_cards ?? []}
                      onPaperSelect={openPaperSidebar}
                    />
                  </RetroWindow>
                )}

                {dashboardReady && activeData && (
                  <>
                    <DashboardPanels
                      data={activeData}
                      onExport={() => setShowExportModal(true)}
                      onExpandGap={(id) => runCommand(`expand_gap:${id}`)}
                      onAnalogyDetail={() => runCommand("analogy_detail")}
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => runCommand("logic_lab")}
                        disabled={specialLoading !== null}
                        className="border border-mouse-gray px-4 py-2 font-pixel text-[9px] text-electric-accent hover:bg-electric-accent/10 disabled:opacity-50"
                      >
                        {specialLoading === "logic_lab" ? "⣾ DEBATING…" : "⚔ ADVOCATE VS SKEPTIC DEBATE"}
                      </button>
                      <button
                        onClick={() => runCommand("analogy_detail")}
                        disabled={specialLoading !== null}
                        className="border border-mouse-gray px-4 py-2 font-pixel text-[9px] text-electric-accent hover:bg-electric-accent/10 disabled:opacity-50"
                      >
                        ◈ SHOW ANALOGY DETAILS
                      </button>
                    </div>
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="mt-4 block w-full border-2 border-electric-accent bg-transparent py-[14px] font-pixel text-[10px] text-electric-accent transition-colors hover:bg-electric-accent hover:text-black"
                    >
                      ▶ EXPORT RESEARCH PDF
                    </button>
                  </>
                )}

                {!activeData && !isResearching && (
                  <RetroWindow title="README.txt">
                    <p className="font-body text-[14px] leading-[1.7] text-mono-white/80">
                      Enter a topic above and press <span className="font-pixel text-[10px] text-electric-accent">▶ INITIATE RESEARCH</span>.
                      The 7-agent pipeline will deliberate in real time and produce a full dashboard.
                    </p>
                  </RetroWindow>
                )}
              </div>
            ) : (
              <FrontierGrid
                data={activeData}
                onDeepDive={(paper) => {
                  openPaperSidebar(paper);
                }}
              />
            )}
          </div>
        </main>

        {/* RIGHT PANEL */}
        <AnimatePresence initial={false}>
          {!rightPanelCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <RightPanel data={activeData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PDFExportModal open={showExportModal} onClose={() => setShowExportModal(false)} data={activeData} />
      <SpecialPanelModal special={special} onClose={() => setSpecial(null)} />
      <PaperSidebar
        paper={selectedPaper}
        researchData={activeData}
        mobile={isMobile}
        onClose={closePaperSidebar}
        onResearchPaper={researchPaper}
      />
      <SourceVaultDrawer
        sources={activeData?.referenced_sources ?? []}
        isOpen={sourceVaultOpen}
        onClose={() => {
          setSourceVaultOpen(false);
          setActiveVaultSource(null);
        }}
      />
    </div>
  );
}

function FrontierGrid({
  data,
  onDeepDive,
}: {
  data: ResearchResponse | null;
  onDeepDive: (paper: ResearchResponse["frontier_cards"][number]) => void;
}) {
  if (!data) {
    return (
      <RetroWindow title="FRONTIER.dat">
        <p className="font-body text-[14px] text-mono-white/80">
          Run a research session first — the knowledge frontier surfaces 8 papers tailored to your topic.
        </p>
      </RetroWindow>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {data.frontier_cards.map((c) => (
        <FrontierCard key={c.id} card={c} onDeepDive={onDeepDive} />
      ))}
    </div>
  );
}

function PaperSidebar({
  paper,
  researchData,
  mobile,
  onClose,
  onResearchPaper,
}: {
  paper: ResearchResponse["frontier_cards"][number] | null;
  researchData: ResearchResponse | null;
  mobile: boolean;
  onClose: () => void;
  onResearchPaper: (paper: ResearchResponse["frontier_cards"][number]) => void;
}) {
  const open = !!paper;
  const linkedGap = researchData?.dashboard.research_gaps[0];
  const linkedDecay = researchData?.dashboard.epistemic_decay.stale[0];
  const linkedClaim = researchData?.dashboard.key_claims[0];

  const [vaultTab, setVaultTab] = useState<"overview" | "document">("overview");

  // Reset vaultTab to "overview" whenever a new paper is selected
  useEffect(() => {
    setVaultTab("overview");
  }, [paper?.id]);

  const downloadAbstract = () => {
    if (!paper) return;
    const content = generateAbstract(paper);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paper.paper_title.slice(0, 40).replace(/[^a-z0-9]/gi, "_").toLowerCase()}_abstract.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const docData = paper && researchData ? generateFullDocumentSections(paper, researchData) : null;

  return (
    <AnimatePresence>
      {open && paper && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={mobile ? { y: "100%" } : { x: "100%" }}
            animate={mobile ? { y: 0 } : { x: 0 }}
            exit={mobile ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed z-40 overflow-hidden bg-session-dark flex flex-col ${
              mobile
                ? "bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl border-t border-pixel-border"
                : "right-0 top-0 h-full w-[420px] border-l border-pixel-border"
            }`}
            style={{ backgroundColor: "#080A14", borderColor: "var(--color-pixel-border)" }}
          >
            {/* SIDEBAR HEADER */}
            <div className="border-b border-pixel-border px-5 pt-4">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border px-2 py-1 font-pixel text-[8px]" style={categoryStyles[paper.category]}>
                      {paper.category}
                    </span>
                    {paper.year >= 2024 && (
                      <span className="border border-lime-signal px-2 py-1 font-pixel text-[8px] text-lime-signal">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="max-w-[280px]">
                    <p className="font-pixel text-[10px] leading-[1.5] text-cream-terminal">{paper.paper_title}</p>
                    <p className="mt-1 font-mono text-[10px] text-mouse-gray">
                      {paper.authors} · {paper.year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="font-pixel text-[12px] text-mouse-gray hover:text-cream-terminal"
                  aria-label="Close paper sidebar"
                >
                  ✕
                </button>
              </div>

              {/* TAB BAR */}
              <div className="flex gap-6">
                <button
                  onClick={() => setVaultTab("overview")}
                  className={`-mb-px border-b-2 pb-3 font-pixel text-[8px] transition-colors ${
                    vaultTab === "overview"
                      ? "border-electric-accent text-electric-accent"
                      : "border-transparent text-mouse-gray hover:text-mono-white"
                  }`}
                >
                  ◉ OVERVIEW
                </button>
                <button
                  onClick={() => setVaultTab("document")}
                  className={`-mb-px border-b-2 pb-3 font-pixel text-[8px] transition-colors ${
                    vaultTab === "document"
                      ? "border-electric-accent text-electric-accent"
                      : "border-transparent text-mouse-gray hover:text-mono-white"
                  }`}
                >
                  ◈ FULL DOCUMENT
                </button>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {vaultTab === "overview" && (
                <>
                  <div className="mb-5">
                    <PixelProgressBar value={paper.confidence} label="CONFIDENCE" color="electric" />
                  </div>

                  <section className="mb-5">
                    <p className="font-body text-[13px] italic leading-[1.8] text-[rgba(245,237,211,0.8)]">
                      {paper.the_why}
                    </p>
                  </section>

                  <RetroWindow title="ABSTRACT.txt" variant="terminal">
                    <div className="space-y-3">
                      <p className="font-mono text-[8px] text-mouse-gray">AI-Generated Abstract</p>
                      <p className="font-body text-[13px] leading-[1.8] text-[rgba(245,237,211,0.85)]">
                        {generateAbstract(paper)}
                      </p>
                    </div>
                  </RetroWindow>

                  <div className="mt-5">
                    <RetroWindow title="SESSION_LINKS.dat">
                      <div className="space-y-3 font-body text-[13px] leading-[1.7] text-[rgba(245,237,211,0.85)]">
                        {linkedGap && <p>Addresses Gap #{linkedGap.id}: {truncateText(linkedGap.gap, 110)}</p>}
                        {linkedDecay && <p>Relates to decay: {truncateText(linkedDecay.claim, 110)}</p>}
                        {linkedClaim && <p>Supports claim: {truncateText(linkedClaim.claim, 110)}</p>}
                        {!linkedGap && !linkedDecay && !linkedClaim && (
                          <p className="text-mouse-gray">No session links available yet.</p>
                        )}
                      </div>
                    </RetroWindow>
                  </div>
                </>
              )}

              {vaultTab === "document" && docData && (
                <div className="space-y-6">
                  {/* DOCUMENT HEADER */}
                  <div className="space-y-3 border-b border-pixel-border/40 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border px-2 py-1 font-pixel text-[8px]" style={categoryStyles[paper.category]}>
                        {paper.category}
                      </span>
                    </div>
                    <h2 className="font-body text-[16px] font-bold text-cream-terminal leading-tight">{paper.paper_title}</h2>
                    <p className="font-mono text-[11px] text-mouse-gray">
                      {paper.authors} · {paper.year}
                    </p>
                    <div className="mt-4 border border-sakura-alert/40 bg-sakura-alert/5 px-3 py-2 font-pixel text-[7px] text-sakura-alert leading-relaxed">
                      ⚠ AI-RECONSTRUCTED — Not the original paper. Use SEARCH ON ARXIV for the real document.
                    </div>
                  </div>

                  {/* DOCUMENT BODY */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-pixel text-[8px] text-electric-accent mb-2 mt-4">ABSTRACT</h3>
                      <div className="font-body text-[13px] leading-[1.9] text-[rgba(245,237,211,0.8)] space-y-2">
                        {docData.abstract.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    </div>

                    <div className="border-t border-pixel-border/40 pt-5">
                      <h3 className="font-pixel text-[8px] text-electric-accent mb-2 mt-4">1. INTRODUCTION</h3>
                      <p className="font-body text-[13px] leading-[1.9] text-[rgba(245,237,211,0.8)]">
                        {docData.introduction}
                      </p>
                    </div>

                    <div className="border-t border-pixel-border/40 pt-5">
                      <h3 className="font-pixel text-[8px] text-electric-accent mb-2 mt-4">2. METHODOLOGY</h3>
                      <p className="font-body text-[13px] leading-[1.9] text-[rgba(245,237,211,0.8)]">
                        {docData.methodology}
                      </p>
                    </div>

                    <div className="border-t border-pixel-border/40 pt-5">
                      <h3 className="font-pixel text-[8px] text-electric-accent mb-2 mt-4">3. KEY FINDINGS</h3>
                      <div className="font-body text-[13px] leading-[1.9] text-[rgba(245,237,211,0.8)] space-y-3">
                        {docData.findings.map((f, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="font-mono text-electric-accent">[{i + 1}]</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-pixel-border/40 pt-5">
                      <h3 className="font-pixel text-[8px] text-electric-accent mb-2 mt-4">4. CONCLUSION</h3>
                      <p className="font-body text-[13px] leading-[1.9] text-[rgba(245,237,211,0.8)]">
                        {docData.conclusion}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="border-t border-pixel-border px-5 py-4 shrink-0">
              <div className="flex flex-col gap-2">
                {vaultTab === "overview" && (
                  <button
                    onClick={() => onResearchPaper(paper)}
                    className="border-2 border-black bg-electric-accent px-4 py-3 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]"
                  >
                    ▶ RESEARCH THIS PAPER
                  </button>
                )}
                
                {vaultTab === "document" && (
                  <button
                    onClick={downloadAbstract}
                    className="border border-mouse-gray px-4 py-3 font-pixel text-[9px] text-cream-terminal transition-all hover:bg-white/5"
                  >
                    ⬇ DOWNLOAD ABSTRACT (.txt)
                  </button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://arxiv.org/search/?query=${encodeURIComponent(paper.paper_title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-mouse-gray px-3 py-2 text-center font-pixel text-[8px] text-cream-terminal hover:bg-white/5"
                  >
                    ◈ SEARCH ON ARXIV
                  </a>
                  <a
                    href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.paper_title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-mouse-gray px-3 py-2 text-center font-pixel text-[8px] text-cream-terminal hover:bg-white/5"
                  >
                    ◈ SEARCH ON SCHOLAR
                  </a>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function generateFullDocumentSections(
  paper: ResearchResponse["frontier_cards"][number],
  researchData: ResearchResponse
) {
  const abstract = [
    `${paper.paper_title} represents a critical inquiry into ${paper.the_why.toLowerCase()}.`,
    "By re-examining the foundational assumptions of the field, the authors present a structured approach to mitigating long-standing bottlenecks.",
    "This reconstructed document synthesizes the core themes of the manuscript for immediate integration into the current research session."
  ];

  const topic = researchData.session.topic || "the current domain";
  const introduction = `The investigation of ${topic} has increasingly required novel paradigms to address structural limitations. In this context, the present work introduces a highly relevant perspective, bridging theoretical gaps and offering a robust framework for subsequent analysis.`;

  let methodology = "Methodological details reconstructed from metadata.";
  if (paper.category === "FOUNDATION") methodology = "The study employs a systematic literature review and establishes a foundational theoretical framework to unify disparate observations across the field.";
  else if (paper.category === "FRONTIER") methodology = "The authors utilize a novel experimental design augmented by comprehensive ablation studies to isolate the primary causal mechanisms.";
  else if (paper.category === "WILDCARD") methodology = "This work applies a cross-disciplinary transfer methodology, adapting techniques from adjacent domains to solve localized constraints.";
  else if (paper.category === "HARDWARE_BRIDGE") methodology = "The investigation relies on rigorous systems-level benchmarking methodology, ensuring empirical validation across varied hardware constraints.";

  const claims = researchData.dashboard.key_claims || [];
  const findings = claims.slice(0, 3).map(c => c.claim);
  if (findings.length === 0) {
    findings.push("Initial empirical results strongly correlate with the hypothesized framework.");
    findings.push("Identified key constraints that limit traditional scaling approaches.");
  }

  const conclusion = `In summary, the findings underscore the necessity of adapting ${paper.the_why.toLowerCase()}. Future work will likely extend these principles to broader operational contexts, cementing this paper's utility within the overarching research session.`;

  return { abstract, introduction, methodology, findings, conclusion };
}

function generateAbstract(paper: ResearchResponse["frontier_cards"][number]) {
  return [
    `${paper.paper_title} is positioned as a consequential reference for the current session because it reframes the problem around ${paper.the_why.toLowerCase()}.`,
    "The paper likely contributes a focused conceptual model or empirical result that helps explain why this line of work remains competitive or newly relevant.",
    "In practical terms, it appears to connect the session's core mechanism, frontier constraints, and unresolved gaps into a usable research path.",
  ].join(" ");
}

function truncateText(text: string, maxLength: number) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

const categoryStyles: Record<
  ResearchResponse["frontier_cards"][number]["category"],
  { color: string; backgroundColor: string; borderColor: string }
> = {
  FOUNDATION: { color: "#0D0F1A", backgroundColor: "#F5EDD3", borderColor: "#F5EDD3" },
  FRONTIER: { color: "#0D0F1A", backgroundColor: "#7B6FFF", borderColor: "#7B6FFF" },
  WILDCARD: { color: "#0D0F1A", backgroundColor: "#D4F87A", borderColor: "#D4F87A" },
  HARDWARE_BRIDGE: { color: "#0D0F1A", backgroundColor: "#FFB7C5", borderColor: "#FFB7C5" },
};
