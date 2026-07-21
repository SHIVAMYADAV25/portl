import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Chip } from "@/components/Badge";
import { colors } from "@/constants/theme";
import { useTowers, useFlats } from "@/hooks/useSocietyStructure";
import { useInviteResident, useInviteGuard, useInviteAdmin } from "@/hooks/useAdminPeople";
import { ApiError } from "@/services/api";

type RoleTab = "resident" | "guard" | "admin";

export default function InvitePerson() {
  const [role, setRole] = useState<RoleTab>("resident");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [towerId, setTowerId] = useState<string | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [ownerOrTenant, setOwnerOrTenant] = useState<"owner" | "tenant">("owner");

  const [gate, setGate] = useState("");
  const [shift, setShift] = useState<"morning" | "evening" | "night">("morning");

  const { data: towers } = useTowers();
  const { data: flats } = useFlats(towerId ?? undefined);

  const inviteResident = useInviteResident();
  const inviteGuard = useInviteGuard();
  const inviteAdmin = useInviteAdmin();
  const submitting = inviteResident.isPending || inviteGuard.isPending || inviteAdmin.isPending;

  const canSubmit = useMemo(() => {
    const base = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 10;
    if (!base) return false;
    if (role === "resident") return !!flatId;
    if (role === "guard") return gate.trim().length > 0;
    return true;
  }, [role, name, email, phone, flatId, gate]);

  const showSentAlert = (activationLink?: string) => {
    Alert.alert(
      "Invitation sent",
      activationLink
        ? `Email isn't configured on this server, so here's the activation link to share manually for testing:\n\n${activationLink}`
        : `An activation email is on its way to ${email}.`,
      [{ text: "Done", onPress: () => router.back() }]
    );
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    try {
      if (role === "resident") {
        const res = await inviteResident.mutateAsync({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), flatId: flatId!, ownerOrTenant });
        showSentAlert(res.activationLink);
      } else if (role === "guard") {
        const res = await inviteGuard.mutateAsync({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), gate: gate.trim(), shift });
        showSentAlert(res.activationLink);
      } else {
        const res = await inviteAdmin.mutateAsync({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() });
        showSentAlert(res.activationLink);
      }
    } catch (err) {
      Alert.alert("Couldn't send invite", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
        <View className="px-6 pt-4 flex-row items-center">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={24} color={colors.ink700} />
          </Pressable>
          <Text className="font-display-medium text-xl text-ink900 ml-4">Invite someone</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row gap-2 mb-6">
            <Chip label="Resident" active={role === "resident"} onPress={() => setRole("resident")} />
            <Chip label="Guard" active={role === "guard"} onPress={() => setRole("guard")} />
            <Chip label="Admin" active={role === "admin"} onPress={() => setRole("admin")} />
          </View>

          <FormField label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
          <FormField label="Email address" value={email} onChangeText={setEmail} placeholder="them@email.com" keyboardType="email-address" autoCapitalize="none" />
          <FormField label="Phone number" value={phone} onChangeText={setPhone} placeholder="98765 43210" keyboardType="phone-pad" />

          {role === "resident" ? (
            <>
              <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2">Tower</Text>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {(towers ?? []).map((t) => (
                  <Chip key={t.id} label={t.name} active={towerId === t.id} onPress={() => { setTowerId(t.id); setFlatId(null); }} />
                ))}
                {(towers ?? []).length === 0 ? <Text className="text-ink300 text-sm">No towers yet — add one from Society structure first.</Text> : null}
              </View>

              {towerId ? (
                <>
                  <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2">Flat</Text>
                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {(flats ?? []).map((f) => (
                      <Chip key={f.id} label={f.label} active={flatId === f.id} onPress={() => setFlatId(f.id)} />
                    ))}
                    {(flats ?? []).length === 0 ? <Text className="text-ink300 text-sm">No flats in this tower yet.</Text> : null}
                  </View>
                </>
              ) : null}

              <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2">Owner or tenant?</Text>
              <View className="flex-row gap-2 mb-2">
                <Chip label="Owner" active={ownerOrTenant === "owner"} onPress={() => setOwnerOrTenant("owner")} />
                <Chip label="Tenant" active={ownerOrTenant === "tenant"} onPress={() => setOwnerOrTenant("tenant")} />
              </View>
            </>
          ) : null}

          {role === "guard" ? (
            <>
              <FormField label="Assigned gate" value={gate} onChangeText={setGate} placeholder="Main Gate" />
              <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2">Shift</Text>
              <View className="flex-row gap-2 mb-2">
                <Chip label="Morning" active={shift === "morning"} onPress={() => setShift("morning")} />
                <Chip label="Evening" active={shift === "evening"} onPress={() => setShift("evening")} />
                <Chip label="Night" active={shift === "night"} onPress={() => setShift("night")} />
              </View>
            </>
          ) : null}

          <View className="flex-1" />
          <Button label="Send invitation" fullWidth size="lg" loading={submitting} disabled={!canSubmit || submitting} onPress={submit} />
          <View className="h-4" />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}