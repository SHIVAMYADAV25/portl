import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";
import { Card, PageHeader, Button, EmptyState } from "@/components/ui";
import type { User } from "@/lib/types";

const roleStyle: Record<string, string> = {
  resident: "bg-ember-50 text-ember-600",
  guard: "bg-teal-50 text-teal-500",
  admin: "bg-ink-100 text-ink-600",
};

export default function Residents() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<{ users: User[] }>("/users")).users,
  });

  const filtered = users.filter((u) => {
    const matchesQuery =
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.phone.includes(query) ||
      (u.flatLabel ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (u.towerName ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const { page, setPage, pageSize, setPageSize, totalPages, totalItems, pageItems } = usePagination(filtered);

  const handleExport = () => {
    exportToCsv(`portl-residents-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
      { header: "Name", value: (u) => u.name },
      { header: "Phone", value: (u) => `+91 ${u.phone}` },
      { header: "Flat / Tower", value: (u) => u.flatLabel ?? u.towerName ?? "" },
      { header: "Role", value: (u) => u.role },
    ]);
  };

  const roleFilters: ("all" | User["role"])[] = ["all", "resident", "guard", "admin"];

  return (
    <div>
      <PageHeader
        title="Residents & Staff"
        subtitle="Everyone with access to Portl for this society"
        action={
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or flat…"
          className="w-full max-w-sm border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400 bg-white"
        />
        <div className="flex gap-2">
          {roleFilters.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                roleFilter === r ? "bg-ink-800 text-white" : "bg-white border border-ink-100 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 text-xs uppercase tracking-wide border-b border-ink-100">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Flat / Tower</th>
                <th className="px-5 py-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink-800">{u.name}</td>
                  <td className="px-5 py-3 text-ink-500">+91 {u.phone}</td>
                  <td className="px-5 py-3 text-ink-500">{u.flatLabel ?? u.towerName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${roleStyle[u.role]}`}>{u.role}</span>
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
