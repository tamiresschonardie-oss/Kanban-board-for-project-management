import { Pin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Note } from '../../types';
import { usePersonalProductivity } from '../../context/PersonalProductivityContext';
import { NOTE_COLORS } from './noteColors';

export function NotesBoard() {
  const { notes, addNote, updateNote, deleteNote, toggleNotePinned } = usePersonalProductivity();
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('amber');

  const handleCreateNote = () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    addNote({
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      color: newColor,
      isPinned: false,
    });
    setNewTitle('');
    setNewContent('');
    setNewColor('amber');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Notas pessoais</h2>
            <p className="mt-1 text-sm text-gray-600">
              Capture ideias, pendências e rascunhos rápidos em um mural leve, separado das tarefas.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {notes.length} nota{notes.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Título opcional"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewColor(color.value)}
                  className={`h-8 w-8 rounded-full border ${color.className} ${
                    newColor === color.value ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <textarea
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="Anote algo rápido..."
            rows={4}
            className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleCreateNote}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Salvar nota
            </button>
          </div>
        </div>
      </section>

      {notes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onTogglePinned={toggleNotePinned}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-500">
          Nenhuma nota criada ainda. Use o bloco acima para capturar ideias rapidamente.
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
  onTogglePinned,
}: {
  note: Note;
  onUpdate: (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>) => Note | null;
  onDelete: (id: string) => void;
  onTogglePinned: (id: string) => void;
}) {
  const colorClass =
    NOTE_COLORS.find((item) => item.value === (note.color || 'amber'))?.className ||
    NOTE_COLORS[0].className;

  return (
    <article className={`rounded-3xl border p-4 shadow-sm transition-shadow hover:shadow-md ${colorClass}`}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onTogglePinned(note.id)}
          className={`rounded-full p-2 transition-colors ${
            note.isPinned ? 'bg-slate-900 text-white' : 'bg-white/80 text-gray-500 hover:text-gray-800'
          }`}
          title={note.isPinned ? 'Desafixar nota' : 'Fixar nota'}
        >
          <Pin className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          className="rounded-full bg-white/80 p-2 text-gray-500 hover:text-red-600"
          title="Excluir nota"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <input
        type="text"
        value={note.title || ''}
        onChange={(event) => onUpdate(note.id, { title: event.target.value })}
        placeholder="Sem título"
        className="mt-3 w-full border-none bg-transparent text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />

      <textarea
        value={note.content}
        onChange={(event) => onUpdate(note.id, { content: event.target.value })}
        placeholder="Escreva sua nota"
        rows={6}
        className="mt-3 w-full resize-none border-none bg-transparent text-sm leading-relaxed text-gray-700 placeholder:text-gray-400 focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {NOTE_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onUpdate(note.id, { color: color.value })}
              className={`h-7 w-7 rounded-full border ${color.className} ${
                note.color === color.value ? 'ring-2 ring-slate-400 ring-offset-2' : ''
              }`}
              title={color.label}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Atualizada em {new Date(note.updatedAt).toLocaleString('pt-BR')}
        </p>
      </div>
    </article>
  );
}
