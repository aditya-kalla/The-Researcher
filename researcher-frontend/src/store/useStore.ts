import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentStreamEntry, ResearchResponse, ResearchSession } from "@/lib/types";

interface AppState {
  isAuthenticated: boolean;
  user: { username: string; email: string } | null;
  login: (username: string, email: string) => void;
  logout: () => void;

  sessions: ResearchSession[];
  currentSessionId: string | null;
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

  defaultLevel: 1 | 2 | 3 | 4;
  defaultLengthMode: "Summary" | "Detailed" | "Deep Dive";
  geminiApiKey: string;
  setPreferences: (p: Partial<Pick<AppState, "defaultLevel" | "defaultLengthMode" | "geminiApiKey">>) => void;

  uploadedSources: string[];
  addUploadedSource: (name: string) => void;
  removeUploadedSource: (name: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (username, email) => set({ isAuthenticated: true, user: { username, email } }),
      logout: () => set({ isAuthenticated: false, user: null }),

      sessions: [],
      currentSessionId: null,
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
    }),
    {
      name: "the-researcher-store",
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        sessions: s.sessions,
        defaultLevel: s.defaultLevel,
        defaultLengthMode: s.defaultLengthMode,
        geminiApiKey: s.geminiApiKey,
        uploadedSources: s.uploadedSources,
      }),
    }
  )
);
