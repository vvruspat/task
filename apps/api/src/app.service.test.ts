import assert from "node:assert/strict";
import test from "node:test";
import { AppService } from "./app.service.js";

test("AppService returns the typed API health response", () => {
  const service = new AppService();
  const response = service.getHealth();

  assert.equal(response.status, "ok");
  assert.equal(response.service, "api");
  assert.equal(response.version, "0.0.0");
});
