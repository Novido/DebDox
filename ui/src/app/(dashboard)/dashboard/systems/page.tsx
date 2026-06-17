"use client";
import { useQuery } from "@tanstack/react-query";
import { Text, Card, ProgressBar, Spinner, Badge } from "@fluentui/react-components";
import { ServerRegular, RamRegular, StorageRegular } from "@fluentui/react-icons";
import { systemApi, type SystemInfo } from "@/lib/api/system";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <Text size={200} style={{ opacity: 0.6 }}>{label}</Text>
      <Text size={200} weight="semibold">{value}</Text>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ style?: React.CSSProperties }>; title: string; children: React.ReactNode }) {
  return (
    <Card style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Icon style={{ fontSize: 18, color: "#29a6ba" }} />
        <Text size={300} weight="semibold">{title}</Text>
      </div>
      {children}
    </Card>
  );
}

export default function SystemPage() {
  const { data, isLoading } = useQuery<SystemInfo>({
    queryKey: ["system-info"],
    queryFn: systemApi.info,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <>
        <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>System</Text>
        <Spinner label="Loading system information…" />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 16 }}>System</Text>
        <Text style={{ opacity: 0.5 }}>Unable to fetch system information.</Text>
      </>
    );
  }

  const memUsedGb = (data.memory.used_mb / 1024).toFixed(1);
  const memTotalGb = (data.memory.total_mb / 1024).toFixed(1);

  return (
    <>
      <Text size={500} weight="semibold" style={{ display: "block", marginBottom: 4 }}>System</Text>
      <Text size={200} style={{ display: "block", opacity: 0.5, marginBottom: 20 }}>
        Host hardware and OS information
      </Text>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>

        {/* Overview */}
        <SectionCard icon={ServerRegular} title="Overview">
          <StatRow label="Hostname" value={data.hostname} />
          <StatRow label="Operating System" value={data.os} />
          <StatRow label="Kernel" value={data.kernel} />
          <StatRow label="Architecture" value={data.arch} />
          <StatRow label="Uptime" value={formatUptime(data.uptime_seconds)} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Badge color="informative">
              Load: {data.load_avg[0].toFixed(2)} · {data.load_avg[1].toFixed(2)} · {data.load_avg[2].toFixed(2)}
            </Badge>
          </div>
        </SectionCard>

        {/* CPU */}
        <SectionCard icon={RamRegular} title="CPU">
          <StatRow label="Model" value={data.cpu.model} />
          <StatRow label="Cores" value={data.cpu.cores} />
          <StatRow label="Threads" value={data.cpu.threads} />
          {data.cpu.freq_mhz > 0 && (
            <StatRow label="Base Frequency" value={`${(data.cpu.freq_mhz / 1000).toFixed(2)} GHz`} />
          )}
        </SectionCard>

        {/* Memory */}
        <SectionCard icon={StorageRegular} title="Memory">
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Text size={200}>RAM Usage</Text>
              <Text size={200} weight="semibold">
                {memUsedGb} GB / {memTotalGb} GB
              </Text>
            </div>
            <ProgressBar
              value={data.memory.used_pct / 100}
              color={data.memory.used_pct > 90 ? "error" : data.memory.used_pct > 70 ? "warning" : "success"}
              thickness="medium"
            />
            <Text size={100} style={{ display: "block", marginTop: 4, opacity: 0.5 }}>
              {data.memory.used_pct}% used · {(data.memory.available_mb / 1024).toFixed(1)} GB available
            </Text>
          </div>
          <StatRow label="Total" value={`${memTotalGb} GB`} />
          <StatRow label="Used" value={`${memUsedGb} GB`} />
          <StatRow label="Available" value={`${(data.memory.available_mb / 1024).toFixed(1)} GB`} />
        </SectionCard>

      </div>
    </>
  );
}
