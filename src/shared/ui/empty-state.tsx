import * as React from "react";
import { cn } from "@/shared/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function EmptyState({ className, ...props }: EmptyStateProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { EmptyState };
