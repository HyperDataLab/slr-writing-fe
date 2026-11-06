import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import type { CitationManifestView } from "@/features/verification/model/verification.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CitationManifestTable({ manifest }: { manifest: CitationManifestView }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  const filtered = manifest.items.filter((e) => {
    const q = filter.toLowerCase();
    return (
      e.citationId.toLowerCase().includes(q) ||
      e.studyId.toLowerCase().includes(q) ||
      e.studyTitle.toLowerCase().includes(q) ||
      (e.quote && e.quote.toLowerCase().includes(q))
    );
  });

  return (
    <Card className="border border-border/80">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base">{t("verify.manifest.title")}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("verify.manifest.summary", { resolved: manifest.resolvedCitations, total: manifest.totalCitations })}
            {manifest.unresolvedCitations.length > 0 ? ` ${t("verify.manifest.unresolvedCount", { count: manifest.unresolvedCitations.length })}` : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("verify.manifest.search")}
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">{t("verify.manifest.marker")}</th>
                <th className="py-2.5 px-4">{t("verify.manifest.status")}</th>
                <th className="py-2.5 px-4">{t("verify.manifest.location")}</th>
                <th className="py-2.5 px-4">{t("verify.manifest.studyQuote")}</th>
                <th className="py-2.5 px-4">{t("verify.manifest.year")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("verify.manifest.noMatch")}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`${item.citationId}-${item.paragraphId}-${idx}`} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-primary whitespace-nowrap">{item.citationId}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <Badge variant={item.isResolved ? "success" : "destructive"} className="text-[10px]">
                        {item.isResolved ? t("verify.manifest.resolved") : t("verify.manifest.unresolved")}
                      </Badge>
                      {item.isResolved && !item.quoteHashVerified && (
                        <Badge variant="warning" className="text-[10px] ml-1">
                          {t("verify.manifest.quoteUnverified")}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {item.sectionKey} · {item.paragraphId}
                    </td>
                    <td className="py-2.5 px-4 max-w-md">
                      <div className="font-semibold text-foreground truncate">{item.studyTitle}</div>
                      {item.quote && <div className="text-muted-foreground italic text-[11px] truncate">{item.quote}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {item.studyYear ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {manifest.unresolvedCitations.length > 0 && (
          <div className="border-t border-border/60 p-4 space-y-1 text-xs text-destructive">
            <span className="font-semibold block">{t("verify.manifest.unresolvedTitle")}</span>
            {manifest.unresolvedCitations.map((u, idx) => (
              <div key={`${u.marker}-${idx}`}>
                <span className="font-mono">{u.marker}</span> @ {u.location} — {u.reason}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
