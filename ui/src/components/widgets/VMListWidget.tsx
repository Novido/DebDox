"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge, Text, Link } from "@fluentui/react-components";
import { DesktopRegular } from "@fluentui/react-icons";
import { vmsApi } from "@/lib/api/vms";
import { WidgetCard } from "./WidgetCard";
import styles from "./ListWidget.module.css";

const stateColor: Record<string, "success" | "warning" | "danger" | "subtle"> = {
  running: "success",
  paused: "warning",
  shutoff: "subtle",
  crashed: "danger",
};

export function VMListWidget() {
  const { data: vms = [], isLoading } = useQuery({
    queryKey: ["vms"],
    queryFn: vmsApi.list,
    refetchInterval: 15_000,
  });

  return (
    <WidgetCard title={`Virtual Machines (${vms.length})`} icon={<DesktopRegular />}>
      {isLoading ? <Text>Loading…</Text> : (
        <ul className={styles.list}>
          {vms.slice(0, 8).map((vm: { id: string; name: string; state: string; vcpus: number; max_memory_mb: number }) => (
            <li key={vm.id} className={styles.item}>
              <Badge
                size="small"
                color={stateColor[vm.state] ?? "subtle"}
                className={styles.badge}
              />
              <Text size={200} className={styles.name}>{vm.name}</Text>
              <Text size={100} className={styles.meta}>{vm.vcpus}vCPU / {vm.max_memory_mb}MB</Text>
            </li>
          ))}
          {vms.length === 0 && <li><Text size={200} style={{ opacity: 0.5 }}>No VMs</Text></li>}
        </ul>
      )}
    </WidgetCard>
  );
}
