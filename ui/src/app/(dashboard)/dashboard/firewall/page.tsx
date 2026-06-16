"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Text, Button, Spinner, Field, Input, Select, Card,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
} from "@fluentui/react-components";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import { networksApi } from "@/lib/api/networks";

export default function FirewallPage() {
  const qc = useQueryClient();
  const [table, setTable] = useState("filter");
  const [chain, setChain] = useState("INPUT");
  const [addOpen, setAddOpen] = useState(false);
  const [ruleExpr, setRuleExpr] = useState("");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["fw-rules", table, chain],
    queryFn: () => networksApi.firewallRules(table, chain),
  });

  const addMutation = useMutation({
    mutationFn: () => networksApi.addFirewallRule({ table, chain, rule_expr: ruleExpr }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fw-rules"] }); setAddOpen(false); setRuleExpr(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (handle: number) => networksApi.deleteFirewallRule({ table, chain, handle }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fw-rules"] }),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text size={500} weight="semibold">Firewall (nftables)</Text>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => setAddOpen(true)}>Add Rule</Button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Field label="Table">
          <Select value={table} onChange={(_, d) => setTable(d.value)}>
            <option value="filter">filter</option>
            <option value="nat">nat</option>
            <option value="mangle">mangle</option>
          </Select>
        </Field>
        <Field label="Chain">
          <Select value={chain} onChange={(_, d) => setChain(d.value)}>
            <option value="INPUT">INPUT</option>
            <option value="OUTPUT">OUTPUT</option>
            <option value="FORWARD">FORWARD</option>
          </Select>
        </Field>
      </div>

      {isLoading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.length === 0 && <Text style={{ opacity: 0.5 }}>No rules in {table}/{chain}</Text>}
          {rules.map((rule: { handle: number; expr?: unknown[] }) => (
            <Card key={rule.handle} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text size={200} style={{ opacity: 0.5 }}>Handle {rule.handle}</Text>
                  <Text size={200} style={{ display: "block", fontFamily: "monospace" }}>
                    {JSON.stringify(rule.expr)}
                  </Text>
                </div>
                <Button size="small" icon={<DeleteRegular />} appearance="subtle"
                  onClick={() => deleteMutation.mutate(rule.handle)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(_, d) => setAddOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Add nftables Rule</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Field label={`Rule expression for ${table}/${chain}`}>
                <Input
                  value={ruleExpr}
                  onChange={(_, d) => setRuleExpr(d.value)}
                  placeholder="ip protocol tcp tcp dport 22 accept"
                  style={{ fontFamily: "monospace" }}
                />
              </Field>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={() => addMutation.mutate()} disabled={!ruleExpr || addMutation.isPending}>
              {addMutation.isPending ? <Spinner size="tiny" /> : "Add"}
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </>
  );
}
