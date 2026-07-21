import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const allowedTechnicalCopy = new Set([
  "Enter",
  "TASK_API_BASE_URL=http://localhost:3000",
  "Telegram Mini App",
  "v",
]);
const localizedAttributes = new Set(["alt", "aria-label", "placeholder", "title"]);

test("user-facing JSX copy is sourced from the locale dictionaries", () => {
  const componentsDirectory = resolve(process.cwd(), "components");
  const violations: string[] = [];
  for (const filename of readdirSync(componentsDirectory).filter((name) => name.endsWith(".tsx"))) {
    const path = resolve(componentsDirectory, filename);
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isJsxText(node)) {
        recordViolation(node.text.replace(/\s+/gu, " ").trim(), node.getStart(sourceFile));
      } else if (
        ts.isJsxAttribute(node) &&
        localizedAttributes.has(node.name.getText(sourceFile)) &&
        node.initializer !== undefined &&
        ts.isStringLiteral(node.initializer)
      ) {
        recordViolation(node.initializer.text.trim(), node.getStart(sourceFile));
      }
      ts.forEachChild(node, visit);
    };
    const recordViolation = (copy: string, position: number): void => {
      if (copy.length === 0 || !/\p{L}/u.test(copy) || allowedTechnicalCopy.has(copy)) return;
      const location = sourceFile.getLineAndCharacterOfPosition(position);
      violations.push(`${filename}:${location.line + 1}: ${copy}`);
    };
    visit(sourceFile);
  }
  assert.deepEqual(violations, []);
});
