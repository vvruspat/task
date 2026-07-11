import { Button, Callout, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import type { ConfirmationRequestSummary } from "@task/api-client";
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
    <Grid columns="1">
      <Card aria-labelledby="confirmations-view-title">
        <Flex gap="4">
          <Flex gap="1">
            <Text color="gray">Agent actions</Text>
            <Heading id="confirmations-view-title">Confirmations</Heading>
          </Flex>
          {loadState.status === "loading" ? (
            <Text color="gray">Loading pending confirmations.</Text>
          ) : null}
          {loadState.status === "error" ? (
            <Callout.Root color="red">{loadState.message}</Callout.Root>
          ) : null}
          {actionState.status === "error" ? (
            <Callout.Root color="red">{actionState.message}</Callout.Root>
          ) : null}
          {loadState.status === "loaded" && confirmationRequests.length === 0 ? (
            <Flex gap="1">
              <Heading as="h3">No pending confirmations</Heading>
              <Text color="gray">
                Actions that need approval will appear here before they are applied.
              </Text>
            </Flex>
          ) : null}
          {loadState.status === "loaded"
            ? confirmationRequests.map((request) => (
                <article key={request.id}>
                  <Flex align="start" gap="4" justify="between">
                    <Flex gap="1">
                      <Heading as="h3">{request.kind}</Heading>
                      <Text color="gray">
                        Expires {new Date(request.expiresAt).toLocaleString()}
                      </Text>
                      {formatConfirmationPreview(request.preview).map((preview) => (
                        <Text key={preview} color="gray">
                          {preview}
                        </Text>
                      ))}
                    </Flex>
                    <Flex gap="2">
                      <Button
                        disabled={controlsDisabled}
                        onClick={() => void onCancel(request.id)}
                        variant="soft"
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
        </Flex>
      </Card>
    </Grid>
  );
}
