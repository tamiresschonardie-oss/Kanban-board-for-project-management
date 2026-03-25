export const PROJECT_SITUATIONS = {
  ATIVO: 'ativo',
  PAUSADO: 'pausado',
  CANCELADO: 'cancelado',
} as const;

export const PROJECT_PURPOSES = {
  EXPANSAO: 'expansao',
  SUPORTE: 'suporte',
  INOVACAO: 'inovacao',
  SEGURANCA: 'seguranca',
  OPERACIONAL: 'operacional',
  ESTRATEGICO: 'estrategico',
} as const;

export const PROJECT_SITUATIONS_LABELS: Record<string, string> = {
  [PROJECT_SITUATIONS.ATIVO]: 'Ativo',
  [PROJECT_SITUATIONS.PAUSADO]: 'Pausado',
  [PROJECT_SITUATIONS.CANCELADO]: 'Cancelado',
};

export const PROJECT_PURPOSES_LABELS: Record<string, string> = {
  [PROJECT_PURPOSES.EXPANSAO]: 'Expansão',
  [PROJECT_PURPOSES.SUPORTE]: 'Suporte',
  [PROJECT_PURPOSES.INOVACAO]: 'Inovação',
  [PROJECT_PURPOSES.SEGURANCA]: 'Segurança',
  [PROJECT_PURPOSES.OPERACIONAL]: 'Operacional',
  [PROJECT_PURPOSES.ESTRATEGICO]: 'Estratégico',
};

export const PROJECT_SITUATIONS_OPTIONS = Object.entries(PROJECT_SITUATIONS).map(([key, value]) => ({
  value,
  label: PROJECT_SITUATIONS_LABELS[value],
}));

export const PROJECT_PURPOSES_OPTIONS = Object.entries(PROJECT_PURPOSES).map(([key, value]) => ({
  value,
  label: PROJECT_PURPOSES_LABELS[value],
}));
