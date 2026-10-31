import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type Step = {
  number: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const workflowSteps: Step[] = [
  {
    number: "01",
    title: "Import a reviewed run",
    description: "Bring an approved SLR run into an immutable writing snapshot.",
    icon: Squares2X2Icon,
  },
  {
    number: "02",
    title: "Plan the manuscript",
    description: "Build an outline and connect each section to reviewed findings.",
    icon: DocumentTextIcon,
  },
  {
    number: "03",
    title: "Draft with evidence",
    description: "Shape prose from a focused evidence pack and keep source links intact.",
    icon: ShieldCheckIcon,
  },
  {
    number: "04",
    title: "Verify before export",
    description: "Review citations, quality gates, and OWNER approvals before export.",
    icon: CheckBadgeIcon,
  },
];

const guardrails = [
  {
    title: "Snapshot-led",
    description: "Writing starts from a versioned, immutable copy of the reviewed run.",
  },
  {
    title: "Registry-only citations",
    description: "References must resolve to IDs already present in the snapshot.",
  },
  {
    title: "Human approvals",
    description: "The OWNER reviews the outline, draft, and final package at H1–H3.",
  },
];

export function OverviewPage() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const root = stepsRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-workflow-step]",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power2.out" },
      );
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div className="space-y-10">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" }}
        className="relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10 lg:px-12"
      >
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-32 -z-10 size-96 rounded-full border border-white/15"
        />
        <div
          aria-hidden="true"
          className="absolute -right-5 -top-16 -z-10 size-64 rounded-full border border-white/15"
        />
        <div className="max-w-3xl">
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
            Evidence-first scientific writing
          </Badge>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Turn a reviewed SLR into a traceable manuscript.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Move from an approved review run to a carefully checked draft while keeping every claim
            connected to its source evidence.
          </p>
          <Button
            asChild
            variant="secondary"
            className="mt-7 bg-white text-primary hover:bg-white/90"
          >
            <Link to="/projects">
              View projects
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.section>

      <section aria-labelledby="workflow-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Writing workflow
            </p>
            <h2 id="workflow-heading" className="mt-1 text-xl font-semibold tracking-tight">
              From reviewed evidence to export
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Each stage keeps the scientific record separate from the writing process.
          </p>
        </div>

        <div ref={stepsRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} data-workflow-step className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="guardrails-heading">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Built around the research record
          </p>
          <h2 id="guardrails-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Clear boundaries at every step
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {guardrails.map((item) => (
            <div key={item.title} className="border-l-2 border-primary/25 pl-4">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

