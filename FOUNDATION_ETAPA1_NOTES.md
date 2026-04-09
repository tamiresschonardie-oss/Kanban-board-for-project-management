# Etapa 1 - Notas de Compatibilidade

Esta etapa introduz a base canônica para separação entre Governança e Execução:

- `project.governance`
- `project.execution`
- `project.metrics`

Para evitar retrabalho grande nesta entrega, vários componentes ainda operam com espelhos de compatibilidade:

- `project.status` espelha `project.governance.currentPhaseId`
- `project.situation` espelha `project.governance.situation`
- `project.eapId` espelha `project.execution.eapTemplateId`
- `project.phases` espelha `project.execution.phases`
- `project.progress`, `project.tasksCompleted`, `project.tasksTotal`, `project.hoursRemaining`, `project.totalTimeTracked` espelham `project.metrics`

## Componentes ainda semanticamente transitórios

- `src/app/pages/Governance.tsx`
  - Ainda trata `status` como fase macro fixa em colunas hardcoded.
- `src/app/pages/ProjectDetail.tsx`
  - Ainda usa estrutura mock local quando o projeto não possui fases reais.
- `src/app/components/ProjectDetailModal.tsx`
  - Continua assumindo a estrutura `phases -> milestones -> tasks`, sem distinguir explicitamente a nova camada canônica `execution`.
- `src/app/components/ProjectSummary.tsx`
  - Ainda consome métricas espelhadas e `project.activities` como fallback.
- `src/app/components/TaskModal.tsx`
  - Continua gravando tarefas na estrutura `project.phases`, sustentada agora pelo espelho de compatibilidade.
- `src/app/pages/Home.tsx`, `src/app/pages/MyTasks.tsx`, `src/app/pages/MyTasksRefined.tsx`, `src/app/pages/MyTasksKanban.tsx`
  - Ainda leem tarefas a partir de `project.phases`.

## Decisão desta etapa

Esses pontos foram mantidos de propósito para:

- evitar retrabalho visual e funcional antes da hora;
- preservar o comportamento atual;
- permitir que as próximas etapas migrem tela por tela para os campos canônicos.
