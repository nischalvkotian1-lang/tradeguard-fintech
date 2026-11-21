import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production-grade Error Boundary component that catches runtime errors
 * in the React tree and displays a graceful fallback UI without crashing the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, error telemetry can be sent here safely
    if (import.meta.env.DEV) {
      // Dev warning suppressed in test/prod
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-navy-900/90 p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 mb-4">
              <AlertTriangle className="h-7 w-7 text-rose-400" aria-hidden="true" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">TradeGuard System Recovery</h1>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              An unexpected runtime error occurred within the analytics engine. Your active capital
              allocations and session safeguards remain intact.
            </p>

            {this.state.error && (
              <div className="mb-6 rounded-lg border border-white/10 bg-navy-950/80 p-3 text-left">
                <span className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  Diagnostic Information
                </span>
                <p className="font-mono text-xs text-rose-300 break-all">
                  {this.state.error.message || 'Unknown runtime exception'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
