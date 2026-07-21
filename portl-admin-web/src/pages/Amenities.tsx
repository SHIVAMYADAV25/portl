import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Button } from "@/components/ui";
import type { Amenity } from "@/lib/types";

export default function Amenities() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");

  const { data: amenities = [] } = useQuery({
    queryKey: ["admin", "amenities"],
    queryFn: async () => (await api.get<{ amenities: Amenity[] }>("/amenities")).amenities,
  });

  const create = useMutation({
    mutationFn: () => api.post("/amenities", { name, location, openTime, closeTime, icon: "grid", slotMinutes: 60 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "amenities"] });
      setName("");
      setLocation("");
      setShowForm(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/amenities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "amenities"] }),
  });

  return (
    <div>
      <PageHeader
        title="Amenities"
        subtitle="Clubhouse, gym, pool and courts — configure booking windows"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add amenity"}</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name — e.g. Tennis Court"
              className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400"
            />
            <input
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              placeholder="Open (HH:MM)"
              className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400"
            />
            <input
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              placeholder="Close (HH:MM)"
              className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400"
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add amenity"}
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        {amenities.map((a) => (
          <Card key={a.id}>
            <div className="font-semibold text-ink-800 mb-1">{a.name}</div>
            <div className="text-xs text-ink-400 mb-3">{a.location}</div>
            <div className="text-xs text-ink-500 mb-4">
              {a.openTime} – {a.closeTime} · {a.slotMinutes} min slots
            </div>
            <button onClick={() => remove.mutate(a.id)} className="text-xs text-rust-500 font-semibold hover:underline">
              Remove
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
