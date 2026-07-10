import { Box, Flex, Heading, Text } from "@task/ui/app";
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
    <Flex align="start" justify="between">
      <Box>
        <Text tone="muted">{eyebrow.toUpperCase()}</Text>
        <Heading id={titleId} level={3}>
          {title}
        </Heading>
      </Box>
      {action}
    </Flex>
  );
}
