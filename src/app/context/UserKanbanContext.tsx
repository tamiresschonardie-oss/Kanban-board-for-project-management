import React, { createContext, useContext, useState, ReactNode } from 'react';

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

// Default columns for personal kanban
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', order: 0, color: 'bg-gray-100 border-gray-300' },
  { id: 'in-progress', name: 'Em andamento', order: 1, color: 'bg-blue-100 border-blue-300' },
  { id: 'testing', name: 'Em testes', order: 2, color: 'bg-yellow-100 border-yellow-300' },
  { id: 'done', name: 'Concluído', order: 3, color: 'bg-green-100 border-green-300' },
];

export function UserKanbanProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS);

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
    // Don't allow deleting if it's the last column
    if (columns.length <= 1) {
      alert('Você precisa ter pelo menos uma coluna!');
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
