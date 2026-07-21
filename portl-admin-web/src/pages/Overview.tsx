import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, PageHeader, Badge } from "@/components/ui";
import type { Complaint, Visitor, Bill } from "@/lib/types";

export default function Overview() {
  const { data: complaints = [] } = useQuery({
    queryKey: ["admin", "complaints"],
    queryFn: async () => (await api.get<{ complaints: Complaint[] }>("/complaints")).complaints,
  });
  const { data: visitors = [] } = useQuery({
    queryKey: ["admin", "visitors"],
    queryFn: async () => (await api.get<{ visitors: Visitor[] }>("/visitors")).visitors,
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["admin", "bills"],
    queryFn: async () => (await api.get<{ bills: Bill[] }>("/bills")).bills,
  });

  const openTickets = complaints.filter((c) => c.status === "open" || c.status === "assigned").length;
  const paidBills = bills.filter((b) => b.status === "paid").length;

  const kpis = [
    { label: "Open tickets", value: openTickets, color: "text-rust-500", bg: "bg-rust-50" },
    { label: "Visitors today", value: visitors.length, color: "text-teal-500", bg: "bg-teal-50" },
    { label: "Dues collected", value: `${paidBills}/${bills.length}`, color: "text-moss-600", bg: "bg-moss-50" },
    { label: "Total residents", value: new Set(visitors.map((v) => v.flatLabel)).size || "—", color: "text-ember-600", bg: "bg-ember-50" },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Cedar Heights — live from the Portl API" />

      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className={`w-9 h-9 rounded-full ${k.bg} flex items-center justify-center mb-3`}>
              <div className={`w-2.5 h-2.5 rounded-full ${k.color.replace("text-", "bg-")}`} />
            </div>
            <div className="text-2xl font-semibold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
              {k.value}
            </div>
            <div className="text-xs text-ink-400 mt-1 font-medium">{k.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-ink-800">Recent tickets</h2>
        <Link to="/complaints" className="text-sm text-ember-600 font-semibold hover:underline">
          View queue →
        </Link>
      </div>
      <Card className="p-0 overflow-hidden">
        {complaints.length === 0 ? (
          <p className="text-ink-400 text-sm p-5">No tickets yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {complaints.slice(0, 5).map((c, i) => (
                <tr key={c.id} className={i > 0 ? "border-t border-ink-50" : ""}>
                  <td className="px-5 py-3 font-medium text-ink-800">{c.title}</td>
                  <td className="px-5 py-3 text-ink-400">{c.flatLabel}</td>
                  <td className="px-5 py-3 text-ink-400">{c.category}</td>
                  <td className="px-5 py-3">
                    <Badge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
