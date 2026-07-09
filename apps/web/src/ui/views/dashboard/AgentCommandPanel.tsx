import { MText } from "@task/ui";
import { Clock3 } from "lucide-react";
import type { ReactElement } from "react";
import { DashboardPanel } from "./DashboardPrimitives.js";

export function AgentCommandPanel(): ReactElement {
  return (
    <DashboardPanel
      action={<Clock3 aria-hidden="true" className="muted-icon" />}
      eyebrow="Agent"
      title="Recent command"
      titleId="agent-title"
      wide
    >
      <MText as="p" className="agent-line" mode="secondary">
        Create a song from the Song skill, preview subtasks, then wait for confirmation.
      </MText>
    </DashboardPanel>
  );
}
