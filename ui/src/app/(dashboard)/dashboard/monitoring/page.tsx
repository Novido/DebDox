"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, Card, ProgressBar, Spinner, TabList, Tab } from "@fluentui/react-components";
import { useState } from "react";
import { monitoringApi } from "@/lib/api/monitoring";

export default function MonitoringPage() {
  const [tab, setTab] = useState("host");
  const { data: host, isLoading: hostLoading } = useQuery({ queryKey: ["host-metrics"], queryFn: monitoringApi.host, refetchInterval: 10_000 });
  const { data: containers, isLoading: ctLoading } = useQuery({ queryKey: ["container-metrics"], queryFn: monitoringApi.containers, refetchInterval: 15_000 });
  const { data: gpuMetrics } = useQuery({ queryKey: ["gpu-metrics"], queryFn: monitoringApi.gpu, refetchInterval: 10_000 });

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Monitoring</Text>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)} style={{ marginBottom: 16 }}>
        <Tab value="host">Host</Tab>
        <Tab value="containers">Containers</Tab>
        <Tab value="gpu">GPU</Tab>
        <Tab value="grafana">Grafana</Tab>
      </TabList>

      {tab === "host" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {hostLoading ? <Spinner /> : host && (
            <>
              {[
                { label: "CPU Usage", value: host.cpu_pct, color: "brand" },
                { label: "Memory Usage", value: host.memory_pct, color: "brand" },
                { label: "Disk Usage", value: host.disk_pct, color: "brand" },
              ].map(m => (
                <Card key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text size={300}>{m.label}</Text>
                    <Text size={300} weight="semibold">{m.value?.toFixed(1)}%</Text>
                  </div>
                  <ProgressBar value={(m.value ?? 0) / 100} color={(m.value ?? 0) > 85 ? "error" : (m.value ?? 0) > 65 ? "warning" : "success"} thickness="medium" />
                </Card>
              ))}
              {host.load_1m !== undefined && (
                <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
                  <Text size={300}>Load Average (1m)</Text>
                  <Text size={500} weight="semibold" style={{ display: "block" }}>{host.load_1m?.toFixed(2)}</Text>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === "containers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ctLoading ? <Spinner /> : (
            containers?.cpu?.map((c: { labels?: { name?: string }; value?: number }, i: number) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text size={200}>{c.labels?.name ?? "container"}</Text>
                  <Text size={200}>{c.value?.toFixed(1)}% CPU</Text>
                </div>
              </div>
            )) ?? <Text style={{ opacity: 0.5 }}>No data</Text>
          )}
        </div>
      )}

      {tab === "gpu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gpuMetrics?.utilization?.map((g: { labels?: { gpu?: string }; value?: number }, i: number) => (
            <Card key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 14 }}>
              <Text size={200} style={{ display: "block" }}>GPU {g.labels?.gpu}</Text>
              <Text size={300} weight="semibold">{g.value?.toFixed(1)}% utilization</Text>
            </Card>
          )) ?? <Text style={{ opacity: 0.5 }}>No GPU metrics. Ensure libvirt_exporter and DCGM are running.</Text>}
        </div>
      )}

      {tab === "grafana" && (
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden", height: "calc(100vh - 200px)" }}>
          <iframe
            src="http://localhost:3001"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Grafana"
          />
        </div>
      )}
    </>
  );
}
