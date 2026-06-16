import { apiClient } from "./client";

export const monitoringApi = {
  host: () => apiClient.get("/monitoring/host").then((r) => r.data),
  vms: () => apiClient.get("/monitoring/vms").then((r) => r.data),
  containers: () => apiClient.get("/monitoring/containers").then((r) => r.data),
  gpu: () => apiClient.get("/monitoring/gpu").then((r) => r.data),
  query: (q: string, start?: string, end?: string, step?: string) =>
    apiClient.get("/monitoring/query", { params: { q, start, end, step } }).then((r) => r.data),
};
