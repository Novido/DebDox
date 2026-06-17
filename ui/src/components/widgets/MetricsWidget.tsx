"use client";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@fluentui/react-components";
import { DataBarVerticalRegular } from "@fluentui/react-icons";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { monitoringApi } from "@/lib/api/monitoring";
import { WidgetCard } from "./WidgetCard";
import { useState, useEffect } from "react";

type DataPoint = { time: string; cpu: number; memory: number };

export function MetricsWidget() {
  const [history, setHistory] = useState<DataPoint[]>([]);

  const { data } = useQuery({
    queryKey: ["host-metrics-chart"],
    queryFn: monitoringApi.host,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!data) return;
    const point: DataPoint = {
      time: new Date().toLocaleTimeString(),
      cpu: parseFloat((data.cpu_pct ?? 0).toFixed(1)),
      memory: parseFloat((data.memory_pct ?? 0).toFixed(1)),
    };
    setHistory((h) => [...h.slice(-29), point]);
  }, [data]);

  return (
    <WidgetCard title="Live Metrics" icon={<DataBarVerticalRegular />}>
      {history.length < 2 ? (
        <Text size={200} style={{ opacity: 0.5 }}>Collecting data…</Text>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#29a6ba" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#29a6ba" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9c89e8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#9c89e8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
            <Tooltip
              contentStyle={{ background: "#1a2332", border: "none", borderRadius: 6, fontSize: 12 }}
              formatter={(val) => `${val}%`}
            />
            <Area type="monotone" dataKey="cpu" stroke="#29a6ba" fill="url(#cpu)" strokeWidth={1.5} dot={false} name="CPU" />
            <Area type="monotone" dataKey="memory" stroke="#9c89e8" fill="url(#mem)" strokeWidth={1.5} dot={false} name="Memory" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}
