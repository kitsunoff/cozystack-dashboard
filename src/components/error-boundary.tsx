"use client";

import { Component, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

// React requires class component for error boundaries — no hook equivalent.
// This wraps it in a clean API.

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => React.ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { onReset: () => void },
  State
> {
  constructor(props: ErrorBoundaryProps & { onReset: () => void }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        });
      }

      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message}
        </p>
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [key, setKey] = useState(0);
  const handleReset = useCallback(() => setKey((k) => k + 1), []);

  return (
    <ErrorBoundaryInner key={key} fallback={fallback} onReset={handleReset}>
      {children}
    </ErrorBoundaryInner>
  );
}
