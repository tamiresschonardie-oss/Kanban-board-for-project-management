import { useEffect, useMemo, useState } from 'react';
import { SavedView } from '../types';
import { useAdmin } from '../context/AdminContext';
import { useIntegration } from '../context/IntegrationContext';

const STORAGE_KEY = 'crisdu_saved_views';

function normalizeSavedView(value: unknown): SavedView | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<SavedView>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.userId !== 'string' ||
    typeof candidate.screenKey !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    userId: candidate.userId,
    screenKey: candidate.screenKey,
    name: candidate.name,
    filtersJson: Array.isArray(candidate.filtersJson) ? candidate.filtersJson : [],
    sortJson:
      candidate.sortJson && typeof candidate.sortJson === 'object' && !Array.isArray(candidate.sortJson)
        ? candidate.sortJson
        : undefined,
    viewMode: typeof candidate.viewMode === 'string' ? candidate.viewMode : undefined,
    isPinnedDefault: candidate.isPinnedDefault === true,
    createdAt:
      typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  };
}

function readSavedViews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as SavedView[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => normalizeSavedView(item))
          .filter((item): item is SavedView => item !== null)
      : [];
  } catch {
    return [] as SavedView[];
  }
}

export function useSavedViews(screenKey: string) {
  const { currentUser } = useAdmin();
  const { publishDomainEvent } = useIntegration();
  const [allViews, setAllViews] = useState<SavedView[]>(() => readSavedViews());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allViews));
  }, [allViews]);

  const views = useMemo(
    () =>
      allViews
        .filter((view) => view.userId === currentUser?.id && view.screenKey === screenKey)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [allViews, currentUser?.id, screenKey]
  );

  const pinnedView = views.find((view) => view.isPinnedDefault);

  const saveView = (params: {
    id?: string;
    name: string;
    filtersJson: SavedView['filtersJson'];
    sortJson?: SavedView['sortJson'];
    viewMode?: SavedView['viewMode'];
  }) => {
    if (!currentUser?.id) return null;
    const now = new Date().toISOString();

    if (params.id) {
      let updated: SavedView | null = null;
      setAllViews((prev) =>
        prev.map((view) => {
          if (view.id !== params.id) return view;
          updated = {
            ...view,
            name: params.name,
            filtersJson: params.filtersJson,
            sortJson: params.sortJson,
            viewMode: params.viewMode,
            updatedAt: now,
          };
          return updated;
        })
      );
      if (updated) {
        publishDomainEvent({
          name: 'saved_view.updated',
          entityType: 'saved_view',
          entityId: updated.id,
          payloadJson: {
            savedViewId: updated.id,
            userId: updated.userId,
            screenKey: updated.screenKey,
            name: updated.name,
          },
        });
      }
      return updated;
    }

    const created: SavedView = {
      id: `saved-view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: currentUser.id,
      screenKey,
      name: params.name,
      filtersJson: params.filtersJson,
      sortJson: params.sortJson,
      viewMode: params.viewMode,
      isPinnedDefault: false,
      createdAt: now,
      updatedAt: now,
    };
    setAllViews((prev) => [...prev, created]);
    publishDomainEvent({
      name: 'saved_view.created',
      entityType: 'saved_view',
      entityId: created.id,
      payloadJson: {
        savedViewId: created.id,
        userId: created.userId,
        screenKey: created.screenKey,
        name: created.name,
      },
    });
    return created;
  };

  const deleteView = (viewId: string) => {
    setAllViews((prev) => prev.filter((view) => view.id !== viewId));
  };

  const pinView = (viewId: string) => {
    setAllViews((prev) =>
      prev.map((view) => {
        if (view.userId !== currentUser?.id || view.screenKey !== screenKey) return view;
        return {
          ...view,
          isPinnedDefault: view.id === viewId,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const clearPinnedView = () => {
    setAllViews((prev) =>
      prev.map((view) => {
        if (view.userId !== currentUser?.id || view.screenKey !== screenKey || !view.isPinnedDefault) {
          return view;
        }
        return {
          ...view,
          isPinnedDefault: false,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  return {
    views,
    pinnedView,
    saveView,
    deleteView,
    pinView,
    clearPinnedView,
  };
}
