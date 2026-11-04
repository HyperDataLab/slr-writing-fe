import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "outline" | "ghost";

export function Button({
  className,
  variant = "outline",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-700",
        variant === "outline" && "border border-neutral-300 bg-transparent text-neutral-800 hover:bg-neutral-100",
        variant === "ghost" && "bg-transparent text-neutral-700 hover:bg-neutral-100",
        className,
      )}
      {...props}
    />
  );
}
