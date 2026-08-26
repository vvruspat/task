import assert from "node:assert/strict";
import test from "node:test";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import {
  registerTaskFileUploadBodyParser,
  taskFileUploadContentType,
} from "./task-file-upload-body-parser.js";

test("task file upload parser accepts binary request bodies", async (context) => {
  const adapter = new FastifyAdapter();
  context.after(async () => adapter.close());
  registerTaskFileUploadBodyParser(adapter);
  adapter.getInstance().post("/upload", (request) => ({
    bytes: Buffer.isBuffer(request.body) ? request.body.byteLength : null,
  }));

  const response = await adapter.getInstance().inject({
    body: Buffer.from("hello"),
    headers: { "content-type": taskFileUploadContentType },
    method: "POST",
    url: "/upload",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { bytes: 5 });
});

test("task file upload parser accepts files above the former 25 MB limit", async (context) => {
  const adapter = new FastifyAdapter();
  context.after(async () => adapter.close());
  registerTaskFileUploadBodyParser(adapter);
  adapter.getInstance().post("/upload", (request) => ({
    bytes: Buffer.isBuffer(request.body) ? request.body.byteLength : null,
  }));

  const bytes = Buffer.alloc(25 * 1_024 * 1_024 + 1);

  const response = await adapter.getInstance().inject({
    body: bytes,
    headers: { "content-type": taskFileUploadContentType },
    method: "POST",
    url: "/upload",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { bytes: bytes.byteLength });
});
