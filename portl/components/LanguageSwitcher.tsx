import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, languageNames, setLanguage, type SupportedLanguage } from "@/localization/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.language as SupportedLanguage;

  return (
    <View className="mb-5 px-5">
      <Text className="text-ink400 font-body-semibold text-xs uppercase tracking-wide mb-2 px-1">
        {t("settings.language")}
      </Text>
      <View className="bg-paper rounded-xl2 border border-ink100 p-2 flex-row gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Pressable
            key={lang}
            onPress={() => setLanguage(lang)}
            accessibilityRole="button"
            accessibilityLabel={languageNames[lang]}
            accessibilityState={{ selected: current === lang }}
            className={`flex-1 items-center py-2.5 rounded-xl ${
              current === lang ? "bg-ember500" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-body-semibold text-sm ${current === lang ? "text-white" : "text-ink600"}`}
            >
              {languageNames[lang]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
