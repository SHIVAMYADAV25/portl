import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import {
  useTowers,
  useAllFlats,
  useCreateTower,
  useUpdateTower,
  useDeleteTower,
  useCreateFlat,
  useUpdateFlat,
  useDeleteFlat,
  type Tower,
  type Flat,
} from "@/hooks/useSocietyStructure";
import { ApiError } from "@/services/api";

type TowerModalState = { mode: "create" } | { mode: "edit"; tower: Tower } | null;
type FlatModalState = { mode: "create"; towerId: string } | { mode: "edit"; flat: Flat } | null;

export default function SocietySetup() {
  const { data: towers = [], isLoading: towersLoading } = useTowers();
  const towerIds = towers.map((t) => t.id);
  const { data: flats = [], isLoading: flatsLoading } = useAllFlats(towerIds);

  const createTower = useCreateTower();
  const updateTower = useUpdateTower();
  const deleteTower = useDeleteTower();
  const createFlat = useCreateFlat();
  const updateFlat = useUpdateFlat();
  const deleteFlat = useDeleteFlat();

  const [expandedTower, setExpandedTower] = useState<string | null>(null);
  const [towerModal, setTowerModal] = useState<TowerModalState>(null);
  const [flatModal, setFlatModal] = useState<FlatModalState>(null);
  const [towerName, setTowerName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [flatLabel, setFlatLabel] = useState("");
  const [flatOwner, setFlatOwner] = useState("");

  const isLoading = towersLoading || flatsLoading;

  const openCreateTower = () => {
    setTowerName("");
    setTowerModal({ mode: "create" });
  };
  const openEditTower = (tower: Tower) => {
    setTowerName(tower.name);
    setTowerModal({ mode: "edit", tower });
  };
  const openCreateFlat = (towerId: string) => {
    setFlatNumber("");
    setFlatLabel("");
    setFlatOwner("");
    setFlatModal({ mode: "create", towerId });
  };
  const openEditFlat = (flat: Flat) => {
    setFlatNumber(flat.number);
    setFlatLabel(flat.label);
    setFlatOwner(flat.ownerName ?? "");
    setFlatModal({ mode: "edit", flat });
  };

  const showError = (err: unknown) =>
    Alert.alert("Couldn't save", err instanceof ApiError ? err.message.replace(/^"|"$/g, "") : "Something went wrong");

  const saveTower = async () => {
    if (!towerName.trim() || !towerModal) return;
    try {
      if (towerModal.mode === "create") {
        await createTower.mutateAsync({ name: towerName.trim() });
      } else {
        await updateTower.mutateAsync({ id: towerModal.tower.id, name: towerName.trim() });
      }
      setTowerModal(null);
    } catch (err) {
      showError(err);
    }
  };

  const removeTower = (tower: Tower) => {
    const flatCount = flats.filter((f) => f.towerId === tower.id).length;
    Alert.alert(
      `Delete ${tower.name}?`,
      flatCount > 0 ? `This tower has ${flatCount} flat(s) — remove them first.` : "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTower.mutateAsync(tower.id);
            } catch (err) {
              showError(err);
            }
          },
        },
      ]
    );
  };

  const saveFlat = async () => {
    if (!flatNumber.trim() || !flatLabel.trim() || !flatModal) return;
    try {
      if (flatModal.mode === "create") {
        await createFlat.mutateAsync({
          towerId: flatModal.towerId,
          number: flatNumber.trim(),
          label: flatLabel.trim(),
          ownerName: flatOwner.trim() || undefined,
        });
      } else {
        await updateFlat.mutateAsync({
          id: flatModal.flat.id,
          number: flatNumber.trim(),
          label: flatLabel.trim(),
          ownerName: flatOwner.trim() || undefined,
        });
      }
      setFlatModal(null);
    } catch (err) {
      showError(err);
    }
  };

  const removeFlat = (flat: Flat) => {
    Alert.alert(`Delete flat ${flat.label}?`, "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFlat.mutateAsync(flat.id);
          } catch (err) {
            showError(err);
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
            <Text className="font-display text-xl text-ink900">Towers & flats</Text>
            <Text className="text-ink400 text-xs mt-0.5">Society structure</Text>
          </View>
        </View>
        <Pressable
          onPress={openCreateTower}
          accessibilityRole="button"
          accessibilityLabel="Add tower"
          className="w-11 h-11 rounded-full bg-ember500 items-center justify-center"
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Loading society structure…" />
      ) : towers.length === 0 ? (
        <EmptyState icon="layers" title="No towers yet" subtitle="Tap + to add your first tower." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {towers.map((tower) => {
            const towerFlats = flats.filter((f) => f.towerId === tower.id);
            const expanded = expandedTower === tower.id;
            return (
              <Card key={tower.id} className="mb-3">
                <Pressable
                  onPress={() => setExpandedTower(expanded ? null : tower.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tower.name}, ${towerFlats.length} flats`}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-9 h-9 rounded-full bg-ember50 items-center justify-center">
                      <Feather name="layers" size={16} color={colors.ember600} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body-semibold text-ink800">{tower.name}</Text>
                      <Text className="text-ink400 text-xs mt-0.5">{towerFlats.length} flat{towerFlats.length === 1 ? "" : "s"}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => openEditTower(tower)} accessibilityRole="button" accessibilityLabel={`Edit ${tower.name}`} hitSlop={8}>
                      <Feather name="edit-2" size={16} color={colors.ink400} />
                    </Pressable>
                    <Pressable onPress={() => removeTower(tower)} accessibilityRole="button" accessibilityLabel={`Delete ${tower.name}`} hitSlop={8}>
                      <Feather name="trash-2" size={16} color={colors.rust500} />
                    </Pressable>
                    <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.ink300} />
                  </View>
                </Pressable>

                {expanded && (
                  <View className="mt-4 pt-4 border-t border-ink50">
                    {towerFlats.length === 0 ? (
                      <Text className="text-ink300 text-sm mb-3">No flats added yet</Text>
                    ) : (
                      towerFlats.map((flat) => (
                        <View key={flat.id} className="flex-row items-center justify-between py-2.5 border-b border-ink50 last:border-0">
                          <View className="flex-1 pr-2">
                            <Text className="text-ink700 font-body-medium text-sm">{flat.label}</Text>
                            {flat.ownerName ? <Text className="text-ink400 text-xs mt-0.5">{flat.ownerName}</Text> : null}
                          </View>
                          <View className="flex-row items-center gap-3">
                            <Pressable onPress={() => openEditFlat(flat)} accessibilityRole="button" accessibilityLabel={`Edit flat ${flat.label}`} hitSlop={8}>
                              <Feather name="edit-2" size={14} color={colors.ink400} />
                            </Pressable>
                            <Pressable onPress={() => removeFlat(flat)} accessibilityRole="button" accessibilityLabel={`Delete flat ${flat.label}`} hitSlop={8}>
                              <Feather name="trash-2" size={14} color={colors.rust500} />
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                    <Pressable
                      onPress={() => openCreateFlat(tower.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add flat to ${tower.name}`}
                      className="flex-row items-center gap-1.5 mt-3"
                    >
                      <Feather name="plus-circle" size={14} color={colors.ember600} />
                      <Text className="text-ember600 font-body-semibold text-sm">Add flat</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Tower create/edit modal */}
      <Modal visible={!!towerModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTowerModal(null)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">{towerModal?.mode === "edit" ? "Edit tower" : "Add tower"}</Text>
            <Pressable onPress={() => setTowerModal(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Tower name</Text>
            <TextInput
              value={towerName}
              onChangeText={setTowerName}
              placeholder="e.g. Tower A"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6"
            />
            <Button
              label={towerModal?.mode === "edit" ? "Save changes" : "Add tower"}
              fullWidth
              size="lg"
              disabled={!towerName.trim() || createTower.isPending || updateTower.isPending}
              loading={createTower.isPending || updateTower.isPending}
              onPress={saveTower}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Flat create/edit modal */}
      <Modal visible={!!flatModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFlatModal(null)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">{flatModal?.mode === "edit" ? "Edit flat" : "Add flat"}</Text>
            <Pressable onPress={() => setFlatModal(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Flat number</Text>
            <TextInput
              value={flatNumber}
              onChangeText={setFlatNumber}
              placeholder="e.g. 1005"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />
            <Text className="text-ink500 font-body-medium text-sm mb-2">Label (shown throughout the app)</Text>
            <TextInput
              value={flatLabel}
              onChangeText={setFlatLabel}
              placeholder="e.g. A-1005"
              placeholderTextColor={colors.ink300}
              autoCapitalize="characters"
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />
            <Text className="text-ink500 font-body-medium text-sm mb-2">Owner name (optional)</Text>
            <TextInput
              value={flatOwner}
              onChangeText={setFlatOwner}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6"
            />
            <Button
              label={flatModal?.mode === "edit" ? "Save changes" : "Add flat"}
              fullWidth
              size="lg"
              disabled={!flatNumber.trim() || !flatLabel.trim() || createFlat.isPending || updateFlat.isPending}
              loading={createFlat.isPending || updateFlat.isPending}
              onPress={saveFlat}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}