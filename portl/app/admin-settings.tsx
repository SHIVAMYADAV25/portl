import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAdminSociety, useUpdateSociety } from "@/hooks/useAdminSociety";
import { ApiError } from "@/services/api";

export default function AdminSettings() {
  const { data: society, isLoading } = useAdminSociety();
  const updateSociety = useUpdateSociety();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (society) {
      setName(society.name ?? "");
      setAddress(society.address ?? "");
      setLogoUrl(society.logoUrl ?? "");
    }
  }, [society]);

  const dirty =
    !!society && (name.trim() !== (society.name ?? "") || address.trim() !== (society.address ?? "") || logoUrl.trim() !== (society.logoUrl ?? ""));

  const save = async () => {
    if (!name.trim()) return;
    try {
      await updateSociety.mutateAsync({
        name: name.trim(),
        address: address.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      Alert.alert("Saved", "Society settings updated.");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">Society settings</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading settings…" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <View className="items-center mb-6">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={{ width: 72, height: 72, borderRadius: 20 }} />
            ) : (
              <View className="w-[72px] h-[72px] rounded-[20px] bg-ember50 items-center justify-center">
                <Feather name="home" size={28} color={colors.ember500} />
              </View>
            )}
          </View>

          <Text className="text-ink500 font-body-medium text-sm mb-2">Society name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sunrise Residency"
            placeholderTextColor={colors.ink300}
            className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
          />

          <Text className="text-ink500 font-body-medium text-sm mb-2">Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Plot 12, Baner Road, Pune"
            placeholderTextColor={colors.ink300}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5 h-24"
          />

          <Text className="text-ink500 font-body-medium text-sm mb-2">Logo URL</Text>
          <TextInput
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder="https://…"
            placeholderTextColor={colors.ink300}
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-2"
          />
          <Text className="text-ink300 text-xs mb-6">
            Paste a hosted image link (e.g. from Cloudinary). In-app upload can be added later using the existing /uploads endpoint.
          </Text>

          <Button
            label="Save changes"
            fullWidth
            size="lg"
            disabled={!dirty || !name.trim() || updateSociety.isPending}
            loading={updateSociety.isPending}
            onPress={save}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}