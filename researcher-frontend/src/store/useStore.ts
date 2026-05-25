import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentStreamEntry, ReferencedSource, ResearchResponse, ResearchSession } from "@/lib/types";

interface AppState {
  isAuthenticated: boolean;
  user: { id: string; username: string; email: string; avatarUrl?: string } | null;
  setUser: (user: AppState['user']) => void;
  clearUser: () => void;

  sessions: ResearchSession[];
  currentSessionId: string | null;
  sessionsLoading?: boolean;
  loadSessions?: () => Promise<void>;
  deleteSession: (id: string) => void;
  addSession: (s: ResearchSession) => void;
  setCurrentSession: (id: string | null) => void;
  updateSession: (id: string, data: Partial<ResearchSession>) => void;
  deleteAllSessions: () => void;

  isResearching: boolean;
  setResearching: (v: boolean) => void;
  currentResearchData: ResearchResponse | null;
  setResearchData: (data: ResearchResponse | null) => void;
  agentStreamBuffer: AgentStreamEntry[];
  appendStreamLine: (e: AgentStreamEntry) => void;
  clearStream: () => void;

  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  activeTab: "research" | "frontier";
  setActiveTab: (t: "research" | "frontier") => void;
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;

  isBooting: boolean;
  setIsBooting: (v: boolean) => void;

  defaultLevel: 1 | 2 | 3 | 4;
  defaultLengthMode: "Summary" | "Detailed" | "Deep Dive";
  geminiApiKey: string;
  setPreferences: (p: Partial<Pick<AppState, "defaultLevel" | "defaultLengthMode" | "geminiApiKey">>) => void;

  uploadedSources: string[];
  addUploadedSource: (name: string) => void;
  removeUploadedSource: (name: string) => void;

  dateRangeFilter: { from: number; to: number };
  countryFilter: string;
  journalRankFilter: "any" | "Q1" | "Q2" | "Q3" | "Q4";
  minCitationsFilter: number;
  setDateRangeFilter: (range: { from: number; to: number }) => void;
  setCountryFilter: (country: string) => void;
  setJournalRankFilter: (rank: "any" | "Q1" | "Q2" | "Q3" | "Q4") => void;
  setMinCitationsFilter: (count: number) => void;

  sourceVaultOpen: boolean;
  activeVaultSource: ReferencedSource | null;
  setSourceVaultOpen: (open: boolean) => void;
  setActiveVaultSource: (source: ReferencedSource | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setUser: (user) => set({ isAuthenticated: !!user, user }),
      clearUser: () => set({ isAuthenticated: false, user: null, sessions: [], currentSessionId: null, currentResearchData: null }),

      sessions: [],
      currentSessionId: null,
      deleteSession: (id: string) => {
        set((st) => ({ 
          sessions: st.sessions.filter(s => s.id !== id),
          currentSessionId: st.currentSessionId === id ? null : st.currentSessionId
        }))
      },
      addSession: (s) => set((st) => ({ sessions: [s, ...st.sessions], currentSessionId: s.id })),
      setCurrentSession: (id) => set({ currentSessionId: id }),
      updateSession: (id, data) =>
        set((st) => ({ sessions: st.sessions.map((s) => (s.id === id ? { ...s, ...data } : s)) })),
      deleteAllSessions: () => set({ sessions: [], currentSessionId: null }),

      isResearching: false,
      setResearching: (v) => set({ isResearching: v }),
      currentResearchData: null,
      setResearchData: (data) => set({ currentResearchData: data }),
      agentStreamBuffer: [],
      appendStreamLine: (e) => set((st) => ({ agentStreamBuffer: [...st.agentStreamBuffer, e] })),
      clearStream: () => set({ agentStreamBuffer: [] }),

      sidebarCollapsed: false,
      rightPanelCollapsed: false,
      toggleSidebar: () => set((st) => ({ sidebarCollapsed: !st.sidebarCollapsed })),
      toggleRightPanel: () => set((st) => ({ rightPanelCollapsed: !st.rightPanelCollapsed })),
      activeTab: "research",
      setActiveTab: (t) => set({ activeTab: t }),
      showExportModal: false,
      setShowExportModal: (v) => set({ showExportModal: v }),

      isBooting: false,
      setIsBooting: (v) => set({ isBooting: v }),

      defaultLevel: 2,
      defaultLengthMode: "Detailed",
      geminiApiKey: "",
      setPreferences: (p) => set(p as Partial<AppState>),

      uploadedSources: [],
      addUploadedSource: (name) =>
        set((st) =>
          st.uploadedSources.includes(name)
            ? st
            : { uploadedSources: [...st.uploadedSources, name] }
        ),
      removeUploadedSource: (name) =>
        set((st) => ({ uploadedSources: st.uploadedSources.filter((n) => n !== name) })),

      dateRangeFilter: { from: 2001, to: 2026 },
      countryFilter: "",
      journalRankFilter: "any",
      minCitationsFilter: 0,
      setDateRangeFilter: (range) => set({ dateRangeFilter: range }),
      setCountryFilter: (country) => set({ countryFilter: country }),
      setJournalRankFilter: (rank) => set({ journalRankFilter: rank }),
      setMinCitationsFilter: (count) => set({ minCitationsFilter: count }),

      sourceVaultOpen: false,
      activeVaultSource: null,
      setSourceVaultOpen: (open) => set({ sourceVaultOpen: open }),
      setActiveVaultSource: (source) => set({ activeVaultSource: source }),
    }),
    {
      name: "the-researcher-store",
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        defaultLevel: s.defaultLevel,
        defaultLengthMode: s.defaultLengthMode,
        geminiApiKey: s.geminiApiKey,
        uploadedSources: s.uploadedSources,
        dateRangeFilter: s.dateRangeFilter,
        countryFilter: s.countryFilter,
        journalRankFilter: s.journalRankFilter,
        minCitationsFilter: s.minCitationsFilter,
        sessions: s.sessions,
        currentSessionId: s.currentSessionId,
      }),
    }
  )
);
