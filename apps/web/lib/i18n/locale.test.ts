import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalePreference, resolveLocale } from "./locale.ts";

test("system locale supports Russian and falls back to English", () => {
  assert.equal(resolveLocale("system", "ru-RU"), "ru");
  assert.equal(resolveLocale("system", "de-DE"), "en");
  assert.equal(resolveLocale("en", "ru-RU"), "en");
});

test("unknown persisted preferences use the system default", () => {
  assert.equal(parseLocalePreference("ru"), "ru");
  assert.equal(parseLocalePreference("de"), "system");
  assert.equal(parseLocalePreference(undefined), "system");
});
