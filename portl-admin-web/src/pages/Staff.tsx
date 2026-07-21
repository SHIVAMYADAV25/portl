import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, PageHeader, Button } from "@/components/ui";
import type { StaffMember } from "@/lib/types";

export default function Staff() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => (await api.get<{ staff: StaffMember[] }>("/staff")).staff,
  });

  const create = useMutation({
    mutationFn: () => api.post("/staff", { name, role, phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setName("");
      setRole("");
      setPhone("");
      setShowForm(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });

  return (
    <div>
      <PageHeader
        title="Staff & Vendors"
        subtitle="Service providers visible in every resident's directory"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add staff"}</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role — e.g. Electrician" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="border border-ink-100 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-ember-400" />
          </div>
          <Button onClick={() => create.mutate()} disabled={!name.trim() || !role.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add to directory"}
          </Button>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-400 text-xs uppercase tracking-wide border-b border-ink-100">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Phone</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-800">{s.name}</td>
                <td className="px-5 py-3 text-ink-500">{s.role}</td>
                <td className="px-5 py-3 text-ink-500">{s.phone}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove.mutate(s.id)} className="text-xs text-rust-500 font-semibold hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
