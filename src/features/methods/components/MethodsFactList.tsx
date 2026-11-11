import { useTranslation } from "react-i18next";
import type { MethodsFact } from "@/features/methods/model/methods.types";
import { Badge } from "@/shared/ui/badge";

function formatFactValue(value: MethodsFact["value"], locale: string, missingLabel: string, emptyLabel: string) {
  if (value === null) return missingLabel;
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value);
  if (typeof value === "string") return value;
  if (value.length === 0) return emptyLabel;

  return value.map((item) => {
    const id = item.id ? `${item.id}: ` : "";
    const count = item.count === undefined ? "" : ` (n = ${new Intl.NumberFormat(locale).format(item.count)})`;
    return `${id}${item.text}${count}`;
  }).join("; ");
}

export function MethodsFactList({ facts }: { facts: MethodsFact[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";

  if (facts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("methods.noFacts")}</p>;
  }

  return (
    <ul className="space-y-3">
      {facts.map((fact) => {
        const factLabelKey = fact.key.replace(/\./g, "_");
        const factLabel = t(`methods.factLabels.${factLabelKey}`, { defaultValue: fact.label });
        const value = formatFactValue(
          fact.value,
          locale,
          t("methods.notReported"),
          t("methods.noItemsReported"),
        );

        return (
          <li key={fact.key} className="space-y-1.5 border-b border-border/70 pb-3 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{factLabel}</p>
              <Badge variant={fact.status === "explicit" ? "secondary" : "outline"}>
                {t(fact.status === "explicit" ? "methods.explicit" : "methods.missing")}
              </Badge>
            </div>
            <p className="break-words text-xs leading-5 text-foreground">{value}</p>
            <code className="block break-all text-[10px] leading-4 text-muted-foreground">{fact.source}</code>
            {fact.derivation && (
              <p className="text-[11px] leading-4 text-muted-foreground">
                {t("methods.derivation")}: {fact.derivation}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
