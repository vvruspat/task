import { Card, Heading, Stack, Text } from "@task/ui/app";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";
import type { TaskSkillSummary } from "./dashboardTypes.js";

type TemplatesPanelProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesPanel({ skills }: TemplatesPanelProps): ReactElement {
  return (
    <Card aria-labelledby="skills-title">
      <Stack gap="md">
        <DashboardPanelHeader eyebrow="Templates" title="Task skills" titleId="skills-title" />
        <Stack gap="sm">
          {skills.map((skill) => (
            <article key={skill.id}>
              <Heading level={4}>{skill.name}</Heading>
              <Text tone="muted">{skill.aliases.join(", ")}</Text>
            </article>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
