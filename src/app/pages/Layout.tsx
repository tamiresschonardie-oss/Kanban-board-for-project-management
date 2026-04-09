import { Outlet, useLocation, useSearchParams } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { EnhancedProjectModal } from '../components/EnhancedProjectModal';
import { StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProjectDetailOverlay } from '../components/project/ProjectDetailOverlay';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { GlobalSearch } from '../components/GlobalSearch';
import { AppErrorBoundary } from '../components/shared/AppErrorBoundary';
import { QuickNoteDrawer } from '../components/personal/QuickNoteDrawer';

export function Layout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { closeProjectDetail } = useProjectDetailNavigation();
  const overlayProjectId = searchParams.get('project');
  const isStandaloneProjectRoute = location.pathname.startsWith('/project/');

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setIsQuickNoteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div className="app-shell flex h-screen">
      <Sidebar onCreateProject={() => setIsCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative z-30 border-b border-slate-200/70 bg-white/65 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-end gap-3 px-4 py-4 sm:px-6 md:px-8">
            <AppErrorBoundary
              area="layout-toolbar"
              title="Alguns atalhos nao puderam ser carregados"
              message="Busca global ou notificacoes falharam, mas o restante da pagina continua disponivel."
              className="contents"
            >
              <div className="min-w-0 flex-1 basis-full lg:order-2 lg:basis-auto lg:flex-none">
                <GlobalSearch />
              </div>
              <div className="flex shrink-0 items-center gap-3 lg:order-3">
                <button
                  type="button"
                  onClick={() => setIsQuickNoteOpen(true)}
                  title="Nova nota"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors hover:bg-white hover:text-slate-900"
                >
                  <StickyNote className="h-4 w-4" />
                </button>
                <NotificationCenter compact />
              </div>
            </AppErrorBoundary>
          </div>
        </div>
        <main className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 via-white/35 to-transparent" />
          <AppErrorBoundary
            area="route-content"
            title="Nao foi possivel renderizar esta rota"
            message="O conteudo principal falhou ao carregar. Recarregue a pagina ou navegue para outra rota enquanto analisamos o erro."
            className="m-6 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 shadow-sm"
            resetKey={`${location.pathname}${location.search}`}
          >
            <Outlet />
          </AppErrorBoundary>
        </main>
      </div>

      <AppErrorBoundary
        area="project-create-modal"
        title="Nao foi possivel abrir o modal de projeto"
        message="A tela principal segue disponivel enquanto este bloco e isolado."
        className="contents"
      >
        <EnhancedProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </AppErrorBoundary>

      <AppErrorBoundary
        area="quick-note-drawer"
        title="Nao foi possivel abrir a nota rapida"
        message="O restante da aplicacao continua disponivel enquanto esse painel e isolado."
        className="contents"
      >
        <QuickNoteDrawer
          isOpen={isQuickNoteOpen}
          onClose={() => setIsQuickNoteOpen(false)}
        />
      </AppErrorBoundary>

      {overlayProjectId && !isStandaloneProjectRoute && (
        <AppErrorBoundary
          area="project-detail-overlay"
          title="Nao foi possivel abrir o detalhe do projeto"
          message="Feche o detalhe e continue navegando pela aplicacao."
          className="contents"
        >
          <ProjectDetailOverlay
            projectId={overlayProjectId}
            onClose={closeProjectDetail}
          />
        </AppErrorBoundary>
      )}
    </div>
  );
}
