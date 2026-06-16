"""Execute commands received from master over WebSocket."""
import asyncio
import subprocess


async def execute(command: str, args: dict) -> dict:
    if command == "shell":
        cmd = args.get("cmd", "")
        if not cmd:
            return {"error": "No cmd provided"}
        proc = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return {
            "returncode": proc.returncode,
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
        }

    if command == "docker_action":
        import docker
        client = docker.from_env()
        ct = client.containers.get(args["container_id"])
        getattr(ct, args["action"])()
        return {"status": "ok"}

    return {"error": f"Unknown command: {command}"}
