import { View } from "react-native";

// This route is never really seen — RootLayout's useProtectedRoute redirects
// immediately to (auth)/welcome or the user's role-home as soon as the
// session is hydrated. It exists so Expo Router has a valid entry at "/".
export default function Index() {
  return <View className="flex-1 bg-cream" />;
}
