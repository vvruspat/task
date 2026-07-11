import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";
import type { TaskSkillSummary } from "./dashboardTypes.js";

type TemplatesPanelProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesPanel({ skills }: TemplatesPanelProps): ReactElement {
  return (
    <Card aria-labelledby="skills-title">
      <Flex gap="3">
        <DashboardPanelHeader eyebrow="Templates" title="Task skills" titleId="skills-title" />
        <Flex gap="2">
          {skills.map((skill) => (
            <article key={skill.id}>
              <Heading as="h4">{skill.name}</Heading>
              <Text color="gray">{skill.aliases.join(", ")}</Text>
            </article>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
