import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceMemberRoleUpdateInput,
  buildWorkspaceStatusCreateInput,
  canManageWorkspaceSettings,
  getSettingsMutationSettlement,
  getTelegramMiniAppInitData,
  isTelegramIdentityUnlinkedError,
  shouldApplySettingsWorkspaceSettlement,
  shouldConfirmWorkspaceStatusDeletion,
  shouldShowTelegramLinkAction,
} from "../workspaceViewModels.js";

test("getTelegramMiniAppInitData returns initData only from a Telegram Mini App shape", () => {
  assert.equal(
    getTelegramMiniAppInitData({
      Telegram: { WebApp: { initData: "query_id=trusted-session" } },
    }),
    "query_id=trusted-session",
  );
  assert.equal(getTelegramMiniAppInitData({ Telegram: { WebApp: { initData: "   " } } }), null);
  assert.equal(getTelegramMiniAppInitData({ Telegram: { WebApp: {} } }), null);
  assert.equal(getTelegramMiniAppInitData({}), null);
});

test("403 Telegram identity status response exposes the Mini App link action", () => {
  const initData = getTelegramMiniAppInitData({
    Telegram: { WebApp: { initData: "query_id=verified-mini-app-session" } },
  });

  assert.equal(isTelegramIdentityUnlinkedError({ status: 403 }), true);
  assert.equal(shouldShowTelegramLinkAction({ initData, linkState: "unlinked" }), true);
  assert.equal(isTelegramIdentityUnlinkedError({ status: 500 }), false);
});

test("only workspace owners and admins can manage settings controls", () => {
  assert.equal(canManageWorkspaceSettings("owner"), true);
  assert.equal(canManageWorkspaceSettings("admin"), true);
  assert.equal(canManageWorkspaceSettings("member"), false);
  assert.equal(canManageWorkspaceSettings("guest"), false);
});

test("settings mutation payloads preserve the selected role and normalize a new status name", () => {
  assert.deepEqual(buildWorkspaceMemberRoleUpdateInput("guest"), { role: "guest" });
  assert.deepEqual(
    buildWorkspaceStatusCreateInput({
      color: "#334155",
      isDone: false,
      name: "  Ready for review  ",
      position: "2000",
    }),
    { color: "#334155", isDone: false, name: "Ready for review", position: "2000" },
  );
});

test("status deletion only continues after confirmation", () => {
  assert.equal(shouldConfirmWorkspaceStatusDeletion(false), false);
  assert.equal(shouldConfirmWorkspaceStatusDeletion(true), true);
});

test("settings mutation settlements only update their captured active workspace", () => {
  assert.equal(shouldApplySettingsWorkspaceSettlement("workspace-a", "workspace-a"), true);
  assert.equal(shouldApplySettingsWorkspaceSettlement("workspace-b", "workspace-a"), false);
  assert.equal(shouldApplySettingsWorkspaceSettlement(null, "workspace-a"), false);
});

test("current settings mutation success refreshes while errors surface without a refresh", () => {
  assert.deepEqual(
    getSettingsMutationSettlement({
      capturedWorkspaceId: "workspace-a",
      currentWorkspaceId: "workspace-a",
      errorMessage: null,
    }),
    { errorMessage: null, shouldRefresh: true },
  );
  assert.deepEqual(
    getSettingsMutationSettlement({
      capturedWorkspaceId: "workspace-a",
      currentWorkspaceId: "workspace-a",
      errorMessage: "Permission denied",
    }),
    { errorMessage: "Permission denied", shouldRefresh: false },
  );
  assert.deepEqual(
    getSettingsMutationSettlement({
      capturedWorkspaceId: "workspace-a",
      currentWorkspaceId: "workspace-b",
      errorMessage: "Permission denied",
    }),
    { errorMessage: null, shouldRefresh: false },
  );
});
