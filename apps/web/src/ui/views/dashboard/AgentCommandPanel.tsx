import { Card, Flex, Text } from "@radix-ui/themes";
import { Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";

export function AgentCommandPanel(): ReactElement {
  return (
    <Card aria-labelledby="agent-title">
      <Flex gap="3">
        <DashboardPanelHeader
          action={<Clock3 aria-hidden="true" />}
          eyebrow="Agent"
          title="Recent command"
          titleId="agent-title"
        />
        <Text color="gray">
          Create a song from the Song skill, preview subtasks, then wait for confirmation.
        </Text>
      </Flex>
    </Card>
  );
}
