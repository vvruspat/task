"use client";

import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  createOpen: boolean;
  createViewOpen: boolean;
  agentOpen: boolean;
  selectedWorkspaceId: string | null;
  selectedProjectId: string | null;
  completedTaskIds: string[];
  notificationUnreadCount: number;
  setCreateOpen: (open: boolean) => void;
  setCreateViewOpen: (open: boolean) => void;
  setAgentOpen: (open: boolean) => void;
  setSelectedWorkspaceId: (workspaceId: string | null) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  toggleTask: (id: string) => void;
  setNotificationUnreadCount: (count: number) => void;
};

type PersistedWorkspaceSelection = Pick<
  WorkspaceState,
  "selectedProjectId" | "selectedWorkspaceId"
>;

export const useWorkspaceStore = create<WorkspaceState>()(
  persist<WorkspaceState, [], [], PersistedWorkspaceSelection>(
    (set) => ({
      createOpen: false,
      createViewOpen: false,
      agentOpen: false,
      selectedWorkspaceId: null,
      selectedProjectId: null,
      completedTaskIds: [],
      notificationUnreadCount: 0,
      setCreateOpen: (createOpen: boolean): void => {
        set(
          produce((state: WorkspaceState) => {
            state.createOpen = createOpen;
          }),
        );
      },
      setCreateViewOpen: (createViewOpen: boolean): void => {
        set(
          produce((state: WorkspaceState) => {
            state.createViewOpen = createViewOpen;
          }),
        );
      },
      setAgentOpen: (agentOpen: boolean): void => {
        set(
          produce((state: WorkspaceState) => {
            state.agentOpen = agentOpen;
          }),
        );
      },
      setSelectedWorkspaceId: (selectedWorkspaceId: string | null): void => {
        set(
          produce((state: WorkspaceState) => {
            state.selectedWorkspaceId = selectedWorkspaceId;
          }),
        );
      },
      setSelectedProjectId: (selectedProjectId: string | null): void => {
        set(
          produce((state: WorkspaceState) => {
            state.selectedProjectId = selectedProjectId;
          }),
        );
      },
      toggleTask: (id: string): void => {
        set(
          produce((state: WorkspaceState) => {
            const index = state.completedTaskIds.indexOf(id);
            if (index >= 0) state.completedTaskIds.splice(index, 1);
            else state.completedTaskIds.push(id);
          }),
        );
      },
      setNotificationUnreadCount: (notificationUnreadCount: number): void => {
        set(
          produce((state: WorkspaceState) => {
            state.notificationUnreadCount = Math.max(0, notificationUnreadCount);
          }),
        );
      },
    }),
    {
      name: "task-workspace-selection",
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
        selectedWorkspaceId: state.selectedWorkspaceId,
      }),
    },
  ),
);
