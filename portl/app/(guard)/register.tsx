import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { useRegisterVisitor } from "@/hooks/useVisitors";
import { useFlats } from "@/hooks/useFlats";
import type { VisitorCategory } from "@/types";

const categories: { id: VisitorCategory; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "guest", label: "Guest", icon: "user" },
  { id: "delivery", label: "Delivery", icon: "package" },
  { id: "cab", label: "Cab", icon: "navigation" },
  { id: "service", label: "Service", icon: "tool" },
];

export default function Register() {
  const registerVisitor = useRegisterVisitor();
  const { data: flats = [] } = useFlats();
  const [category, setCategory] = useState<VisitorCategory>("guest");
  const [name, setName] = useState("");
  const [flat, setFlat] = useState("");
  const [flatFocused, setFlatFocused] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [sent, setSent] = useState(false);

  const flatMatches = useMemo(() => {
    if (!flat.trim()) return [];
    const q = flat.trim().toLowerCase();
    return flats.filter((f) => f.label.toLowerCase().includes(q)).slice(0, 6);
  }, [flat, flats]);

  // Exact match against a real flat (either typed exactly or picked from the list) — lets the
  // submit button/confirmation reflect whether this is a known flat or a free-text guess, so a
  // typo doesn't silently vanish into a request that notifies nobody.
  const matchedFlat = flats.find((f) => f.label.toLowerCase() === flat.trim().toLowerCase());
  const showSuggestions = flatFocused && flatMatches.length > 0 && !matchedFlat;

  const reset = () => {
    setName("");
    setFlat("");
    setPurpose("");
    setVehicleNumber("");
    setSent(false);
  };

  const submit = () => {
    if (!name.trim() || !flat.trim()) return;
    registerVisitor.mutate(
      {
        name: name.trim(),
        category,
        flatLabel: flat.trim(),
        purpose: purpose.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
      },
      { onSuccess: () => setSent(true) }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-1">Register visitor</Text>
        <Text className="text-ink400 text-sm">Send an approval request straight to the resident</Text>
      </View>

      {sent ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-gold50 items-center justify-center mb-4">
            <Feather name="clock" size={26} color={colors.gold500} />
          </View>
          <Text className="font-body-semibold text-ink800 text-base mb-1">Request sent</Text>
          <Text className="text-ink400 text-sm text-center mb-6">
            Waiting for {flat || "the resident"} to approve {name || "the visitor"}.
          </Text>
          <Button label="Register another visitor" onPress={reset} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text className="text-ink500 font-body-medium text-sm mb-2">Visitor type</Text>
          <View className="flex-row gap-2 mb-5">
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label} visitor type`}
                accessibilityState={{ selected: category === c.id }}
                className={`flex-1 items-center py-3.5 rounded-xl border ${
                  category === c.id ? "bg-ember500 border-ember500" : "bg-paper border-ink100"
                }`}
              >
                <Feather name={c.icon} size={18} color={category === c.id ? "#fff" : colors.ink500} />
                <Text className={`text-xs font-body-medium mt-1.5 ${category === c.id ? "text-white" : "text-ink600"}`}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-ink500 font-body-medium text-sm mb-2">Visitor / company name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rohit — Zomato"
            placeholderTextColor={colors.ink300}
            className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
          />

          <Text className="text-ink500 font-body-medium text-sm mb-2">Flat number</Text>
          <View style={{ position: "relative", zIndex: 10 }}>
            <View className="flex-row items-center bg-paper border border-ink100 rounded-2xl px-4">
              <TextInput
                value={flat}
                onChangeText={setFlat}
                onFocus={() => setFlatFocused(true)}
                onBlur={() => setTimeout(() => setFlatFocused(false), 150)}
                placeholder="Search flat — e.g. A-1005"
                placeholderTextColor={colors.ink300}
                autoCapitalize="characters"
                className="flex-1 text-ink800 font-body py-3.5"
              />
              {matchedFlat ? (
                <Feather name="check-circle" size={16} color={colors.moss500} />
              ) : flat.trim() ? (
                <Feather name="alert-circle" size={16} color={colors.gold500} />
              ) : (
                <Feather name="search" size={16} color={colors.ink300} />
              )}
            </View>

            {matchedFlat?.ownerName ? (
              <Text className="text-moss600 text-xs mt-1.5 ml-1">Matches {matchedFlat.ownerName}'s flat</Text>
            ) : flat.trim() && !matchedFlat ? (
              <Text className="text-gold500 text-xs mt-1.5 ml-1">
                No exact match — double-check the flat number before sending
              </Text>
            ) : null}

            {showSuggestions && (
              <View
                className="absolute top-full left-0 right-0 mt-1 bg-paper border border-ink100 rounded-2xl overflow-hidden"
                style={{ shadowColor: "#251F1A", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
              >
                {flatMatches.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      setFlat(f.label);
                      setFlatFocused(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select flat ${f.label}${f.ownerName ? `, ${f.ownerName}` : ""}`}
                    className="px-4 py-3 border-b border-ink50 last:border-0 flex-row items-center justify-between"
                  >
                    <Text className="text-ink800 font-body-medium">{f.label}</Text>
                    {f.ownerName ? <Text className="text-ink400 text-xs">{f.ownerName}</Text> : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <View className="mb-5" />

          <Text className="text-ink500 font-body-medium text-sm mb-2">Purpose (optional)</Text>
          <TextInput
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g. Package delivery"
            placeholderTextColor={colors.ink300}
            className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-5"
          />

          {(category === "cab" || category === "delivery" || category === "service") && (
            <>
              <Text className="text-ink500 font-body-medium text-sm mb-2">Vehicle number (optional)</Text>
              <TextInput
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                placeholder="e.g. MH12AB1234"
                placeholderTextColor={colors.ink300}
                autoCapitalize="characters"
                className="bg-paper border border-ink100 rounded-2xl px-4 py-3.5 text-ink800 font-body mb-8"
              />
            </>
          )}

          <Button
            label="Send approval request"
            fullWidth
            size="lg"
            disabled={!name.trim() || !flat.trim() || registerVisitor.isPending}
            loading={registerVisitor.isPending}
            onPress={submit}
          />

          <Pressable
            onPress={() => router.push("/guard-scan")}
            accessibilityRole="button"
            accessibilityLabel="Scan guest QR pass instead"
            className="flex-row items-center justify-center gap-2 mt-4 py-3"
          >
            <Feather name="maximize" size={16} color={colors.ink500} />
            <Text className="text-ink500 font-body-medium text-sm">Scan guest QR pass instead</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}