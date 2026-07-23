import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAmenities, useCreateAmenity, useUpdateAmenity, useDeleteAmenity } from "@/hooks/useAmenities";
import { ApiError } from "@/services/api";
import type { Amenity } from "@/types";

const icons: (keyof typeof Feather.glyphMap)[] = ["grid", "activity", "droplet", "wind", "sun", "shield", "heart", "star"];

type ModalState = { mode: "create" } | { mode: "edit"; amenity: Amenity } | null;

export default function AdminAmenities() {
  const { data: amenities = [], isLoading } = useAmenities();
  const createAmenity = useCreateAmenity();
  const updateAmenity = useUpdateAmenity();
  const deleteAmenity = useDeleteAmenity();

  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<keyof typeof Feather.glyphMap>("grid");
  const [location, setLocation] = useState("");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [slotMinutes, setSlotMinutes] = useState("60");

  const openCreate = () => {
    setName("");
    setIcon("grid");
    setLocation("");
    setOpenTime("06:00");
    setCloseTime("22:00");
    setSlotMinutes("60");
    setModal({ mode: "create" });
  };

  const openEdit = (a: Amenity) => {
    setName(a.name);
    setIcon((a.icon as keyof typeof Feather.glyphMap) ?? "grid");
    setLocation(a.location ?? "");
    setOpenTime(a.openTime);
    setCloseTime(a.closeTime);
    setSlotMinutes(String(a.slotMinutes));
    setModal({ mode: "edit", amenity: a });
  };

  const save = async () => {
    if (!name.trim() || !modal) return;
    const payload = {
      name: name.trim(),
      icon,
      location: location.trim() || undefined,
      openTime,
      closeTime,
      slotMinutes: Number(slotMinutes) || 60,
    };
    try {
      if (modal.mode === "create") {
        await createAmenity.mutateAsync(payload);
      } else {
        await updateAmenity.mutateAsync({ id: modal.amenity.id, ...payload });
      }
      setModal(null);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
    }
  };

  const remove = (a: Amenity) => {
    Alert.alert(`Remove ${a.name}?`, "Residents will no longer be able to book it. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAmenity.mutateAsync(a.id);
          } catch (err) {
            Alert.alert("Couldn't remove", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" className="mr-4">
            <Feather name="arrow-left" size={22} color={colors.ink700} />
          </Pressable>
          <View>
            <Text className="font-display text-xl text-ink900">Amenities</Text>
            <Text className="text-ink400 text-xs mt-0.5">Add, edit or remove bookable spaces</Text>
          </View>
        </View>
        <Pressable
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Add amenity"
          className="w-11 h-11 rounded-full bg-ember500 items-center justify-center"
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Loading amenities…" />
      ) : amenities.length === 0 ? (
        <EmptyState icon="calendar" title="No amenities yet" subtitle="Tap + to add a clubhouse, gym, pool, or other bookable space." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {amenities.map((a) => (
            <Card key={a.id} className="mb-3 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-ember50 items-center justify-center mr-3">
                <Feather name={(a.icon as keyof typeof Feather.glyphMap) ?? "grid"} size={17} color={colors.ember600} />
              </View>
              <View className="flex-1">
                <Text className="font-body-semibold text-ink800">{a.name}</Text>
                <Text className="text-ink400 text-xs mt-0.5">
                  {a.openTime}–{a.closeTime} · {a.slotMinutes} min slots{a.location ? ` · ${a.location}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => openEdit(a)} accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`} hitSlop={8} className="mr-4">
                <Feather name="edit-2" size={16} color={colors.ink400} />
              </Pressable>
              <Pressable onPress={() => remove(a)} accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`} hitSlop={8}>
                <Feather name="trash-2" size={16} color={colors.rust500} />
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(null)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">{modal?.mode === "edit" ? "Edit amenity" : "Add amenity"}</Text>
            <Pressable onPress={() => setModal(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Clubhouse"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <Text className="text-ink500 font-body-medium text-sm mb-2">Icon</Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {icons.map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${i}`}
                  accessibilityState={{ selected: icon === i }}
                  className={`w-11 h-11 rounded-xl items-center justify-center border ${icon === i ? "bg-ember500 border-ember500" : "bg-paper border-ink100"}`}
                >
                  <Feather name={i} size={18} color={icon === i ? "#fff" : colors.ink500} />
                </Pressable>
              ))}
            </View>

            <Text className="text-ink500 font-body-medium text-sm mb-2">Location (optional)</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Ground floor, Tower B"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <Text className="text-ink500 font-body-medium text-sm mb-2">Opens</Text>
                <TextInput
                  value={openTime}
                  onChangeText={setOpenTime}
                  placeholder="06:00"
                  placeholderTextColor={colors.ink300}
                  className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body"
                />
              </View>
              <View className="flex-1">
                <Text className="text-ink500 font-body-medium text-sm mb-2">Closes</Text>
                <TextInput
                  value={closeTime}
                  onChangeText={setCloseTime}
                  placeholder="22:00"
                  placeholderTextColor={colors.ink300}
                  className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body"
                />
              </View>
            </View>

            <Text className="text-ink500 font-body-medium text-sm mb-2">Slot length (minutes)</Text>
            <TextInput
              value={slotMinutes}
              onChangeText={setSlotMinutes}
              placeholder="60"
              placeholderTextColor={colors.ink300}
              keyboardType="number-pad"
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6"
            />

            <Button
              label={modal?.mode === "edit" ? "Save changes" : "Add amenity"}
              fullWidth
              size="lg"
              disabled={!name.trim() || createAmenity.isPending || updateAmenity.isPending}
              loading={createAmenity.isPending || updateAmenity.isPending}
              onPress={save}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}