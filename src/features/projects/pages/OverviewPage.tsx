import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { useTranslation } from "react-i18next";
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const workflowSteps: Step[] = [
  {
    number: "01",
    icon: Squares2X2Icon,
  },
  {
    number: "02",
    icon: DocumentTextIcon,
  },
  {
    number: "03",
    icon: ShieldCheckIcon,
  },
  {
    number: "04",
    icon: CheckBadgeIcon,
  },
];

export function OverviewPage() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();

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
            {t("overview.badge")}
          </Badge>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t("overview.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            {t("overview.description")}
          </p>
          <Button
            asChild
            variant="secondary"
            className="mt-7 bg-white text-primary hover:bg-white/90"
          >
            <Link to="/projects">
              {t("overview.viewProjects")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.section>

      <section aria-labelledby="workflow-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {t("overview.workflowLabel")}
            </p>
            <h2 id="workflow-heading" className="mt-1 text-xl font-semibold tracking-tight">
              {t("overview.workflowTitle")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t("overview.workflowDescription")}
          </p>
        </div>

        <div ref={stepsRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
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
                  <h3 className="mt-5 text-sm font-semibold text-foreground">{t(`overview.steps.${index}.title`)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`overview.steps.${index}.description`)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="guardrails-heading">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {t("overview.guardrailsLabel")}
          </p>
          <h2 id="guardrails-heading" className="mt-1 text-xl font-semibold tracking-tight">
            {t("overview.guardrailsTitle")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="border-l-2 border-primary/25 pl-4">
              <h3 className="text-sm font-semibold">{t(`overview.guardrails.${index}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t(`overview.guardrails.${index}.description`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

