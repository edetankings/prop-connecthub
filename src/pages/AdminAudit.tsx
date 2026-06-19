import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Input } from "@/components/ui/input";

const AdminAudit = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (supabase as any).from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500).then(({ data }: any) => setRows(data || []));
  }, []);

  const filtered = rows.filter((r) => !q || r.action?.toLowerCase().includes(q.toLowerCase()) || JSON.stringify(r.details || {}).toLowerCase().includes(q.toLowerCase()));

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-display text-3xl font-bold mb-4">Audit Log</h1>
        <Input placeholder="Filter by action or details…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr><th className="text-left p-3">When</th><th className="text-left p-3">Action</th><th className="text-left p-3">By</th><th className="text-left p-3">Details</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{r.action}</td>
                  <td className="p-3 font-mono text-xs">{r.user_id?.slice(0, 8)}</td>
                  <td className="p-3"><code className="text-xs">{JSON.stringify(r.details || {})}</code></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};
export default AdminAudit;
