"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text,
  Card,
  Badge,
  Button,
  ProgressBar,
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import {
  FlashRegular,
  LinkRegular,
  LinkDismissRegular,
  InfoRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import { gpuApi, type GpuInfo, type VfioDevice } from "@/lib/api/gpu";

// ─── Vendor helpers ────────────────────────────────────────────────────────────

function vendorColor(vendor: string): string {
  if (vendor === "nvidia") return "#76b900";
  if (vendor === "amd") return "#ed1c24";
  return "rgba(255,255,255,0.4)";
}

function vendorLabel(vendor: string): string {
  if (vendor === "nvidia") return "NVIDIA";
  if (vendor === "amd") return "AMD";
  return "Unknown";
}

// ─── Bind dialog ──────────────────────────────────────────────────────────────

function BindDialog({ gpu, onBind }: { gpu: GpuInfo; onBind: (pciAddress: string, vendorId: string, deviceId: string) => void }) {
  const [vendorId, setVendorId] = useState(gpu.pci_vendor_id || (gpu.vendor === "nvidia" ? "0x10de" : gpu.vendor === "amd" ? "0x1002" : ""));
  const [deviceId, setDeviceId] = useState(gpu.pci_device_id || "");
  const [open, setOpen] = useState(false);

  const handle = () => {
    onBind(gpu.pci_address, vendorId, deviceId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button icon={<LinkRegular />} size="small" appearance="primary">
          Bind to VFIO
        </Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Bind GPU to VFIO</DialogTitle>
          <DialogContent>
            <Text size={200} style={{ display: "block", marginBottom: 16, opacity: 0.7 }}>
              Binding <strong>{gpu.name}</strong> to vfio-pci will detach it from the host driver
              and make it available for VM passthrough. The GPU will be unavailable to the host OS and Docker until unbound.
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="PCI Address">
                <Input value={gpu.pci_address} readOnly />
              </Field>
              <Field label="Vendor ID (hex)">
                <Input
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  placeholder="e.g. 0x10de"
                />
              </Field>
              <Field label="Device ID (hex)">
                <Input
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value)}
                  placeholder="e.g. 0x2684"
                />
              </Field>
              {!deviceId && (
                <MessageBar intent="info" icon={<InfoRegular />}>
                  <MessageBarBody>
                    Find your device ID: <code>lspci -nn -d ::0300</code>
                  </MessageBarBody>
                </MessageBar>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              onClick={handle}
              disabled={!gpu.pci_address || !vendorId || !deviceId}
            >
              Bind
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// ─── GPU card ─────────────────────────────────────────────────────────────────

function GpuCard({
  gpu,
  vfioDevices,
  onBind,
  onUnbind,
}: {
  gpu: GpuInfo;
  vfioDevices: VfioDevice[];
  onBind: (pciAddress: string, vendorId: string, deviceId: string) => void;
  onUnbind: (pciAddress: string) => void;
}) {
  const isBound = vfioDevices.some(d => d.pci_address === gpu.pci_address);

  return (
    <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FlashRegular style={{ fontSize: 22, color: vendorColor(gpu.vendor) }} />
          <div>
            <Text size={400} weight="semibold">{gpu.name}</Text>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <Badge
                style={{
                  background: vendorColor(gpu.vendor) + "22",
                  color: vendorColor(gpu.vendor),
                  border: `1px solid ${vendorColor(gpu.vendor)}44`,
                }}
              >
                {vendorLabel(gpu.vendor)}
              </Badge>
              {isBound && (
                <Badge color="warning">VFIO — VM passthrough active</Badge>
              )}
            </div>
          </div>
        </div>
        {gpu.temperature_c > 0 && (
          <Badge color={gpu.temperature_c > 85 ? "danger" : gpu.temperature_c > 70 ? "warning" : "informative"}>
            {gpu.temperature_c}°C
          </Badge>
        )}
      </div>

      {/* Metrics (when not bound to VFIO) */}
      {!isBound && gpu.memory_total_mb > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text size={200}>GPU Utilization</Text>
              <Text size={200} weight="semibold">{gpu.utilization_pct}%</Text>
            </div>
            <ProgressBar
              value={gpu.utilization_pct / 100}
              color={gpu.utilization_pct > 85 ? "error" : "success"}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text size={200}>VRAM</Text>
              <Text size={200} weight="semibold">{gpu.memory_used_mb} / {gpu.memory_total_mb} MB</Text>
            </div>
            <ProgressBar value={gpu.memory_total_mb > 0 ? gpu.memory_used_mb / gpu.memory_total_mb : 0} />
          </div>
        </div>
      )}

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {gpu.driver_version && (
          <Text size={100} style={{ opacity: 0.5 }}>Driver: {gpu.driver_version}</Text>
        )}
        {gpu.pci_address && (
          <Text size={100} style={{ opacity: 0.5 }}>PCI: {gpu.pci_address}</Text>
        )}
        <Text size={100} style={{ opacity: 0.4 }}>UUID: {gpu.uuid}</Text>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isBound ? (
          <Button
            icon={<LinkDismissRegular />}
            size="small"
            appearance="secondary"
            onClick={() => onUnbind(gpu.pci_address)}
          >
            Unbind from VFIO
          </Button>
        ) : gpu.pci_address ? (
          <BindDialog gpu={gpu} onBind={onBind} />
        ) : (
          <Text size={100} style={{ opacity: 0.5 }}>
            PCI address not detected — VFIO bind unavailable
          </Text>
        )}
      </div>
    </Card>
  );
}

// ─── Docker runtime section ───────────────────────────────────────────────────

function DockerRuntimeSection({ gpus }: { gpus: GpuInfo[] }) {
  const hasNvidia = gpus.some(g => g.vendor === "nvidia");
  const hasAmd = gpus.some(g => g.vendor === "amd");

  return (
    <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 20 }}>
      <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 14 }}>
        Docker GPU Runtime
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {hasNvidia && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Text size={200} weight="semibold" style={{ color: vendorColor("nvidia") }}>NVIDIA Container Toolkit</Text>
              <Text size={100} style={{ display: "block", opacity: 0.5 }}>
                Installed via ISO hook · run containers with <code>--gpus all</code> or <code>--gpus device=UUID</code>
              </Text>
            </div>
            <Badge color="success">Configured</Badge>
          </div>
        )}
        {hasAmd && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Text size={200} weight="semibold" style={{ color: vendorColor("amd") }}>AMD ROCm Docker</Text>
              <Text size={100} style={{ display: "block", opacity: 0.5, marginTop: 2 }}>
                Not pre-configured in DebDox ISO. Install <code>rocm-docker</code> and add your user to the <code>render</code> group, then run with <code>--device /dev/kfd --device /dev/dri</code>
              </Text>
            </div>
            <Badge color="warning" style={{ flexShrink: 0, marginLeft: 12 }}>Manual setup</Badge>
          </div>
        )}
        {!hasNvidia && !hasAmd && (
          <Text size={200} style={{ opacity: 0.5 }}>No NVIDIA or AMD GPUs detected.</Text>
        )}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GpuPassthroughPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: gpus = [], isLoading } = useQuery<GpuInfo[]>({
    queryKey: ["gpus"],
    queryFn: gpuApi.list,
    refetchInterval: 10_000,
  });

  const { data: vfioDevices = [] } = useQuery<VfioDevice[]>({
    queryKey: ["vfio-devices"],
    queryFn: gpuApi.vfioDevices,
    refetchInterval: 10_000,
  });

  const bind = useMutation({
    mutationFn: ({ pciAddress, vendorId, deviceId }: { pciAddress: string; vendorId: string; deviceId: string }) =>
      gpuApi.bindVfio(pciAddress, vendorId, deviceId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["vfio-devices"] });
      queryClient.invalidateQueries({ queryKey: ["gpus"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const unbind = useMutation({
    mutationFn: (pciAddress: string) => gpuApi.unbindVfio(pciAddress),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["vfio-devices"] });
      queryClient.invalidateQueries({ queryKey: ["gpus"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 4 }}>GPU Passthrough</Text>
      <Text size={200} style={{ display: "block", opacity: 0.5, marginBottom: 20 }}>
        Configure VFIO passthrough to VMs and Docker GPU access for NVIDIA and AMD cards
      </Text>

      {error && (
        <MessageBar intent="error" style={{ marginBottom: 16 }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <MessageBar intent="warning" icon={<WarningRegular />} style={{ marginBottom: 20 }}>
        <MessageBarBody>
          VFIO passthrough requires <strong>IOMMU</strong> enabled in BIOS (Intel VT-d or AMD-Vi) and kernel parameters
          <code> intel_iommu=on</code> or <code>amd_iommu=on</code>. Binding a GPU to VFIO detaches it from the host.
        </MessageBarBody>
      </MessageBar>

      {isLoading ? (
        <Spinner label="Detecting GPUs…" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Detected GPUs */}
          <section>
            <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 12 }}>
              Detected GPUs
            </Text>
            {gpus.length === 0 ? (
              <Text style={{ opacity: 0.5 }}>No GPUs detected. Check that nvidia-smi, rocm-smi, or lspci is installed.</Text>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
                {gpus.map(gpu => (
                  <GpuCard
                    key={gpu.uuid}
                    gpu={gpu}
                    vfioDevices={vfioDevices}
                    onBind={(pciAddress, vendorId, deviceId) =>
                      bind.mutate({ pciAddress, vendorId, deviceId })
                    }
                    onUnbind={pciAddress => unbind.mutate(pciAddress)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* VFIO bound devices summary */}
          {vfioDevices.length > 0 && (
            <section>
              <Text size={300} weight="semibold" style={{ display: "block", marginBottom: 12 }}>
                VFIO Bound Devices
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vfioDevices.map(d => (
                  <Card
                    key={d.pci_address}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <Text size={200} weight="semibold">{d.pci_address}</Text>
                        <Text size={100} style={{ display: "block", opacity: 0.5 }}>
                          Vendor {d.vendor_id} · Device {d.device_id}
                        </Text>
                      </div>
                      <Button
                        icon={<LinkDismissRegular />}
                        size="small"
                        appearance="secondary"
                        onClick={() => unbind.mutate(d.pci_address)}
                      >
                        Unbind
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Docker runtime info */}
          <section>
            <DockerRuntimeSection gpus={gpus} />
          </section>

        </div>
      )}
    </>
  );
}
