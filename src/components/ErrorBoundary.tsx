import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // En producción: reportar a un servicio como Sentry.
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
          <AlertTriangle className="size-16 text-warning" aria-hidden />
          <h1 className="mt-6 font-display text-display-sm text-[var(--text-primary)]">
            Algo salió mal
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Ocurrió un error inesperado. Por favor recargá la página.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex min-h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand/90"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
          {import.meta.env.DEV && this.state.error ?
            <pre className="mt-8 max-w-2xl overflow-x-auto rounded-lg bg-[var(--bg-input)] p-4 text-left text-xs text-[var(--text-secondary)]">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          : null}
        </div>
      );
    }

    return this.props.children;
  }
}
