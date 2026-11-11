"use client";

import React, { Component, type ReactNode } from "react";
import { Button } from "./Button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  className?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className={`flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 border border-rose-500/40 rounded-xl m-2 ${this.props.className || ""}`}
        >
          <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400 text-lg font-bold mb-3">
            !
          </div>
          <h3 className="text-sm font-bold text-white font-sans mb-1">
            {this.props.fallbackTitle || "Component Encountered an Issue"}
          </h3>
          <p className="text-xs text-rose-300 font-mono mb-4 max-w-sm truncate">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="text-xs border-rose-500/50 hover:border-rose-400 text-rose-200"
          >
            Retry View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

