import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";
import { Card, PageHeader, Badge, Button, EmptyState } from "@/components/ui";
import type { Visitor } from "@/lib/types";

export default function Visitors() {
  const [query, setQuery] = useState("");

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ["admin", "visitors"],
    queryFn: async () => (await api.get<{ visitors: Visitor[] }>("/visitors")).visitors,
  });

  const filtered = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.flatLabel.toLowerCase().includes(query.toLowerCase()) ||
      (v.company ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const { page, setPage, pageSize, setPageSize, totalPages, totalItems, pageItems } = usePagination(filtered);

  const handleExport = () => {
    exportToCsv(`portl-visitors-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
      { header: "Visitor", value: (v) => v.name },
      { header: "Company", value: (v) => v.company ?? "" },
      { header: "Flat", value: (v) => v.flatLabel },
      { header: "Category", value: (v) => v.category },
      { header: "Requested At", value: (v) => new Date(v.requestedAt).toISOString() },
      { header: "Entry Time", value: (v) => (v.entryTime ? new Date(v.entryTime).toISOString() : "") },
      { header: "Exit Time", value: (v) => (v.exitTime ? new Date(v.exitTime).toISOString() : "") },
      { header: "Status", value: (v) => v.status },
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Visitors"
        subtitle="Entry and exit log across the society"
        action={
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, flat, or company…"
        className="w-full max-w-sm border border-ink-100 rounded-xl px-3.5 py-2.5 mb-5 text-sm outline-none focus:border-ember-400 bg-white"
      />

      {!isLoading && filtered.length === 0 ? (
        <EmptyState title="No visitors match" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 text-xs uppercase tracking-wide border-b border-ink-100">
                <th className="px-5 py-3 font-semibold">Visitor</th>
                <th className="px-5 py-3 font-semibold">Flat</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Requested</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v) => (
                <tr key={v.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink-800">{v.name}</div>
                    {v.company && <div className="text-xs text-ink-400">{v.company}</div>}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{v.flatLabel}</td>
                  <td className="px-5 py-3 text-ink-500 capitalize">{v.category}</td>
                  <td className="px-5 py-3 text-ink-400 text-xs">
                    {new Date(v.requestedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      )}
    </div>
  );
}
