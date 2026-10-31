import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/shared/i18n/resources";

export const supportedLanguages = ["vi", "en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const languageStorageKey = "slr-ai-writing-language";

function getInitialLanguage(): SupportedLanguage {
  try {
    if (typeof window === "undefined") return "vi";
    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    return supportedLanguages.includes(savedLanguage as SupportedLanguage)
      ? (savedLanguage as SupportedLanguage)
      : "vi";
  } catch {
    return "vi";
  }
}

export const i18nReady = i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "vi",
  supportedLngs: [...supportedLanguages],
  interpolation: { escapeValue: false },
});

function syncLanguagePreferences(language: string) {
  const normalizedLanguage = language.split("-")[0];
  document.documentElement.lang = normalizedLanguage;

  try {
    window.localStorage.setItem(languageStorageKey, normalizedLanguage);
  } catch {
    // Keep language switching functional when browser storage is unavailable.
  }
}

if (typeof document !== "undefined") {
  syncLanguagePreferences(i18n.language || "vi");
  i18n.on("languageChanged", syncLanguagePreferences);
}

export default i18n;
