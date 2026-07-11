import { Box, Flex, Heading, Text } from "@radix-ui/themes";
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
        <Text color="gray">{eyebrow.toUpperCase()}</Text>
        <Heading id={titleId} as="h3">
          {title}
        </Heading>
      </Box>
      {action}
    </Flex>
  );
}
