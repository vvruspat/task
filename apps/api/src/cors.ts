import type { FastifyCorsOptions } from "@fastify/cors";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

const localDevelopmentHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalDevelopmentOrigin(origin: string): boolean {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  return (
    url.protocol === "http:" && url.origin === origin && localDevelopmentHosts.has(url.hostname)
  );
}

export const localDevelopmentCorsOptions: FastifyCorsOptions = {
  origin(origin, callback): void {
    callback(null, origin === undefined || isLocalDevelopmentOrigin(origin));
  },
};

export function configureCors(app: Pick<NestFastifyApplication, "enableCors">): void {
  app.enableCors(localDevelopmentCorsOptions);
}
