import assert from "node:assert/strict";
import test from "node:test";
import { InvalidApiEnvironmentError, parseApiConfig } from "./config.js";

test("parseApiConfig defaults PORT to 3000", () => {
  const config = parseApiConfig({});

  assert.equal(config.port, 3000);
});

test("parseApiConfig leaves database config unset when DATABASE_URL is absent", () => {
  const config = parseApiConfig({});

  assert.equal(config.database, null);
});

test("parseApiConfig accepts a valid DATABASE_URL", () => {
  const databaseUrl = "postgresql://task_user:task_password@localhost:5432/task_db";
  const config = parseApiConfig({ DATABASE_URL: databaseUrl });

  assert.deepEqual(config.database, { url: databaseUrl });
});

test("parseApiConfig rejects invalid DATABASE_URL values", () => {
  const invalidDatabaseUrls = [
    "",
    " postgresql://task_user:task_password@localhost:5432/task_db",
    "http://task_user:task_password@localhost:5432/task_db",
    "postgresql:///task_db",
    "postgresql://localhost:5432/task_db",
    "postgresql://task_user:task_password@localhost:5432",
  ];

  for (const databaseUrl of invalidDatabaseUrls) {
    assert.throws(() => parseApiConfig({ DATABASE_URL: databaseUrl }), InvalidApiEnvironmentError);
  }
});

test("parseApiConfig redacts invalid DATABASE_URL values in error messages", () => {
  assert.throws(
    () => parseApiConfig({ DATABASE_URL: "http://task_user:task_password@localhost:5432/task_db" }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidApiEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /task_user/);
      assert.doesNotMatch(error.message, /task_password/);
      return true;
    },
  );
});

test("parseApiConfig accepts a valid PORT", () => {
  const config = parseApiConfig({ PORT: "4000" });

  assert.equal(config.port, 4000);
});

test("parseApiConfig rejects invalid PORT values", () => {
  const invalidPorts = ["", "0", "-1", "65536", "3000abc", "abc3000", "3.5"];

  for (const port of invalidPorts) {
    assert.throws(() => parseApiConfig({ PORT: port }), InvalidApiEnvironmentError);
  }
});
