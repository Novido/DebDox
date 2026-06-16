import { apiClient } from "./client";

export const clusterApi = {
  nodes: () => apiClient.get("/cluster/nodes").then((r) => r.data),
  node: (id: string) => apiClient.get(`/cluster/nodes/${id}`).then((r) => r.data),
  command: (nodeId: string, command: string, args?: object) =>
    apiClient.post(`/cluster/nodes/${nodeId}/command`, { command, args }).then((r) => r.data),
  swarm: () => apiClient.get("/cluster/swarm").then((r) => r.data),
  swarmInit: (advertise_addr: string) => apiClient.post("/cluster/swarm/init", null, { params: { advertise_addr } }).then((r) => r.data),
  swarmServices: () => apiClient.get("/cluster/swarm/services").then((r) => r.data),
};
