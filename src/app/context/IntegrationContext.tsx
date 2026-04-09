import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DomainEvent, IntegrationConfig, IntegrationLog } from '../types';
import { dispatchIntegrationEvent } from '../services/integrationDispatcher';

interface IntegrationContextType {
  integrationConfigs: IntegrationConfig[];
  integrationLogs: IntegrationLog[];
  domainEvents: DomainEvent[];
  addIntegrationConfig: (config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateIntegrationConfig: (id: string, updates: Partial<IntegrationConfig>) => void;
  deleteIntegrationConfig: (id: string) => void;
  publishDomainEvent: (event: Omit<DomainEvent, 'id' | 'createdAt'>) => Promise<DomainEvent>;
}

interface IntegrationStorageShape {
  integrationConfigs: IntegrationConfig[];
  integrationLogs: IntegrationLog[];
  domainEvents: DomainEvent[];
}

const STORAGE_KEY = 'crisdu_integrations_data';

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

function readStorage(): IntegrationStorageShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const now = new Date().toISOString();
      return {
        integrationConfigs: [
          {
            id: 'integration-seed-n8n',
            name: 'Webhook n8n',
            type: 'n8n',
            endpoint: '',
            method: 'POST',
            headersJson: {},
            authType: 'none',
            authConfigJson: {},
            subscribedEvents: ['project.phase_changed', 'task.completed'],
            isActive: false,
            timeoutMs: 8000,
            retryCount: 2,
            createdAt: now,
            updatedAt: now,
          },
        ],
        integrationLogs: [],
        domainEvents: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<IntegrationStorageShape>;
    return {
      integrationConfigs: Array.isArray(parsed.integrationConfigs) ? parsed.integrationConfigs : [],
      integrationLogs: Array.isArray(parsed.integrationLogs) ? parsed.integrationLogs : [],
      domainEvents: Array.isArray(parsed.domainEvents) ? parsed.domainEvents : [],
    };
  } catch {
    return {
      integrationConfigs: [],
      integrationLogs: [],
      domainEvents: [],
    };
  }
}

export function IntegrationProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<IntegrationStorageShape>(() => readStorage());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }, [storage]);

  const addIntegrationConfig: IntegrationContextType['addIntegrationConfig'] = (config) => {
    const now = new Date().toISOString();
    const nextId = `integration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextConfig: IntegrationConfig = {
      id: nextId,
      createdAt: now,
      updatedAt: now,
      ...config,
    };
    setStorage((prev) => ({
      ...prev,
      integrationConfigs: [nextConfig, ...prev.integrationConfigs],
    }));
    return nextId;
  };

  const updateIntegrationConfig: IntegrationContextType['updateIntegrationConfig'] = (id, updates) => {
    setStorage((prev) => ({
      ...prev,
      integrationConfigs: prev.integrationConfigs.map((config) =>
        config.id === id
          ? { ...config, ...updates, updatedAt: new Date().toISOString() }
          : config
      ),
    }));
  };

  const deleteIntegrationConfig = (id: string) => {
    setStorage((prev) => ({
      ...prev,
      integrationConfigs: prev.integrationConfigs.filter((config) => config.id !== id),
      integrationLogs: prev.integrationLogs.filter((log) => log.integrationId !== id),
    }));
  };

  const publishDomainEvent: IntegrationContextType['publishDomainEvent'] = async (eventInput) => {
    const event: DomainEvent = {
      id: `domain-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...eventInput,
    };

    setStorage((prev) => ({
      ...prev,
      domainEvents: [event, ...prev.domainEvents].slice(0, 300),
    }));

    const matchingConfigs = storage.integrationConfigs.filter(
      (config) => config.isActive && config.subscribedEvents.includes(event.name)
    );

    const logGroups = await Promise.all(
      matchingConfigs.map((config) => dispatchIntegrationEvent(config, event))
    );

    const nextLogs = logGroups.flat();
    if (nextLogs.length > 0) {
      setStorage((prev) => ({
        ...prev,
        integrationLogs: [...nextLogs, ...prev.integrationLogs].slice(0, 500),
      }));
    }

    return event;
  };

  const value = useMemo<IntegrationContextType>(
    () => ({
      integrationConfigs: storage.integrationConfigs,
      integrationLogs: storage.integrationLogs,
      domainEvents: storage.domainEvents,
      addIntegrationConfig,
      updateIntegrationConfig,
      deleteIntegrationConfig,
      publishDomainEvent,
    }),
    [storage]
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegration must be used within IntegrationProvider');
  }
  return context;
}
