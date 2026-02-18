/**
 * GlobalErrorBoundary.test.tsx
 * Tests for the global React error boundary component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import React from 'react';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

// Suppress React's error boundary console noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  vi.restoreAllMocks();
});

// A component that throws on demand
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test explosion!');
  return <div>Everything is fine</div>;
};

describe('GlobalErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <GlobalErrorBoundary region="TestRegion">
        <div>Safe content</div>
      </GlobalErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <GlobalErrorBoundary region="TestRegion">
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/TestRegion/)).toBeInTheDocument();
  });

  it('shows error ID in the fallback UI', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('shows error name and message', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText(/Test explosion!/)).toBeInTheDocument();
  });

  it('"Try Again" button is present and clickable in error state', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // The "Try Again" button must exist and be clickable (no throw)
    const btn = screen.getByRole('button', { name: /try again/i });
    expect(btn).toBeInTheDocument();
    // Clicking it should not throw — reset is idempotent
    expect(() => fireEvent.click(btn)).not.toThrow();
  });

  it('renders without region prop', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
  });
});
