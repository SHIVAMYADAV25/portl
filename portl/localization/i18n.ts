import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import kn from "./locales/kn.json";

export const SUPPORTED_LANGUAGES = ["en", "hi", "kn"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
};

const LANGUAGE_STORAGE_KEY = "portl.language";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  kn: { translation: kn },
};

function isSupported(tag: string | undefined): tag is SupportedLanguage {
  return !!tag && (SUPPORTED_LANGUAGES as readonly string[]).includes(tag);
}

/** Best-effort device language, falling back to English for anything we haven't translated
 *  (e.g. a phone set to Tamil or French — better to show clear English than a half-translated
 *  mix, and English is the one language guaranteed to be complete). */
function detectDeviceLanguage(): SupportedLanguage {
  const deviceTag = Localization.getLocales()[0]?.languageCode ?? undefined;
  return isSupported(deviceTag) ? deviceTag : "en";
}

let initialized = false;

/** Call once at app startup, before rendering anything that uses useTranslation(). Restores the
 *  user's saved language choice if they've set one; otherwise detects the device language. */
export async function initI18n() {
  if (initialized) return;
  initialized = true;

  let language: SupportedLanguage = detectDeviceLanguage();
  try {
    const saved = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    if (isSupported(saved ?? undefined)) language = saved as SupportedLanguage;
  } catch {
    // SecureStore unavailable (e.g. web) or nothing saved yet — device-detected language stands.
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false }, // React already escapes — avoid double-escaping.
    compatibilityJSON: "v4",
  });
}

/** Switches the active language and persists the choice for next launch. */
export async function setLanguage(lang: SupportedLanguage) {
  await i18n.changeLanguage(lang);
  try {
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Best-effort persistence — switching still works for the rest of this session even if
    // SecureStore write fails (e.g. web).
  }
}

export default i18n;
