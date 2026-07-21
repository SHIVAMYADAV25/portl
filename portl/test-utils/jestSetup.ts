// expo-haptics touches native APIs unavailable under Jest; every screen that fires haptic
// feedback on tap needs this mocked or the test crashes on mount/press.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// i18next: screens call useTranslation()/t() directly, so tests need a real, synchronously-ready
// i18n instance rather than mocking react-i18next entirely — that would defeat the purpose of
// testing what actually renders. English-only here (no expo-localization/SecureStore dependency)
// keeps test setup fast and deterministic; other locales are exercised by translation-file
// validation instead (see localization/__tests__).
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../localization/locales/en.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});
