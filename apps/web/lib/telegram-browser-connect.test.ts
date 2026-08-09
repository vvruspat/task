import assert from "node:assert/strict";
import test from "node:test";
import {
  isTelegramBrowserConnectPreview,
  isTelegramBrowserConnectResult,
} from "./telegram-browser-connect.ts";

const workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Music",
  slug: "music",
};

test("connected Telegram chats preview one fixed workspace without a selector list", () => {
  assert.equal(
    isTelegramBrowserConnectPreview({
      chatTitle: "Album Team",
      expiresAt: "2026-08-09T19:00:00.000Z",
      mode: "link_identity",
      workspace,
      workspaces: [],
    }),
    true,
  );
  assert.equal(
    isTelegramBrowserConnectPreview({
      chatTitle: "Album Team",
      expiresAt: "2026-08-09T19:00:00.000Z",
      mode: "link_identity",
      workspace,
      workspaces: [workspace],
    }),
    false,
  );
});

test("unconnected Telegram chats preview selectable workspaces only", () => {
  assert.equal(
    isTelegramBrowserConnectPreview({
      chatTitle: "Album Team",
      expiresAt: "2026-08-09T19:00:00.000Z",
      mode: "connect_chat",
      workspace: null,
      workspaces: [workspace],
    }),
    true,
  );
  assert.equal(
    isTelegramBrowserConnectResult({
      chatTitle: "Album Team",
      status: "chat_connected",
      workspace,
    }),
    true,
  );
});
