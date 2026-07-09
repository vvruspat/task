import { MBox, MCard, MDescriptionList, MFlex, MHeading, MText } from "@task/ui";
import type { ReactElement, ReactNode } from "react";

type WorkspacePanelHeaderProps = {
  action?: ReactNode;
  eyebrow: string;
  title: ReactNode;
  titleId: string;
};

type WorkspacePanelProps = WorkspacePanelHeaderProps & {
  children: ReactNode;
  wide?: boolean;
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
        <MText as="p" className="eyebrow" mode="secondary" size="s">
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
  wide = false,
}: WorkspacePanelProps): ReactElement {
  return (
    <MCard
      aria-labelledby={titleId}
      className={wide ? "wide-panel" : undefined}
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

export function WorkspaceMetrics({
  className,
  items,
}: {
  className?: string;
  items: WorkspaceMetricItem[];
}): ReactElement {
  return (
    <MDescriptionList
      className={className ? `metric-list ${className}` : "metric-list"}
      options={items.map((item) => ({
        title: item.label,
        description: item.value,
      }))}
      size="s"
    />
  );
}
