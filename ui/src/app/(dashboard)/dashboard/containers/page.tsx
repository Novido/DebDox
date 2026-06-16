"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text, Button, Badge, DataGrid, DataGridHeader, DataGridHeaderCell,
  DataGridBody, DataGridRow, DataGridCell, TableColumnDefinition, createTableColumn,
  Spinner, Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions,
  DialogContent, Field, Input,
} from "@fluentui/react-components";
import { CubeRegular, AddRegular } from "@fluentui/react-icons";
import { containersApi } from "@/lib/api/containers";

type Container = { id: string; name: string; status: string; image: string };

const columns: TableColumnDefinition<Container>[] = [
  createTableColumn<Container>({ columnId: "name", renderHeaderCell: () => "Name", renderCell: (c) => c.name }),
  createTableColumn<Container>({ columnId: "image", renderHeaderCell: () => "Image", renderCell: (c) => c.image }),
  createTableColumn<Container>({ columnId: "status", renderHeaderCell: () => "Status", renderCell: (c) => <Badge color={c.status === "running" ? "success" : "subtle"}>{c.status}</Badge> }),
];

export default function ContainersPage() {
  const qc = useQueryClient();
  const { data: containers = [], isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: () => containersApi.list(true),
    refetchInterval: 10_000,
  });
  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => containersApi.action(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [newCt, setNewCt] = useState({ image: "", name: "", gpu_ids: undefined as string[] | undefined });
  const createMutation = useMutation({
    mutationFn: () => containersApi.create(newCt),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["containers"] }); setCreateOpen(false); },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text size={500} weight="semibold">Docker Containers</Text>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setCreateOpen(true)}>New Container</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <DataGrid items={containers} columns={columns} getRowId={(c) => c.id}>
          <DataGridHeader>
            <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
          </DataGridHeader>
          <DataGridBody<Container>>
            {({ item, rowId }) => (
              <DataGridRow<Container> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}

      <Dialog open={createOpen} onOpenChange={(_, d) => setCreateOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Run Container</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Image"><Input value={newCt.image} onChange={(_, d) => setNewCt(c => ({ ...c, image: d.value }))} placeholder="nginx:latest" /></Field>
                <Field label="Name (optional)"><Input value={newCt.name} onChange={(_, d) => setNewCt(c => ({ ...c, name: d.value }))} /></Field>
                <Field label="GPU IDs (comma-separated, or 'all')">
                  <Input
                    placeholder="all  or  GPU-uuid1,GPU-uuid2"
                    onChange={(_, d) => setNewCt(c => ({ ...c, gpu_ids: d.value ? d.value.split(",").map(s => s.trim()) : undefined }))}
                  />
                </Field>
              </div>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newCt.image}>
              {createMutation.isPending ? <Spinner size="tiny" /> : "Run"}
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
}
