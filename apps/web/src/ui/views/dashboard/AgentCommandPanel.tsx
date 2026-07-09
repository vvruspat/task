import { Clock3 } from "lucide-react";
import type { ReactElement } from "react";

export function AgentCommandPanel(): ReactElement {
  return (
    <section className="panel wide-panel" aria-labelledby="agent-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Agent</p>
          <h3 id="agent-title">Recent command</h3>
        </div>
        <Clock3 aria-hidden="true" className="muted-icon" />
      </div>
      <p className="agent-line">
        Create a song from the Song skill, preview subtasks, then wait for confirmation.
      </p>
    </section>
  );
}
