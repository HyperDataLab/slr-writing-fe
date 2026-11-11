import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { MethodsFactList } from "@/features/methods/components/MethodsFactList";
import type { MethodsFact, MethodsFactPassage } from "@/features/methods/model/methods.types";

type MarkdownBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string; key: number; sourceLine: number }
  | { type: "paragraph"; text: string; key: number; sourceLine: number }
  | { type: "list"; items: string[]; key: number; sourceLine: number };

interface DocumentGroup {
  key: string;
  blocks: MarkdownBlock[];
  passage?: MethodsFactPassage;
  facts: MethodsFact[];
}

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
  let listSourceLine = 0;

  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: "list", items: list, key: blocks.length, sourceLine: listSourceLine });
      list = [];
    }
  };

  for (const [sourceLine, line] of markdown.split(/\r?\n/).entries()) {
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
        sourceLine,
      });
      continue;
    }

    if (line.startsWith("- ")) {
      if (list.length === 0) listSourceLine = sourceLine;
      list.push(line.slice(2));
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: line, key: blocks.length, sourceLine });
  }
  flushList();

  return blocks;
}

function groupDocumentBlocks(
  blocks: MarkdownBlock[],
  passages: MethodsFactPassage[],
  facts: MethodsFact[],
): DocumentGroup[] {
  const factsByKey = new Map(facts.map((fact) => [fact.key, fact]));
  const groups: DocumentGroup[] = [];

  for (const block of blocks) {
    const passage = passages.find(({ startLine, endLine }) => block.sourceLine >= startLine && block.sourceLine < endLine);
    const key = passage ? `passage:${passage.id}` : `block:${block.key}`;
    const previous = groups.at(-1);
    if (previous?.key === key) {
      previous.blocks.push(block);
      continue;
    }

    groups.push({
      key,
      blocks: [block],
      passage,
      facts: passage ? passage.factKeys.flatMap((factKey) => {
        const fact = factsByKey.get(factKey);
        return fact ? [fact] : [];
      }) : [],
    });
  }

  return groups;
}

function renderMarkdownBlock(block: MarkdownBlock): ReactNode {
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
}

function GroundedPassage({
  group,
  documentId,
  isPinned,
  onPin,
  onUnpin,
  onRegister,
}: {
  group: DocumentGroup;
  documentId: string;
  isPinned: boolean;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onRegister: (id: string, element: HTMLDivElement | null) => void;
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const passage = group.passage;
  const canShowFacts = Boolean(passage && group.facts.length > 0);
  const isOpen = canShowFacts && (isPinned || isHovered || isFocused);
  const popoverId = `${documentId}-${passage?.id ?? "facts"}-sources`;
  const label = t("methods.factSourceMarker", { count: group.facts.length });

  return (
    <div
      id={passage ? `${documentId}-${passage.id}` : undefined}
      data-grounded-passage={passage?.id}
      ref={(element) => {
        if (passage) onRegister(passage.id, element);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !isOpen || !passage) return;
        event.preventDefault();
        onUnpin(passage.id);
        setIsHovered(false);
        setIsFocused(false);
        triggerRef.current?.blur();
      }}
      className={`relative space-y-3 rounded-xl px-2 py-2 transition-colors motion-reduce:transition-none ${
        isOpen ? "bg-primary/[0.06] ring-1 ring-primary/25" : ""
      }`}
    >
      {canShowFacts && passage && (
        <div
          className="relative z-10 flex justify-end"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-label={label}
            aria-expanded={Boolean(isOpen)}
            aria-controls={popoverId}
            aria-describedby={isOpen ? popoverId : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onClick={(event) => {
              if (isPinned) {
                onUnpin(passage.id);
                setIsFocused(false);
                setIsHovered(false);
                event.currentTarget.blur();
                return;
              }
              onPin(passage.id);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium text-foreground outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LinkIcon aria-hidden="true" className="size-3.5" />
            {label}
            <ChevronDownIcon aria-hidden="true" className={`size-3.5 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
          </button>
          <section
            id={popoverId}
            role="region"
            aria-label={t("methods.factSourcePopoverTitle")}
            hidden={!isOpen}
            className="absolute right-0 top-full mt-2 max-h-72 w-[min(28rem,calc(100vw-3rem))] overflow-y-auto overscroll-contain rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-border"
          >
            <h4 className="mb-3 text-sm font-semibold">{t("methods.factSourcePopoverTitle")}</h4>
            <MethodsFactList facts={group.facts} />
          </section>
        </div>
      )}
      {group.blocks.map(renderMarkdownBlock)}
    </div>
  );
}

export function MethodsDocument({
  markdown,
  facts,
  factPassages,
}: {
  markdown: string;
  facts: MethodsFact[];
  factPassages: MethodsFactPassage[];
}) {
  const { t } = useTranslation();
  const documentId = `methods-${useId()}`;
  const passageElements = useRef(new Map<string, HTMLDivElement>());
  const [pinnedPassageId, setPinnedPassageId] = useState<string | null>(null);
  const blocks = useMemo(() => parseGeneratedMarkdown(markdown), [markdown]);
  const groups = useMemo(() => groupDocumentBlocks(blocks, factPassages, facts), [blocks, facts, factPassages]);

  const handlePin = (id: string) => {
    setPinnedPassageId(id);
    const element = passageElements.current.get(id);
    if (element) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
    }
  };
  const handleUnpin = (id: string) => setPinnedPassageId((current) => current === id ? null : current);
  const handleRegister = (id: string, element: HTMLDivElement | null) => {
    if (element) passageElements.current.set(id, element);
    else passageElements.current.delete(id);
  };

  return (
    <article aria-label={t("methods.documentLabel")} className="mx-auto w-full max-w-[75ch] space-y-5 px-1 py-1 text-pretty sm:px-3">
      {groups.map((group) => (
        <GroundedPassage
          key={group.key}
          group={group}
          documentId={documentId}
          isPinned={group.passage?.id === pinnedPassageId}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onRegister={handleRegister}
        />
      ))}
    </article>
  );
}
