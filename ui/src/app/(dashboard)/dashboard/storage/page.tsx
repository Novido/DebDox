"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text, Card, Badge, Button, ProgressBar, Spinner, TabList, Tab,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions,
  DialogContent, Field, Input,
} from "@fluentui/react-components";
import { AddRegular, CameraRegular } from "@fluentui/react-icons";
import { storageApi } from "@/lib/api/storage";

export default function StoragePage() {
  const [tab, setTab] = useState("pools");
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapDataset, setSnapDataset] = useState("");
  const [snapName, setSnapName] = useState("");
  const qc = useQueryClient();

  const { data: pools = [], isLoading: poolsLoading } = useQuery({ queryKey: ["pools"], queryFn: storageApi.pools });
  const { data: datasets = [], isLoading: dsLoading } = useQuery({ queryKey: ["datasets"], queryFn: () => storageApi.datasets() });
  const { data: snapshots = [], isLoading: snapLoading } = useQuery({ queryKey: ["snapshots"], queryFn: () => storageApi.snapshots() });

  const snapMutation = useMutation({
    mutationFn: () => storageApi.createSnapshot(snapDataset, snapName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshots"] }); setSnapOpen(false); },
  });

  const deleteSnapMutation = useMutation({
    mutationFn: storageApi.deleteSnapshot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshots"] }),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text size={500} weight="semibold">Storage & Backup</Text>
        <Button appearance="primary" icon={<CameraRegular />} onClick={() => setSnapOpen(true)}>New Snapshot</Button>
      </div>

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)} style={{ marginBottom: 16 }}>
        <Tab value="pools">ZFS Pools</Tab>
        <Tab value="datasets">Datasets</Tab>
        <Tab value="snapshots">Snapshots</Tab>
        <Tab value="backup">Backup</Tab>
      </TabList>

      {tab === "pools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {poolsLoading ? <Spinner /> : pools.map((p: { name: string; health: string; size: string; allocated: string; capacity: string }) => (
            <Card key={p.name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Text weight="semibold">{p.name}</Text>
                <Badge color={p.health === "ONLINE" ? "success" : "danger"}>{p.health}</Badge>
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: 8 }}>
                <div><Text size={200} style={{ opacity: 0.6 }}>Size</Text><Text size={200} style={{ display: "block" }}>{p.size}</Text></div>
                <div><Text size={200} style={{ opacity: 0.6 }}>Used</Text><Text size={200} style={{ display: "block" }}>{p.allocated}</Text></div>
                <div><Text size={200} style={{ opacity: 0.6 }}>Capacity</Text><Text size={200} style={{ display: "block" }}>{p.capacity}</Text></div>
              </div>
              <ProgressBar value={parseInt(p.capacity) / 100} color={parseInt(p.capacity) > 85 ? "error" : "success"} />
            </Card>
          ))}
        </div>
      )}

      {tab === "datasets" && (
        <div>
          {dsLoading ? <Spinner /> : datasets.map((d: { name: string; type: string; used: string; available: string; mountpoint: string }) => (
            <div key={d.name} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16 }}>
              <Text size={200} style={{ flex: 1 }}>{d.name}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>{d.type}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>Used: {d.used}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>Avail: {d.available}</Text>
            </div>
          ))}
        </div>
      )}

      {tab === "snapshots" && (
        <div>
          {snapLoading ? <Spinner /> : snapshots.map((s: { name: string; used: string; creation: string }) => (
            <div key={s.name} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 16 }}>
              <Text size={200} style={{ flex: 1 }}>{s.name}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>{s.used}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>{s.creation}</Text>
              <Button size="small" appearance="subtle" onClick={() => deleteSnapMutation.mutate(s.name)}>Delete</Button>
            </div>
          ))}
          {snapshots.length === 0 && !snapLoading && <Text style={{ opacity: 0.5 }}>No snapshots</Text>}
        </div>
      )}

      {tab === "backup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 8 }}>BorgBackup</Text>
            <Text size={200} style={{ opacity: 0.6 }}>Configure host backups via API or CLI. Use /api/storage/backup/borg/create to trigger a backup.</Text>
          </Card>
          <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 8 }}>ZFS Replication</Text>
            <Text size={200} style={{ opacity: 0.6 }}>Use /api/storage/replicate to send ZFS snapshots to another DebDox host over SSH.</Text>
          </Card>
        </div>
      )}

      <Dialog open={snapOpen} onOpenChange={(_, d) => setSnapOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Create Snapshot</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Dataset"><Input value={snapDataset} onChange={(_, d) => setSnapDataset(d.value)} placeholder="debdox-pool/vms/myvm" /></Field>
                <Field label="Snapshot name"><Input value={snapName} onChange={(_, d) => setSnapName(d.value)} placeholder="snap-2026-06-16" /></Field>
              </div>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setSnapOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={() => snapMutation.mutate()} disabled={!snapDataset || !snapName || snapMutation.isPending}>
              {snapMutation.isPending ? <Spinner size="tiny" /> : "Create"}
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
}
