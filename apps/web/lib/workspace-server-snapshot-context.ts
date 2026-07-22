"use client";

import { createContext } from "react";
import type { WorkspaceServerSnapshot } from "./workspace-server-snapshot";

export const WorkspaceServerSnapshotContext = createContext<WorkspaceServerSnapshot | null>(null);
