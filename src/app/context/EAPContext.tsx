import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EAP, Phase } from '../types';
import { STORAGE_KEYS, STORAGE_VERSIONS } from '../constants/project';
import { normalizeProjectRoleKey } from '../utils/phaseOwnership';

interface EAPContextType {
  eapTemplates: EAP[];
  addEAPTemplate: (eap: EAP) => void;
  duplicateEAPTemplate: (id: string) => string | null;
  updateEAPTemplate: (id: string, updates: Partial<EAP>) => void;
  deleteEAPTemplate: (id: string) => void;
  getEAPTemplate: (id: string) => EAP | undefined;
}

interface StorageEnvelope<T> {
  version: number;
  data: T;
}

const EAPContext = createContext<EAPContextType | undefined>(undefined);

const createEntityId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const duplicateTemplatePhases = (phases: Phase[] = []): Phase[] =>
  phases.map((phase, phaseIndex) => {
    const nextPhaseId = createEntityId('phase');
    return {
      ...phase,
      id: nextPhaseId,
      order: phaseIndex + 1,
      milestones: (phase.milestones || []).map((milestone, milestoneIndex) => {
        const nextMilestoneId = createEntityId('milestone');
        return {
          ...milestone,
          id: nextMilestoneId,
          order: milestoneIndex + 1,
          tasks: (milestone.tasks || []).map((task, taskIndex) => ({
            ...task,
            id: createEntityId('task'),
            order: taskIndex + 1,
            phaseId: nextPhaseId,
            milestoneId: nextMilestoneId,
          })),
        };
      }),
    };
  });

