import type { ReactElement } from "react";
import { buildAgentHistoryRows, buildAgentHistorySummary } from "../workspaceViewModels.js";
import type {
  AgentRunSummary,
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";

export type AgentHistoryViewProps = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export function AgentHistoryView({
  agentRuns,
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: AgentHistoryViewProps): ReactElement {
  const rows = buildAgentHistoryRows(agentRuns);
  const summary = buildAgentHistorySummary({
    agentRuns,
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="agent-history-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Agent</p>
            <h3 id="agent-history-view-title">Agent run audit</h3>
          </div>
        </div>

        <div className="agent-history-list">
          {rows.length === 0 ? (
            <article className="agent-history-row">
              <div>
                <h4>No agent runs loaded</h4>
                <p>{summary.selectedWorkspaceLabel}</p>
              </div>
              <span>{summary.selectedProjectLabel}</span>
            </article>
          ) : (
            rows.map((run) => (
              <article className="agent-history-row" key={run.id}>
                <div>
                  <h4>{run.title}</h4>
                  <p>{run.detail}</p>
                </div>
                <span>
                  {run.statusLabel} - {run.updatedAtLabel}
                </span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="agent-history-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="agent-history-summary-title">Audit load</h3>
          </div>
        </div>
        <p className="agent-line">{summary.selectedWorkspaceLabel}</p>
        <dl className="metric-list">
          <div>
            <dt>Runs</dt>
            <dd>{summary.runCount}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{summary.projectCount}</dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
          <div>
            <dt>Statuses</dt>
            <dd>{summary.statusCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
