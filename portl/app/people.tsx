import { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { Avatar, EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useAdminPeople, useResendInvite, useSetPersonStatus } from "@/hooks/useAdminPeople";
import { ApiError } from "@/services/api";
import type { User } from "@/types";

const roleLabel: Record<string, string> = { resident: "Resident", guard: "Security Guard", admin: "Society Admin" };

export default function People() {
  const me = useAuthStore((s) => s.user);
  const { data: people, isLoading } = useAdminPeople();
  const resendInvite = useResendInvite();
  const setStatus = useSetPersonStatus();

  const { pending, active, disabled } = useMemo(() => {
    const list = people ?? [];
    return {
      pending: list.filter((p) => p.status === "pending_invitation"),
      active: list.filter((p) => p.status === "active"),
      disabled: list.filter((p) => p.status === "disabled"),
    };
  }, [people]);

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

  const renderPerson = (person: User, opts: { showResend?: boolean; showToggle?: boolean }) => (
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
      {opts.showResend ? (
        <Pressable onPress={() => resend(person.id, person.email)} className="mt-3 self-start" accessibilityRole="button" accessibilityLabel="Resend invitation">
          <Text className="text-ember600 font-body-semibold text-sm">Resend invitation</Text>
        </Pressable>
      ) : null}
      {opts.showToggle && person.id !== me?.id ? (
        <Pressable onPress={() => toggleStatus(person)} className="mt-3 self-start" accessibilityRole="button" accessibilityLabel="Change account status">
          <Text className={`font-body-semibold text-sm ${person.status === "disabled" ? "text-moss600" : "text-rust500"}`}>
            {person.status === "disabled" ? "Re-enable account" : "Disable account"}
          </Text>
        </Pressable>
      ) : null}
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}>
        {isLoading ? (
          <LoadingState label="Loading people…" />
        ) : (people ?? []).length === 0 ? (
          <EmptyState icon="users" title="Nobody's been invited yet" subtitle="Tap Invite to add your first resident, guard, or admin." />
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
              {active.map((p) => renderPerson(p, { showToggle: true }))}
            </View>
            {disabled.length > 0 ? (
              <View>
                <SectionHeader title={`Disabled (${disabled.length})`} />
                {disabled.map((p) => renderPerson(p, { showToggle: true }))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}