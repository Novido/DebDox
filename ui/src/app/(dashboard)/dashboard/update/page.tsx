"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text,
  Card,
  Badge,
  Button,
  Spinner,
  TabList,
  Tab,
  Input,
  Field,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  MessageBar,
  MessageBarBody,
  Tooltip,
  Select,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  ArrowCircleUpRegular,
  ShieldCheckmarkRegular,
  InfoRegular,
  DeleteRegular,
  AddRegular,
  SaveRegular,
  DocumentRegular,
  WarningRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  ClockRegular,
  LockClosedRegular,
} from "@fluentui/react-icons";
import {
  updateApi,
  type UpdateStatus,
  type UpgradablePackage,
  type AptSource,
  type CommandResult,
} from "@/lib/api/update";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TERM_STYLE: React.CSSProperties = {
  background: "#080808",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "14px 16px",
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  fontSize: 12,
  lineHeight: 1.6,
  color: "#c8c8c8",
  overflowY: "auto",
  maxHeight: 380,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function TerminalOutput({ result, command }: { result: CommandResult; command: string }) {
  const icon = result.success
    ? <CheckmarkCircleRegular style={{ color: "#4ec9b0", marginRight: 6 }} />
    : <DismissCircleRegular style={{ color: "#f48771", marginRight: 6 }} />;
  return (
    <div style={TERM_STYLE}>
      <span style={{ color: "#569cd6" }}>$ </span>
      <span style={{ color: "#9cdcfe" }}>{command}</span>
      {"\n\n"}
      {result.output}
      {"\n"}
      <span style={{ display: "inline-flex", alignItems: "center", marginTop: 4 }}>
        {icon}
        <span style={{ color: result.success ? "#4ec9b0" : "#f48771" }}>
          {result.success ? "Done" : `Failed (exit ${result.returncode})`}
        </span>
      </span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString();
}

// ─── Status cards ─────────────────────────────────────────────────────────────

function StatusCards({ status, onRefresh, refreshing }: {
  status: UpdateStatus;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
      <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <ArrowCircleUpRegular style={{ color: "#29a6ba" }} />
          <Text size={200} style={{ opacity: 0.6 }}>Upgradable</Text>
        </div>
        <Text size={600} weight="semibold">{status.upgradable_count}</Text>
        <Text size={100} style={{ display: "block", opacity: 0.4 }}>packages</Text>
      </Card>

      <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <ShieldCheckmarkRegular style={{ color: status.security_count > 0 ? "#f48771" : "#4ec9b0" }} />
          <Text size={200} style={{ opacity: 0.6 }}>Security</Text>
        </div>
        <Text size={600} weight="semibold" style={{ color: status.security_count > 0 ? "#f48771" : undefined }}>
          {status.security_count}
        </Text>
        <Text size={100} style={{ display: "block", opacity: 0.4 }}>updates</Text>
      </Card>

      <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <LockClosedRegular style={{ color: "#dcdcaa" }} />
          <Text size={200} style={{ opacity: 0.6 }}>Held back</Text>
        </div>
        <Text size={600} weight="semibold">{status.held_count}</Text>
        <Text size={100} style={{ display: "block", opacity: 0.4 }}>packages</Text>
      </Card>

      <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <ClockRegular style={{ color: "#29a6ba" }} />
          <Text size={200} style={{ opacity: 0.6 }}>Last check</Text>
        </div>
        <Text size={200} weight="semibold" style={{ display: "block" }}>{formatDate(status.last_check)}</Text>
        <Button
          size="small"
          appearance="transparent"
          icon={refreshing ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
          onClick={onRefresh}
          disabled={refreshing}
          style={{ marginTop: 4, padding: 0 }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </Card>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const queryClient = useQueryClient();
  const [output, setOutput] = useState<{ result: CommandResult; command: string } | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<UpdateStatus>({
    queryKey: ["update-status"],
    queryFn: updateApi.status,
    refetchInterval: 60_000,
  });

  const checkMut = useMutation({
    mutationFn: updateApi.check,
    onSuccess: data => {
      setOutput({ result: data, command: "apt-get update" });
      queryClient.invalidateQueries({ queryKey: ["update-status"] });
      queryClient.invalidateQueries({ queryKey: ["upgradable"] });
    },
  });

  const upgradeMut = useMutation({
    mutationFn: (full: boolean) => updateApi.upgrade(full),
    onSuccess: (data, full) => {
      setOutput({ result: data, command: full ? "apt-get full-upgrade -y" : "apt-get upgrade -y" });
      queryClient.invalidateQueries({ queryKey: ["update-status"] });
      queryClient.invalidateQueries({ queryKey: ["upgradable"] });
    },
  });

  const busy = checkMut.isPending || upgradeMut.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {statusLoading ? (
        <Spinner label="Loading status…" />
      ) : status ? (
        <StatusCards
          status={status}
          onRefresh={() => checkMut.mutate()}
          refreshing={checkMut.isPending}
        />
      ) : null}

      {/* Actions */}
      <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 20 }}>
        <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 6 }}>Actions</Text>
        <Text size={200} style={{ display: "block", opacity: 0.5, marginBottom: 16 }}>
          All operations run non-interactively (<code>DEBIAN_FRONTEND=noninteractive</code>).
          Upgrade and full-upgrade may take several minutes.
        </Text>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            icon={busy && checkMut.isPending ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
            onClick={() => checkMut.mutate()}
            disabled={busy}
          >
            Check for Updates
          </Button>

          <Tooltip
            content="Upgrades packages that can be upgraded without removing or installing new packages."
            relationship="description"
          >
            <Button
              icon={busy && upgradeMut.isPending ? <Spinner size="tiny" /> : <ArrowCircleUpRegular />}
              appearance="primary"
              onClick={() => upgradeMut.mutate(false)}
              disabled={busy}
            >
              Upgrade
            </Button>
          </Tooltip>

          <Tooltip
            content="Full-upgrade may install new packages or remove obsolete ones to satisfy dependencies. Use when upgrade reports held packages."
            relationship="description"
          >
            <Button
              icon={busy && upgradeMut.isPending ? <Spinner size="tiny" /> : <ArrowCircleUpRegular />}
              appearance="secondary"
              onClick={() => upgradeMut.mutate(true)}
              disabled={busy}
            >
              Full Upgrade
            </Button>
          </Tooltip>
        </div>
      </Card>

      {/* Terminal output */}
      {busy && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Spinner size="small" />
          <Text size={200} style={{ opacity: 0.6 }}>Running — this may take a moment…</Text>
        </div>
      )}
      {output && !busy && (
        <div>
          <Text size={200} style={{ display: "block", opacity: 0.5, marginBottom: 6 }}>Output</Text>
          <TerminalOutput result={output.result} command={output.command} />
        </div>
      )}

      {/* Held packages detail */}
      {status && status.held_count > 0 && (
        <MessageBar intent="warning" icon={<WarningRegular />}>
          <MessageBarBody>
            <strong>{status.held_count} held package{status.held_count !== 1 ? "s" : ""}:</strong>{" "}
            {status.held_packages.join(", ")}. These will not be upgraded automatically.
            Use <code>apt-mark unhold &lt;package&gt;</code> to release them.
          </MessageBarBody>
        </MessageBar>
      )}
    </div>
  );
}

