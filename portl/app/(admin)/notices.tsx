import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useNotices, useCreateNotice } from "@/hooks/useNotices";
import type { Notice } from "@/types";

const categories: Notice["category"][] = ["General", "Maintenance", "Event", "Alert"];

export default function AdminNotices() {
  const { data: notices = [], isLoading } = useNotices();
  const createNotice = useCreateNotice();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Notice["category"]>("General");

  const publish = () => {
    if (!title.trim()) return;
    createNotice.mutate(
      { title: title.trim(), body: body.trim(), category },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setShowNew(false);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="font-display text-2xl text-ink900 mb-1">Notices</Text>
          <Text className="text-ink400 text-sm">Broadcast updates to every resident</Text>
        </View>
        <Pressable
          onPress={() => setShowNew(true)}
          accessibilityRole="button"
          accessibilityLabel="New notice"
          className="w-11 h-11 rounded-full bg-ember500 items-center justify-center"
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Loading notices…" />
      ) : notices.length === 0 ? (
        <EmptyState icon="bell" title="No notices yet" subtitle="Tap + to publish one to every resident." />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {notices.map((n) => (
          <Card key={n.id} className="mb-3">
            <View className="bg-ember50 px-2.5 py-1 rounded-full self-start mb-2">
              <Text className="text-ember600 text-[10px] font-body-bold">{n.category.toUpperCase()}</Text>
            </View>
            <Text className="font-body-semibold text-ink800 mb-1">{n.title}</Text>
            <Text className="text-ink500 text-sm leading-5">{n.body}</Text>
          </Card>
        ))}
      </ScrollView>
      )}

      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <SafeAreaView className="flex-1 bg-cream">
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-display text-xl text-ink900">New notice</Text>
            <Pressable onPress={() => setShowNew(false)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.ink700} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-ink500 font-body-medium text-sm mb-2">Category</Text>
            <View className="flex-row gap-2 mb-5">
              {categories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${c}`}
                  accessibilityState={{ selected: category === c }}
                  className={`px-4 py-2 rounded-full border ${category === c ? "bg-ink800 border-ink800" : "bg-paper border-ink100"}`}
                >
                  <Text className={`text-sm font-body-medium ${category === c ? "text-white" : "text-ink600"}`}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-ink500 font-body-medium text-sm mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Water supply interruption"
              placeholderTextColor={colors.ink300}
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
            />

            <Text className="text-ink500 font-body-medium text-sm mb-2">Message</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Add the details residents need to know"
              placeholderTextColor={colors.ink300}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-6 h-28"
            />

            <Button
              label="Publish to all residents"
              fullWidth
              size="lg"
              disabled={!title.trim() || createNotice.isPending}
              loading={createNotice.isPending}
              onPress={publish}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
