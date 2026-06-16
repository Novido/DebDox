"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, Badge, Card, Spinner } from "@fluentui/react-components";
import { clusterApi } from "@/lib/api/cluster";

export default function ClusterPage() {
  const { data: nodes = [], isLoading } = useQuery({ queryKey: ["cluster-nodes"], queryFn: clusterApi.nodes, refetchInterval: 10_000 });
  const { data: swarm } = useQuery({ queryKey: ["swarm"], queryFn: clusterApi.swarm, refetchInterval: 15_000 });
  const { data: services = [] } = useQuery({ queryKey: ["swarm-services"], queryFn: clusterApi.swarmServices, refetchInterval: 15_000 });

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Cluster & Swarm</Text>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <Card style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
          <Text size={200} style={{ opacity: 0.6 }}>Swarm Status</Text>
          <Text size={400} weight="semibold" style={{ display: "block" }}>
            {swarm?.active ? "Active" : "Inactive"}
          </Text>
          {swarm?.active && <Text size={200} style={{ opacity: 0.6 }}>{swarm.nodes} nodes · {swarm.managers} managers</Text>}
        </Card>
        <Card style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
          <Text size={200} style={{ opacity: 0.6 }}>Connected Nodes</Text>
          <Text size={400} weight="semibold" style={{ display: "block" }}>{nodes.length}</Text>
          <Text size={200} style={{ opacity: 0.6 }}>{nodes.filter((n: { online: boolean }) => n.online).length} online</Text>
        </Card>
        <Card style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
          <Text size={200} style={{ opacity: 0.6 }}>Swarm Services</Text>
          <Text size={400} weight="semibold" style={{ display: "block" }}>{services.length}</Text>
        </Card>
      </div>

      <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 12 }}>Nodes</Text>
      {isLoading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nodes.map((node: { node_id: string; name: string; online: boolean; metrics?: { cpu?: number; memory?: number } }) => (
            <Card key={node.node_id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge color={node.online ? "success" : "danger"} />
                <Text weight="semibold">{node.name ?? node.node_id}</Text>
                {node.metrics?.cpu !== undefined && (
                  <Text size={200} style={{ opacity: 0.6 }}>CPU {node.metrics.cpu?.toFixed(0)}%</Text>
                )}
                {node.metrics?.memory !== undefined && (
                  <Text size={200} style={{ opacity: 0.6 }}>MEM {node.metrics.memory?.toFixed(0)}%</Text>
                )}
              </div>
            </Card>
          ))}
          {nodes.length === 0 && <Text style={{ opacity: 0.5 }}>No nodes connected. Install debdox-agent on other hosts.</Text>}
        </div>
      )}

      {services.length > 0 && (
        <>
          <Text size={300} weight="semibold" style={{ display: "block", margin: "20px 0 12px" }}>Swarm Services</Text>
          {services.map((svc: { id: string; name: string; replicas: number }) => (
            <Card key={svc.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text weight="semibold">{svc.name}</Text>
                <Text size={200} style={{ opacity: 0.6 }}>{svc.replicas} replica(s)</Text>
              </div>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
