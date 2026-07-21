import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, LoadingState } from "@/components/Misc";
import { colors } from "@/constants/theme";
import { useBills, useMockPayBill } from "@/hooks/useBills";
import { useCreateComplaint } from "@/hooks/useComplaints";
import { useAuthStore } from "@/store/authStore";

export default function Payments() {
  const { data: bills = [], isLoading } = useBills();
  const mockPay = useMockPayBill();
  const claimPayment = useCreateComplaint();
  const isBackendLive = useAuthStore((s) => s.isBackendLive);

  const dues = bills.filter((b) => b.status === "unpaid");
  const totalDue = dues.reduce((s, b) => s + b.amount, 0);

  const payNow = (billId: string, amount: number, title: string) => {
    if (isBackendLive) {
      // Real Razorpay checkout — opens app/razorpay-checkout.tsx, which creates a live order via
      // POST /bills/:id/pay/order and verifies the signature server-side on success.
      router.push({ pathname: "/razorpay-checkout", params: { billId, amount: String(amount), title } });
    } else {
      // No backend session — nothing to create a real order against, so just demo-pay locally.
      mockPay.mutate(billId);
    }
  };

  // "I have paid" is for cash/cheque/bank-transfer payments made outside the app — there's no
  // Razorpay order to verify, so it raises a helpdesk ticket for the office to manually confirm
  // and mark paid (via the admin dashboard's bulk "mark paid" action), rather than silently
  // flipping the bill to paid on an unverified claim.
  const claimOfflinePayment = (title: string, amount: number) => {
    Alert.alert(
      "Flag as paid?",
      `This lets the office know you've already paid "${title}" (₹${amount.toLocaleString("en-IN")}) outside the app — e.g. cash or bank transfer. They'll verify and update your bill.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Flag for verification",
          onPress: () =>
            claimPayment.mutate(
              {
                title: `Payment verification — ${title}`,
                category: "Other",
                description: `Resident reports having already paid ₹${amount.toLocaleString("en-IN")} for "${title}" outside the app. Please verify and mark the bill paid.`,
              },
              {
                onSuccess: () => Alert.alert("Sent", "The office has been notified and will verify your payment."),
                onError: () => Alert.alert("Couldn't send", "Please try again in a moment."),
              }
            ),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.ink700} />
        </Pressable>
        <Text className="font-display text-xl text-ink900">Payments</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Loading bills…" />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Card className="bg-ink900 border-0 mb-6">
          <Text className="text-ink300 text-xs font-body-semibold mb-1">TOTAL OUTSTANDING</Text>
          <Text className="text-white font-display text-3xl mb-4">₹{totalDue.toLocaleString("en-IN")}</Text>
          <View className="flex-row gap-6">
            <View>
              <Text className="text-ink300 text-[11px]">Deposit</Text>
              <Text className="text-white font-body-semibold text-sm mt-0.5">₹0</Text>
            </View>
            <View>
              <Text className="text-ink300 text-[11px]">Paid this year</Text>
              <Text className="text-moss400 font-body-semibold text-sm mt-0.5">
                ₹{bills.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </Card>

        <Text className="text-ink700 font-body-semibold mb-3 px-1">Bills</Text>
        {bills.length === 0 ? (
          <EmptyState icon="credit-card" title="No bills yet" subtitle="Maintenance dues will show up here." />
        ) : (
        bills.map((b) => (
          <Card key={b.id} className="mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-row items-center gap-2">
                {b.isNew && b.status === "unpaid" ? (
                  <View className="bg-ember50 px-2 py-0.5 rounded-full">
                    <Text className="text-ember600 text-[10px] font-body-bold">NEW</Text>
                  </View>
                ) : null}
                <Text className="font-body-semibold text-ink800">{b.title}</Text>
              </View>
              <View className={`px-2.5 py-1 rounded-full ${b.status === "paid" ? "bg-moss50" : "bg-rust50"}`}>
                <Text className={`text-[11px] font-body-semibold ${b.status === "paid" ? "text-moss600" : "text-rust500"}`}>
                  {b.status === "paid" ? "Paid" : "Unpaid"}
                </Text>
              </View>
            </View>
            <Text className="font-display-medium text-xl text-ink900 mb-1">₹{b.amount.toLocaleString("en-IN")}</Text>
            <Text className="text-ink400 text-xs mb-3">Due {b.dueDate}</Text>
            {b.status === "unpaid" && (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => claimOfflinePayment(b.title, b.amount)}
                  disabled={claimPayment.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Flag ${b.title} as paid outside the app, pending office verification`}
                  className="flex-1 bg-ink50 py-2.5 rounded-xl items-center"
                >
                  <Text className="text-ink600 font-body-semibold text-xs">I have paid</Text>
                </Pressable>
                <Pressable
                  onPress={() => payNow(b.id, b.amount, b.title)}
                  disabled={mockPay.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay ${b.title} now`}
                  className="flex-1 bg-ember500 py-2.5 rounded-xl items-center"
                >
                  <Text className="text-white font-body-semibold text-xs">Pay now</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))
        )}

        <Text className="text-ink300 text-xs text-center mt-2 px-4">
          {isBackendLive
            ? "Pay now opens real Razorpay checkout (needs RAZORPAY_KEY_ID/SECRET on the backend)."
            : "Demo mode — Pay now marks the bill paid instantly since there's no backend session to check out against."}
        </Text>
      </ScrollView>
      )}

      {dues.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-cream border-t border-ink100 px-5 pt-3 pb-8">
          <Button
            label={`Pay all · ₹${totalDue.toLocaleString("en-IN")}`}
            fullWidth
            size="lg"
            loading={mockPay.isPending}
            onPress={() => dues.forEach((b) => mockPay.mutate(b.id))}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
