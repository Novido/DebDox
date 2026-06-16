"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, Card, Badge, Spinner, TabList, Tab } from "@fluentui/react-components";
import { useState } from "react";
import { networksApi } from "@/lib/api/networks";

export default function NetworkPage() {
  const [tab, setTab] = useState("bridges");
  const { data: bridges = [], isLoading: bridgesLoading } = useQuery({ queryKey: ["bridges"], queryFn: networksApi.bridges });
  const { data: dockerNets = [], isLoading: dockerLoading } = useQuery({ queryKey: ["docker-networks"], queryFn: networksApi.dockerNetworks });

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Network</Text>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)} style={{ marginBottom: 16 }}>
        <Tab value="bridges">Linux Bridges</Tab>
        <Tab value="docker">Docker Networks</Tab>
      </TabList>

      {tab === "bridges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bridgesLoading ? <Spinner /> : bridges.map((b: { name: string; state: string; addresses: string[]; mac: string }) => (
            <Card key={b.name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge color={b.state === "UP" ? "success" : "subtle"}>{b.state}</Badge>
                <Text weight="semibold">{b.name}</Text>
                <Text size={200} style={{ opacity: 0.5 }}>{b.addresses?.join(", ")}</Text>
                <Text size={200} style={{ opacity: 0.4, marginLeft: "auto" }}>{b.mac}</Text>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "docker" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dockerLoading ? <Spinner /> : dockerNets.map((n: { id: string; name: string; driver: string; scope: string }) => (
            <Card key={n.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Text weight="semibold">{n.name}</Text>
                <Badge>{n.driver}</Badge>
                <Text size={200} style={{ opacity: 0.5 }}>{n.scope}</Text>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
