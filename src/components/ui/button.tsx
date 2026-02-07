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
            "bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500 shadow-lg shadow-blue-500/25":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 shadow-lg shadow-red-500/25":
              variant === "expense",
            "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500 shadow-lg shadow-emerald-500/25":
              variant === "income",
            "border-2 border-[#1e1e2e] bg-[#12121a] text-slate-300 hover:bg-[#1e1e2e] hover:text-slate-100 focus-visible:ring-blue-500":
              variant === "outline",
            "hover:bg-[#1e1e2e] text-slate-400 hover:text-slate-200 focus-visible:ring-blue-500":
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
