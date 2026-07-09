import { MBox, MCard, MDescriptionList, MFlex, MHeading, MText } from "@task/ui";
import type { ReactElement, ReactNode } from "react";

type PanelHeaderProps = {
  action?: ReactNode;
  eyebrow: string;
  title: string;
  titleId: string;
};

type DashboardPanelProps = PanelHeaderProps & {
  children: ReactNode;
  wide?: boolean;
};

export type MetricItem = {
  label: string;
  value: ReactNode;
};

function PanelHeader({ action, eyebrow, title, titleId }: PanelHeaderProps): ReactElement {
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

export function DashboardPanel({
  action,
  children,
  eyebrow,
  title,
  titleId,
  wide = false,
}: DashboardPanelProps): ReactElement {
  return (
    <MCard
      aria-labelledby={titleId}
      className={wide ? "wide-panel" : undefined}
      gap="m"
      header={<PanelHeader action={action} eyebrow={eyebrow} title={title} titleId={titleId} />}
      shadow={false}
    >
      {children}
    </MCard>
  );
}

export function DashboardMetrics({
  ariaLabel,
  className,
  items,
}: {
  ariaLabel: string;
  className?: string;
  items: MetricItem[];
}): ReactElement {
  return (
    <MDescriptionList
      aria-label={ariaLabel}
      className={className ? `metric-list ${className}` : "metric-list"}
      options={items.map((item) => ({
        title: item.label,
        description: item.value,
      }))}
      size="s"
    />
  );
}
