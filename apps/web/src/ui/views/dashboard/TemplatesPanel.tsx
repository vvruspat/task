import { MBox, MCard, MFlex, MHeading, MText } from "@task/ui/app";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";
import type { TaskSkillSummary } from "./dashboardTypes.js";

type TemplatesPanelProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesPanel({ skills }: TemplatesPanelProps): ReactElement {
  return (
    <MCard
      aria-labelledby="skills-title"
      gap="m"
      header={
        <DashboardPanelHeader eyebrow="Templates" title="Task skills" titleId="skills-title" />
      }
      shadow={false}
    >
      <MFlex align="stretch" direction="column" gap="s">
        {skills.map((skill) => (
          <MBox as="article" key={skill.id} paddingY="xs">
            <MHeading mode="h4">{skill.name}</MHeading>
            <MText as="p" mode="secondary">
              {skill.aliases.join(", ")}
            </MText>
          </MBox>
        ))}
      </MFlex>
    </MCard>
  );
}
