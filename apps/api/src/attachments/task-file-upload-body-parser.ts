import type { FastifyAdapter } from "@nestjs/platform-fastify";

export const taskFileUploadContentType = "application/octet-stream";

export function registerTaskFileUploadBodyParser(adapter: FastifyAdapter): void {
  adapter
    .getInstance()
    .addContentTypeParser(
      taskFileUploadContentType,
      { bodyLimit: Number.MAX_SAFE_INTEGER, parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
}
