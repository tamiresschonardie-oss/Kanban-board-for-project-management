Crie um sistema completo de gestão de projetos moderno, com foco em governança, EAP por projeto e controle de marcos, inspirado em ferramentas como Linear, ClickUp e Notion, porém com abordagem estruturada para PMO.

## 🎨 Estilo visual
- Interface moderna, clean e profissional
- Tema claro com possibilidade dark
- Uso de cards com bordas suaves (rounded 12px+)
- Tipografia moderna (Inter ou similar)
- Cores neutras com destaque para status (verde, amarelo, vermelho, azul)
- Layout fluido, responsivo
- UX simples, porém poderoso (nível produto SaaS)

---

# 🧱 ESTRUTURA DO SISTEMA

O sistema deve ser dividido em módulos principais:

## 1. 🧭 GOVERNANÇA (VISÃO MACRO DE PROJETOS)

Criar uma tela principal onde a gestão (CEO / PMO) consiga visualizar TODOS os projetos.

Essa visualização NÃO deve ser apenas Kanban.

Criar 3 modos de visualização:

### 🔹 1.1 Lista Inteligente (principal)
- Lista de projetos com colunas:
  - Nome do projeto
  - Status atual (derivado da EAP)
  - Fase atual
  - Progresso (ex: 2/5 marcos concluídos)
  - Equipe responsável
  - Responsável
  - Data início / previsão fim
- Filtros por:
  - equipe
  - status
  - tipo de projeto
- Busca global

---

### 🔹 1.2 Kanban de Projetos (visão secundária)
- Colunas:
  - Backlog
  - Em análise
  - Em execução
  - Pausado
  - Concluído
- Cards de projeto contendo:
  - Nome
  - Fase atual
  - Progresso da fase
  - Indicador visual de risco
  - Badge da equipe
- O status do card deve parecer automático (não manual)

---

### 🔹 1.3 Visão por Equipes (workspace)
- Agrupar projetos por equipe:
  - Fábrica
  - AIO
  - Infra
- Cada grupo com seus projetos
- Layout tipo dashboard

---

## 2. 📂 DETALHE DO PROJETO (EAP POR PROJETO)

Criar uma tela ao clicar no projeto.

Essa é a parte mais importante.

---

### 🔹 2.1 Estrutura EAP (principal)

Criar uma visualização em árvore (tree view):

Projeto X
├── Fase: Análise
│   ├── Marco: Análise de Negócio
│   │   ├── Tarefa 1
│   ├── Marco: Análise Técnica
│   │   ├── Tarefa 2
├── Fase: Execução
│   ├── Marco: Backend
│   ├── Marco: Frontend

Requisitos:
- Expandir/recolher
- Drag & drop
- Status visual por item
- Ícones por tipo (fase, marco, tarefa)

---

### 🔹 2.2 Timeline / Gantt

- Visualização de fases e marcos no tempo
- Barras horizontais
- Dependências (opcional)
- Datas de início e fim

---

### 🔹 2.3 Kanban interno do projeto

- Colunas por status (To Do, Doing, Done)
- Cards são tarefas da EAP
- Filtro por fase/marco

---

### 🔹 2.4 Painel de Marcos (PMO)

- Lista de marcos do projeto:
  - Nome
  - Tipo (negócio, técnico, etc)
  - Status
  - Data início
  - Data fim
  - SLA
- Indicador de atraso
- Progresso da fase

---

### 🔹 2.5 Resumo do Projeto

- Fase atual
- Tempo em cada fase
- Indicador de risco
- % progresso geral
- Histórico de movimentações

---

## 3. ⚙️ CADASTROS (ADMIN)

Criar telas completas para:

---

### 🔹 3.1 Usuários
- Nome
- Email
- Equipe
- Papel (Admin, PMO, Operacional)
- Status (ativo/inativo)

---

### 🔹 3.2 Equipes
- Nome da equipe
- Descrição
- Membros

---

### 🔹 3.3 Produtos
- Nome
- Tipo
- Descrição

---

### 🔹 3.4 Sistemas
- Nome
- Integrações
- Descrição

---

### 🔹 3.5 Tipos de Projeto (IMPORTANTE)

- Nome (Ex: Integração, IA, Infra)
- Template de EAP associado

---

## 4. 🧠 CRIAÇÃO DE PROJETO

Tela de criação com:

- Nome
- Equipe
- Responsável
- Tipo de projeto
- Produto
- Sistema
- Datas
- Botão:
  → “Criar com template de EAP”

---

## 5. 🧩 DIFERENCIAIS IMPORTANTES

- Status do projeto NÃO é manual → é derivado da EAP
- Fase atual visível em todos os lugares
- Progresso baseado em marcos
- Permitir fases paralelas (ex: análise técnica + negócio)
- Projeto pode não ter todas as fases

---

## 6. 🧭 NAVEGAÇÃO

Menu lateral com:
- Governança
- Projetos
- Equipes
- Cadastros
- Relatórios

---

## 7. 📊 RELATÓRIOS (opcional mas desejado)

- Tempo por fase
- Projetos atrasados
- Gargalos por equipe
- SLA por tipo de projeto

---

## 🎯 OBJETIVO FINAL DO DESIGN

Criar uma interface que permita:
- Gestão macro confiável (CEO)
- Operação eficiente (times)
- Controle real de marcos (PMO)
- Flexibilidade por projeto (não por equipe)

---

Gerar telas completas e navegáveis com foco em UX clara, moderna e escalável.