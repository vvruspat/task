import type { ConfirmationRequestSummary } from "@task/api-client";
import {
  MAlert,
  MBox,
  MButton,
  MFlex,
  MHeading,
  MOperationalContentGrid,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import {
  formatConfirmationPreview,
  isConfirmationActionPending,
} from "./confirmationViewModels.js";
import { WorkspacePanel } from "./workspace/WorkspacePrimitives.js";

type ConfirmationsViewProps = {
  actionState: ConfirmationActionState;
  confirmationRequests: ConfirmationRequestSummary[];
  loadState: ConfirmationLoadState;
  onCancel(confirmationRequestId: string): Promise<void>;
  onConfirm(confirmationRequestId: string): Promise<void>;
};

export type ConfirmationLoadState =
  | { status: "loading" }
  | { status: "loaded" }
  | { message: string; status: "error" };

export type ConfirmationActionState =
  | { status: "idle" }
  | { confirmationRequestId: string; status: "cancelling" | "confirming" }
  | { message: string; status: "error" };

export default function ConfirmationsView({
  actionState,
  confirmationRequests,
  loadState,
  onCancel,
  onConfirm,
}: ConfirmationsViewProps): ReactElement {
  const controlsDisabled = isConfirmationActionPending(actionState.status);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel
        eyebrow="Agent actions"
        title="Confirmations"
        titleId="confirmations-view-title"
      >
        <MFlex align="stretch" direction="column" gap="m">
          {loadState.status === "loading" ? (
            <MText as="p" mode="secondary">
              Loading pending confirmations.
            </MText>
          ) : null}
          {loadState.status === "error" ? <MAlert mode="error">{loadState.message}</MAlert> : null}
          {actionState.status === "error" ? (
            <MAlert mode="error">{actionState.message}</MAlert>
          ) : null}
          {loadState.status === "loaded" && confirmationRequests.length === 0 ? (
            <MBox>
              <MHeading mode="h4">No pending confirmations</MHeading>
              <MText as="p" mode="secondary">
                Actions that need approval will appear here before they are applied.
              </MText>
            </MBox>
          ) : null}
          {loadState.status === "loaded"
            ? confirmationRequests.map((request) => (
                <MFlex
                  as="article"
                  align="start"
                  gap="m"
                  justify="space-between"
                  key={request.id}
                  wrap="nowrap"
                >
                  <MBox>
                    <MHeading mode="h4">{request.kind}</MHeading>
                    <MText as="p" mode="secondary">
                      Expires {new Date(request.expiresAt).toLocaleString()}
                    </MText>
                    {formatConfirmationPreview(request.preview).map((preview) => (
                      <MText as="p" key={preview} mode="secondary">
                        {preview}
                      </MText>
                    ))}
                  </MBox>
                  <MFlex gap="s" wrap="nowrap">
                    <MButton
                      disabled={controlsDisabled}
                      onClick={() => void onCancel(request.id)}
                      mode="outlined"
                    >
                      Cancel
                    </MButton>
                    <MButton disabled={controlsDisabled} onClick={() => void onConfirm(request.id)}>
                      Confirm
                    </MButton>
                  </MFlex>
                </MFlex>
              ))
            : null}
        </MFlex>
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}
