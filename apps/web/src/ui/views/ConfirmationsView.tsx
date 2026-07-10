import type { ConfirmationRequestSummary } from "@task/api-client";
import { Alert, Button, Card, ContentGrid, Flex, Heading, Stack, Text } from "@task/ui";
import type { ReactElement } from "react";
import {
  formatConfirmationPreview,
  isConfirmationActionPending,
} from "./confirmationViewModels.js";

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
    <ContentGrid columns={1}>
      <Card aria-labelledby="confirmations-view-title">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text tone="muted">Agent actions</Text>
            <Heading id="confirmations-view-title">Confirmations</Heading>
          </Stack>
          {loadState.status === "loading" ? (
            <Text tone="muted">Loading pending confirmations.</Text>
          ) : null}
          {loadState.status === "error" ? <Alert tone="danger">{loadState.message}</Alert> : null}
          {actionState.status === "error" ? (
            <Alert tone="danger">{actionState.message}</Alert>
          ) : null}
          {loadState.status === "loaded" && confirmationRequests.length === 0 ? (
            <Stack gap="xs">
              <Heading level={3}>No pending confirmations</Heading>
              <Text tone="muted">
                Actions that need approval will appear here before they are applied.
              </Text>
            </Stack>
          ) : null}
          {loadState.status === "loaded"
            ? confirmationRequests.map((request) => (
                <article key={request.id}>
                  <Flex align="start" gap="lg" justify="between">
                    <Stack gap="xs">
                      <Heading level={3}>{request.kind}</Heading>
                      <Text tone="muted">
                        Expires {new Date(request.expiresAt).toLocaleString()}
                      </Text>
                      {formatConfirmationPreview(request.preview).map((preview) => (
                        <Text key={preview} tone="muted">
                          {preview}
                        </Text>
                      ))}
                    </Stack>
                    <Flex gap="sm">
                      <Button
                        disabled={controlsDisabled}
                        onClick={() => void onCancel(request.id)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={controlsDisabled}
                        onClick={() => void onConfirm(request.id)}
                      >
                        Confirm
                      </Button>
                    </Flex>
                  </Flex>
                </article>
              ))
            : null}
        </Stack>
      </Card>
    </ContentGrid>
  );
}
