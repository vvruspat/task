import { MBox, MCard, MDescriptionList, MFlex, MHeading, MText } from "@task/ui/app";
import type { ReactElement, ReactNode } from "react";

type WorkspacePanelHeaderProps = {
  action?: ReactNode;
  eyebrow: string;
  title: ReactNode;
  titleId: string;
};

type WorkspacePanelProps = WorkspacePanelHeaderProps & {
  children: ReactNode;
};

export type WorkspaceMetricItem = {
  label: string;
  value: ReactNode;
};

function WorkspacePanelHeader({
  action,
  eyebrow,
  title,
  titleId,
}: WorkspacePanelHeaderProps): ReactElement {
  return (
    <MFlex align="start" justify="space-between" wrap="nowrap">
      <MBox>
        <MText as="p" mode="secondary" size="s">
          {eyebrow}
        </MText>
        <MHeading id={titleId} mode="h3">
          {title}
        </MHeading>
      </MBox>
      {action}
    </MFlex>
  );
}

export function WorkspacePanel({
  action,
  children,
  eyebrow,
  title,
  titleId,
}: WorkspacePanelProps): ReactElement {
  return (
    <MCard
      aria-labelledby={titleId}
      gap="m"
      header={
        <WorkspacePanelHeader action={action} eyebrow={eyebrow} title={title} titleId={titleId} />
      }
      shadow={false}
    >
      {children}
    </MCard>
  );
}

export function WorkspaceMetrics({ items }: { items: WorkspaceMetricItem[] }): ReactElement {
  return (
    <MDescriptionList
      options={items.map((item) => ({
        title: item.label,
        description: item.value,
      }))}
      size="s"
    />
  );
}
