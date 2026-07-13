import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User, Shield, Info, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onRedirectToSubscription: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRedirectToSubscription }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default credentials info box helper
  const [showDemoInfo, setShowDemoInfo] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register flow
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
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
            Finanfly
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Controle financeiro inteligente e seguro
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
          </form>
        </div>

        {/* Demo Credentials Box */}
        {showDemoInfo && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 text-xs text-slate-400">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                Credenciais de Demonstração
              </span>
              <button 
                onClick={() => setShowDemoInfo(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                Ocultar
              </button>
            </div>
            <div className="space-y-2">
              <div 
                onClick={() => fillDemoCredentials('user@finanfly.com', 'user')}
                className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 hover:bg-slate-900 cursor-pointer border border-slate-800/40 transition-colors group"
              >
                <div>
                  <p className="font-medium text-slate-200">Usuário Ativo (Acesso Liberado)</p>
                  <p className="font-mono text-[10px] text-slate-400">E-mail: user@finanfly.com | Senha: user</p>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
              </div>

              <div 
                onClick={() => fillDemoCredentials('expired@finanfly.com', 'user')}
                className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 hover:bg-slate-900 cursor-pointer border border-slate-800/40 transition-colors group"
              >
                <div>
                  <p className="font-medium text-slate-200">Usuário Expirado (Bloqueio Automático)</p>
                  <p className="font-mono text-[10px] text-slate-400">E-mail: expired@finanfly.com | Senha: user</p>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
              </div>

              <div 
                onClick={() => fillDemoCredentials('admin@finanfly.com', 'admin')}
                className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 hover:bg-slate-900 cursor-pointer border border-slate-800/40 transition-colors group"
              >
                <div>
                  <p className="font-medium text-slate-200">Administrador Geral</p>
                  <p className="font-mono text-[10px] text-slate-400">E-mail: admin@finanfly.com | Senha: admin</p>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
