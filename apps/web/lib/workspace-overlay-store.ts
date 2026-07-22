"use client";

import { create } from "zustand";

type WorkspaceOverlayState = {
  agentOpen: boolean;
  createOpen: boolean;
  createViewOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  setCreateOpen: (open: boolean) => void;
  setCreateViewOpen: (open: boolean) => void;
};

export const useWorkspaceOverlayStore = create<WorkspaceOverlayState>()((set) => ({
  agentOpen: false,
  createOpen: false,
  createViewOpen: false,
  setAgentOpen: (agentOpen): void => set({ agentOpen }),
  setCreateOpen: (createOpen): void => set({ createOpen }),
  setCreateViewOpen: (createViewOpen): void => set({ createViewOpen }),
}));
