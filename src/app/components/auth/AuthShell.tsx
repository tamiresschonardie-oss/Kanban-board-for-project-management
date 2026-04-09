import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function AuthShell({ title, description, children, aside }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_42%,_#111827_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-10 lg:flex-row lg:items-center lg:px-10">
        <section className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300 font-semibold text-slate-950">
              K
            </span>
            <div>
              <p className="font-semibold">Kanban PMO</p>
              <p className="text-xs text-slate-400">Autenticação, sessão e governança por perfil</p>
            </div>
          </div>

          <div>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight text-white lg:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">{description}</p>
          </div>

          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-semibold text-white">PMO</p>
              <p className="mt-1 text-slate-400">Administra usuários, estrutura e governança.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-semibold text-white">Gestão / Admin</p>
              <p className="mt-1 text-slate-400">Acompanha a operação com acesso executivo.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-semibold text-white">Colaborador</p>
              <p className="mt-1 text-slate-400">Entra direto no próprio contexto de execução.</p>
            </div>
          </div>

          {aside}
        </section>

        <section className="w-full max-w-md">
          <div className="rounded-[28px] border border-white/10 bg-white/95 p-7 text-slate-900 shadow-2xl shadow-black/30 backdrop-blur">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
