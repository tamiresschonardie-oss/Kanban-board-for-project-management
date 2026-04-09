# MVP Legacy Compatibility Notes

Este arquivo registra o que ainda foi mantido no MVP apenas por compatibilidade temporária, para evitar que essas peças sejam confundidas com os fluxos canônicos.

## Fluxos canônicos atuais

- Projeto:
  - criação/edição por `src/app/components/ProjectModal.tsx`
  - detalhamento por `src/app/pages/ProjectDetail.tsx`
- Tarefa:
  - criação/edição/detalhe por `src/app/components/TaskModal.tsx`
- Governança:
  - `src/app/pages/Governance.tsx`
- Workspace:
  - `src/app/pages/TeamWorkspace.tsx`
- Gantt:
  - `src/app/pages/GanttView.tsx`
  - `src/app/components/ProjectGanttTab.tsx`

## Mantido por compatibilidade temporária

- `src/app/components/EnhancedProjectModal.tsx`
  - Wrapper fino para abertura do fluxo canônico de projeto a partir do layout.
  - Pode ser removido no futuro se o `Layout` passar a abrir `ProjectModal` diretamente.

- Campos espelhados no modelo de `Project`
  - `status`
  - `situation`
  - `phases`
  - `eapId`
  - `progress`
  - `tasksCompleted`
  - `tasksTotal`
  - `hoursRemaining`
  - `totalTimeTracked`
  - `requester`
  - `isPaused`
  - Continuam existindo apenas para compatibilidade transitória com partes ainda não totalmente migradas.
  - A fonte de verdade é a estrutura canônica:
    - `project.governance`
    - `project.execution`
    - `project.metrics`
  - A leitura de compatibilidade agora está concentrada principalmente em:
    - `src/app/context/ProjectContext.tsx` para normalização/migração
    - `src/app/utils/projectSelectors.ts` para acesso canônico ao solicitante

## Decisões desta estabilização

- O fluxo legado `ProjectDetailModal` foi removido do uso ativo e do código.
- A navegação de cards/listas/workspaces agora converge para `ProjectDetail`.
- Wrappers antigos de tarefa foram removidos; o fluxo principal agora usa `TaskModal` diretamente.
- Telas e componentes mortos ou paralelos antigos foram removidos para reduzir manutenção indevida.
