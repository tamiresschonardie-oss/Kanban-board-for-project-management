import { useMemo, useRef, useState } from 'react';
import { Plus, Star, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { TagScope } from '../../types';

interface TagSelectorProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  scope: TagScope;
  workspaceId?: string;
  placeholder?: string;
  emptyMessage?: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');

export function TagSelector({
  value,
  onChange,
  scope,
  workspaceId,
  placeholder = 'Buscar ou criar tag',
  emptyMessage = 'Nenhuma tag disponível.',
}: TagSelectorProps) {
  const { tags, ensureTag, toggleFavoriteTag, isFavoriteTag } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const availableTags = useMemo(
    () =>
      tags
        .filter((tag) => {
          const scopeMatches = tag.scope === 'both' || scope === 'both' || tag.scope === scope;
          const workspaceMatches = !workspaceId || !tag.workspaceId || tag.workspaceId === workspaceId;
          return scopeMatches && workspaceMatches;
        })
        .sort((a, b) => {
          const aFav = isFavoriteTag(a.id) ? 1 : 0;
          const bFav = isFavoriteTag(b.id) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          return a.name.localeCompare(b.name, 'pt-BR');
        }),
    [tags, scope, workspaceId, isFavoriteTag]
  );

  const filteredTags = useMemo(() => {
    if (!search.trim()) return availableTags;
    const normalizedSearch = normalize(search);
    return availableTags.filter(
      (tag) =>
        tag.normalizedName.includes(normalizedSearch) ||
        tag.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    );
  }, [availableTags, search]);

  const selectedTags = useMemo(
    () => value.map((tagId) => availableTags.find((tag) => tag.id === tagId) || tags.find((tag) => tag.id === tagId)).filter(Boolean),
    [value, availableTags, tags]
  );

  const favoriteTags = filteredTags.filter((tag) => isFavoriteTag(tag.id));
  const regularTags = filteredTags.filter((tag) => !isFavoriteTag(tag.id));
  const normalizedSearch = normalize(search);
  const canCreate = normalizedSearch.length > 0 && !availableTags.some((tag) => tag.normalizedName === normalizedSearch);

  const toggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((current) => current !== tagId));
      return;
    }
    onChange([...value, tagId]);
  };

  const handleCreateTag = () => {
    const created = ensureTag(search, scope, workspaceId);
    if (!created) return;
    if (!value.includes(created.id)) {
      onChange([...value, created.id]);
    }
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="rounded-xl border border-gray-300 bg-white px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedTags.length === 0 && (
            <span className="text-sm text-gray-400">Nenhuma tag selecionada</span>
          )}
          {selectedTags.map((tag) => (
            <span
              key={tag?.id}
              className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700"
            >
              {tag?.name}
              <button
                type="button"
                onClick={() => tag?.id && toggleTag(tag.id)}
                className="rounded-full hover:bg-orange-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full border-0 p-0 text-sm focus:outline-none focus:ring-0"
        />
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {canCreate && (
            <button
              type="button"
              onClick={handleCreateTag}
              className="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-3 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Criar tag "{search.trim()}"
            </button>
          )}

          {favoriteTags.length > 0 && (
            <div className="border-b border-gray-100 px-4 py-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Favoritas
              </p>
              <div className="space-y-1">
                {favoriteTags.map((tag) => (
                  <TagOption
                    key={tag.id}
                    name={tag.name}
                    selected={value.includes(tag.id)}
                    favorite
                    onSelect={() => toggleTag(tag.id)}
                    onToggleFavorite={() => toggleFavoriteTag(tag.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Todas as tags
            </p>
            <div className="space-y-1">
              {regularTags.length === 0 && favoriteTags.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-500">{emptyMessage}</div>
              ) : (
                regularTags.map((tag) => (
                  <TagOption
                    key={tag.id}
                    name={tag.name}
                    selected={value.includes(tag.id)}
                    favorite={isFavoriteTag(tag.id)}
                    onSelect={() => toggleTag(tag.id)}
                    onToggleFavorite={() => toggleFavoriteTag(tag.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-2 text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TagOption({
  name,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  name: string;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
      <button type="button" onClick={onSelect} className="flex-1 text-left text-sm text-gray-700">
        <span className={selected ? 'font-semibold text-gray-900' : ''}>{name}</span>
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`rounded p-1 ${favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
        title={favorite ? 'Remover das favoritas' : 'Marcar como favorita'}
      >
        <Star className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
