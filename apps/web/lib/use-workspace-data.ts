"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiFailure, WorkspaceBootstrap } from "./workspace-contracts";
import { isApiFailure } from "./workspace-contracts";

type WorkspaceDataState = {
  data: WorkspaceBootstrap | null;
  error: string | null;
  loading: boolean;
};
const initialState: WorkspaceDataState = {
  data: null,
  error: null,
  loading: true,
};
const workspaceRefreshEvent = "task:workspace-data-refresh";

export function notifyWorkspaceDataChanged(): void {
  window.dispatchEvent(new Event(workspaceRefreshEvent));
}

function isWorkspaceBootstrap(value: unknown): value is WorkspaceBootstrap {
  if (typeof value !== "object" || value === null) return false;
  return (
    "workspace" in value &&
    "dashboard" in value &&
    "myTasks" in value &&
    "projects" in value &&
    "statuses" in value &&
    "taskSkills" in value &&
    "confirmations" in value &&
    "agentRuns" in value &&
    "views" in value &&
    "projectData" in value &&
    Array.isArray(value.projects) &&
    Array.isArray(value.statuses) &&
    Array.isArray(value.taskSkills) &&
    Array.isArray(value.confirmations) &&
    Array.isArray(value.agentRuns) &&
    Array.isArray(value.views) &&
    Array.isArray(value.projectData)
  );
}

async function readJson(
  response: Response,
): Promise<WorkspaceBootstrap | ApiFailure> {
  const body: unknown = await response.json();
  if (isWorkspaceBootstrap(body) || isApiFailure(body)) return body;
  return { error: "The web API returned an invalid response." };
}

export function useWorkspaceData(): WorkspaceDataState & {
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<WorkspaceDataState>(initialState);
  const refresh = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await readJson(
        await fetch("/api/workspace", { cache: "no-store" }),
      );
      if (isApiFailure(result))
        setState({ data: null, error: result.error, loading: false });
      else setState({ data: result, error: null, loading: false });
    } catch {
      setState({
        data: null,
        error: "Unable to reach the local web API.",
        loading: false,
      });
    }
  }, []);
  useEffect(() => {
    void refresh();
    const handleRefresh = (): void => {
      void refresh();
    };
    window.addEventListener(workspaceRefreshEvent, handleRefresh);
    return () =>
      window.removeEventListener(workspaceRefreshEvent, handleRefresh);
  }, [refresh]);
  return { ...state, refresh };
}
