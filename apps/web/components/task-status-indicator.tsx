import "./task-status-indicator.css";
import type { CSSProperties, ReactNode } from "react";

type TaskStatusIndicatorSize = "xs" | "sm" | "md";

export function TaskStatusIndicator({
  color = "#A1A1AA",
  size = "sm",
}: Readonly<{
  color?: string | null | undefined;
  size?: TaskStatusIndicatorSize;
}>): ReactNode {
  return (
    <span
      className={`task-status-indicator ${size}`}
      aria-hidden="true"
      style={{ "--task-status-color": color ?? "#A1A1AA" } as CSSProperties}
    />
  );
}
