import type { components } from "@task/api-client";

export type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
export type TaskSummary = components["schemas"]["TaskSummaryDto"];
export type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];

export type FormSubmissionState =
  | {
      status: "idle";
    }
  | {
      status: "submitting";
    }
  | {
      message: string;
      status: "error" | "success";
    };
