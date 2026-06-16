import { apiClient } from "./client";

export const networksApi = {
  bridges: () => apiClient.get("/networks/bridges").then((r) => r.data),
  createBridge: (body: object) => apiClient.post("/networks/bridges", body).then((r) => r.data),
  deleteBridge: (name: string) => apiClient.delete(`/networks/bridges/${name}`),
  createVlan: (body: object) => apiClient.post("/networks/vlans", body).then((r) => r.data),
  dockerNetworks: () => apiClient.get("/networks/docker").then((r) => r.data),
  createDockerNetwork: (body: object) => apiClient.post("/networks/docker", body).then((r) => r.data),
  firewallRuleset: () => apiClient.get("/firewall/ruleset").then((r) => r.data),
  firewallRules: (table?: string, chain?: string) =>
    apiClient.get("/firewall/rules", { params: { table, chain } }).then((r) => r.data),
  addFirewallRule: (body: object) => apiClient.post("/firewall/rules", body).then((r) => r.data),
  deleteFirewallRule: (body: object) => apiClient.delete("/firewall/rules", { data: body }),
};
