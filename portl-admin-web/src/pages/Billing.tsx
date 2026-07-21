import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";
import { Card, PageHeader, Badge, Button, EmptyState } from "@/components/ui";
import type { Bill } from "@/lib/types";

export default function Billing() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [flatLabel, setFlatLabel] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Bill["status"]>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: bills = [] } = useQuery({
    queryKey: ["admin", "bills"],
    queryFn: async () => (await api.get<{ bills: Bill[] }>("/bills")).bills,
  });

  const create = useMutation({
    mutationFn: () => api.post("/bills", { flatLabel, title, amount: Number(amount), dueDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
      setFlatLabel("");
      setTitle("");
      setAmount("");
      setDueDate("");
      setShowForm(false);
    },
  });

  const markPaid = useMutation({
    mutationFn: (ids: string[]) => api.post<{ ok: true; updated: string[] }>("/bills/mark-paid", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
      setSelected(new Set());
    },
  });

  const totalDue = bills.filter((b) => b.status === "unpaid").reduce((s, b) => s + b.amount, 0);
  const totalCollected = bills.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0);

  const filtered = statusFilter === "all" ? bills : bills.filter((b) => b.status === statusFilter);
  const { page, setPage, pageSize, setPageSize, totalPages, totalItems, pageItems } = usePagination(filtered);

  const selectableOnPage = pageItems.filter((b) => b.status === "unpaid");
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((b) => selected.has(b.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        selectableOnPage.forEach((b) => next.delete(b.id));
      } else {
        selectableOnPage.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const handleExport = () => {
    exportToCsv(`portl-billing-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
      { header: "Flat", value: (b) => b.flatLabel },
      { header: "Title", value: (b) => b.title },
      { header: "Amount", value: (b) => b.amount },
      { header: "Due Date", value: (b) => b.dueDate },
      { header: "Period", value: (b) => b.period ?? "" },
      { header: "Status", value: (b) => b.status },
    ]);
  };

  const filters: ("all" | Bill["status"])[] = ["all", "unpaid", "paid"];

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Maintenance dues across every flat"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
              Export CSV
            </Button>
            <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Create bill"}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-xs text-ink-400 font-semibold mb-1">OUTSTANDING</div>
          <div className="text-2xl font-semibold text-rust-500" style={{ fontFamily: "var(--font-display)" }}>
            ₹{totalDue.toLocaleString("en-IN")}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-ink-400 font-semibold mb-1">COLLECTED</div>
          <div className="text-2xl font-semibold text-moss-600" style={{ fontFamily: "var(--font-display)" }}>
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
        </Card>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <input value={flatLabel} onChange={(e) => setFlatLabel(e.target.value)} placeholder="Flat — e.g. A-1005" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. May Maintenance" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" type="number" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Due date (YYYY-MM-DD)" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
          </div>
          <Button onClick={() => create.mutate()} disabled={!flatLabel || !title || !amount || !dueDate || create.isPending}>
            {create.isPending ? "Creating…" : "Create bill"}
          </Button>
        </Card>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                statusFilter === f ? "bg-ink-800 text-white" : "bg-white border border-ink-100 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-500">{selected.size} selected</span>
            <Button onClick={() => markPaid.mutate(Array.from(selected))} disabled={markPaid.isPending}>
              {markPaid.isPending ? "Marking paid…" : "Mark selected as paid"}
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No bills in this view" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 text-xs uppercase tracking-wide border-b border-ink-100">
                <th className="px-5 py-3 font-semibold w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    disabled={selectableOnPage.length === 0}
                    aria-label="Select all unpaid bills on this page"
                    className="rounded border-ink-200"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Flat</th>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Due</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((b) => (
                <tr key={b.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() => toggleOne(b.id)}
                      disabled={b.status === "paid"}
                      aria-label={`Select bill for ${b.flatLabel}`}
                      className="rounded border-ink-200"
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-ink-800">{b.flatLabel}</td>
                  <td className="px-5 py-3 text-ink-500">{b.title}</td>
                  <td className="px-5 py-3 text-ink-500">₹{b.amount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-ink-400 text-xs">{b.dueDate}</td>
                  <td className="px-5 py-3">
                    <Badge status={b.status} />
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
