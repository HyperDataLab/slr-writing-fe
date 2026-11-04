import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
