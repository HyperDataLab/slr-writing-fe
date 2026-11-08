import { useTranslation } from "react-i18next";
import type { MethodsFact } from "@/features/methods/model/methods.types";
import { Badge } from "@/shared/ui/badge";
import { GsapListItem } from "@/shared/ui/gsap-motion";

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
    <ul className="divide-y divide-border">
      {facts.map((fact, index) => {
        const factLabelKey = fact.key.replace(/\./g, "_");
        const factLabel = t(`methods.factLabels.${factLabelKey}`, { defaultValue: fact.label });
        const value = formatFactValue(
          fact.value,
          locale,
          t("methods.notReported"),
          t("methods.noItemsReported"),
        );

        return (
          <GsapListItem key={fact.key} delay={index * 0.025} className="space-y-2 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{factLabel}</p>
              <Badge variant={fact.status === "explicit" ? "default" : "outline"}>
                {t(fact.status === "explicit" ? "methods.explicit" : "methods.missing")}
              </Badge>
            </div>
            <p className="break-words text-sm leading-6 text-muted-foreground">{value}</p>
            <code className="block break-all text-[11px] leading-5 text-muted-foreground">{fact.source}</code>
            {fact.derivation && (
              <p className="text-xs leading-5 text-muted-foreground">
                {t("methods.derivation")}: {fact.derivation}
              </p>
            )}
          </GsapListItem>
        );
      })}
    </ul>
  );
}
