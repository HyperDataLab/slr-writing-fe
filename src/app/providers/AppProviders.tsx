import type { PropsWithChildren } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ScrollbarAutohide } from "@/shared/ui/ScrollbarAutohide";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      {children}
      <ScrollbarAutohide />
    </TooltipPrimitive.Provider>
  );
}

