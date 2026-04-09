import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const isResponseError = isRouteErrorResponse(error);

  if (isResponseError) {
    console.error('[RouteErrorBoundary] route response error', error);
  } else {
    console.error('[RouteErrorBoundary] uncaught route error', error);
  }

  const title = isResponseError ? `Erro ${error.status}` : 'Nao foi possivel renderizar esta rota';
  const description = isResponseError
    ? error.statusText || 'A rota retornou uma resposta invalida.'
    : 'Um componente desta rota falhou ao carregar. A navegacao principal continua disponivel.';

  return (
    <div className="m-6 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 shadow-sm">
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-amber-900/80">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex items-center rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-950"
        >
          Ir para a home
        </Link>
        <Link
          to="/workspace"
          className="inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Abrir workspace
        </Link>
      </div>
    </div>
  );
}
