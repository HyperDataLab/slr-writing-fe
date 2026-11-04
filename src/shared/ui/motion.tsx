import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

interface MotionRevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  delay?: number;
  effect?: "fade" | "rise";
}

export function MotionReveal({ children, delay = 0, effect = "rise", ...props }: MotionRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const entrance = effect === "fade" ? { opacity: 0 } : { opacity: 0, y: 10 };
  const visible = effect === "fade" ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : entrance}
      animate={visible}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28, delay: shouldReduceMotion ? 0 : delay, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionListItemProps extends Omit<HTMLMotionProps<"li">, "children"> {
  children: ReactNode;
  delay?: number;
}

export function MotionListItem({ children, delay = 0, ...props }: MotionListItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.li
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.24, delay: shouldReduceMotion ? 0 : delay, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.li>
  );
}
