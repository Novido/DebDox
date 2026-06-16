"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge, Text } from "@fluentui/react-components";
import { CubeRegular } from "@fluentui/react-icons";
import { containersApi } from "@/lib/api/containers";
import { WidgetCard } from "./WidgetCard";
import styles from "./ListWidget.module.css";

export function ContainerListWidget() {
  const { data: containers = [], isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: () => containersApi.list(true),
    refetchInterval: 10_000,
  });

  const running = containers.filter((c: { status: string }) => c.status === "running").length;

  return (
    <WidgetCard title={`Containers (${running} running / ${containers.length})`} icon={<CubeRegular />}>
      {isLoading ? <Text>Loading…</Text> : (
        <ul className={styles.list}>
          {containers.slice(0, 8).map((ct: { id: string; name: string; status: string; image: string }) => (
            <li key={ct.id} className={styles.item}>
              <Badge
                size="small"
                color={ct.status === "running" ? "success" : "subtle"}
                className={styles.badge}
              />
              <Text size={200} className={styles.name}>{ct.name}</Text>
              <Text size={100} className={styles.meta}>{ct.image}</Text>
            </li>
          ))}
          {containers.length === 0 && <li><Text size={200} style={{ opacity: 0.5 }}>No containers</Text></li>}
        </ul>
      )}
    </WidgetCard>
  );
}