const normalizeTemplatePhases = (phases?: Phase[]): Phase[] =>
  [...(phases || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((phase, index) => ({
      ...phase,
      order: index + 1,
      phaseType: 'execution',
      expectedRoleKey:
        phase.expectedRoleKey || normalizeProjectRoleKey(phase.expectedRoleLabel),
      milestones: [...(phase.milestones || [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((milestone, milestoneIndex) => ({
          ...milestone,
          order: milestoneIndex + 1,
          tasks: (milestone.tasks || []).map((task, taskIndex) => ({
            ...task,
            order: taskIndex + 1,
            phaseId: task.phaseId || phase.id,
            milestoneId: task.milestoneId || milestone.id,
            subtasks: task.subtasks || [],
            checklistItems: task.checklistItems || [],
            attachments: task.attachments || [],
            comments: task.comments || [],
            timeLogs: task.timeLogs || [],
          })),
        })),
    }));

const normalizeEAPTemplate = (template: EAP): EAP => ({
  ...template,
  projectTypeId: template.projectTypeId,
  phases: normalizeTemplatePhases(template.phases),
  updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
});

const eapSeedTemplates: EAP[] = [
  {
    id: 'eap-tpl-fábrica',
    name: 'EAP Padrão - Fábrica',
    description:
      'Template padrão para projetos da Fábrica com 3 fases: Análise, Desenvolvimento e Testes',
    isActive: true,
    phases: [
      {
        id: 'phase-analise-001',
        name: 'Fase 1: Análise',
        description: 'Fase de levantamento, análise de requisitos e viabilidade',
        expectedRoleLabel: 'Analista de Negócios',
        order: 1,
        phaseType: 'execution',
        milestones: [
          {
            id: 'milestone-analise-001',
            name: 'Análise Inicial',
            type: 'business',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 5,
            description: 'Levantamento de requisitos e alinhamento com stakeholders',
            tasks: [],
            order: 1,
          },
          {
            id: 'milestone-analise-002',
            name: 'Viabilidade e Planejamento',
            type: 'business',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 5,
            description: 'Análise de viabilidade técnica, recursos e riscos',
            tasks: [],
            order: 2,
          },
        ],
      },
      {
        id: 'phase-dev-001',
        name: 'Fase 2: Desenvolvimento',
        description: 'Fase de implementação técnica',
        expectedRoleLabel: 'Desenvolvedor',
        order: 2,
        phaseType: 'execution',
        milestones: [
          {
            id: 'milestone-dev-001',
            name: 'Desenvolvimento',
            type: 'technical',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 10,
            description: 'Implementação das funcionalidades de acordo com requisitos',
            tasks: [],
            order: 1,
          },
          {
            id: 'milestone-dev-002',
            name: 'Code Review e Integração',
            type: 'technical',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 3,
            description: 'Review de código e integração com sistemas existentes',
            tasks: [],
            order: 2,
          },
        ],
      },
      {
        id: 'phase-testes-001',
        name: 'Fase 3: Testes e Entrega',
        description: 'Fase de testes, ajustes e entrega para produção',
        expectedRoleLabel: 'Tester',
        order: 3,
        phaseType: 'execution',
        milestones: [
          {
            id: 'milestone-testes-001',
            name: 'Testes',
            type: 'delivery',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 5,
            description: 'Testes de qualidade, performance e segurança',
            tasks: [],
            order: 1,
          },
          {
            id: 'milestone-testes-002',
            name: 'Entrega em Produção',
            type: 'delivery',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 2,
            description: 'Deploy em produção e suporte inicial',
            tasks: [],
            order: 2,
          },
        ],
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
].map(normalizeEAPTemplate);

const getInitialTemplates = (): EAP[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.eapTemplates);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((template) => normalizeEAPTemplate(template as EAP));
      }
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as StorageEnvelope<EAP[]>).data)
      ) {
        return (parsed as StorageEnvelope<EAP[]>).data.map((template) =>
          normalizeEAPTemplate(template)
        );
      }
    }
  } catch (error) {
    console.warn('[EAPContext] Erro ao ler localStorage - aplicando fallback:', error);
  }

  return eapSeedTemplates;
};

export function EAPProvider({ children }: { children: ReactNode }) {
  const [eapTemplates, setEAPTemplates] = useState<EAP[]>(() => getInitialTemplates());

  useEffect(() => {
    const payload: StorageEnvelope<EAP[]> = {
      version: STORAGE_VERSIONS.eapTemplates,
      data: eapTemplates.map((template) => normalizeEAPTemplate(template)),
    };
    localStorage.setItem(STORAGE_KEYS.eapTemplates, JSON.stringify(payload));
  }, [eapTemplates]);

  const addEAPTemplate = (eap: EAP) => {
    setEAPTemplates((prev) => [...prev, normalizeEAPTemplate(eap)]);
  };

  const duplicateEAPTemplate: EAPContextType['duplicateEAPTemplate'] = (id) => {
    const template = eapTemplates.find((candidate) => candidate.id === id);
    if (!template) return null;

    const timestamp = new Date().toISOString();
    const duplicatedTemplate: EAP = {
      ...template,
      id: createEntityId('eap'),
      name: `${template.name} (cópia)`,
      phases: duplicateTemplatePhases(template.phases),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addEAPTemplate(duplicatedTemplate);
    return duplicatedTemplate.id;
  };

  const updateEAPTemplate = (id: string, updates: Partial<EAP>) => {
    setEAPTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? normalizeEAPTemplate({
              ...template,
              ...updates,
              updatedAt: new Date().toISOString(),
            } as EAP)
          : template
      )
    );
  };

  const deleteEAPTemplate = (id: string) => {
    setEAPTemplates((prev) => prev.filter((template) => template.id !== id));
  };

  const getEAPTemplate = (id: string): EAP | undefined => {
    return eapTemplates.find((template) => template.id === id);
  };

  return (
    <EAPContext.Provider
      value={{
        eapTemplates,
        addEAPTemplate,
        duplicateEAPTemplate,
        updateEAPTemplate,
        deleteEAPTemplate,
        getEAPTemplate,
      }}
    >
      {children}
    </EAPContext.Provider>
  );
}

export function useEAP() {
  const context = useContext(EAPContext);
  if (!context) {
    throw new Error('useEAP must be used within EAPProvider');
  }
  return context;
}
