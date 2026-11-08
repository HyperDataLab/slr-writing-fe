import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn";

const buttonVariants = cva(
  "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl text-center text-sm font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-card text-foreground hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "min-h-11 px-4 py-2 md:min-h-10",
        sm: "min-h-11 rounded-xl px-3 py-2 md:min-h-9 md:rounded-lg",
        lg: "min-h-11 px-6 py-2.5",
        icon: "size-11 md:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    onClick,
    children,
    "aria-busy": ariaBusy,
    "aria-disabled": ariaDisabled,
    ...props
  }, ref) => {
    const Component = asChild ? Slot : "button";

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      if (isLoading) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <Component
        className={cn(buttonVariants({ variant, size }), isLoading && "relative", className)}
        data-button-variant={variant ?? "default"}
        aria-busy={isLoading || ariaBusy || undefined}
        aria-disabled={isLoading || ariaDisabled || undefined}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{children}</span>
            <span className="invisible" aria-hidden="true">{children}</span>
            <ArrowPathIcon className="absolute inset-0 m-auto animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </>
        ) : children}
      </Component>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
