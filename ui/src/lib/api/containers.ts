import { apiClient } from "./client";

export const containersApi = {
  list: (all = true) => apiClient.get("/containers/", { params: { all } }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/containers/${id}`).then((r) => r.data),
  create: (body: object) => apiClient.post("/containers/", body).then((r) => r.data),
  delete: (id: string, force = false) => apiClient.delete(`/containers/${id}`, { params: { force } }),
  action: (id: string, action: string) => apiClient.post(`/containers/${id}/${action}`).then((r) => r.data),
  logs: (id: string, tail = 200) => apiClient.get(`/containers/${id}/logs`, { params: { tail } }).then((r) => r.data),
  swarmStatus: () => apiClient.get("/containers/swarm/status").then((r) => r.data),
  swarmInit: (advertise_addr: string) => apiClient.post("/containers/swarm/init", null, { params: { advertise_addr } }).then((r) => r.data),
  swarmServices: () => apiClient.get("/containers/swarm/services").then((r) => r.data),
};
