import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-10 pb-6">
          <View className="w-14 h-14 rounded-2xl bg-ember500 items-center justify-center mb-6">
            <Feather name="aperture" size={26} color="#fff" />
          </View>
          <Text className="font-display text-4xl text-ink900 leading-[42px]">
            The society gate,{"\n"}now in your pocket.
          </Text>
          <Text className="text-ink400 font-body text-base mt-3 leading-6">
            One app for visitor approvals, notices, amenities and dues — for every home in the community.
          </Text>
        </View>

        <View className="px-6 gap-3 mt-4">
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            className="flex-row items-center bg-paper border border-ink100 rounded-xl2 p-4 active:bg-ember50"
            style={{ shadowColor: "#251F1A", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
          >
            <View className="w-11 h-11 rounded-full bg-ember50 items-center justify-center mr-4">
              <Feather name="log-in" size={20} color={colors.ember600} />
            </View>
            <View className="flex-1">
              <Text className="font-body-semibold text-ink800 text-[15px]">Sign in</Text>
              <Text className="text-ink400 text-[13px] mt-0.5">You've been invited by your society admin</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.ink300} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/create-society")}
            accessibilityRole="button"
            accessibilityLabel="Create a society"
            className="flex-row items-center bg-paper border border-ink100 rounded-xl2 p-4 active:bg-ember50"
            style={{ shadowColor: "#251F1A", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
          >
            <View className="w-11 h-11 rounded-full bg-ember50 items-center justify-center mr-4">
              <Feather name="grid" size={20} color={colors.ember600} />
            </View>
            <View className="flex-1">
              <Text className="font-body-semibold text-ink800 text-[15px]">Set up your society</Text>
              <Text className="text-ink400 text-[13px] mt-0.5">First time here? Register your society and become its admin</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.ink300} />
          </Pressable>
        </View>

        <View className="flex-1" />
        <Text className="text-center text-ink300 text-xs pb-6 px-6">
          By continuing you agree to Portl's Terms & Privacy Policy
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}