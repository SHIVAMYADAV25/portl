import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { Avatar, EmptyState, LoadingState } from "@/components/Misc";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useAdminPeople, useResendInvite, useSetPersonStatus, useEditResident, useEditGuard } from "@/hooks/useAdminPeople";
import { useTowers, useFlats } from "@/hooks/useSocietyStructure";
import { ApiError } from "@/services/api";
import type { User } from "@/types";

const roleLabel: Record<string, string> = { resident: "Resident", guard: "Security Guard", admin: "Society Admin" };

export default function People() {
  const me = useAuthStore((s) => s.user);
  const { data: people, isLoading } = useAdminPeople();
  const resendInvite = useResendInvite();
  const setStatus = useSetPersonStatus();
  const editResident = useEditResident();
  const editGuard = useEditGuard();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTowerId, setEditTowerId] = useState<string | null>(null);
  const [editFlatId, setEditFlatId] = useState<string | null>(null);
  const [editOwnerOrTenant, setEditOwnerOrTenant] = useState<"owner" | "tenant">("owner");
  const [editGate, setEditGate] = useState("");
  const [editShift, setEditShift] = useState<"morning" | "evening" | "night">("morning");

  const { data: towers } = useTowers();
  const { data: flatsForTower } = useFlats(editTowerId ?? undefined);

  const filtered = useMemo(() => {
    const list = people ?? [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.flatLabel ?? "").toLowerCase().includes(q) ||
        (p.gate ?? "").toLowerCase().includes(q)
    );
  }, [people, query]);

  const { pending, active, disabled } = useMemo(() => {
    return {
      pending: filtered.filter((p) => p.status === "pending_invitation"),
      active: filtered.filter((p) => p.status === "active"),
      disabled: filtered.filter((p) => p.status === "disabled"),
    };
  }, [filtered]);

  const resend = async (userId: string, email?: string) => {
    try {
      const res = await resendInvite.mutateAsync(userId);
      Alert.alert(
        "Invitation resent",
        res.activationLink ? `Share this link — email isn't configured on this server:\n\n${res.activationLink}` : `A fresh link was emailed to ${email}.`
      );
    } catch (err) {
      Alert.alert("Couldn't resend", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  const toggleStatus = (person: User) => {
    const nextStatus = person.status === "disabled" ? "active" : "disabled";
    Alert.alert(
      nextStatus === "disabled" ? "Disable this account?" : "Re-enable this account?",
      nextStatus === "disabled" ? `${person.name} will no longer be able to sign in. Their history is kept.` : `${person.name} will be able to sign in again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextStatus === "disabled" ? "Disable" : "Enable",
          style: nextStatus === "disabled" ? "destructive" : "default",
          onPress: async () => {
            try {
              await setStatus.mutateAsync({ userId: person.id, status: nextStatus });
            } catch (err) {
              Alert.alert("Couldn't update", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
            }
          },
        },
      ]
    );
  };

  const openEdit = (person: User) => {
    setEditing(person);
    setEditName(person.name);
    setEditPhone(person.phone ?? "");
    setEditTowerId(null);
    setEditFlatId(person.flatId ?? null);
    setEditOwnerOrTenant(person.ownerOrTenant ?? "owner");
    setEditGate(person.gate ?? "");
    setEditShift((person.shift as "morning" | "evening" | "night") ?? "morning");
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      if (editing.role === "resident") {
        await editResident.mutateAsync({
          userId: editing.id,
          name: editName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          flatId: editFlatId ?? undefined,
          ownerOrTenant: editOwnerOrTenant,
        });
      } else if (editing.role === "guard") {
        await editGuard.mutateAsync({
          userId: editing.id,
          name: editName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          gate: editGate.trim() || undefined,
          shift: editShift,
        });
      }
      setEditing(null);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  const renderPerson = (person: User, opts: { showResend?: boolean; showToggle?: boolean; showEdit?: boolean }) => (
    <Card key={person.id} className="mb-3">
      <View className="flex-row items-center gap-3">
        <Avatar name={person.name} size={44} />
        <View className="flex-1">
          <Text className="font-body-semibold text-ink800">{person.name}</Text>
          <Text className="text-ink400 text-xs mt-0.5">{person.email}</Text>
          <Text className="text-ink300 text-xs mt-0.5">
            {roleLabel[person.role] ?? person.role}
            {person.flatLabel ? ` · ${person.flatLabel}` : ""}
            {person.gate ? ` · ${person.gate}` : ""}
          </Text>
        </View>
        <StatusBadge status={person.status ?? "active"} />
      </View>
      <View className="flex-row items-center gap-5 mt-3">
        {opts.showEdit && (person.role === "resident" || person.role === "guard") ? (
          <Pressable onPress={() => openEdit(person)} accessibilityRole="button" accessibilityLabel={`Edit ${person.name}`}>
            <Text className="text-ink600 font-body-semibold text-sm">Edit</Text>
          </Pressable>
        ) : null}
        {opts.showResend ? (
          <Pressable onPress={() => resend(person.id, person.email)} accessibilityRole="button" accessibilityLabel="Resend invitation">
            <Text className="text-ember600 font-body-semibold text-sm">Resend invitation</Text>
          </Pressable>
        ) : null}
        {opts.showToggle && person.id !== me?.id ? (
          <Pressable onPress={() => toggleStatus(person)} accessibilityRole="button" accessibilityLabel="Change account status">
            <Text className={`font-body-semibold text-sm ${person.status === "disabled" ? "text-moss600" : "text-rust500"}`}>
              {person.status === "disabled" ? "Re-enable account" : "Disable account"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" className="mr-4">
            <Feather name="arrow-left" size={24} color={colors.ink700} />
          </Pressable>
          <Text className="font-display-medium text-xl text-ink900">People</Text>
        </View>
        <Pressable
          onPress={() => router.push("/invite-person")}
          accessibilityRole="button"
          accessibilityLabel="Invite someone"
          className="flex-row items-center gap-1.5 bg-ember500 px-3.5 py-2 rounded-full active:bg-ember600"
        >
          <Feather name="user-plus" size={15} color="#fff" />
          <Text className="text-white font-body-semibold text-sm">Invite</Text>
        </Pressable>
      </View>

      <View className="px-5 pb-2">
        <View className="flex-row items-center bg-paper border border-ink100 rounded-2xl px-4">
          <Feather name="search" size={16} color={colors.ink300} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, email, or flat"
            placeholderTextColor={colors.ink300}
            className="flex-1 text-ink800 font-body py-3 ml-2"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search">
              <Feather name="x" size={16} color={colors.ink300} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}>
        {isLoading ? (
          <LoadingState label="Loading people…" />
        ) : (people ?? []).length === 0 ? (
          <EmptyState icon="users" title="Nobody's been invited yet" subtitle="Tap Invite to add your first resident, guard, or admin." />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search" title="No matches" subtitle="Try a different name, email, or flat." />
        ) : (
          <>
            {pending.length > 0 ? (
              <View className="mb-2">
                <SectionHeader title={`Pending invitations (${pending.length})`} />
                {pending.map((p) => renderPerson(p, { showResend: true }))}
              </View>
            ) : null}
            <View className="mb-2">
              <SectionHeader title={`Active (${active.length})`} />
              {active.map((p) => renderPerson(p, { showToggle: true, showEdit: true }))}
            </View>
            {disabled.length > 0 ? (
              <View>
                <SectionHeader title={`Disabled (${disabled.length})`} />
                {disabled.map((p) => renderPerson(p, { showToggle: true, showEdit: true }))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">Edit {editing ? roleLabel[editing.role] : ""}</Text>
            <Pressable onPress={() => setEditing(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <Text className="text-ink500 font-body-medium text-sm mb-2">Phone</Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            {editing?.role === "resident" ? (
              <>
                <Text className="text-ink500 font-body-medium text-sm mb-2">Tower</Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {(towers ?? []).map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        setEditTowerId(t.id);
                        setEditFlatId(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Tower ${t.name}`}
                      accessibilityState={{ selected: editTowerId === t.id }}
                      className={`px-4 py-2 rounded-full border ${editTowerId === t.id ? "bg-ink800 border-ink800" : "bg-paper border-ink100"}`}
                    >
                      <Text className={`text-sm font-body-medium ${editTowerId === t.id ? "text-white" : "text-ink600"}`}>{t.name}</Text>
                    </Pressable>
                  ))}
                </View>

                {editTowerId ? (
                  <>
                    <Text className="text-ink500 font-body-medium text-sm mb-2">Flat</Text>
                    <View className="flex-row flex-wrap gap-2 mb-5">
                      {(flatsForTower ?? []).map((f) => (
                        <Pressable
                          key={f.id}
                          onPress={() => setEditFlatId(f.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Flat ${f.label}`}
                          accessibilityState={{ selected: editFlatId === f.id }}
                          className={`px-4 py-2 rounded-full border ${editFlatId === f.id ? "bg-ember500 border-ember500" : "bg-paper border-ink100"}`}
                        >
                          <Text className={`text-sm font-body-medium ${editFlatId === f.id ? "text-white" : "text-ink600"}`}>{f.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text className="text-ink300 text-xs mb-5">Currently {editing.flatLabel ?? "unassigned"} — pick a tower to reassign.</Text>
                )}

                <Text className="text-ink500 font-body-medium text-sm mb-2">Owner or tenant</Text>
                <View className="flex-row gap-2 mb-6">
                  {(["owner", "tenant"] as const).map((o) => (
                    <Pressable
                      key={o}
                      onPress={() => setEditOwnerOrTenant(o)}
                      accessibilityRole="button"
                      accessibilityLabel={o}
                      accessibilityState={{ selected: editOwnerOrTenant === o }}
                      className={`px-4 py-2 rounded-full border capitalize ${editOwnerOrTenant === o ? "bg-ink800 border-ink800" : "bg-paper border-ink100"}`}
                    >
                      <Text className={`text-sm font-body-medium capitalize ${editOwnerOrTenant === o ? "text-white" : "text-ink600"}`}>{o}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {editing?.role === "guard" ? (
              <>
                <Text className="text-ink500 font-body-medium text-sm mb-2">Gate</Text>
                <TextInput
                  value={editGate}
                  onChangeText={setEditGate}
                  placeholder="e.g. Main Gate"
                  placeholderTextColor={colors.ink300}
                  className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
                />
                <Text className="text-ink500 font-body-medium text-sm mb-2">Shift</Text>
                <View className="flex-row gap-2 mb-6">
                  {(["morning", "evening", "night"] as const).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setEditShift(s)}
                      accessibilityRole="button"
                      accessibilityLabel={s}
                      accessibilityState={{ selected: editShift === s }}
                      className={`px-4 py-2 rounded-full border capitalize ${editShift === s ? "bg-ink800 border-ink800" : "bg-paper border-ink100"}`}
                    >
                      <Text className={`text-sm font-body-medium capitalize ${editShift === s ? "text-white" : "text-ink600"}`}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Button
              label="Save changes"
              fullWidth
              size="lg"
              disabled={!editName.trim() || editResident.isPending || editGuard.isPending}
              loading={editResident.isPending || editGuard.isPending}
              onPress={saveEdit}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}