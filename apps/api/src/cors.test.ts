import assert from "node:assert/strict";
import test from "node:test";
import { configureCors, isLocalDevelopmentOrigin, localDevelopmentCorsOptions } from "./cors.js";

test("isLocalDevelopmentOrigin allows local Vite origins on any port", () => {
  assert.equal(isLocalDevelopmentOrigin("http://localhost:5173"), true);
  assert.equal(isLocalDevelopmentOrigin("http://127.0.0.1:5174"), true);
  assert.equal(isLocalDevelopmentOrigin("http://[::1]:5173"), true);
});

test("isLocalDevelopmentOrigin rejects non-local and malformed origins", () => {
  assert.equal(isLocalDevelopmentOrigin("https://localhost:5173"), false);
  assert.equal(isLocalDevelopmentOrigin("http://task.example"), false);
  assert.equal(isLocalDevelopmentOrigin("not a URL"), false);
});

test("localDevelopmentCorsOptions permits local origins and requests without Origin", () => {
  const allowedOrigins: boolean[] = [];

  if (typeof localDevelopmentCorsOptions.origin !== "function") {
    throw new Error("Expected a CORS origin callback.");
  }

  localDevelopmentCorsOptions.origin("http://localhost:5173", (error, allowed) => {
    assert.equal(error, null);
    allowedOrigins.push(allowed === true);
  });
  localDevelopmentCorsOptions.origin("https://task.example", (error, allowed) => {
    assert.equal(error, null);
    allowedOrigins.push(allowed === true);
  });
  localDevelopmentCorsOptions.origin(undefined, (error, allowed) => {
    assert.equal(error, null);
    allowedOrigins.push(allowed === true);
  });

  assert.deepEqual(allowedOrigins, [true, false, true]);
});

test("configureCors registers the local development CORS policy", () => {
  let registeredOptions: typeof localDevelopmentCorsOptions | undefined;

  configureCors({
    enableCors(options): void {
      registeredOptions = options;
    },
  });

  assert.equal(registeredOptions, localDevelopmentCorsOptions);
});
