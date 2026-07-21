import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { colors } from "@/constants/theme";
import { api, ApiError } from "@/services/api";

interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  paymentId: string;
}

// Razorpay's Checkout.js is loaded from their CDN inside the WebView (standard integration —
// see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/). The page
// auto-opens the checkout modal on load and posts the result back to React Native via
// `window.ReactNativeWebView.postMessage`.
function buildCheckoutHtml(order: OrderResponse, name: string, phone: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;background:#FFF8F1;">
  <script>
    var options = {
      key: "${order.keyId}",
      amount: "${order.amount}",
      currency: "${order.currency}",
      name: "Portl Society Dues",
      description: "Maintenance payment",
      order_id: "${order.orderId}",
      prefill: { name: "${name}", contact: "${phone}" },
      theme: { color: "#FF7A30" },
      handler: function (response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "success", ...response }));
      },
      modal: {
        ondismiss: function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "dismissed" }));
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "failed", error: response.error }));
    });
    rzp.open();
  </script>
</body>
</html>`;
}

export default function RazorpayCheckout() {
  const { billId, amount, title } = useLocalSearchParams<{ billId: string; amount: string; title: string }>();
  const qc = useQueryClient();
  const webviewRef = useRef<WebView>(null);

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "checkout" | "verifying" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post<OrderResponse>(`/bills/${billId}/pay/order`);
        setOrder(res);
        setStatus("checkout");
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          setErrorMsg("Razorpay isn't configured on this backend yet (missing RAZORPAY_KEY_ID/SECRET).");
        } else {
          setErrorMsg((err as Error).message || "Could not start checkout.");
        }
        setStatus("error");
      }
    })();
  }, [billId]);

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        setStatus("verifying");
        await api.post(`/bills/${billId}/pay/verify`, {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
        qc.invalidateQueries({ queryKey: ["bills"] });
        setStatus("success");
      } else if (data.type === "dismissed") {
        router.back();
      } else if (data.type === "failed") {
        setErrorMsg(data.error?.description || "Payment failed.");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg((err as Error).message || "Could not verify payment.");
      setStatus("error");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="font-display text-xl text-ink900">{title || "Pay dues"}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.ink700} />
        </Pressable>
      </View>

      {status === "loading" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ember500} />
          <Text className="text-ink400 text-sm mt-3">Starting secure checkout…</Text>
        </View>
      )}

      {status === "checkout" && order && (
        <WebView<{}>
          ref={webviewRef}
          source={{ html: buildCheckoutHtml(order, "Resident", "9999999999") }}
          onMessage={onMessage}
          style={{ flex: 1, backgroundColor: "#FFF8F1" }}
        />
      )}

      {status === "verifying" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ember500} />
          <Text className="text-ink400 text-sm mt-3">Confirming your payment…</Text>
        </View>
      )}

      {status === "success" && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-moss500 items-center justify-center mb-4">
            <Feather name="check" size={28} color="#fff" />
          </View>
          <Text className="font-body-semibold text-ink800 text-base mb-1">Payment successful</Text>
          <Text className="text-ink400 text-sm text-center mb-6">₹{amount} paid for {title}</Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      )}

      {status === "error" && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-rust50 items-center justify-center mb-4">
            <Feather name="alert-triangle" size={26} color={colors.rust500} />
          </View>
          <Text className="font-body-semibold text-ink800 text-base mb-1 text-center">Couldn't complete payment</Text>
          <Text className="text-ink400 text-sm text-center mb-6">{errorMsg}</Text>
          <View className="flex-row gap-3">
            <Button label="Close" variant="outline" onPress={() => router.back()} />
            <Button
              label="Pay without Razorpay (demo)"
              onPress={async () => {
                await api.post(`/bills/${billId}/pay/mock`);
                qc.invalidateQueries({ queryKey: ["bills"] });
                router.back();
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