// ─── Packages tab ─────────────────────────────────────────────────────────────

function PackagesTab() {
  const [search, setSearch] = useState("");
  const [securityOnly, setSecurityOnly] = useState(false);

  const { data: packages = [], isLoading } = useQuery<UpgradablePackage[]>({
    queryKey: ["upgradable"],
    queryFn: updateApi.upgradable,
    staleTime: 30_000,
  });

  const filtered = packages.filter(p => {
    if (securityOnly && !p.is_security) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const security = packages.filter(p => p.is_security).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Input
          placeholder="Filter packages…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Button
          appearance={securityOnly ? "primary" : "secondary"}
          icon={<ShieldCheckmarkRegular />}
          size="small"
          onClick={() => setSecurityOnly(v => !v)}
        >
          Security only ({security})
        </Button>
        <Text size={200} style={{ opacity: 0.5 }}>
          {filtered.length} of {packages.length} packages
        </Text>
      </div>

      {isLoading ? (
        <Spinner label="Loading packages…" />
      ) : filtered.length === 0 ? (
        <Text style={{ opacity: 0.5 }}>
          {packages.length === 0 ? "No upgradable packages. Run «Check for Updates» first." : "No packages match the filter."}
        </Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 160px 80px 80px",
            gap: 8,
            padding: "6px 12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "6px 6px 0 0",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {["Package", "Current version", "New version", "Arch", ""].map(h => (
              <Text key={h} size={100} weight="semibold" style={{ opacity: 0.5 }}>{h}</Text>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {filtered.map(pkg => (
              <div
                key={pkg.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 160px 80px 80px",
                  gap: 8,
                  padding: "9px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: pkg.is_security ? "rgba(244,135,113,0.04)" : undefined,
                  alignItems: "center",
                }}
              >
                <Text size={200} style={{ fontFamily: "monospace" }}>{pkg.name}</Text>
                <Text size={100} style={{ opacity: 0.6, fontFamily: "monospace" }}>{pkg.old_version}</Text>
                <Text size={100} style={{ fontFamily: "monospace", color: "#4ec9b0" }}>{pkg.new_version}</Text>
                <Text size={100} style={{ opacity: 0.5 }}>{pkg.arch}</Text>
                <div>
                  {pkg.is_security && (
                    <Badge color="danger" icon={<ShieldCheckmarkRegular />} size="small">
                      security
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sources tab ──────────────────────────────────────────────────────────────

const SOURCE_TEMPLATE = `# Debian 13 Trixie
# Format: deb [options] uri suite components
# Example:
deb [signed-by=/usr/share/keyrings/example.gpg] https://repo.example.com/debian trixie main
`;

function AddSourceDialog({ onAdd }: { onAdd: (filename: string, content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState(SOURCE_TEMPLATE);
  const validName = /^[a-zA-Z0-9._-]+\.(list|sources)$/.test(filename);

  const handle = () => {
    onAdd(filename, content);
    setOpen(false);
    setFilename("");
    setContent(SOURCE_TEMPLATE);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button icon={<AddRegular />} size="small">Add source file</Button>
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: 640, width: "95vw" }}>
        <DialogBody>
          <DialogTitle>Add APT Source File</DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                label="Filename"
                hint="Must end in .list or .sources — stored in /etc/apt/sources.list.d/"
                validationState={filename && !validName ? "error" : "none"}
                validationMessage={filename && !validName ? "Invalid filename" : undefined}
              >
                <Input
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="my-repo.list"
                />
              </Field>
              <Field label="Content">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#c8c8c8",
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: 12,
                    resize: "vertical",
                  }}
                />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handle} disabled={!validName || !content.trim()}>
              Add
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function SourcesTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: sources = [], isLoading } = useQuery<AptSource[]>({
    queryKey: ["apt-sources"],
    queryFn: updateApi.sources,
  });

  const selectedSource = sources.find(s => s.filename === selected) ?? null;

  const selectSource = (src: AptSource) => {
    setSelected(src.filename);
    setEditContent(src.content);
    setSaved(false);
    setError(null);
  };

  const saveMut = useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      updateApi.saveSource(filename, content),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["apt-sources"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (filename: string) => updateApi.deleteSource(filename),
    onSuccess: () => {
      setSelected(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["apt-sources"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const addMut = useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      updateApi.saveSource(filename, content),
    onSuccess: (_, { filename }) => {
      queryClient.invalidateQueries({ queryKey: ["apt-sources"] });
      setSelected(filename);
    },
    onError: (e: Error) => setError(e.message),
  });

  const dirty = selectedSource && editContent !== selectedSource.content;

  if (isLoading) return <Spinner label="Loading sources…" />;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* File list */}
      <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <AddSourceDialog onAdd={(f, c) => addMut.mutate({ filename: f, content: c })} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
          {sources.map(src => (
            <button
              key={src.filename}
              onClick={() => selectSource(src)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 6,
                background: selected === src.filename ? "rgba(20,115,133,0.2)" : "rgba(255,255,255,0.03)",
                border: selected === src.filename ? "1px solid rgba(20,115,133,0.4)" : "1px solid rgba(255,255,255,0.05)",
                color: selected === src.filename ? "#29a6ba" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              <DocumentRegular style={{ flexShrink: 0, fontSize: 14 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {src.filename}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {!selectedSource ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, opacity: 0.4 }}>
            <Text size={300}>Select a source file to edit</Text>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text size={200} style={{ fontFamily: "monospace", opacity: 0.7, flex: 1 }}>
                {selectedSource.path}
              </Text>
              {saved && (
                <Badge color="success" icon={<CheckmarkCircleRegular />}>Saved</Badge>
              )}
              {error && (
                <Badge color="danger">{error}</Badge>
              )}
              <Button
                icon={saveMut.isPending ? <Spinner size="tiny" /> : <SaveRegular />}
                appearance="primary"
                size="small"
                disabled={!dirty || saveMut.isPending}
                onClick={() => {
                  setSaved(false);
                  saveMut.mutate({ filename: selectedSource.filename, content: editContent });
                }}
              >
                Save
              </Button>
              {selectedSource.deletable && (
                <Button
                  icon={<DeleteRegular />}
                  appearance="secondary"
                  size="small"
                  onClick={() => {
                    if (confirm(`Delete ${selectedSource.filename}?`)) {
                      deleteMut.mutate(selectedSource.filename);
                    }
                  }}
                >
                  Delete
                </Button>
              )}
            </div>

            {!selectedSource.deletable && (
              <MessageBar intent="info" icon={<InfoRegular />}>
                <MessageBarBody>
                  <code>sources.list</code> is the primary APT sources file.
                  Prefer adding new repos as separate files in <code>sources.list.d/</code>.
                </MessageBarBody>
              </MessageBar>
            )}

            <textarea
              value={editContent}
              onChange={e => { setEditContent(e.target.value); setSaved(false); }}
              spellCheck={false}
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: 420,
                background: "#080808",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "#c8c8c8",
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                fontSize: 13,
                lineHeight: 1.6,
                padding: "14px 16px",
                resize: "vertical",
                outline: "none",
              }}
            />

            <Text size={100} style={{ opacity: 0.35 }}>
              Lines starting with <code>#</code> are comments.
              Format: <code>deb [options] uri suite components</code>
            </Text>
          </>
        )}
      </div>
    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [logType, setLogType] = useState<"apt" | "dpkg">("apt");
  const [lines, setLines] = useState(100);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["log", logType, lines],
    queryFn: () => logType === "apt" ? updateApi.history(lines) : updateApi.dpkgLog(lines),
    staleTime: 10_000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <TabList
          selectedValue={logType}
          onTabSelect={(_, d) => setLogType(d.value as "apt" | "dpkg")}
          size="small"
        >
          <Tab value="apt">APT History</Tab>
          <Tab value="dpkg">dpkg Log</Tab>
        </TabList>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <Text size={200} style={{ opacity: 0.6 }}>Lines:</Text>
          <Select
            value={String(lines)}
            onChange={e => setLines(Number(e.target.value))}
            size="small"
            style={{ width: 90 }}
          >
            {[50, 100, 200, 500].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
          <Button
            icon={isLoading ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
            size="small"
            appearance="subtle"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner label="Loading log…" />
      ) : (
        <div style={{ ...TERM_STYLE, maxHeight: 560 }}>
          {data?.log || "No log data."}
        </div>
      )}

      <Text size={100} style={{ opacity: 0.35 }}>
        {logType === "apt"
          ? "Source: /var/log/apt/history.log"
          : "Source: /var/log/dpkg.log"}
        {" — showing last "}{lines}{" lines"}
      </Text>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UpdatePage() {
  const [tab, setTab] = useState("overview");

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <Text size={500} weight="semibold">Update</Text>
      </div>
      <Text size={200} style={{ display: "block", opacity: 0.5, marginBottom: 20 }}>
        Manage system packages, APT sources, and view update history
      </Text>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as string)}
        style={{ marginBottom: 24 }}
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="packages">Packages</Tab>
        <Tab value="sources">APT Sources</Tab>
        <Tab value="history">History</Tab>
      </TabList>

      {tab === "overview" && <OverviewTab />}
      {tab === "packages" && <PackagesTab />}
      {tab === "sources" && <SourcesTab />}
      {tab === "history" && <HistoryTab />}
    </>
  );
}
