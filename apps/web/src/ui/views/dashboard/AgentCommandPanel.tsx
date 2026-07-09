import { MCard, MText } from "@task/ui/app";
import { Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";

export function AgentCommandPanel(): ReactElement {
  return (
    <MCard
      aria-labelledby="agent-title"
      gap="m"
      header={
        <DashboardPanelHeader
          action={<Clock3 aria-hidden="true" />}
          eyebrow="Agent"
          title="Recent command"
          titleId="agent-title"
        />
      }
      shadow={false}
    >
      <MText as="p" mode="secondary">
        Create a song from the Song skill, preview subtasks, then wait for confirmation.
      </MText>
    </MCard>
  );
}
