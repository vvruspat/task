import type { ReactElement } from "react";
import { buildTemplateSkillRows, buildTemplateSkillSummary } from "../workspaceViewModels.js";
import type { TaskSkillSummary } from "./types.js";

export type TemplatesViewProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesView({ skills }: TemplatesViewProps): ReactElement {
  const rows = buildTemplateSkillRows(skills);
  const summary = buildTemplateSkillSummary(skills);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="templates-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Templates</p>
            <h3 id="templates-view-title">Task skills</h3>
          </div>
        </div>

        <div className="template-skill-list">
          {rows.map((skill) => (
            <article className="template-skill-row" key={skill.id}>
              <div>
                <h4>{skill.name}</h4>
                <p>{skill.description}</p>
              </div>
              <span>{skill.aliasLabel}</span>
              <time dateTime={skill.updatedAtLabel}>{skill.updatedAtLabel}</time>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="templates-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="templates-summary-title">Loaded skills</h3>
          </div>
        </div>
        <p className="agent-line">Read-only overview of task skills loaded for the workspace.</p>
        <dl className="metric-list">
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
          <div>
            <dt>Aliases</dt>
            <dd>{summary.skillsWithAliasesCount}</dd>
          </div>
          <div>
            <dt>No description</dt>
            <dd>{summary.skillsWithoutDescriptionCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
