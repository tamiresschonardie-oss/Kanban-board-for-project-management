import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminResponsiveModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  bodyClassName?: string;
}

export function AdminResponsiveModal({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-4xl',
  bodyClassName = '',
}: AdminResponsiveModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6">
      <div className="flex min-h-full items-start justify-center">
        <div
          className={`flex max-h-[calc(100vh-2rem)] w-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:max-h-[calc(100vh-3rem)] ${maxWidthClassName}`.trim()}
        >
          <div className="shrink-0 border-b border-slate-200 bg-white/95 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${bodyClassName}`.trim()}>
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
