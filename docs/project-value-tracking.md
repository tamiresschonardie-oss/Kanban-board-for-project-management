# Acompanhamento de Valor Gerado

## Visão geral

O sistema agora possui dois ciclos por projeto:

1. Fluxo Labs / execução
   Termina quando o projeto entra em fase terminal do Kanban principal.

2. Fluxo de valor / resultado
   Continua após a entrega para medir benefício real, percepção de valor e maturação do resultado.

`concluido` no fluxo Labs não significa que o valor já foi encerrado.

## Entidades principais

### Projeto

Campos relevantes:

- `resultMaturityType`
- `resultStatus`
- `resultScheduleMode`
- `resultOwnerId`
- `resultCustomEvaluationOffsetsDays`
- `impactLevel`
- `nextResultEvaluationAt`
- `valueRealizationSummary`
- `projectKpis`
- `resultEvaluations`
- `expectedBenefits`
- `realizedBenefits`

### KPI do projeto

Usado para registrar baseline, esperado e real.
Pode representar tempo, financeiro, produtividade, qualidade, uso, satisfação ou outro.

### Avaliação de resultado

Representa cada checkpoint do ciclo de valor.
Pode ser automática na criação da agenda ou manual.

Campos relevantes:

- `label`
- `sequence`
- `scheduledAt`
- `completedAt`
- `status`
- `responsibleId`
- `valueScore`
- `summary`
- `notes`
- `isAutoScheduled`

## Statuses

### Fluxo Labs

Usa o status/fase operacional do projeto e continua sendo o critério do Kanban principal.

### Fluxo de valor

- `nao_iniciado`
- `aguardando_avaliacao`
- `em_avaliacao`
- `avaliado`
- `encerrado`

Regras:

- `encerrado` é uma ação mais forte e não deve acontecer automaticamente.
- O ciclo só pode ser encerrado quando houver ao menos uma avaliação concluída e nenhum checkpoint aberto.
- Se existir avaliação aberta, o status derivado volta para `aguardando_avaliacao` ou `em_avaliacao`.

## Estratégia de maturação

As regras ficam centralizadas em `projectValueMetadata.ts`.

Configuração atual:

- `imediato`: 1 checkpoint
- `curto_prazo`: 1 checkpoint
- `medio_prazo`: 2 checkpoints
- `longo_prazo`: 3 checkpoints

Cada projeto pode sobrescrever isso usando:

- `resultScheduleMode = custom`
- `resultCustomEvaluationOffsetsDays`

## Impacto

Hoje o impacto continua manual:

- `baixo`
- `medio`
- `alto`

Mas a arquitetura já deixa espaço para sinais futuros com base em:

- nota de valor
- KPIs
- economia
- produtividade
- uso

## Responsabilidade

`resultOwnerId` define o owner preferencial do acompanhamento.

Fallback atual:

1. `resultOwnerId`
2. papel do projeto com nome contendo `anal`
3. papel do projeto com nome contendo `pmo`
4. responsável operacional do projeto

## Onde cada tela entra

- Card do projeto
  Opera no detalhe do projeto e permite editar KPIs, benefícios, owner, agenda e avaliações.

- Painel de resultados
  Funciona como fila operacional de follow-up pós-entrega.

- Dashboard de valor
  Faz leitura executiva agregada; não substitui o painel operacional.

## Princípio-chave

Nunca manter projeto no Kanban principal apenas porque o valor ainda está maturando.
