import { MBox, MFlex, MHeading, MOperationalContentGrid, MText } from "@task/ui/app";
import type { ReactElement } from "react";
import { buildTemplateSkillRows, buildTemplateSkillSummary } from "../workspaceViewModels.js";
import type { TaskSkillSummary } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type TemplatesViewProps = {
  skills: TaskSkillSummary[];
};

export function TemplatesView({ skills }: TemplatesViewProps): ReactElement {
  const rows = buildTemplateSkillRows(skills);
  const summary = buildTemplateSkillSummary(skills);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Templates" title="Task skills" titleId="templates-view-title">
        <MFlex align="stretch" direction="column" gap="m">
          {rows.map((skill) => (
            <MFlex
              as="article"
              align="start"
              gap="m"
              key={skill.id}
              justify="space-between"
              wrap="nowrap"
            >
              <MBox>
                <MHeading mode="h4">{skill.name}</MHeading>
                <MText as="p" mode="secondary">
                  {skill.description}
                </MText>
              </MBox>
              <MText as="span">{skill.aliasLabel}</MText>
              <time dateTime={skill.updatedAtLabel}>{skill.updatedAtLabel}</time>
            </MFlex>
          ))}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded skills" titleId="templates-summary-title">
        <MText as="p" mode="secondary">
          Read-only overview of task skills loaded for the workspace.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Skills", value: summary.skillCount },
            { label: "Aliases", value: summary.skillsWithAliasesCount },
            { label: "No description", value: summary.skillsWithoutDescriptionCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}
