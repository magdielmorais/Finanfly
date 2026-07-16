import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User, Shield, Info, ArrowRight, X, CheckCircle, RefreshCw } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onRedirectToSubscription: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRedirectToSubscription }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state for "Relembrar senha" and "Mudar senha"
  const [showRememberModal, setShowRememberModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [rememberEmail, setRememberEmail] = useState('');
  const [rememberLoading, setRememberLoading] = useState(false);
  const [rememberSuccess, setRememberSuccess] = useState('');
  const [rememberError, setRememberError] = useState('');
  const [rememberedPassword, setRememberedPassword] = useState('');

  const handleRememberPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRememberError('');
    setRememberSuccess('');
    setRememberedPassword('');
    setRememberLoading(true);

    try {
      const response = await fetch('/api/auth/remember-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rememberEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao recuperar senha.');
      }

      setRememberSuccess(data.message);
      if (data.password) {
        setRememberedPassword(data.password);
      }
    } catch (err: any) {
      setRememberError(err.message || 'Ocorreu um erro.');
    } finally {
      setRememberLoading(false);
    }
  };

  // Default credentials info box helper
  const [showDemoInfo, setShowDemoInfo] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('As senhas digitadas não coincidem!');
          return;
        }
        setLoading(true);
        // Register flow
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, cpf }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao registrar.');
        }

        // New users default to 'none' subscription, must configure on subscription page
        onRedirectToSubscription(data.user);
      } else {
        // Login flow
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao fazer login.');
        }

        const user: UserProfile = data.user;

        if (user.role === 'admin') {
          // Admins go directly to admin dashboard
          onLoginSuccess(user);
        } else {
          // Check subscription status
          const hasPlan = user.subscription && user.subscription.plan !== 'none';
          const isValid = user.subscription && user.subscription.validUntil && new Date(user.subscription.validUntil) > new Date();

          if (hasPlan && isValid) {
            onLoginSuccess(user);
          } else {
            // Subscription expired or none. Show nice modal notification first, then redirect to subscription
            setError('Sua assinatura está expirada ou não ativa! É necessário escolher um plano para continuar.');
            setTimeout(() => {
              onRedirectToSubscription(user);
            }, 3000);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsRegister(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <span className="text-2xl font-black text-white">F</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white font-sans">
            Finan Fly
          </h2>
          <p className="mt-1 text-sm font-semibold text-blue-400">
            Suas finanças voando!
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Controle financeiro inteligente, prático e seguro.
          </p>
          <p className="mt-2.5 text-lg font-bold text-blue-500">
            Comece grátis
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-2xl shadow-blue-900/10">
          <div className="mb-6 flex border-b border-slate-800 pb-2">
            <button
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-all ${
                !isRegister ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Acessar Conta
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-all ${
                isRegister ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Criar Conta Nova
            </button>
          </div>

          {error && (
            <div className={`mb-4 flex items-start gap-2.5 rounded-lg p-3 text-xs border ${
              error.includes('expirada') 
                ? 'bg-amber-950/40 border-amber-800 text-amber-200' 
                : 'bg-red-950/40 border-red-900 text-red-200'
            }`}>
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nome Completo
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu Nome Completo"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    CPF
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="123.456.789-00"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                E-mail
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Senha de Acesso
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Repetir Senha de Acesso
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="******"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isRegister ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  Cadastrar Grátis
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar no Painel
                </>
              )}
            </button>

            {!isRegister && (
              <div className="mt-4 flex items-center justify-center text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setShowRememberModal(true);
                    setRememberEmail(email);
                    setRememberSuccess('');
                    setRememberError('');
                    setRememberedPassword('');
                  }}
                  className="hover:text-blue-400 font-semibold transition-colors focus:outline-none underline underline-offset-4"
                >
                  Relembrar senha
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Remember Password Modal */}
      {showRememberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Recuperação de Senha
              </h3>
              <button
                onClick={() => setShowRememberModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {rememberSuccess ? (
              <div className="space-y-4 py-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Recuperação Processada!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Sua senha de acesso foi recuperada com sucesso no sistema.
                  </p>
                </div>
                {rememberedPassword && (
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 mt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sua Senha</span>
                    <span className="font-mono text-sm font-bold text-blue-400">{rememberedPassword}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowRememberModal(false)}
                  className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRememberPassword} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite seu e-mail de cadastro para recuperar a sua senha correspondente.
                </p>

                {rememberError && (
                  <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-200">
                    {rememberError}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRememberModal(false)}
                    className="flex-1 rounded-lg border border-slate-800 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={rememberLoading}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {rememberLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : 'Enviar Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
