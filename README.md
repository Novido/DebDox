# DebDox

**A Proxmox-inspired hypervisor platform built on Debian 13 "Trixie" — with Docker as a first-class citizen.**

DebDox is a self-hosted bare-metal hypervisor management platform. Install it from a bootable ISO onto any x86-64 server and get a unified web dashboard to manage virtual machines, Docker containers, GPU resources, cluster nodes, storage, networking, and more.

> **Docker first.** Unlike Proxmox (which focuses on LXC), DebDox treats Docker Engine as a core component — not an afterthought.

---

## Features

| Category | What you get |
|---|---|
| **Hypervisor** | KVM/QEMU with libvirt API, virtio drivers, UEFI/OVMF |
| **Containers** | Docker CE + containerd + runc, overlay2, Docker Swarm |
| **GPU** | NVIDIA Container Toolkit (GPU passthrough to containers) + VFIO passthrough to VMs |
| **Storage** | OpenZFS — snapshots, replication, compression, dedup |
| **Backup** | BorgBackup (host files) + ZFS send/receive (VMs & containers) |
| **Networking** | Linux bridge (vmbr0), VLAN support, Open vSwitch, Docker networks |
| **Firewall** | nftables — per-host, per-VM, per-container rules via UI and API |
| **Cluster** | Master + node architecture, persistent WebSocket agent, Docker Swarm across nodes |
| **Auth** | JWT sessions, bcrypt passwords, RBAC (admin / operator / viewer), API keys |
| **Monitoring** | Prometheus + Grafana + cAdvisor + node_exporter + libvirt_exporter |
| **AI / MCP** | Built-in MCP server — let Claude (or any AI) control your server via tool calls |
| **UI** | Fluent 2 design (Microsoft), dark theme, drag-and-drop customizable dashboard |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  UI — Next.js 15 + Fluent 2  (nginx, static)                 │
├──────────────────────────────────────────────────────────────┤
│  REST API — FastAPI (Python)  + MCP Server                   │
├──────────────────────────────────────────────────────────────┤
│  Cluster layer — debdox-master ←→ debdox-agent (each node)  │
├─────────────────────┬────────────────────────────────────────┤
│  KVM/QEMU · libvirt │  Docker CE · containerd · runc         │
│  OVMF · virtio      │  overlay2 · Swarm · NVIDIA CTK         │
├─────────────────────┴────────────────────────────────────────┤
│  OpenZFS — snapshots · replication · compression             │
├──────────────────────────────────────────────────────────────┤
│  Linux bridge (vmbr0) · OVS · nftables                       │
├──────────────────────────────────────────────────────────────┤
│  Debian 13 "Trixie" (bare-metal)                             │
└──────────────────────────────────────────────────────────────┘
```

All management services (`debdox-api`, `debdox-agent`, `debdox-mcp`) run as **systemd units on the host** — not as containers. The web UI is served by `nginx` (static files + API reverse proxy). The monitoring stack (Prometheus, Grafana, etc.) runs as Docker containers managed by the host.

---

## Project Structure

```
debdox/
│
├── iso-builder/              # Builds the bootable DebDox ISO
│   ├── build.sh              # Entry point — run as root on Debian 13
│   ├── auto/                 # live-build auto scripts
│   └── config/
│       ├── package-lists/    # Packages baked into the ISO
│       ├── hooks/chroot/     # Install scripts (KVM, Docker, ZFS, GPU…)
│       ├── includes.chroot/  # Files copied directly into the rootfs
│       └── preseed/          # Unattended install configuration
│
├── api/                      # DebDox REST API (Python / FastAPI)
│   └── src/
│       ├── auth/             # JWT, bcrypt, RBAC, API keys
│       ├── routers/          # vms, containers, storage, network, firewall, gpu, cluster…
│       ├── services/         # libvirt, docker, zfs, nftables, backup, gpu, cluster
│       └── models/           # SQLAlchemy models (User, Group, APIKey, UserLayout)
│
├── ui/                       # Web dashboard (Next.js 15, Fluent 2)
│   └── src/
│       ├── app/(auth)/       # Login page
│       ├── app/(dashboard)/  # All dashboard pages
│       ├── components/
│       │   ├── layout/       # Sidebar, TopBar, drag-drop WindowGrid
│       │   └── widgets/      # ResourceWidget, VMListWidget, MetricsWidget…
│       └── lib/api/          # Typed API clients for each domain
│
├── agent/                    # Node agent (runs on every cluster node)
│   └── src/
│       ├── collectors/       # host, docker, vms, gpu metrics
│       ├── executor.py       # Executes commands from master
│       └── agent.py          # WebSocket loop → master
│
├── mcp/                      # MCP server for AI integration
│   └── src/
│       ├── server.py         # MCP entry point (stdio transport)
│       └── tools/            # list_vms, run_container, get_host_metrics…
│
├── monitoring/               # Monitoring stack (Docker Compose)
│   ├── docker-compose.yml    # Prometheus, Grafana, cAdvisor, node_exporter, Portainer
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── rules/alerts.yml
│   └── grafana/dashboards/
│
└── systemd/                  # systemd unit files for all DebDox services
```

---

## Dashboard

The web UI is built with **[Fluent 2](https://fluent2.microsoft.design/)** (Microsoft's design system) using `@fluentui/react-components`. The dashboard is fully customizable — drag, resize, and rearrange widgets to suit your workflow.

### Menu structure

```
Overview            ← Drag-and-drop widget dashboard (saved per user)
├── Compute
│   ├── Virtual Machines
│   ├── Containers
│   └── GPU Resources
├── Cluster & Swarm ← Multi-node management, Docker Swarm
├── Storage & Backup← ZFS pools, datasets, snapshots, BorgBackup
├── Network         ← Linux bridges, VLANs, Docker networks
├── Firewall        ← nftables rules (host, per-VM, per-container)
├── Users & Access  ← Users, groups, roles, API keys
├── Monitoring      ← Live metrics + embedded Grafana
└── Settings
    ├── System
    ├── Cluster
    └── AI / MCP Integration
