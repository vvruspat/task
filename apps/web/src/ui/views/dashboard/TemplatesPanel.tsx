import type { ReactElement } from "react";
import type { TaskSkillSummary } from "./dashboardTypes.js";

type TemplatesPanelProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesPanel({ skills }: TemplatesPanelProps): ReactElement {
  return (
    <section className="panel" aria-labelledby="skills-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Templates</p>
          <h3 id="skills-title">Task skills</h3>
        </div>
      </div>
      <div className="stacked-list">
        {skills.map((skill) => (
          <article className="mini-row" key={skill.id}>
            <h4>{skill.name}</h4>
            <p>{skill.aliases.join(", ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
