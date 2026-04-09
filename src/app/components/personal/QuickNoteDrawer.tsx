import { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FileText, PlusSquare, X } from 'lucide-react';
import { usePersonalProductivity } from '../../context/PersonalProductivityContext';
import { useFeedback } from '../../context/FeedbackContext';
import { NOTE_COLORS } from './noteColors';

interface QuickNoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_COLOR = 'amber';

export function QuickNoteDrawer({ isOpen, onClose }: QuickNoteDrawerProps) {
  const { addNote } = usePersonalProductivity();
  const { showFeedback } = useFeedback();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setColor(DEFAULT_COLOR);
  };

  const handleSave = useCallback(() => {
    if (!title.trim() && !content.trim()) return;

    const saved = addNote({
      title: title.trim() || undefined,
      content: content.trim(),
      color,
      isPinned: false,
    });

    if (!saved) return;

    showFeedback({
      tone: 'success',
      title: 'Nota criada',
      message: 'A nota rápida foi adicionada em Minhas Tarefas > Notas.',
    });
    resetForm();
    textareaRef.current?.focus();
  }, [addNote, color, content, showFeedback, title]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSave();
      return;
    }

    if (event.currentTarget instanceof HTMLInputElement && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/20 transition-opacity ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <PlusSquare className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">Nota rápida</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Capture uma ideia sem sair da tela atual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Fechar nota rápida"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Título</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nota</span>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva algo rápido..."
                rows={10}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Cor</span>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={`h-9 w-9 rounded-full border ${option.className} ${
                      color === option.value ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                    }`}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <FileText className="h-4 w-4" />
                Integração automática
              </div>
              <p className="mt-1">
                Toda nota criada aqui aparece imediatamente em Minhas Tarefas &gt; Notas.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Atalho: Ctrl+Shift+N abre a nota rápida e Ctrl+Enter salva.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                textareaRef.current?.focus();
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpar
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <PlusSquare className="h-4 w-4" />
                Salvar nota
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
