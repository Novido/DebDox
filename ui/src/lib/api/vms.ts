import { apiClient } from "./client";

export const vmsApi = {
  list: () => apiClient.get("/vms/").then((r) => r.data),
  get: (id: string) => apiClient.get(`/vms/${id}`).then((r) => r.data),
  create: (body: object) => apiClient.post("/vms/", body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/vms/${id}`),
  action: (id: string, action: string) => apiClient.post(`/vms/${id}/${action}`).then((r) => r.data),
  snapshot: (id: string, name: string) => apiClient.post(`/vms/${id}/snapshots`, { name }).then((r) => r.data),
  console: (id: string) => apiClient.get(`/vms/${id}/console`).then((r) => r.data),
};
