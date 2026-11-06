import type { PropsWithChildren } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function AppProviders({ children }: PropsWithChildren) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>;
}

