import { apiClient } from "./client";

export const usersApi = {
  list: () => apiClient.get("/users/").then((r) => r.data),
  create: (body: object) => apiClient.post("/users/", body).then((r) => r.data),
  update: (id: string, body: object) => apiClient.put(`/users/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
  groups: () => apiClient.get("/users/groups/").then((r) => r.data),
  createGroup: (body: object) => apiClient.post("/users/groups/", body).then((r) => r.data),
  deleteGroup: (id: string) => apiClient.delete(`/users/groups/${id}`),
  apiKeys: () => apiClient.get("/users/apikeys/").then((r) => r.data),
  createApiKey: (body: object) => apiClient.post("/users/apikeys/", body).then((r) => r.data),
  deleteApiKey: (id: string) => apiClient.delete(`/users/apikeys/${id}`),
  getLayout: () => apiClient.get("/users/layout/").then((r) => r.data),
  saveLayout: (layout: unknown[]) => apiClient.put("/users/layout/", { layout }).then((r) => r.data),
  me: () => apiClient.get("/auth/me").then((r) => r.data),
};
