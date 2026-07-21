import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Button } from "@/components/ui";
import type { Notice } from "@/lib/types";

const categories: Notice["category"][] = ["General", "Maintenance", "Event", "Alert"];

export default function Notices() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Notice["category"]>("General");

  const { data: notices = [] } = useQuery({
    queryKey: ["admin", "notices"],
    queryFn: async () => (await api.get<{ notices: Notice[] }>("/notices")).notices,
  });

  const publish = useMutation({
    mutationFn: () => api.post("/notices", { title, body, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notices"] });
      setTitle("");
      setBody("");
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle="Broadcast updates to every resident's device"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New notice"}</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <div className="flex gap-2 mb-4">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === c ? "bg-ink-800 text-white" : "bg-ink-50 text-ink-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. Water supply interruption"
            className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-3 text-sm outline-none focus:border-ember-400"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body"
            rows={4}
            className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-4 text-sm outline-none focus:border-ember-400 resize-none"
          />
          <Button onClick={() => publish.mutate()} disabled={!title.trim() || publish.isPending}>
            {publish.isPending ? "Publishing…" : "Publish to all residents"}
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {notices.map((n) => (
          <Card key={n.id}>
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-ember-50 text-ember-600 mb-2">
              {n.category.toUpperCase()}
            </span>
            <div className="font-semibold text-ink-800 mb-1">{n.title}</div>
            <p className="text-sm text-ink-500">{n.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
