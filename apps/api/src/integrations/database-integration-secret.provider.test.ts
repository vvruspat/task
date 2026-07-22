import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  parseSecretReference,
} from "./database-integration-secret.provider.js";

const key = Buffer.alloc(32, 9);
const secretId = "11111111-1111-4111-8111-111111111111";

test("integration secrets round-trip with authenticated encryption", () => {
  const encrypted = encryptIntegrationSecret("refresh-token", key, secretId);

  assert.notEqual(encrypted.ciphertext, "refresh-token");
  assert.equal(decryptIntegrationSecret(encrypted, key, secretId), "refresh-token");
  assert.throws(
    () => decryptIntegrationSecret(encrypted, key, "22222222-2222-4222-8222-222222222222"),
    /authenticate|Unsupported state/u,
  );
});

test("database secret references accept only canonical UUID references", () => {
  assert.equal(parseSecretReference(`database-integration-secret:${secretId}`), secretId);
  assert.equal(parseSecretReference(secretId), null);
  assert.equal(parseSecretReference("database-integration-secret:not-a-uuid"), null);
});
