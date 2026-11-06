import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { CitationManifestEntry } from "@/features/verification/model/verification.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CitationManifestTable({ entries }: { entries: CitationManifestEntry[] }) {
  const [filter, setFilter] = useState("");

  const filtered = entries.filter((e) => {
    const q = filter.toLowerCase();
    return (
      e.marker.toLowerCase().includes(q) ||
      e.externalId.toLowerCase().includes(q) ||
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.quote && e.quote.toLowerCase().includes(q))
    );
  });

  return (
    <Card className="border border-border/80">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base">Citation Manifest Registry</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {entries.length} validated citation entities mapped from the SLR review corpus.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search marker, title, ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Marker</th>
                <th className="py-2.5 px-4">Kind</th>
                <th className="py-2.5 px-4">External ID</th>
                <th className="py-2.5 px-4">Details / Quote</th>
                <th className="py-2.5 px-4">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No citation markers matched your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                      {item.marker}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {item.kind}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {item.externalId}
                    </td>
                    <td className="py-2.5 px-4 max-w-md">
                      {item.title && <div className="font-semibold text-foreground truncate">{item.title}</div>}
                      {item.quote && <div className="text-muted-foreground italic text-[11px] truncate">{item.quote}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {item.year || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

