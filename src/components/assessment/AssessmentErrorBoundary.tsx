import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class AssessmentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Assessment Error Boundary caught an error:', error, errorInfo);
    console.error('Error ID:', this.state.errorId);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Something went wrong loading this form
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please refresh the page to try again. If the problem persists, contact support.
            </p>
            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Error ID: {this.state.errorId}
            </div>
            <Button onClick={this.handleReset} variant="outline" size="sm">
              <RefreshCw className="w-3 h-3 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
