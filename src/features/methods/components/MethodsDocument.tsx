import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type MarkdownBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string; key: number }
  | { type: "paragraph"; text: string; key: number }
  | { type: "list"; items: string[]; key: number };

function decodeGeneratedMarkdown(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\([\\`*_\[\]~])/g, "$1");
}

function parseGeneratedMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: "list", items: list, key: blocks.length });
      list = [];
    }
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim()) {
      flushList();
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      blocks.push({
        type: "heading",
        level: Math.min(4, heading[1].length) as 2 | 3 | 4,
        text: heading[2],
        key: blocks.length,
      });
      continue;
    }

    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: line, key: blocks.length });
  }
  flushList();

  return blocks;
}

export function MethodsDocument({ markdown }: { markdown: string }) {
  const { t } = useTranslation();
  const blocks = useMemo(() => parseGeneratedMarkdown(markdown), [markdown]);

  return (
    <article aria-label={t("methods.documentLabel")} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-7">
      {blocks.map((block) => {
        if (block.type === "heading") {
          const className = block.level === 2
            ? "text-xl font-semibold text-foreground"
            : block.level === 3
              ? "text-base font-semibold text-foreground"
              : "text-sm font-semibold text-foreground";
          if (block.level === 2) return <h2 key={block.key} className={className}>{decodeGeneratedMarkdown(block.text)}</h2>;
          if (block.level === 3) return <h3 key={block.key} className={className}>{decodeGeneratedMarkdown(block.text)}</h3>;
          return <h4 key={block.key} className={className}>{decodeGeneratedMarkdown(block.text)}</h4>;
        }

        if (block.type === "list") {
          return (
            <ul key={block.key} className="list-disc space-y-2 pl-6 text-sm leading-7 text-foreground">
              {block.items.map((item, index) => <li key={`${block.key}-${index}`}>{decodeGeneratedMarkdown(item)}</li>)}
            </ul>
          );
        }

        return <p key={block.key} className="text-sm leading-7 text-foreground">{decodeGeneratedMarkdown(block.text)}</p>;
      })}
    </article>
  );
}
