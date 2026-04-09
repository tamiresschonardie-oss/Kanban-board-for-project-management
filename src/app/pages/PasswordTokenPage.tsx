import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '../components/auth/AuthShell';
import { useAdmin } from '../context/AdminContext';
import { isStrongPassword } from '../utils/auth';

export function PasswordTokenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { consumePasswordToken } = useAdmin();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token') || '';
  const isSetupFlow = location.pathname === '/set-password';

  const copy = useMemo(
    () =>
      isSetupFlow
        ? {
            eyebrow: 'Primeiro acesso',
            title: 'Definir senha inicial',
            description: 'Crie sua senha para ativar sua conta e acessar o Kanban normalmente.',
            button: 'Salvar senha e entrar',
          }
        : {
            eyebrow: 'Redefinição',
            title: 'Criar nova senha',
            description: 'Defina uma nova senha para recuperar o acesso à sua conta.',
            button: 'Redefinir senha',
          },
    [isSetupFlow]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('O link informado é inválido.');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('A confirmação da senha não confere.');
      return;
    }

    setIsSubmitting(true);
    const result = await consumePasswordToken(token, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Não foi possível concluir a atualização da senha.');
      return;
    }

    setSuccess('Senha atualizada com sucesso. Você já pode entrar com seu e-mail e sua nova senha.');
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1200);
  };

  return (
    <AuthShell
      title={copy.title}
      description="Os links desta etapa são de uso único, possuem expiração e são invalidados após a definição da nova senha."
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-600">{copy.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{copy.description}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              placeholder="Repita a nova senha"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-slate-950 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Atualizando senha...' : copy.button}
          </button>
        </form>

        <p className="text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Voltar para o login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
