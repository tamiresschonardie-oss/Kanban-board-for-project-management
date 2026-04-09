import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAdmin } from './AdminContext';

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface UserKanbanContextType {
  columns: KanbanColumn[];
  addColumn: (column: Omit<KanbanColumn, 'id' | 'order'>) => void;
  updateColumn: (id: string, updates: Partial<KanbanColumn>) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (columns: KanbanColumn[]) => void;
}

const UserKanbanContext = createContext<UserKanbanContextType | undefined>(undefined);
const STORAGE_KEY = 'user-kanban-columns';

const getStorageKey = (userId?: string) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

// Default columns for personal kanban
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', order: 0, color: 'bg-gray-100 border-gray-300' },
  { id: 'in-progress', name: 'Em andamento', order: 1, color: 'bg-blue-100 border-blue-300' },
  { id: 'testing', name: 'Em testes', order: 2, color: 'bg-yellow-100 border-yellow-300' },
  { id: 'done', name: 'Concluído', order: 3, color: 'bg-green-100 border-green-300' },
];

export function UserKanbanProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAdmin();

  const readColumns = (userId?: string) => {
    try {
      const userScopedKey = getStorageKey(userId);
      const stored = localStorage.getItem(userScopedKey);

      if (!stored && userId) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          localStorage.setItem(userScopedKey, legacy);
          return JSON.parse(legacy) as KanbanColumn[];
        }
      }

      if (!stored) return DEFAULT_COLUMNS;

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_COLUMNS;

      return parsed as KanbanColumn[];
    } catch {
      return DEFAULT_COLUMNS;
    }
  };

  const [columns, setColumns] = useState<KanbanColumn[]>(() => readColumns(currentUser?.id));

  useEffect(() => {
    setColumns(readColumns(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser?.id), JSON.stringify(columns));
  }, [columns, currentUser?.id]);

  const addColumn = (column: Omit<KanbanColumn, 'id' | 'order'>) => {
    const newColumn: KanbanColumn = {
      ...column,
      id: `column-${Date.now()}`,
      order: columns.length,
    };
    setColumns([...columns, newColumn]);
  };

  const updateColumn = (id: string, updates: Partial<KanbanColumn>) => {
    setColumns(prev => prev.map(col => (col.id === id ? { ...col, ...updates } : col)));
  };

  const deleteColumn = (id: string) => {
    if (columns.length <= 1) {
      return;
    }
    setColumns(prev => prev.filter(col => col.id !== id));
  };

  const reorderColumns = (newColumns: KanbanColumn[]) => {
    setColumns(newColumns.map((col, index) => ({ ...col, order: index })));
  };

  return (
    <UserKanbanContext.Provider
      value={{
        columns,
        addColumn,
        updateColumn,
        deleteColumn,
        reorderColumns,
      }}
    >
      {children}
    </UserKanbanContext.Provider>
  );
}

export function useUserKanban() {
  const context = useContext(UserKanbanContext);
  if (!context) {
    throw new Error('useUserKanban must be used within UserKanbanProvider');
  }
  return context;
}
