import { apiClient } from "./client";

export interface GpuInfo {
  uuid: string;
  name: string;
  vendor: "nvidia" | "amd" | "unknown";
  memory_total_mb: number;
  memory_used_mb: number;
  utilization_pct: number;
  temperature_c: number;
  driver_version: string;
  pci_address: string;
  pci_vendor_id: string;
  pci_device_id: string;
}

export interface VfioDevice {
  pci_address: string;
  class: string;
  vendor_id: string;
  device_id: string;
}

export const gpuApi = {
  list: () => apiClient.get<GpuInfo[]>("/gpu/").then(r => r.data),
  vfioDevices: () => apiClient.get<VfioDevice[]>("/gpu/vfio").then(r => r.data),
  bindVfio: (pci_address: string, vendor_id: string, device_id: string) =>
    apiClient.post("/gpu/vfio/bind", { pci_address, vendor_id, device_id }).then(r => r.data),
  unbindVfio: (pci_address: string) =>
    apiClient.post("/gpu/vfio/unbind", { pci_address }).then(r => r.data),
};
