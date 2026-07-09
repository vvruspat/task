import { MBox, MFlex, MHeading, MText } from "@task/ui/app";
import type { ReactElement, ReactNode } from "react";

type DashboardPanelHeaderProps = {
  action?: ReactNode;
  eyebrow: string;
  title: string;
  titleId: string;
};

export function DashboardPanelHeader({
  action,
  eyebrow,
  title,
  titleId,
}: DashboardPanelHeaderProps): ReactElement {
  return (
    <MFlex align="start" justify="space-between" wrap="nowrap">
      <MBox>
        <MText as="p" mode="secondary" size="s">
          {eyebrow.toUpperCase()}
        </MText>
        <MHeading id={titleId} mode="h3">
          {title}
        </MHeading>
      </MBox>
      {action}
    </MFlex>
  );
}
