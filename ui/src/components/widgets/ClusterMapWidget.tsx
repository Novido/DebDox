"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge, Text } from "@fluentui/react-components";
import { ServerRegular } from "@fluentui/react-icons";
import { clusterApi } from "@/lib/api/cluster";
import { WidgetCard } from "./WidgetCard";
import styles from "./ListWidget.module.css";

export function ClusterMapWidget() {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["cluster-nodes"],
    queryFn: clusterApi.nodes,
    refetchInterval: 15_000,
  });

  return (
    <WidgetCard title={`Cluster Nodes (${nodes.length})`} icon={<ServerRegular />}>
      {isLoading ? <Text>Loading…</Text> : (
        <ul className={styles.list}>
          {nodes.map((node: { node_id: string; name: string; online: boolean; metrics?: { cpu?: number } }) => (
            <li key={node.node_id} className={styles.item}>
              <Badge size="small" color={node.online ? "success" : "danger"} className={styles.badge} />
              <Text size={200} className={styles.name}>{node.name ?? node.node_id}</Text>
              {node.metrics?.cpu !== undefined && (
                <Text size={100} className={styles.meta}>CPU {node.metrics.cpu?.toFixed(0)}%</Text>
              )}
            </li>
          ))}
          {nodes.length === 0 && (
            <li><Text size={200} style={{ opacity: 0.5 }}>No nodes connected</Text></li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}
