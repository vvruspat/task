import { Card, Stack, Text } from "@task/ui/app";
import { Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";

export function AgentCommandPanel(): ReactElement {
  return (
    <Card aria-labelledby="agent-title">
      <Stack gap="md">
        <DashboardPanelHeader
          action={<Clock3 aria-hidden="true" />}
          eyebrow="Agent"
          title="Recent command"
          titleId="agent-title"
        />
        <Text tone="muted">
          Create a song from the Song skill, preview subtasks, then wait for confirmation.
        </Text>
      </Stack>
    </Card>
  );
}
