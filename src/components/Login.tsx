import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User, Shield, Info, ArrowRight, X, CheckCircle, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onRedirectToSubscription: (user: UserProfile) => void;
  inactivityNotice?: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRedirectToSubscription, inactivityNotice }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state for "Relembrar senha" and "Mudar senha"
  const [showRememberModal, setShowRememberModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (inactivityNotice) {
      setIsRegister(false);
    }
  }, [inactivityNotice]);

  const [rememberEmail, setRememberEmail] = useState('');
  const [rememberLoading, setRememberLoading] = useState(false);
  const [rememberSuccess, setRememberSuccess] = useState('');
  const [rememberError, setRememberError] = useState('');
  const [rememberedPassword, setRememberedPassword] = useState('');
  const [rememberEmailDetails, setRememberEmailDetails] = useState<{ subject?: string; body?: string; name?: string; email?: string } | null>(null);

  const handleRememberPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRememberError('');
    setRememberSuccess('');
    setRememberedPassword('');
    setRememberEmailDetails(null);
    setRememberLoading(true);

    try {
      const response = await fetch('/api/auth/remember-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rememberEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'O e-mail digitado é diferente do e-mail cadastrado.');
      }

      setRememberSuccess(data.message || 'E-mail enviado com sucesso!');
      setRememberEmailDetails({
        subject: data.emailSubject,
        name: data.user?.name,
        email: data.user?.email || rememberEmail
      });
    } catch (err: any) {
      setRememberError(err.message || 'Erro ao processar solicitação.');
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

        if (data.token) {
          localStorage.setItem('finanfly_token', data.token);
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

        if (data.token) {
          localStorage.setItem('finanfly_token', data.token);
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
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white font-sans">
            FinanFly
          </h2>
          <p className="mt-1.5 text-base font-extrabold tracking-wide text-cintilante drop-shadow-sm">
            Suas finanças voando!
          </p>
          <p className="mt-2 text-xs text-white font-medium">
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

          {inactivityNotice && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg p-3 text-xs bg-amber-950/50 border border-amber-800 text-amber-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div>{inactivityNotice}</div>
            </div>
          )}

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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="******"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                    title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                  Entrar
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

        {/* Beta Disclaimer Message */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-center text-xs text-sky-200/90 shadow-sm leading-relaxed">
          <p className="font-bold text-sky-300 mb-1 tracking-wide">
            versão Beta 1.1
          </p>
          <p>
            Atenção! Versão liberada somente para testes de funcionalidades, o app poderá sofrer instabilidades ou perda de dados na migração definitiva do banco de dados. Assim que for liberado em definitivo o usuário receberá uma mensagem.
          </p>
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
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">E-mail de recuperação enviado!</h4>
                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                      O e-mail digitado foi localizado no banco de dados e as instruções foram despachadas.
                    </p>
                  </div>
                </div>

                {/* Email Sent Confirmation Box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{rememberEmailDetails?.subject || 'Finanfly - Lembrete de Senha'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Para: {rememberEmailDetails?.email || rememberEmail}</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    <p>
                      Olá, <strong className="text-white">{rememberEmailDetails?.name || 'Usuário'}</strong>!
                    </p>
                    <p>
                      Sua mensagem com a senha de acesso foi enviada com sucesso para o endereço: <strong className="text-blue-300">{rememberEmailDetails?.email || rememberEmail}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      🔒 <strong>Segurança:</strong> Por motivos de privacidade e proteção da sua conta, a senha não é exibida na tela do aplicativo. Acesse sua caixa de entrada (ou pasta de spams) para conferir a mensagem recebida e realizar seu login.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowRememberModal(false);
                    setRememberSuccess('');
                    setRememberEmailDetails(null);
                  }}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Voltar para o Login
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
