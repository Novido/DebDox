def collect() -> list[dict]:
    try:
        import libvirt
        conn = libvirt.openReadOnly("qemu:///system")
        if not conn:
            return []
        vms = []
        for d in conn.listAllDomains():
            info = d.info()
            vms.append({
                "id": d.UUIDString(),
                "name": d.name(),
                "state": info[0],
                "vcpus": info[3],
            })
        conn.close()
        return vms
    except Exception:
        return []
