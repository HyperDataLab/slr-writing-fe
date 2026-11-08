import * as React from "react";
import { cn } from "@/shared/utils/cn";

export interface ListRowProps extends React.LiHTMLAttributes<HTMLLIElement> {
  interactive?: boolean;
}

function ListRow({ className, interactive = false, ...props }: ListRowProps) {
  return (
    <li
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm",
        interactive && "transition-colors hover:bg-secondary focus-within:bg-secondary focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
      data-interactive={interactive || undefined}
      {...props}
    />
  );
}

export { ListRow };
