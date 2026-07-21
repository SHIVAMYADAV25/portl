import { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useAmenities, useBookings, useCreateBooking } from "@/hooks/useAmenities";
import type { Amenity } from "@/types";

const iconFor: Record<string, keyof typeof Feather.glyphMap> = {
  home: "home",
  activity: "activity",
  droplet: "droplet",
  square: "square",
};

function nextSlots(a: Amenity) {
  const slots: string[] = [];
  let [h, m] = a.openTime.split(":").map(Number);
  const [ch, cm] = a.closeTime.split(":").map(Number);
  while (h < ch || (h === ch && m < cm)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += a.slotMinutes;
    while (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return slots.slice(0, 6);
}

export default function Amenities() {
  const { data: amenities = [], isLoading } = useAmenities();
  const { data: allBookings = [] } = useBookings();
  const createBooking = useCreateBooking();

  const [selected, setSelected] = useState<Amenity | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const confirmBooking = () => {
    if (!selected || !slot) return;
    setBookingError(null);
    const today = new Date().toISOString().slice(0, 10);
    createBooking.mutate(
      { amenityId: selected.id, date: today, startTime: slot, endTime: slot },
      {
        onSuccess: () => setBooked(true),
        onError: (err) => setBookingError((err as Error).message || "Could not book this slot"),
      }
    );
  };

  if (selected) {
    const slots = nextSlots(selected);
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => { setSelected(null); setSlot(null); setBooked(false); setBookingError(null); }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={22} color={colors.ink700} />
          </Pressable>
          <Text className="font-display text-xl text-ink900">{selected.name}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Card className="mb-5">
            <View className="flex-row items-center gap-2 mb-1">
              <Feather name="map-pin" size={14} color={colors.ink400} />
              <Text className="text-ink400 text-sm">{selected.location}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="clock" size={14} color={colors.ink400} />
              <Text className="text-ink400 text-sm">
                {selected.openTime} – {selected.closeTime} · {selected.slotMinutes} min slots
              </Text>
            </View>
          </Card>

          {booked ? (
            <Card className="items-center py-8 bg-moss50 border-0">
              <View className="w-14 h-14 rounded-full bg-moss500 items-center justify-center mb-3">
                <Feather name="check" size={24} color="#fff" />
              </View>
              <Text className="font-body-semibold text-ink800 text-base">Booking confirmed</Text>
              <Text className="text-ink500 text-sm mt-1">
                {selected.name} · Today, {slot}
              </Text>
            </Card>
          ) : (
            <>
              <Text className="text-ink700 font-body-semibold mb-3">Today's available slots</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {slots.map((s) => {
                  const taken = allBookings.some((b) => b.amenityId === selected.id && b.startTime === s && b.status === "confirmed");
                  return (
                    <Pressable
                      key={s}
                      disabled={taken}
                      onPress={() => setSlot(s)}
                      accessibilityRole="button"
                      accessibilityLabel={taken ? `${s}, already booked` : `Book ${s} slot`}
                      accessibilityState={{ selected: slot === s, disabled: taken }}
                      className={`px-4 py-3 rounded-xl border ${
                        taken
                          ? "bg-ink50 border-ink50"
                          : slot === s
                          ? "bg-ember500 border-ember500"
                          : "bg-paper border-ink100"
                      }`}
                    >
                      <Text
                        className={`font-body-medium text-sm ${
                          taken ? "text-ink300 line-through" : slot === s ? "text-white" : "text-ink700"
                        }`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {bookingError ? <Text className="text-rust500 text-sm mb-3">{bookingError}</Text> : null}
              <Button
                label="Confirm booking"
                fullWidth
                disabled={!slot || createBooking.isPending}
                loading={createBooking.isPending}
                onPress={confirmBooking}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-2xl text-ink900 mb-1">Amenities</Text>
        <Text className="text-ink400 text-sm">Book a slot — no double-booking, guaranteed.</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading amenities…" />
      ) : (
      <FlatList
        data={amenities}
        keyExtractor={(a) => a.id}
        numColumns={2}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        columnWrapperStyle={amenities.length > 0 ? { gap: 12 } : undefined}
        ListEmptyComponent={<EmptyState icon="calendar" title="No amenities yet" subtitle="Bookable amenities will show up here." />}
        ListHeaderComponent={
          allBookings.filter((b) => b.status === "confirmed").length > 0 ? (
            <View className="mb-4">
              <Text className="text-ink700 font-body-semibold mb-2">Your upcoming bookings</Text>
              {allBookings
                .filter((b) => b.status === "confirmed")
                .map((b) => (
                  <Card key={b.id} className="flex-row items-center justify-between mb-2">
                    <View>
                      <Text className="font-body-semibold text-ink800">
                        {b.amenityName ?? amenities.find((a) => a.id === b.amenityId)?.name ?? "Amenity"}
                      </Text>
                      <Text className="text-ink400 text-xs mt-0.5">
                        {b.date} · {b.startTime}–{b.endTime}
                      </Text>
                    </View>
                    <View className="bg-moss50 px-3 py-1 rounded-full">
                      <Text className="text-moss600 text-xs font-body-semibold">Confirmed</Text>
                    </View>
                  </Card>
                ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={{ flex: 1 }}
          >
            <Card className="items-start">
              <View className="w-11 h-11 rounded-xl bg-ember50 items-center justify-center mb-3">
                <Feather name={iconFor[item.icon] ?? "grid"} size={19} color={colors.ember600} />
              </View>
              <Text className="font-body-semibold text-ink800 mb-0.5">{item.name}</Text>
              <Text className="text-ink400 text-xs">{item.openTime} – {item.closeTime}</Text>
            </Card>
          </Pressable>
        )}
      />
      )}
    </SafeAreaView>
  );
}
