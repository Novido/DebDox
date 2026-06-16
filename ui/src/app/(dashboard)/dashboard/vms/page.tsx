"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text, Button, Badge, DataGrid, DataGridHeader, DataGridHeaderCell,
  DataGridBody, DataGridRow, DataGridCell, TableColumnDefinition, createTableColumn,
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, Spinner, Dialog,
  DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
  Field, Input, tokens,
} from "@fluentui/react-components";
import {
  DesktopRegular, AddRegular, PlayRegular, StopRegular,
  ArrowResetRegular, DeleteRegular, CameraRegular, MoreVerticalRegular,
} from "@fluentui/react-icons";
import { vmsApi } from "@/lib/api/vms";

type VM = { id: string; name: string; state: string; vcpus: number; max_memory_mb: number };

const stateColor: Record<string, "success" | "warning" | "danger" | "subtle"> = {
  running: "success", paused: "warning", shutoff: "subtle", crashed: "danger",
};

const columns: TableColumnDefinition<VM>[] = [
  createTableColumn<VM>({ columnId: "name", renderHeaderCell: () => "Name", renderCell: (vm) => vm.name }),
  createTableColumn<VM>({ columnId: "state", renderHeaderCell: () => "State", renderCell: (vm) => <Badge color={stateColor[vm.state] ?? "subtle"}>{vm.state}</Badge> }),
  createTableColumn<VM>({ columnId: "vcpus", renderHeaderCell: () => "vCPUs", renderCell: (vm) => vm.vcpus }),
  createTableColumn<VM>({ columnId: "memory", renderHeaderCell: () => "Memory", renderCell: (vm) => `${vm.max_memory_mb} MB` }),
];

export default function VMsPage() {
  const qc = useQueryClient();
  const { data: vms = [], isLoading } = useQuery({ queryKey: ["vms"], queryFn: vmsApi.list, refetchInterval: 15_000 });
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => vmsApi.action(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vms"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: vmsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vms"] }),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [newVm, setNewVm] = useState({ name: "", vcpus: 2, memory_mb: 2048, disk_gb: 20 });
  const createMutation = useMutation({
    mutationFn: () => vmsApi.create(newVm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vms"] }); setCreateOpen(false); },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text size={500} weight="semibold">Virtual Machines</Text>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setCreateOpen(true)}>New VM</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <DataGrid items={vms} columns={columns} getRowId={(vm) => vm.id} sortable>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<VM>>
            {({ item, rowId }) => (
              <DataGridRow<VM> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}

      <Dialog open={createOpen} onOpenChange={(_, d) => setCreateOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Create Virtual Machine</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Name"><Input value={newVm.name} onChange={(_, d) => setNewVm(v => ({ ...v, name: d.value }))} /></Field>
                <Field label="vCPUs"><Input type="number" value={String(newVm.vcpus)} onChange={(_, d) => setNewVm(v => ({ ...v, vcpus: +d.value }))} /></Field>
                <Field label="Memory (MB)"><Input type="number" value={String(newVm.memory_mb)} onChange={(_, d) => setNewVm(v => ({ ...v, memory_mb: +d.value }))} /></Field>
                <Field label="Disk (GB)"><Input type="number" value={String(newVm.disk_gb)} onChange={(_, d) => setNewVm(v => ({ ...v, disk_gb: +d.value }))} /></Field>
              </div>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newVm.name}>
              {createMutation.isPending ? <Spinner size="tiny" /> : "Create"}
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
}
