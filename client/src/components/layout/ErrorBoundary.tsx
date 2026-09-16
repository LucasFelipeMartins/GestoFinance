import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence against a render-time exception: without it React
 * unmounts the whole tree and the person is left staring at a blank page
 * with no way out but the address bar. Data is safe (it lives in IndexedDB
 * and on the server); this just offers the way back.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[app] render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-10 text-text-primary">
        <div className="w-full max-w-md rounded-[20px] border border-border bg-surface p-6 text-center shadow-card">
          <h1 className="text-h2">Algo deu errado</h1>
          <p className="mt-2 text-body text-text-secondary">
            A tela encontrou um erro inesperado. Seus dados estão salvos — recarregue para continuar.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-[12px] bg-sage-green px-4 py-2.5 text-body font-semibold text-white"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign('/');
              }}
              className="rounded-[12px] border border-border px-4 py-2.5 text-body font-semibold"
            >
              Ir para o início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
