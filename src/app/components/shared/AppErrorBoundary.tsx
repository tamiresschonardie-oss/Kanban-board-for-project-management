import { Component, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  area: string;
  title?: string;
  message?: string;
  className?: string;
  resetKey?: string;
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    const componentStack =
      typeof errorInfo === 'object' && errorInfo !== null && 'componentStack' in errorInfo
        ? (errorInfo as { componentStack?: string }).componentStack
        : undefined;

    console.error(
      `[AppErrorBoundary] render crash in "${this.props.area}"`,
      {
        area: this.props.area,
        resetKey: this.props.resetKey,
        error,
        componentStack,
      }
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={
            this.props.className ||
            'rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 shadow-sm'
          }
          role="alert"
        >
          <h2 className="text-base font-semibold">
            {this.props.title || 'Nao foi possivel carregar esta area'}
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            {this.props.message ||
              'Encontramos um erro de renderizacao neste bloco. O restante da aplicacao continua disponivel.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
