"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceSelectionState = {
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedWorkspaceId: (workspaceId: string | null) => void;
};

export type PersistedWorkspaceSelection = Pick<WorkspaceSelectionState, "selectedWorkspaceId">;

export function parsePersistedWorkspaceSelection(value: unknown): PersistedWorkspaceSelection {
  if (
    typeof value !== "object" ||
    value === null ||
    !("selectedWorkspaceId" in value) ||
    (typeof value.selectedWorkspaceId !== "string" && value.selectedWorkspaceId !== null)
  ) {
    return { selectedWorkspaceId: null };
  }
  return { selectedWorkspaceId: value.selectedWorkspaceId };
}

export const useWorkspaceSelectionStore = create<WorkspaceSelectionState>()(
  persist<WorkspaceSelectionState, [], [], PersistedWorkspaceSelection>(
    (set) => ({
      selectedProjectId: null,
      selectedWorkspaceId: null,
      setSelectedProjectId: (selectedProjectId): void => {
        set({ selectedProjectId });
      },
      setSelectedWorkspaceId: (selectedWorkspaceId): void => {
        set({ selectedWorkspaceId });
      },
    }),
    {
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...parsePersistedWorkspaceSelection(persistedState),
      }),
      migrate: (persistedState): PersistedWorkspaceSelection =>
        parsePersistedWorkspaceSelection(persistedState),
      name: "task-workspace-selection",
      partialize: (state) => ({ selectedWorkspaceId: state.selectedWorkspaceId }),
      version: 1,
    },
  ),
);
