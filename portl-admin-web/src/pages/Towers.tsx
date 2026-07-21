import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Button, EmptyState } from "@/components/ui";
import type { Tower, Flat } from "@/lib/types";

export default function Towers() {
  const qc = useQueryClient();
  const [showTowerForm, setShowTowerForm] = useState(false);
  const [towerName, setTowerName] = useState("");
  const [flatFormTowerId, setFlatFormTowerId] = useState<string | null>(null);
  const [flatNumber, setFlatNumber] = useState("");
  const [flatLabel, setFlatLabel] = useState("");
  const [flatOwner, setFlatOwner] = useState("");

  const { data: towers = [], isLoading: towersLoading } = useQuery({
    queryKey: ["admin", "towers"],
    queryFn: async () => (await api.get<{ towers: Tower[] }>("/towers")).towers,
  });

  const { data: flats = [] } = useQuery({
    queryKey: ["admin", "flats"],
    queryFn: async () => (await api.get<{ flats: Flat[] }>("/flats")).flats,
  });

  const createTower = useMutation({
    mutationFn: () => api.post("/towers", { name: towerName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "towers"] });
      setTowerName("");
      setShowTowerForm(false);
    },
  });

  const deleteTower = useMutation({
    mutationFn: (id: string) => api.delete(`/towers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "towers"] }),
    onError: (err: Error) => alert(err.message || "Couldn't delete — it may still have flats assigned."),
  });

  const createFlat = useMutation({
    mutationFn: (towerId: string) =>
      api.post("/flats", { towerId, number: flatNumber, label: flatLabel, ownerName: flatOwner || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flats"] });
      setFlatNumber("");
      setFlatLabel("");
      setFlatOwner("");
      setFlatFormTowerId(null);
    },
  });

  const deleteFlat = useMutation({
    mutationFn: (id: string) => api.delete(`/flats/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "flats"] }),
  });

  return (
    <div>
      <PageHeader
        title="Towers & Flats"
        subtitle="The society's physical structure — every flat here is what residents, visitors, and bills reference"
        action={<Button onClick={() => setShowTowerForm((s) => !s)}>{showTowerForm ? "Cancel" : "+ Add tower"}</Button>}
      />

      {showTowerForm && (
        <Card className="mb-6">
          <div className="flex gap-3 mb-4">
            <input
              value={towerName}
              onChange={(e) => setTowerName(e.target.value)}
              placeholder="Tower name — e.g. Tower B"
              className="flex-1 border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400"
            />
          </div>
          <Button onClick={() => createTower.mutate()} disabled={!towerName.trim() || createTower.isPending}>
            {createTower.isPending ? "Adding…" : "Add tower"}
          </Button>
        </Card>
      )}

      {!towersLoading && towers.length === 0 ? (
        <EmptyState title="No towers yet" subtitle="Add a tower to start assigning flats to it." />
      ) : (
        <div className="space-y-4">
          {towers.map((tower) => {
            const towerFlats = flats.filter((f) => f.towerId === tower.id);
            const isAddingFlat = flatFormTowerId === tower.id;
            return (
              <Card key={tower.id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-ink-50">
                  <div>
                    <div className="font-semibold text-ink-800">{tower.name}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{towerFlats.length} flat{towerFlats.length === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setFlatFormTowerId(isAddingFlat ? null : tower.id)}>
                      {isAddingFlat ? "Cancel" : "+ Add flat"}
                    </Button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${tower.name}? This only works if it has no flats.`)) deleteTower.mutate(tower.id);
                      }}
                      className="text-xs text-rust-500 font-semibold hover:underline px-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isAddingFlat && (
                  <div className="px-5 py-4 bg-cream border-b border-ink-50">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <input
                        value={flatNumber}
                        onChange={(e) => setFlatNumber(e.target.value)}
                        placeholder="Number — e.g. 1005"
                        className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400 bg-white"
                      />
                      <input
                        value={flatLabel}
                        onChange={(e) => setFlatLabel(e.target.value)}
                        placeholder="Label — e.g. A-1005"
                        className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400 bg-white"
                      />
                      <input
                        value={flatOwner}
                        onChange={(e) => setFlatOwner(e.target.value)}
                        placeholder="Owner name (optional)"
                        className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400 bg-white"
                      />
                    </div>
                    <Button
                      onClick={() => createFlat.mutate(tower.id)}
                      disabled={!flatNumber.trim() || !flatLabel.trim() || createFlat.isPending}
                    >
                      {createFlat.isPending ? "Adding…" : "Add flat"}
                    </Button>
                  </div>
                )}

                {towerFlats.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-ink-400">No flats in this tower yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-400 text-xs uppercase tracking-wide border-b border-ink-50">
                        <th className="px-5 py-2.5 font-semibold">Label</th>
                        <th className="px-5 py-2.5 font-semibold">Number</th>
                        <th className="px-5 py-2.5 font-semibold">Owner</th>
                        <th className="px-5 py-2.5 font-semibold w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {towerFlats.map((f) => (
                        <tr key={f.id} className="border-b border-ink-50 last:border-0">
                          <td className="px-5 py-2.5 font-medium text-ink-800">{f.label}</td>
                          <td className="px-5 py-2.5 text-ink-500">{f.number}</td>
                          <td className="px-5 py-2.5 text-ink-500">{f.ownerName ?? "—"}</td>
                          <td className="px-5 py-2.5">
                            <button
                              onClick={() => confirm(`Remove flat ${f.label}?`) && deleteFlat.mutate(f.id)}
                              className="text-xs text-rust-500 font-semibold hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
