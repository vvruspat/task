import { Box, Card, DataList, Flex, Heading, Text } from "@radix-ui/themes";
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
        <Text color="gray">{eyebrow}</Text>
        <Heading id={titleId} as="h3">
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
    <DataList.Root>
      {items.map((item) => (
        <DataList.Item key={item.label}>
          <DataList.Label>{item.label}</DataList.Label>
          <DataList.Value>{item.value}</DataList.Value>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
