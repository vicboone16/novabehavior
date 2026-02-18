/**
 * GlobalErrorBoundary — wraps major routes / layouts.
 * Catches React render errors that bypass the smaller AssessmentErrorBoundary.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/diagnosticLogger';

interface Props {
  children: ReactNode;
  /** Label for the region, e.g. "Dashboard", "Student Profile" */
  region?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorId: null };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(
      `ErrorBoundary[${this.props.region ?? 'global'}]`,
      `${error.name}: ${error.message}`,
      { componentStack: info.componentStack, errorId: this.state.errorId }
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="font-semibold text-lg">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {this.props.region ? `The "${this.props.region}" section crashed.` : 'An unexpected error occurred.'}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Please try again. If the issue persists, contact support with the error ID below.
          </p>

          <div className="bg-muted rounded-md p-3 font-mono text-xs text-muted-foreground">
            Error ID: {this.state.errorId}<br />
            {this.state.error?.name}: {this.state.error?.message}
          </div>

          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline" size="sm" className="flex-1">
              <RefreshCw className="w-3 h-3 mr-2" />
              Try Again
            </Button>
            <Button onClick={this.handleHome} size="sm" className="flex-1">
              <Home className="w-3 h-3 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
