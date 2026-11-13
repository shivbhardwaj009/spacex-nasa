"use client";

import React, { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "amber"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base styles: touch-friendly minimum height (44px for md/lg), WCAG visible focus
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none " +
      "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-space-950 focus-visible:outline-none " +
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]";

    // Variant color mappings
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-space-950 font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30",
      secondary:
        "bg-space-850 hover:bg-space-800 text-space-100 border border-white/10 hover:border-space-600 shadow-md",
      amber:
        "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-space-950 font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30",
      outline:
        "bg-transparent hover:bg-white/10 text-space-100 border border-white/20 hover:border-cyan-400/50",
      ghost:
        "bg-transparent hover:bg-white/10 text-space-200 hover:text-white",
      danger:
        "bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-800/60 shadow-sm",
    };

    // Size mappings (min-height ensures 44px+ touch targets on mobile)
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "min-h-[36px] text-xs px-3 py-1.5 gap-1.5",
      md: "min-h-[44px] text-sm px-4 py-2 gap-2",
      lg: "min-h-[48px] text-base px-6 py-2.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

