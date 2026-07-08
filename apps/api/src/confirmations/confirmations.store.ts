import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "./confirmations.contracts.js";

export type ConfirmationRequestCreateResult =
  | {
      status: "created";
      confirmationRequest: ConfirmationRequestDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "agent_run_not_found";
    };

export type ConfirmationRequestCancelResult =
  | {
      status: "cancelled";
      confirmationRequest: ConfirmationRequestDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "confirmation_request_not_found";
    };

export type ConfirmationRequestsStore = {
  listPendingForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<ConfirmationRequestSummary[] | null>;
  getForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestDetail | null>;
  createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestCreateResult>;
  cancelForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestCancelResult>;
};
