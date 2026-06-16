import subprocess


def collect() -> list[dict]:
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=gpu_uuid,utilization.gpu,memory.used,memory.total,temperature.gpu",
             "--format=csv,noheader,nounits"],
            text=True, timeout=5,
        )
        gpus = []
        for line in out.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 5:
                gpus.append({
                    "uuid": parts[0],
                    "utilization": int(parts[1]),
                    "memory_used_mb": int(parts[2]),
                    "memory_total_mb": int(parts[3]),
                    "temperature_c": int(parts[4]),
                })
        return gpus
    except Exception:
        return []
