import type { components } from "@task/api-client";
import type { ComponentType, SVGProps } from "react";
import type { WorkspaceRouteId } from "../../navigation.js";

export type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
export type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
export type TaskSummary = components["schemas"]["TaskSummaryDto"];
export type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
export type TaskSkillDetail = components["schemas"]["TaskSkillDetailDto"];
export type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];
export type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type WorkspaceRoute = {
  id: Exclude<WorkspaceRouteId, "dashboard" | "confirmations">;
  label: string;
  description: string;
  icon: IconComponent;
};
