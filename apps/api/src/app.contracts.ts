export type HealthStatus = "ok";

export type HealthResponse = {
  status: HealthStatus;
  service: string;
  version: string;
};
