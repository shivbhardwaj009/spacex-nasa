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
          className={`flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 border border-slate-800 rounded-xl m-2 ${this.props.className || ""}`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 text-lg font-medium mb-3">
            !
          </div>
          <h3 className="text-sm font-semibold text-white font-sans mb-1">
            {this.props.fallbackTitle || "Component Encountered an Issue"}
          </h3>
          <p className="text-xs text-slate-400 font-mono mb-4 max-w-sm truncate">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="text-xs border-slate-700 hover:border-slate-500 text-slate-300"
          >
            Retry View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

