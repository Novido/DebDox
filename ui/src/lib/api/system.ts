import { apiClient } from "./client";

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  uptime_seconds: number;
  load_avg: [number, number, number];
  cpu: {
    model: string;
    cores: number;
    threads: number;
    freq_mhz: number;
  };
  memory: {
    total_mb: number;
    available_mb: number;
    used_mb: number;
    used_pct: number;
  };
}

export const systemApi = {
  info: () => apiClient.get<SystemInfo>("/system/info").then(r => r.data),
};
