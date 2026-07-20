import assert from "node:assert/strict";
import test from "node:test";
import { createAgentChatsSql, dropAgentChatsSql } from "./1783297380000-create-agent-chats.js";

test("agent chat migration persists conversations and links assistant turns to runs", () => {
  assert.match(createAgentChatsSql[0], /CREATE TABLE "agent_chats"/u);
  assert.match(createAgentChatsSql[1], /CREATE TABLE "agent_chat_messages"/u);
  assert.match(createAgentChatsSql[1], /REFERENCES "agent_runs"/u);
  assert.match(createAgentChatsSql[1], /ON DELETE CASCADE/u);
  assert.match(createAgentChatsSql.join("\n"), /idx_agent_chats_workspace_user_updated/u);
});

test("agent chat migration drops messages before chats", () => {
  assert.ok(
    dropAgentChatsSql.indexOf('DROP TABLE "agent_chat_messages"') <
      dropAgentChatsSql.indexOf('DROP TABLE "agent_chats"'),
  );
});
