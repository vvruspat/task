import { MBox, MFlex, MHeading, MText } from "@task/ui";
import type { ReactElement } from "react";
import { DashboardPanel } from "./DashboardPrimitives.js";
import type { TaskSkillSummary } from "./dashboardTypes.js";

type TemplatesPanelProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesPanel({ skills }: TemplatesPanelProps): ReactElement {
  return (
    <DashboardPanel eyebrow="Templates" title="Task skills" titleId="skills-title">
      <MFlex align="stretch" className="stacked-list" direction="column" gap="s">
        {skills.map((skill) => (
          <MBox as="article" className="mini-row" key={skill.id}>
            <MHeading mode="h4">{skill.name}</MHeading>
            <MText as="p" mode="secondary">
              {skill.aliases.join(", ")}
            </MText>
          </MBox>
        ))}
      </MFlex>
    </DashboardPanel>
  );
}
