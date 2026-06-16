"use client";
import { Text, Card, Input, Button, Field, TabList, Tab, Badge } from "@fluentui/react-components";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [tab, setTab] = useState("system");
  const [mcpEnabled, setMcpEnabled] = useState(true);

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Settings</Text>

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)} style={{ marginBottom: 20 }}>
        <Tab value="system">System</Tab>
        <Tab value="cluster">Cluster</Tab>
        <Tab value="mcp">AI / MCP Integration</Tab>
        <Tab value="updates">Updates</Tab>
      </TabList>

      {tab === "system" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 16 }}>General</Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Hostname">
                <Input defaultValue="debdox-master" />
              </Field>
              <Field label="Admin email">
                <Input type="email" placeholder="admin@example.com" />
              </Field>
            </div>
          </Card>

          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Theme</Text>
            <Text size={200} style={{ opacity: 0.6 }}>DebDox uses the Fluent 2 design system. Dark mode is active by default.</Text>
          </Card>
        </div>
      )}

      {tab === "cluster" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 16 }}>Cluster Configuration</Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Node name">
                <Input defaultValue="master" />
              </Field>
              <Field label="Cluster secret">
                <Input type="password" placeholder="••••••••" />
              </Field>
              <Field label="Advertise address (for Swarm)">
                <Input placeholder="192.168.1.100" />
              </Field>
            </div>
            <Button appearance="primary" style={{ marginTop: 16 }}>Save</Button>
          </Card>

          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 8 }}>Add Node</Text>
            <Text size={200} style={{ display: "block", marginBottom: 12, opacity: 0.6 }}>
              Run the following on a new node to join the cluster:
            </Text>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 12 }}>
              curl -sSL https://[MASTER_IP]/install-agent.sh | bash -s -- --master [MASTER_IP] --secret [CLUSTER_SECRET]
            </div>
          </Card>
        </div>
      )}

      {tab === "mcp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text size={300} weight="semibold">MCP Server</Text>
              <Badge color={mcpEnabled ? "success" : "subtle"}>{mcpEnabled ? "Running" : "Stopped"}</Badge>
            </div>
            <Text size={200} style={{ display: "block", marginBottom: 12, opacity: 0.6 }}>
              The DebDox MCP server lets AI assistants (Claude, etc.) control your hypervisor via tool calls.
              Connect using an API key.
            </Text>
            <Field label="MCP Endpoint">
              <Input readOnly value="http://[HOST]:8765/mcp" />
            </Field>
            <Text size={200} style={{ display: "block", marginTop: 16, opacity: 0.6 }}>
              Claude Desktop config example:
            </Text>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 12, marginTop: 8 }}>
              {`{
  "mcpServers": {
    "debdox": {
      "command": "curl",
      "args": ["-s", "http://[HOST]:8765/mcp"],
      "env": { "DEBDOX_API_KEY": "ddx_your_key_here" }
    }
  }
}`}
            </div>
          </Card>

          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 12 }}>Available MCP Tools</Text>
            {[
              "list_vms, start_vm, stop_vm, create_vm",
              "list_containers, run_container, stop_container",
              "list_storage_pools, create_snapshot",
              "get_host_metrics, get_container_metrics",
              "list_nodes, get_node_status",
            ].map((line, i) => (
              <Text key={i} size={200} style={{ display: "block", fontFamily: "monospace", opacity: 0.7, marginBottom: 4 }}>
                • {line}
              </Text>
            ))}
          </Card>
        </div>
      )}

      {tab === "updates" && (
        <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20, maxWidth: 600 }}>
          <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 12 }}>System Updates</Text>
          <Text size={200} style={{ display: "block", marginBottom: 16, opacity: 0.6 }}>
            Package updates, APT source management, and upgrade history have moved to the dedicated Update page.
          </Text>
          <Link href="/dashboard/update" style={{ textDecoration: "none" }}>
            <Button appearance="primary">Go to Update page</Button>
          </Link>
        </Card>
      )}
    </>
  );
}
