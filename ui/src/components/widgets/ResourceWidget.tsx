"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, ProgressBar, tokens } from "@fluentui/react-components";
import { ServerRegular } from "@fluentui/react-icons";
import { monitoringApi } from "@/lib/api/monitoring";
import { WidgetCard } from "./WidgetCard";
import styles from "./ResourceWidget.module.css";

export function ResourceWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["host-metrics"],
    queryFn: monitoringApi.host,
    refetchInterval: 10_000,
  });

  const metrics = [
    { label: "CPU", value: data?.cpu_pct ?? 0, color: tokens.colorBrandForeground1 },
    { label: "Memory", value: data?.memory_pct ?? 0, color: "#9c89e8" },
    { label: "Disk", value: data?.disk_pct ?? 0, color: "#e8a869" },
  ];

  return (
    <WidgetCard title="Host Resources" icon={<ServerRegular />}>
      {isLoading ? (
        <Text>Loading…</Text>
      ) : (
        <div className={styles.metrics}>
          {metrics.map((m) => (
            <div key={m.label} className={styles.metric}>
              <div className={styles.metricHeader}>
                <Text size={200}>{m.label}</Text>
                <Text size={200} weight="semibold">{m.value?.toFixed(1)}%</Text>
              </div>
              <ProgressBar
                value={(m.value ?? 0) / 100}
                color={m.value > 85 ? "error" : m.value > 65 ? "warning" : "success"}
                thickness="medium"
              />
            </div>
          ))}
          {data?.load_1m !== undefined && (
            <Text size={200} style={{ marginTop: 8, opacity: 0.6 }}>
              Load avg (1m): {data.load_1m?.toFixed(2)}
            </Text>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
