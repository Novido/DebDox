"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FluentProvider,
  Card,
  CardHeader,
  Input,
  Button,
  Label,
  Field,
  Text,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import { LockClosedRegular } from "@fluentui/react-icons";
import { debdoxDarkTheme } from "@/lib/fluent/theme";
import { apiClient } from "@/lib/api/client";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("username", username);
      form.append("password", password);
      const { data } = await apiClient.post("/auth/token", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/dashboard");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FluentProvider theme={debdoxDarkTheme}>
      <div className={styles.container}>
        <Card className={styles.card}>
          <CardHeader
            header={
              <div className={styles.header}>
                <LockClosedRegular fontSize={32} color={tokens.colorBrandForeground1} />
                <div>
                  <Text size={600} weight="semibold">DebDox</Text>
                  <Text size={300} style={{ display: "block", opacity: 0.7 }}>
                    Hypervisor Management Platform
                  </Text>
                </div>
              </div>
            }
          />
          <form onSubmit={handleLogin} className={styles.form}>
            <Field label="Username">
              <Input
                value={username}
                onChange={(_, d) => setUsername(d.value)}
                placeholder="admin"
                autoFocus
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(_, d) => setPassword(d.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</Text>}
            <Button
              type="submit"
              appearance="primary"
              disabled={loading}
              icon={loading ? <Spinner size="tiny" /> : undefined}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </FluentProvider>
  );
}
