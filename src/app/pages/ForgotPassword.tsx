import { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { AuthShell } from '../components/auth/AuthShell';
import { useAdmin } from '../context/AdminContext';

export function ForgotPassword() {
  const { requestPasswordReset } = useAdmin();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await requestPasswordReset(email, 'reset');
    setMessage(result.message);
    setPreviewUrl(result.previewUrl || '');
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      title="Recupere seu acesso com segurança"
      description="Quando um e-mail válido for informado, um link único e com expiração será preparado para redefinição de senha."
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-600">Recuperação</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Esqueci minha senha</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Informe seu e-mail para receber o link seguro de redefinição.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="nome@empresa.com"
            />
          </div>

          {message ? (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p>{message}</p>
              {previewUrl ? (
                <p>
                  Ambiente local: <Link to={previewUrl} className="font-semibold underline">abrir link gerado</Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Preparando link...' : 'Enviar link'}
          </button>
        </form>

        <p className="text-sm text-slate-500">
          Lembrou sua senha?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Voltar para o login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
