import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store has no web implementation — every call throws "Not implemented on web".
// The rest of the app already wraps these calls in try/catch "ignore" blocks, so on web that
// exception was being silently swallowed: tokens/session never actually got saved anywhere,
// which is why every authenticated request came back "Missing or malformed Authorization header"
// even though the login call itself succeeded. This wrapper routes web to localStorage instead
// (no encryption at rest, unlike SecureStore — fine for a hackathon demo, not for production).
const isWeb = Platform.OS === "web";

function webStorageAvailable() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    if (!webStorageAvailable()) return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (!webStorageAvailable()) return;
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    if (!webStorageAvailable()) return;
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}