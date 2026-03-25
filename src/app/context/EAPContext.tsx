import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EAP, Phase, Milestone } from '../types';

interface EAPContextType {
  eapTemplates: EAP[];
  addEAPTemplate: (eap: EAP) => void;
  updateEAPTemplate: (id: string, updates: Partial<EAP>) => void;
  deleteEAPTemplate: (id: string) => void;
  getEAPTemplate: (id: string) => EAP | undefined;
}

const EAPContext = createContext<EAPContextType | undefined>(undefined);

const STORAGE_KEY = 'crisdu_eap_templates';

/**
 * Carrega templates EAP do localStorage ou usa seed padrão
 * SEMPRE aplica migração para garantir compatibilidade
 */
const getInitialTemplates = (): EAP[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[EAPContext] Carregado do localStorage:', parsed.length, 'templates EAP');
      return parsed;
    }
  } catch (error) {
    console.warn('[EAPContext] Erro ao ler localStorage - aplicando fallback:', error);
  }

  // Fallback: usar seed padrão
  console.log('[EAPContext] Usando templates seed padrão');
  return eapSeedTemplates;
};

/**
 * Templates EAP padrão (seed)
 * Estrutura: fases com marcos, tarefas vazias (usuário preenche depois)
 */
const eapSeedTemplates: EAP[] = [
  {
    id: 'eap-tpl-fábrica',
    name: 'EAP Padrão - Fábrica',
    description: 'Template padrão para projetos da Fábrica com 3 fases: Análise, Desenvolvimento e Testes',
    isActive: true,
    phases: [
      {
        id: 'phase-analise-001',
        name: 'Fase 1: Análise',
        description: 'Fase de levantamento, análise de requisitos e viabilidade',
        order: 1,
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
        order: 2,
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
        order: 3,
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
];

export function EAPProvider({ children }: { children: ReactNode }) {
  const [eapTemplates, setEAPTemplates] = useState<EAP[]>(() => getInitialTemplates());

  // Sincroniza templates com localStorage sempre que state muda
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eapTemplates));
    console.log('[EAPContext] Salvando', eapTemplates.length, 'templates EAP no localStorage');
  }, [eapTemplates]);

  const addEAPTemplate = (eap: EAP) => {
    setEAPTemplates(prev => [...prev, eap]);
    console.log('[EAPContext] Template adicionado:', eap.id);
  };

  const updateEAPTemplate = (id: string, updates: Partial<EAP>) => {
    setEAPTemplates(prev =>
      prev.map(template =>
        template.id === id
          ? { ...template, ...updates, updatedAt: new Date().toISOString() }
          : template
      )
    );
    console.log('[EAPContext] Template atualizado:', id);
  };

  const deleteEAPTemplate = (id: string) => {
    setEAPTemplates(prev => prev.filter(template => template.id !== id));
    console.log('[EAPContext] Template deletado:', id);
  };

  const getEAPTemplate = (id: string): EAP | undefined => {
    return eapTemplates.find(template => template.id === id);
  };

  return (
    <EAPContext.Provider
      value={{
        eapTemplates,
        addEAPTemplate,
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
