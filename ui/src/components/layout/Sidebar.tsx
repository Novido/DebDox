"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Text,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  GridRegular,
  DesktopRegular,
  CubeRegular,
  GpuRegular,
  ServerRegular,
  DatabaseRegular,
  NetworkCheckRegular,
  ShieldCheckmarkRegular,
  PeopleRegular,
  DataBarVerticalRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import styles from "./Sidebar.module.css";

const NAV = [
  { label: "Overview", icon: GridRegular, href: "/dashboard" },
  { label: "Virtual Machines", icon: DesktopRegular, href: "/dashboard/vms" },
  { label: "Containers", icon: CubeRegular, href: "/dashboard/containers" },
  { label: "GPU Resources", icon: GpuRegular, href: "/dashboard/gpu" },
  { label: "Cluster & Swarm", icon: ServerRegular, href: "/dashboard/cluster" },
  { label: "Storage & Backup", icon: DatabaseRegular, href: "/dashboard/storage" },
  { label: "Network", icon: NetworkCheckRegular, href: "/dashboard/network" },
  { label: "Firewall", icon: ShieldCheckmarkRegular, href: "/dashboard/firewall" },
  { label: "Users & Access", icon: PeopleRegular, href: "/dashboard/users" },
  { label: "Monitoring", icon: DataBarVerticalRegular, href: "/dashboard/monitoring" },
  { label: "Settings", icon: SettingsRegular, href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Text size={500} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
          DebDox
        </Text>
      </div>
      <nav className={styles.nav}>
        {NAV.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Tooltip content={label} relationship="label" positioning="after" key={href}>
              <Link
                href={href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
                aria-label={label}
              >
                <Icon className={styles.icon} />
                <span className={styles.label}>{label}</span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
