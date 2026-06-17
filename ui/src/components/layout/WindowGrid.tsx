"use client";
import { useCallback, useEffect, useState } from "react";
import GridLayout, { type Layout, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { usersApi } from "@/lib/api/users";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Props {
  children: React.ReactNode[];
  widgetIds: string[];
  defaultLayout: LayoutItem[];
}

export function WindowGrid({ children, widgetIds, defaultLayout }: Props) {
  const [layout, setLayout] = useState<LayoutItem[]>(defaultLayout);
  const [width, setWidth] = useState(1200);

  const { data: savedLayout } = useQuery({
    queryKey: ["layout"],
    queryFn: usersApi.getLayout,
  });

  const saveMutation = useMutation({ mutationFn: usersApi.saveLayout });

  useEffect(() => {
    if (savedLayout?.layout?.length) {
      try {
        const parsed = typeof savedLayout.layout === "string"
          ? JSON.parse(savedLayout.layout)
          : savedLayout.layout;
        setLayout(parsed);
      } catch {}
    }
  }, [savedLayout]);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    const el = document.querySelector(".wg-container");
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLayoutChange = useCallback((newLayout: Layout) => {
    const items = [...newLayout] as LayoutItem[];
    setLayout(items);
    saveMutation.mutate(items);
  }, [saveMutation]);

  return (
    <div className="wg-container" style={{ width: "100%" }}>
      <GridLayout
        layout={layout}
        width={width}
        onLayoutChange={onLayoutChange}
        gridConfig={{ cols: 12, rowHeight: 80, margin: [16, 16] as [number, number] }}
        dragConfig={{ enabled: true, handle: ".widget-drag-handle" }}
        resizeConfig={{ enabled: true }}
      >
        {children.map((child, i) => (
          <div key={widgetIds[i]}>
            {child}
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
