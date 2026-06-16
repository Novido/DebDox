"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Text, tokens } from "@fluentui/react-components";
import {
  GridRegular,
  DesktopRegular,
  CubeRegular,
  ChipRegular,
  ServerRegular,
  GpuRegular,
  DatabaseRegular,
  NetworkCheckRegular,
  ShieldCheckmarkRegular,
  PeopleRegular,
  DataBarVerticalRegular,
  SettingsRegular,
  ChevronRightRegular,
} from "@fluentui/react-icons";
import styles from "./Sidebar.module.css";
import type { ComponentType } from "react";

interface NavItem {
  type: "item";
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}

interface NavGroup {
  type: "group";
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: Array<{ label: string; icon: ComponentType<{ className?: string }>; href: string }>;
}

type NavEntry = NavItem | NavGroup;

const NAV: NavEntry[] = [
  { type: "item", label: "Overview", icon: GridRegular, href: "/dashboard" },
  { type: "item", label: "Virtual Machines", icon: DesktopRegular, href: "/dashboard/vms" },
  { type: "item", label: "Containers", icon: CubeRegular, href: "/dashboard/containers" },
  {
    type: "group",
    label: "Systems",
    icon: ChipRegular,
    children: [
      { label: "System", icon: ServerRegular, href: "/dashboard/systems" },
      { label: "GPU", icon: GpuRegular, href: "/dashboard/systems/gpu" },
    ],
  },
  { type: "item", label: "Cluster & Swarm", icon: ServerRegular, href: "/dashboard/cluster" },
  { type: "item", label: "Storage & Backup", icon: DatabaseRegular, href: "/dashboard/storage" },
  { type: "item", label: "Network", icon: NetworkCheckRegular, href: "/dashboard/network" },
  { type: "item", label: "Firewall", icon: ShieldCheckmarkRegular, href: "/dashboard/firewall" },
  { type: "item", label: "Users & Access", icon: PeopleRegular, href: "/dashboard/users" },
  { type: "item", label: "Monitoring", icon: DataBarVerticalRegular, href: "/dashboard/monitoring" },
  { type: "item", label: "Settings", icon: SettingsRegular, href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isGroupActive = (group: NavGroup) =>
    group.children.some(c => pathname === c.href || pathname.startsWith(c.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV.forEach(entry => {
      if (entry.type === "group") {
        initial[entry.label] = entry.children.some(
          c => pathname === c.href || pathname.startsWith(c.href),
        );
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Text size={500} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
          DebDox
        </Text>
      </div>
      <nav className={styles.nav}>
        {NAV.map(entry => {
          if (entry.type === "group") {
            const active = isGroupActive(entry);
            const open = openGroups[entry.label] ?? active;
            const GroupIcon = entry.icon;
            return (
              <div key={entry.label}>
                <div
                  className={`${styles.groupHeader} ${active ? styles.groupActive : ""}`}
                  onClick={() => toggleGroup(entry.label)}
                  role="button"
                  aria-expanded={open}
                >
                  <GroupIcon className={styles.icon} />
                  <span className={styles.label}>{entry.label}</span>
                  <ChevronRightRegular className={`${styles.chevron} ${open ? styles.open : ""}`} />
                </div>
                {open && (
                  <div className={styles.subNav}>
                    {entry.children.map(child => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`${styles.subItem} ${childActive ? styles.active : ""}`}
                        >
                          <ChildIcon className={styles.icon} />
                          <span className={styles.label}>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === entry.href || (entry.href !== "/dashboard" && pathname.startsWith(entry.href));
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              aria-label={entry.label}
            >
              <Icon className={styles.icon} />
              <span className={styles.label}>{entry.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
