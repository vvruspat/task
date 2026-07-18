"use client";

import { produce } from "immer";
import { create } from "zustand";

export type WorkspaceRoute =
  | "dashboard"
  | "my-tasks"
  | "projects"
  | "views"
  | "templates"
  | "confirmations"
  | "agent-history"
  | "settings";

type WorkspaceState = {
  route: WorkspaceRoute;
  createOpen: boolean;
  createViewOpen: boolean;
  agentOpen: boolean;
  selectedProjectId: string | null;
  completedTaskIds: string[];
  setRoute: (route: WorkspaceRoute) => void;
  setCreateOpen: (open: boolean) => void;
  setCreateViewOpen: (open: boolean) => void;
  setAgentOpen: (open: boolean) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  toggleTask: (id: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  route: "dashboard",
  createOpen: false,
  createViewOpen: false,
  agentOpen: false,
  selectedProjectId: null,
  completedTaskIds: [],
  setRoute: (route: WorkspaceRoute): void =>
    set(
      produce((state: WorkspaceState) => {
        state.route = route;
      }),
    ),
  setCreateOpen: (createOpen: boolean): void =>
    set(
      produce((state: WorkspaceState) => {
        state.createOpen = createOpen;
      }),
    ),
  setCreateViewOpen: (createViewOpen: boolean): void =>
    set(
      produce((state: WorkspaceState) => {
        state.createViewOpen = createViewOpen;
      }),
    ),
  setAgentOpen: (agentOpen: boolean): void =>
    set(
      produce((state: WorkspaceState) => {
        state.agentOpen = agentOpen;
      }),
    ),
  setSelectedProjectId: (selectedProjectId: string | null): void =>
    set(
      produce((state: WorkspaceState) => {
        state.selectedProjectId = selectedProjectId;
      }),
    ),
  toggleTask: (id: string): void =>
    set(
      produce((state: WorkspaceState) => {
        const index = state.completedTaskIds.indexOf(id);
        if (index >= 0) state.completedTaskIds.splice(index, 1);
        else state.completedTaskIds.push(id);
      }),
    ),
}));
