import { apiClient } from "./client";

export const storageApi = {
  pools: () => apiClient.get("/storage/pools").then((r) => r.data),
  datasets: (pool?: string) => apiClient.get("/storage/datasets", { params: pool ? { pool } : {} }).then((r) => r.data),
  createDataset: (name: string, properties?: object) => apiClient.post("/storage/datasets", { name, properties }).then((r) => r.data),
  snapshots: (dataset?: string) => apiClient.get("/storage/snapshots", { params: dataset ? { dataset } : {} }).then((r) => r.data),
  createSnapshot: (dataset: string, name: string, recursive = false) => apiClient.post("/storage/snapshots", { dataset, name, recursive }).then((r) => r.data),
  deleteSnapshot: (snapshot: string) => apiClient.delete(`/storage/snapshots/${encodeURIComponent(snapshot)}`),
  rollback: (snapshot: string) => apiClient.post(`/storage/snapshots/${encodeURIComponent(snapshot)}/rollback`).then((r) => r.data),
  replicate: (body: object) => apiClient.post("/storage/replicate", body).then((r) => r.data),
  borgList: (repo: string) => apiClient.get("/storage/backup/borg/list", { params: { repo } }).then((r) => r.data),
  borgCreate: (body: object) => apiClient.post("/storage/backup/borg/create", body).then((r) => r.data),
  borgPrune: (repo: string, params?: object) => apiClient.post("/storage/backup/borg/prune", null, { params: { repo, ...params } }).then((r) => r.data),
};
