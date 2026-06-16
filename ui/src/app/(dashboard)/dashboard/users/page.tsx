"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text, Button, Badge, Spinner, TabList, Tab,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions,
  DialogContent, Field, Input, Select,
} from "@fluentui/react-components";
import { AddRegular, DeleteRegular, KeyRegular } from "@fluentui/react-icons";
import { usersApi } from "@/lib/api/users";

export default function UsersPage() {
  const [tab, setTab] = useState("users");
  const [addOpen, setAddOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "viewer" });
  const [newKey, setNewKey] = useState({ name: "", expires_days: "" });
  const [createdKey, setCreatedKey] = useState("");
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const { data: groups = [] } = useQuery({ queryKey: ["groups"], queryFn: usersApi.groups });
  const { data: apiKeys = [] } = useQuery({ queryKey: ["api-keys"], queryFn: usersApi.apiKeys });

  const createUserMutation = useMutation({
    mutationFn: () => usersApi.create(newUser),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setAddOpen(false); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const createKeyMutation = useMutation({
    mutationFn: () => usersApi.createApiKey({ name: newKey.name, expires_days: newKey.expires_days ? +newKey.expires_days : undefined }),
    onSuccess: (data) => { setCreatedKey(data.key); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: usersApi.deleteApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text size={500} weight="semibold">Users & Access</Text>
        <div style={{ display: "flex", gap: 8 }}>
          <Button appearance="subtle" icon={<KeyRegular />} onClick={() => setKeyOpen(true)}>New API Key</Button>
          <Button appearance="primary" icon={<AddRegular />} onClick={() => setAddOpen(true)}>New User</Button>
        </div>
      </div>

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as string)} style={{ marginBottom: 16 }}>
        <Tab value="users">Users</Tab>
        <Tab value="groups">Groups</Tab>
        <Tab value="keys">API Keys</Tab>
      </TabList>

      {tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading ? <Spinner /> : users.map((u: { id: string; username: string; role: string; is_active: boolean }) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <Badge color={u.is_active ? "success" : "subtle"} />
              <Text style={{ flex: 1 }}>{u.username}</Text>
              <Badge>{u.role}</Badge>
              <Button size="small" icon={<DeleteRegular />} appearance="subtle" onClick={() => deleteUserMutation.mutate(u.id)} />
            </div>
          ))}
        </div>
      )}

      {tab === "groups" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groups.map((g: { id: string; name: string; role: string }) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <Text style={{ flex: 1 }}>{g.name}</Text>
              <Badge>{g.role}</Badge>
            </div>
          ))}
          {groups.length === 0 && <Text style={{ opacity: 0.5 }}>No groups</Text>}
        </div>
      )}

      {tab === "keys" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apiKeys.map((k: { id: string; name: string; created_at: string; expires_at?: string }) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <KeyRegular />
              <Text style={{ flex: 1 }}>{k.name}</Text>
              <Text size={200} style={{ opacity: 0.5 }}>{k.expires_at ? `Expires ${k.expires_at}` : "No expiry"}</Text>
              <Button size="small" icon={<DeleteRegular />} appearance="subtle" onClick={() => deleteKeyMutation.mutate(k.id)} />
            </div>
          ))}
          {apiKeys.length === 0 && <Text style={{ opacity: 0.5 }}>No API keys</Text>}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={addOpen} onOpenChange={(_, d) => setAddOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Create User</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Username"><Input value={newUser.username} onChange={(_, d) => setNewUser(u => ({ ...u, username: d.value }))} /></Field>
                <Field label="Password"><Input type="password" value={newUser.password} onChange={(_, d) => setNewUser(u => ({ ...u, password: d.value }))} /></Field>
                <Field label="Role">
                  <Select value={newUser.role} onChange={(_, d) => setNewUser(u => ({ ...u, role: d.value }))}>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </Field>
              </div>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={() => createUserMutation.mutate()} disabled={!newUser.username || !newUser.password || createUserMutation.isPending}>
              {createUserMutation.isPending ? <Spinner size="tiny" /> : "Create"}
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={keyOpen} onOpenChange={(_, d) => { setKeyOpen(d.open); if (!d.open) setCreatedKey(""); }}>
        <DialogSurface>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogBody>
            <DialogContent>
              {createdKey ? (
                <div style={{ background: "rgba(20,115,133,0.15)", padding: 12, borderRadius: 6 }}>
                  <Text size={200} style={{ display: "block", marginBottom: 8 }}>Copy this key — it will not be shown again:</Text>
                  <Text style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{createdKey}</Text>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Name"><Input value={newKey.name} onChange={(_, d) => setNewKey(k => ({ ...k, name: d.value }))} /></Field>
                  <Field label="Expires in days (empty = no expiry)"><Input type="number" value={newKey.expires_days} onChange={(_, d) => setNewKey(k => ({ ...k, expires_days: d.value }))} /></Field>
                </div>
              )}
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => { setKeyOpen(false); setCreatedKey(""); }}>Close</Button>
            {!createdKey && (
              <Button appearance="primary" onClick={() => createKeyMutation.mutate()} disabled={!newKey.name || createKeyMutation.isPending}>
                {createKeyMutation.isPending ? <Spinner size="tiny" /> : "Create"}
              </Button>
            )}
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
}
