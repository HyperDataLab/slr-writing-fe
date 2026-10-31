import { useTranslation } from "react-i18next";
import i18n, { supportedLanguages, type SupportedLanguage } from "@/shared/i18n/i18n";

const languageLabels: Record<SupportedLanguage, string> = {
  vi: "VI",
  en: "EN",
};

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage?.split("-")[0] ?? "vi") as SupportedLanguage;

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={currentLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        {supportedLanguages.map((language) => (
          <option key={language} value={language}>
            {languageLabels[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
