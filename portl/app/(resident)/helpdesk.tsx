import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useComplaints, useCreateComplaint } from "@/hooks/useComplaints";
import type { Complaint } from "@/types";

const categories: Complaint["category"][] = ["Plumbing", "Electrical", "Security", "Housekeeping", "Parking", "Other"];

export default function Helpdesk() {
  const { data: complaints = [], isLoading, refetch, isRefetching } = useComplaints();
  const createComplaint = useCreateComplaint();
  const [showNew, setShowNew] = useState(false);
  const [category, setCategory] = useState<Complaint["category"]>("Plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    createComplaint.mutate(
      { title: title.trim(), category, description: description.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setShowNew(false);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="font-display text-2xl text-ink900 mb-1">Helpdesk</Text>
          <Text className="text-ink400 text-sm">Track every ticket until it's resolved</Text>
        </View>
        <Pressable
          onPress={() => setShowNew(true)}
          accessibilityRole="button"
          accessibilityLabel="Raise a new ticket"
          className="w-11 h-11 rounded-full bg-ember500 items-center justify-center"
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {!isLoading && complaints.length === 0 ? (
        <EmptyState icon="life-buoy" title="No tickets yet" subtitle="Raise a ticket and the committee will get right on it." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.ember500} />}
        >
          {complaints.map((c) => (
            <Card key={c.id} className="mb-3">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 pr-2">
                  <Text className="font-body-semibold text-ink800 mb-1">{c.title}</Text>
                  <Text className="text-ink400 text-xs">{c.category} · #{c.id.slice(-4).toUpperCase()}</Text>
                </View>
                <StatusBadge status={c.status} />
              </View>
              <Text className="text-ink500 text-sm mb-2" numberOfLines={2}>{c.description}</Text>
              {c.assignedTo ? (
                <View className="flex-row items-center gap-1.5">
                  <Feather name="user" size={12} color={colors.ink400} />
                  <Text className="text-ink400 text-xs">Assigned to {c.assignedTo}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}

      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">New ticket</Text>
            <Pressable onPress={() => setShowNew(false)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {categories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${c}`}
                  accessibilityState={{ selected: category === c }}
                  className={`px-4 py-2 rounded-full border ${
                    category === c ? "bg-ink800 border-ink800" : "bg-paper border-ink100"
                  }`}
                >
                  <Text className={`text-sm font-body-medium ${category === c ? "text-white" : "text-ink600"}`}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text className="text-ink500 font-body-medium text-sm mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Kitchen tap leaking"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <Text className="text-ink500 font-body-medium text-sm mb-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add any details that'll help resolve this faster"
              placeholderTextColor={colors.ink300}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6 h-28"
            />

            <Button
              label="Submit ticket"
              fullWidth
              size="lg"
              onPress={submit}
              disabled={!title.trim()}
              loading={createComplaint.isPending}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
