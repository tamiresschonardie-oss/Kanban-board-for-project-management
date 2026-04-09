import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type FeedbackTone = 'success' | 'error' | 'info';

interface FeedbackItem {
  id: string;
  title: string;
  message?: string;
  tone: FeedbackTone;
}

interface FeedbackContextType {
  showFeedback: (input: Omit<FeedbackItem, 'id'>) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

const TONE_STYLES: Record<FeedbackTone, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const TONE_ICON: Record<FeedbackTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  error: <CircleAlert className="h-5 w-5 text-red-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const showFeedback = (input: Omit<FeedbackItem, 'id'>) => {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: FeedbackItem = { id, ...input };
    setItems((prev) => [...prev, item]);

    window.setTimeout(() => {
      setItems((prev) => prev.filter((entry) => entry.id !== id));
    }, 3800);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((entry) => entry.id !== id));
  };

  const value = useMemo(() => ({ showFeedback }), []);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg ${TONE_STYLES[item.tone]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{TONE_ICON[item.tone]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.message && <p className="mt-1 text-sm opacity-90">{item.message}</p>}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="rounded-lg p-1 hover:bg-white/50"
                aria-label="Fechar feedback"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}
