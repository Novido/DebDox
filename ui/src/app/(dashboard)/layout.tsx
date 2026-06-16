"use client";
import { FluentProvider } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { debdoxDarkTheme } from "@/lib/fluent/theme";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import styles from "./dashboard.module.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FluentProvider theme={debdoxDarkTheme}>
      <QueryClientProvider client={queryClient}>
        <div className={styles.shell}>
          <Sidebar />
          <div className={styles.main}>
            <TopBar />
            <main className={styles.content}>{children}</main>
          </div>
        </div>
      </QueryClientProvider>
    </FluentProvider>
  );
}
