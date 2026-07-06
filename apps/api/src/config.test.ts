import assert from "node:assert/strict";
import test from "node:test";
import { InvalidApiEnvironmentError, parseApiConfig } from "./config.js";

test("parseApiConfig defaults PORT to 3000", () => {
  const config = parseApiConfig({});

  assert.equal(config.port, 3000);
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
