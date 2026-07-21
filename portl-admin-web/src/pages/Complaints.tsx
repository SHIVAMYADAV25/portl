import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Badge, Button, EmptyState } from "@/components/ui";
import type { Complaint, ComplaintStatus } from "@/lib/types";

const nextStatus: Record<ComplaintStatus, ComplaintStatus | null> = {
  open: "assigned",
  assigned: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: null,
};
const nextLabel: Record<ComplaintStatus, string> = {
  open: "Assign",
  assigned: "Start progress",
  in_progress: "Mark resolved",
  resolved: "Close ticket",
  closed: "Closed",
};

export default function Complaints() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | ComplaintStatus>("all");

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["admin", "complaints"],
    queryFn: async () => (await api.get<{ complaints: Complaint[] }>("/complaints")).complaints,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ComplaintStatus }) => api.put(`/complaints/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "complaints"] }),
  });

  const filtered = filter === "all" ? complaints : complaints.filter((c) => c.status === filter);
  const filters: ("all" | ComplaintStatus)[] = ["all", "open", "assigned", "in_progress", "resolved", "closed"];

  return (
    <div>
      <PageHeader title="Tickets" subtitle="Assign, track and close resident complaints" />

      <div className="flex gap-2 mb-5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-ink-800 text-white" : "bg-white border border-ink-100 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState title="No tickets in this view" />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-ink-800">{c.title}</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    {c.flatLabel} · {c.category} · #{c.id.slice(-4).toUpperCase()}
                  </div>
                </div>
                <Badge status={c.status} />
              </div>
              {c.description && <p className="text-sm text-ink-500 mb-3">{c.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-300">{c.assignedTo ? `Assigned to ${c.assignedTo}` : "Unassigned"}</span>
                {nextStatus[c.status] && (
                  <Button variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: nextStatus[c.status]! })}>
                    {nextLabel[c.status]}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
