import psutil


def collect() -> dict:
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = psutil.getloadavg()
    return {
        "cpu": cpu,
        "memory": mem.percent,
        "memory_total_mb": mem.total // 1024 // 1024,
        "memory_used_mb": mem.used // 1024 // 1024,
        "disk": disk.percent,
        "disk_total_gb": disk.total // 1024 // 1024 // 1024,
        "disk_used_gb": disk.used // 1024 // 1024 // 1024,
        "load_1m": load[0],
        "load_5m": load[1],
        "load_15m": load[2],
        "net": {
            iface: {
                "bytes_sent": stats.bytes_sent,
                "bytes_recv": stats.bytes_recv,
            }
            for iface, stats in psutil.net_io_counters(pernic=True).items()
        },
    }
