import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Button } from "@/components/ui";
import type { Poll } from "@/lib/types";

export default function Polls() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const { data: polls = [] } = useQuery({
    queryKey: ["admin", "polls"],
    queryFn: async () => (await api.get<{ polls: Poll[] }>("/polls")).polls,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/polls", {
        question,
        options: options.filter((o) => o.trim()),
        closesAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "polls"] });
      setQuestion("");
      setOptions(["", ""]);
      setShowForm(false);
    },
  });

  return (
    <div>
      <PageHeader
        title="Polls"
        subtitle="Community decisions, tallied live"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New poll"}</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-3 text-sm outline-none focus:border-ember-400"
          />
          {options.map((o, i) => (
            <input
              key={i}
              value={o}
              onChange={(e) => setOptions(options.map((x, xi) => (xi === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-3 text-sm outline-none focus:border-ember-400"
            />
          ))}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOptions([...options, ""])}
              className="text-sm text-ember-600 font-semibold hover:underline"
            >
              + Add option
            </button>
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || create.isPending}
          >
            {create.isPending ? "Publishing…" : "Publish poll"}
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {polls.map((p) => (
          <Card key={p.id}>
            <div className="font-semibold text-ink-800 mb-3">{p.question}</div>
            {p.options.map((o) => {
              const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
              return (
                <div key={o.id} className="mb-2.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-600 font-medium">{o.label}</span>
                    <span className="text-ink-400">{pct}% · {o.votes} votes</span>
                  </div>
                  <div className="h-2 bg-ink-50 rounded-full overflow-hidden">
                    <div className="h-2 bg-ember-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-ink-300 mt-2">{p.totalVotes} total votes</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
