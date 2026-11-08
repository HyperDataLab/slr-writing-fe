import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";

interface MotionRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  delay?: number;
  effect?: "fade" | "rise";
}

function useGsapEntrance<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { delay = 0, effect = "rise" }: Pick<MotionRevealProps, "delay" | "effect"> = {},
) {
  const shouldReduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || shouldReduceMotion) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        effect === "fade" ? { autoAlpha: 0 } : { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.3,
          delay: Math.min(Math.max(delay, 0), 0.24),
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        },
      );
    }, element);

    return () => context.revert();
  }, [delay, effect, ref, shouldReduceMotion]);
}

/** Shared GSAP entrance; kept as MotionReveal to preserve existing call sites. */
export function MotionReveal({ children, delay = 0, effect = "rise", ...props }: MotionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapEntrance(ref, { delay, effect });

  return <div ref={ref} {...props}>{children}</div>;
}

export const GsapReveal = MotionReveal;

interface MotionListItemProps extends HTMLAttributes<HTMLLIElement> {
  children: ReactNode;
  delay?: number;
}

export function MotionListItem({ children, delay = 0, ...props }: MotionListItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  useGsapEntrance(ref, { delay, effect: "rise" });

  return <li ref={ref} {...props}>{children}</li>;
}

export const GsapListItem = MotionListItem;

interface GsapStaggerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  delay?: number;
  stagger?: number;
}

/** Staggers only the wrapper's direct content blocks, leaving their controls untouched. */
export function GsapStagger({ children, delay = 0, stagger = 0.055, ...props }: GsapStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || shouldReduceMotion) return;

    const targets = Array.from(root.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (targets.length === 0) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.3,
          delay: Math.min(Math.max(delay, 0), 0.24),
          stagger: Math.min(Math.max(stagger, 0), 0.1),
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        },
      );
    }, root);

    return () => context.revert();
  }, [delay, ref, shouldReduceMotion, stagger]);

  return <div ref={ref} {...props}>{children}</div>;
}

interface GsapRouteRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** A short route entrance used by the authenticated application shell. */
export function GsapRouteReveal({ children, ...props }: GsapRouteRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || shouldReduceMotion) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 5 },
        { autoAlpha: 1, y: 0, duration: 0.18, ease: "power2.out", clearProps: "opacity,visibility,transform" },
      );
    }, element);

    return () => context.revert();
  }, [ref, shouldReduceMotion]);

  return <div ref={ref} {...props}>{children}</div>;
}
