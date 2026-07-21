import assert from "node:assert/strict";
import test from "node:test";
import { addUserLocaleSql, dropUserLocaleSql } from "./1783297740000-add-user-locale.js";

test("user locale migration accepts only supported persisted locales", () => {
  const migrationSql = addUserLocaleSql.join("\n");
  assert.match(migrationSql, /ADD COLUMN "locale" text/u);
  assert.match(migrationSql, /"locale" IN \('en', 'ru'\)/u);
});

test("user locale migration down path removes the constraint before the column", () => {
  assert.deepEqual(dropUserLocaleSql, [
    `ALTER TABLE "users" DROP CONSTRAINT "chk_users_locale"`,
    `ALTER TABLE "users" DROP COLUMN "locale"`,
  ]);
});
