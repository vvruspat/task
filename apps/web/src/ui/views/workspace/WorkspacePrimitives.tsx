import { Box, Card, DescriptionList, Flex, Heading, Text } from "@task/ui/app";
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
    <Flex align="start" justify="between">
      <Box>
        <Text tone="muted">{eyebrow}</Text>
        <Heading id={titleId} level={3}>
          {title}
        </Heading>
      </Box>
      {action}
    </Flex>
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
    <Card aria-labelledby={titleId} role="region">
      <WorkspacePanelHeader action={action} eyebrow={eyebrow} title={title} titleId={titleId} />
      {children}
    </Card>
  );
}

export function WorkspaceMetrics({ items }: { items: WorkspaceMetricItem[] }): ReactElement {
  return (
    <DescriptionList
      items={items.map((item) => ({
        label: item.label,
        value: item.value,
      }))}
    />
  );
}