```

---

## API & MCP

### REST API

The API is auto-documented at `http://[HOST]:8080/api/docs` (OpenAPI / Swagger).

Authenticate with JWT (`POST /api/auth/token`) or an API key (`X-API-Key` header).

### MCP Server (AI Integration)

DebDox ships a built-in [Model Context Protocol](https://modelcontextprotocol.io/) server. Connect Claude Desktop (or any MCP-compatible AI) to control your server:

```json
{
  "mcpServers": {
    "debdox": {
      "command": "curl",
      "args": ["-s", "http://YOUR_HOST:8765/mcp"],
      "env": {
        "DEBDOX_API_KEY": "ddx_your_api_key"
      }
    }
  }
}
```

Available tools:

| Tool | Description |
|---|---|
| `list_vms` | List all KVM VMs with status |
| `start_vm` / `stop_vm` | Start or stop a VM |
| `list_containers` | List all Docker containers |
| `inspect_container` | Full container config, mounts, ports |
| `run_container` | Start a new container (with optional GPU) |
| `start_container` / `stop_container` / `restart_container` | Lifecycle control |
| `remove_container` | Remove a container (force flag supported) |
| `exec_in_container` | **Run a command inside a running container and get output** |
| `get_container_logs` | Tail container logs |
| `get_host_metrics` | CPU / RAM / disk for the host |
| `list_storage_pools` | List ZFS pools |
| `create_snapshot` | Take a ZFS snapshot |
| `list_nodes` | List cluster nodes |
| `get_swarm_status` | Docker Swarm state |

---

## Default Credentials

| Service | Username | Password | Change via |
|---|---|---|---|
| DebDox UI | `admin` | `DebDox!Change` | `DEBDOX_ADMIN_PASSWORD` env var |
| Grafana | `admin` | `debdox` | `GRAFANA_PASSWORD` env var |

**Change these before exposing to a network.**

---

## Cluster Setup

1. Install DebDox ISO on the master node
2. On each additional node, install the agent:

```bash
curl -sSL https://[MASTER_IP]/install-agent.sh | bash -s -- \
  --master [MASTER_IP] \
  --secret [CLUSTER_SECRET]
```

3. Nodes appear in **Cluster → Nodes** in the dashboard
4. Initialize Docker Swarm from **Cluster → Swarm → Init**

---

## Tech Stack

| Component | Technology |
|---|---|
| Base OS | Debian 13 "Trixie" |
| Hypervisor | KVM/QEMU 9.x + libvirt 10.x + OVMF |
| Containers | Docker CE + containerd + runc |
| Orchestration | Docker Swarm |
| Storage | OpenZFS 2.x |
| Backup | BorgBackup + ZFS send/receive |
| GPU | NVIDIA Container Toolkit + VFIO |
| API | Python 3.12 + FastAPI + SQLite/PostgreSQL |
| UI | Next.js 15 + @fluentui/react-components |
| Monitoring | Prometheus + Grafana + cAdvisor |
| Auth | JWT (python-jose) + bcrypt + RBAC |
| AI/MCP | Python MCP SDK |

---

## License

MIT — see [LICENSE](LICENSE)
