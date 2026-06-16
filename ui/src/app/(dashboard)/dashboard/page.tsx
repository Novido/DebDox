"use client";
import { WindowGrid } from "@/components/layout/WindowGrid";
import { ResourceWidget } from "@/components/widgets/ResourceWidget";
import { VMListWidget } from "@/components/widgets/VMListWidget";
import { ContainerListWidget } from "@/components/widgets/ContainerListWidget";
import { ClusterMapWidget } from "@/components/widgets/ClusterMapWidget";
import { MetricsWidget } from "@/components/widgets/MetricsWidget";
import { Text } from "@fluentui/react-components";

const DEFAULT_LAYOUT = [
  { i: "resources", x: 0, y: 0, w: 4, h: 4 },
  { i: "metrics",   x: 4, y: 0, w: 8, h: 4 },
  { i: "vms",       x: 0, y: 4, w: 6, h: 5 },
  { i: "containers",x: 6, y: 4, w: 6, h: 5 },
  { i: "cluster",   x: 0, y: 9, w: 6, h: 4 },
];

export default function DashboardPage() {
  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>
        Overview
      </Text>
      <WindowGrid
        widgetIds={["resources", "metrics", "vms", "containers", "cluster"]}
        defaultLayout={DEFAULT_LAYOUT}
      >
        <ResourceWidget />
        <MetricsWidget />
        <VMListWidget />
        <ContainerListWidget />
        <ClusterMapWidget />
      </WindowGrid>
    </>
  );
}
