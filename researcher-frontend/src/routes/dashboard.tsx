import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { PDFExportModal } from "@/components/PDFExportModal";
import { SpecialPanelModal } from "@/components/SpecialPanels";
import type { ResearchResponse, ResearchSession, SpecialResponse } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — THE RESEARCHER" }] }),
});

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
  } = useStore();

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

  const runResearch = async (topic: string, level: 1 | 2 | 3 | 4, lengthMode: "Summary" | "Detailed" | "Deep Dive") => {
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
    } catch {
      setIsResearching(false);
      setShowStream(false);
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
          <a href="/" className="font-pixel text-[11px] text-cream-terminal">
            ◆ THE RESEARCHER
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

                {isResearching && !researchData && (
                  <RetroWindow title="AGENT_STATE.exe" variant="terminal">
                    <BootingTerminal />
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
    </div>
  );
}

function BootingTerminal() {
  return (
    <div className="bg-black p-3 font-mono text-[11px] text-lime-signal">
      <p>⣾ booting cognitive pipeline…</p>
      <p>⣷ summoning 7 agents…</p>
      <span className="cursor-blink">█</span>
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
            className={`fixed z-40 overflow-hidden bg-session-dark ${
              mobile
                ? "bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl border-t border-pixel-border"
                : "right-0 top-0 h-full w-[420px] border-l border-pixel-border"
            }`}
            style={{ backgroundColor: "#080A14", borderColor: "var(--color-pixel-border)" }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-pixel-border px-5 py-4">
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

              <div className="flex-1 overflow-y-auto px-5 py-4">
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
              </div>

              <div className="border-t border-pixel-border px-5 py-4">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onResearchPaper(paper)}
                    className="border-2 border-black bg-electric-accent px-4 py-3 font-pixel text-[9px] text-black shadow-[3px_3px_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]"
                  >
                    ▶ RESEARCH THIS PAPER
                  </button>
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
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
