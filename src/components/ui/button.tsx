import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "expense" | "income" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500":
              variant === "expense",
            "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500":
              variant === "income",
            "border-2 border-gray-200 bg-white hover:bg-gray-50 focus-visible:ring-gray-400":
              variant === "outline",
            "hover:bg-gray-100 focus-visible:ring-gray-400":
              variant === "ghost",
          },
          {
            "h-11 px-4 text-sm": size === "default",
            "h-9 px-3 text-sm": size === "sm",
            "h-14 px-6 text-base": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
