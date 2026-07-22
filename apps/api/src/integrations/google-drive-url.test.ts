import assert from "node:assert/strict";
import test from "node:test";
import { extractGoogleDriveReferences, parseGoogleDriveUrl } from "./google-drive-url.js";

const fileId = "1AbCdEfGhIjKlMnOpQrStUvWxYz";

test("Google Drive URLs are normalized to stable provider IDs", () => {
  const folder = parseGoogleDriveUrl(
    `https://drive.google.com/drive/folders/${fileId}?usp=sharing`,
  );
  const document = parseGoogleDriveUrl(
    `https://docs.google.com/document/d/${fileId}/edit#heading=h.1`,
  );

  assert.deepEqual(folder, document);
  assert.equal(folder?.url, `https://drive.google.com/open?id=${fileId}`);
  assert.match(folder?.urlHash ?? "", /^[0-9a-f]{64}$/u);
});

test("Drive reference extraction de-duplicates URL forms and strips Markdown punctuation", () => {
  const references = extractGoogleDriveReferences(
    `Folder: (https://drive.google.com/drive/folders/${fileId}). Document: https://docs.google.com/document/d/${fileId}/edit`,
  );

  assert.equal(references.length, 1);
  assert.equal(references[0]?.providerResourceId, fileId);
});

test("Drive reference parsing rejects lookalike hosts and malformed IDs", () => {
  assert.equal(parseGoogleDriveUrl(`https://drive.google.com.example/file/d/${fileId}/view`), null);
  assert.equal(parseGoogleDriveUrl("https://drive.google.com/file/d/short/view"), null);
  assert.equal(parseGoogleDriveUrl(`http://drive.google.com/file/d/${fileId}/view`), null);
});
