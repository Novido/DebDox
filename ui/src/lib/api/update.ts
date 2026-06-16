import { apiClient } from "./client";

export interface UpdateStatus {
  upgradable_count: number;
  security_count: number;
  held_count: number;
  held_packages: string[];
  last_check: string | null;
}

export interface UpgradablePackage {
  name: string;
  suite: string;
  new_version: string;
  arch: string;
  old_version: string;
  is_security: boolean;
}

export interface AptSource {
  filename: string;
  path: string;
  content: string;
  deletable: boolean;
}

export interface CommandResult {
  success: boolean;
  output: string;
  returncode: number;
}

export const updateApi = {
  status: () => apiClient.get<UpdateStatus>("/update/status").then(r => r.data),
  check: () => apiClient.post<CommandResult>("/update/check").then(r => r.data),
  upgradable: () => apiClient.get<UpgradablePackage[]>("/update/upgradable").then(r => r.data),
  upgrade: (full = false) =>
    apiClient.post<CommandResult>(`/update/upgrade?full=${full}`).then(r => r.data),
  sources: () => apiClient.get<AptSource[]>("/update/sources").then(r => r.data),
  saveSource: (filename: string, content: string) =>
    apiClient.put(`/update/sources/${filename}`, { content }).then(r => r.data),
  deleteSource: (filename: string) =>
    apiClient.delete(`/update/sources/${filename}`).then(r => r.data),
  history: (lines = 100) =>
    apiClient.get<{ log: string }>(`/update/history?lines=${lines}`).then(r => r.data),
  dpkgLog: (lines = 100) =>
    apiClient.get<{ log: string }>(`/update/dpkg-log?lines=${lines}`).then(r => r.data),
};
