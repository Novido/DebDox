"use client";
import { useEffect, useRef, useCallback } from "react";

export function useWebSocket(
  path: string,
  onMessage: (data: unknown) => void,
  enabled = true
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}${path}`;
    const socket = new WebSocket(url);

    socket.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        onMessage(e.data);
      }
    };

    socket.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current = socket;
  }, [path, onMessage, enabled]);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    ws.current?.send(JSON.stringify(data));
  }, []);

  return { send };
}
