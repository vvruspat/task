import assert from "node:assert/strict";
import test from "node:test";
import {
  getTelegramMiniAppInitData,
  isTelegramIdentityUnlinkedError,
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
