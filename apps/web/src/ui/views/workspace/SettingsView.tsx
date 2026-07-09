import type { ReactElement } from "react";
import { buildSettingsSummary, buildSettingsWorkspaceRows } from "../workspaceViewModels.js";
import type {
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";

export type SettingsViewProps = {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export function SettingsView({
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: SettingsViewProps): ReactElement {
  const rows = buildSettingsWorkspaceRows(workspaces);
  const summary = buildSettingsSummary({
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
      <section className="panel wide-panel" aria-labelledby="settings-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h3 id="settings-view-title">Workspace context</h3>
          </div>
        </div>

        <div className="settings-workspace-list">
          {rows.map((workspace) => (
            <article className="settings-workspace-row" key={workspace.id}>
              <div>
                <h4>{workspace.name}</h4>
                <p>{workspace.slug}</p>
              </div>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="settings-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="settings-summary-title">Loaded context</h3>
          </div>
        </div>
        <p className="agent-line">{summary.selectedWorkspaceLabel}</p>
        <p className="agent-line">{summary.selectedProjectLabel}</p>
        <dl className="metric-list">
          <div>
            <dt>Workspaces</dt>
            <dd>{summary.workspaceCount}</dd>
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
            <dt>Statuses</dt>
            <dd>{summary.statusCount}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
