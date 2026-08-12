import { BadRequestException } from "@nestjs/common";
import type { FastifyAdapter } from "@nestjs/platform-fastify";

export const taskFileUploadContentType = "application/octet-stream";

export function registerTaskFileUploadBodyParser(adapter: FastifyAdapter, maxBytes: number): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new BadRequestException("Task file upload limit must be a positive integer.");
  }
  adapter
    .getInstance()
    .addContentTypeParser(
      taskFileUploadContentType,
      { bodyLimit: maxBytes, parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
}
