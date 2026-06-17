"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, Card, ProgressBar, Badge, Spinner, tokens } from "@fluentui/react-components";
import { FlashRegular } from "@fluentui/react-icons";
import { apiClient } from "@/lib/api/client";

export default function GPUPage() {
  const { data: gpus = [], isLoading } = useQuery({
    queryKey: ["gpus"],
    queryFn: () => apiClient.get("/gpu/").then(r => r.data),
    refetchInterval: 5000,
  });
  const { data: vfio = [] } = useQuery({
    queryKey: ["vfio"],
    queryFn: () => apiClient.get("/gpu/vfio").then(r => r.data),
  });

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>GPU Resources</Text>
      {isLoading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {gpus.length === 0 && <Text style={{ opacity: 0.5 }}>No GPUs detected</Text>}
          {gpus.map((gpu: { uuid: string; name: string; vendor: string; utilization_pct: number; memory_used_mb: number; memory_total_mb: number; temperature_c: number; driver_version: string }) => (
            <Card key={gpu.uuid} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <Text size={400} weight="semibold">{gpu.name}</Text>
                  <Text size={200} style={{ display: "block", opacity: 0.6 }}>
                    {gpu.vendor.toUpperCase()} · Driver {gpu.driver_version}
                  </Text>
                </div>
                <Badge>{gpu.temperature_c}°C</Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text size={200}>GPU Utilization</Text>
                    <Text size={200} weight="semibold">{gpu.utilization_pct}%</Text>
                  </div>
                  <ProgressBar value={gpu.utilization_pct / 100} color={gpu.utilization_pct > 85 ? "error" : "success"} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text size={200}>Memory</Text>
                    <Text size={200} weight="semibold">{gpu.memory_used_mb} / {gpu.memory_total_mb} MB</Text>
                  </div>
                  <ProgressBar value={gpu.memory_total_mb > 0 ? gpu.memory_used_mb / gpu.memory_total_mb : 0} />
                </div>
              </div>
              <Text size={100} style={{ display: "block", marginTop: 8, opacity: 0.5 }}>UUID: {gpu.uuid}</Text>
            </Card>
          ))}
          {vfio.length > 0 && (
            <>
              <Text size={300} weight="semibold" style={{ marginTop: 8 }}>VFIO Bound Devices (VM Passthrough)</Text>
              {vfio.map((d: { pci_address: string; vendor_id: string; device_id: string }) => (
                <Card key={d.pci_address} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 12 }}>
                  <Text size={200}>{d.pci_address} · {d.vendor_id}:{d.device_id}</Text>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
