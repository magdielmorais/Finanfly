import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Check, AlertCircle, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';

interface SubscriptionPageProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  message?: string;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onUpdateUser, message }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const isFreePlanUsed = user.subscription?.freePlanUsed || false;
  const currentPlan = user.subscription?.plan || 'none';
  const validUntil = user.subscription?.validUntil;

  const handleSelectPlan = async (plan: 'gratis' | 'mensal' | 'anual') => {
    if (plan === 'gratis' && isFreePlanUsed) {
      alert('Você já utilizou o período grátis de 45 dias anteriormente.');
      return;
    }

    if (plan === 'gratis') {
      // Free plan registers instantly
      setLoadingPlan('gratis');
      try {
        const res = await fetch('/api/user/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user.email
          },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onUpdateUser(data.user);
        alert('Período grátis de 45 dias ativado com sucesso!');
      } catch (err: any) {
        alert(err.message || 'Erro ao ativar período grátis.');
      } finally {
        setLoadingPlan(null);
      }
    } else {
      // Paid plans trigger the checkout modal
      setShowCheckoutModal(plan);
      setCardHolder(user.name || '');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCheckoutError('');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckoutModal) return;

    if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
      setCheckoutError('Por favor, preencha todos os dados do cartão.');
      return;
    }

    setLoadingPlan(showCheckoutModal);
    setCheckoutError('');

    try {
      // Simulate API call to process through MercadoPago sandbox
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({ plan: showCheckoutModal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdateUser(data.user);
      setShowCheckoutModal(null);
      alert(`Assinatura do Plano ${showCheckoutModal === 'mensal' ? 'Mensal' : 'Anual'} ativada com sucesso via MercadoPago!`);
    } catch (err: any) {
      setCheckoutError(err.message || 'Falha na transação.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-4">
      {/* Title block */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Planos de Assinatura
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto text-sm dark:text-slate-400">
          Escolha a melhor opção para organizar suas finanças com recursos ilimitados, gráficos dinâmicos e exportação de dados.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200 shadow-sm animate-pulse">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold">Acesso restrito:</span> {message}
          </div>
        </div>
      )}

      {/* Subscription Status HUD */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase">Status Atual</span>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-0.5">
            {currentPlan === 'none' && 'Nenhum plano selecionado ❌'}
            {currentPlan === 'gratis' && 'Período Grátis (45 Dias) ⏳'}
            {currentPlan === 'mensal' && 'Plano Mensal Ativo 🔵'}
            {currentPlan === 'anual' && 'Plano Anual Premium Ativo ✨'}
          </h3>
          {validUntil && (
            <p className="text-xs text-slate-400 mt-1">
              Válido até:{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {new Date(validUntil).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </p>
          )}
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs dark:bg-slate-950 dark:border-slate-800">
          <span className="text-slate-400">Uso do plano grátis:</span>{' '}
          <span className={`font-bold ${isFreePlanUsed ? 'text-red-500' : 'text-emerald-600'}`}>
            {isFreePlanUsed ? 'Já Utilizado' : 'Disponível'}
          </span>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan */}
        <div className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden dark:bg-slate-900 ${
          currentPlan === 'gratis' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período de Experiência</div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2 dark:text-white">Comece Grátis</h3>
            <p className="text-xs text-slate-400 mt-1">Experimente a plataforma por 45 dias completos sem custos.</p>
            
            <div className="mt-4 flex items-baseline text-slate-900 dark:text-white">
              <span className="text-3xl font-extrabold tracking-tight">R$ 0</span>
              <span className="ml-1 text-xs text-slate-400">/ 45 dias</span>
            </div>

            <ul className="mt-6 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Acesso completo ao Dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Cadastro ilimitado de receitas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Cadastro ilimitado de despesas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Lista de compras e Planos</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleSelectPlan('gratis')}
              disabled={isFreePlanUsed || currentPlan === 'gratis' || !!loadingPlan}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                currentPlan === 'gratis'
                  ? 'bg-blue-100 text-blue-800 cursor-default dark:bg-blue-950/40 dark:text-blue-300'
                  : isFreePlanUsed
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
              }`}
            >
              {currentPlan === 'gratis'
                ? 'Plano Ativo'
                : isFreePlanUsed
                ? 'Já Utilizado'
                : loadingPlan === 'gratis'
                ? 'Ativando...'
                : 'Iniciar Teste de 45 Dias'}
            </button>
          </div>
        </div>

        {/* Monthly Plan */}
        <div className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden dark:bg-slate-900 ${
          currentPlan === 'mensal' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acesso Mensal</div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2 dark:text-white">Plano Mensal</h3>
            <p className="text-xs text-slate-400 mt-1">Cobrança recorrente mensal com desconto especial.</p>
            
            <div className="mt-4">
              <span className="text-xs text-slate-400 line-through">de R$ 9,90</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">R$ 3,99</span>
                <span className="ml-1 text-xs text-slate-400">/ mês</span>
              </div>
            </div>

            <ul className="mt-6 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Todos os recursos do teste grátis</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Relatórios financeiros avançados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Suporte prioritário via WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Backups diários automáticos</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleSelectPlan('mensal')}
              disabled={currentPlan === 'mensal' || !!loadingPlan}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                currentPlan === 'mensal'
                  ? 'bg-blue-100 text-blue-800 cursor-default dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/10'
              }`}
            >
              {currentPlan === 'mensal' ? 'Plano Ativo' : 'Assinar com MercadoPago'}
            </button>
          </div>
        </div>

        {/* Annual Plan */}
        <div className={`rounded-2xl border bg-white p-6 shadow-md flex flex-col justify-between relative overflow-hidden dark:bg-slate-900 ${
          currentPlan === 'anual' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-500/50 dark:border-blue-800/80'
        }`}>
          {/* Badge */}
          <div className="absolute right-0 top-0 bg-blue-600 text-white text-[10px] uppercase font-bold py-1 px-3 rounded-bl-lg flex items-center gap-1 shadow-sm">
            <Sparkles className="h-3 w-3" />
            Melhor Valor
          </div>

          <div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Acesso Anual</div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2 dark:text-white">Plano Anual</h3>
            <p className="text-xs text-slate-400 mt-1">Acesso garantido por 1 ano completo com super desconto.</p>
            
            <div className="mt-4">
              <span className="text-xs text-slate-400 line-through">de R$ 118,80</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">R$ 34,90</span>
                <span className="ml-1 text-xs text-slate-400">/ ano</span>
              </div>
            </div>

            <ul className="mt-6 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Acesso ilimitado de 365 dias</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Economia de mais de 70% anual</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Atualizações e novas funções inclusas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Aprovação imediata de acesso</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleSelectPlan('anual')}
              disabled={currentPlan === 'anual' || !!loadingPlan}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                currentPlan === 'anual'
                  ? 'bg-blue-100 text-blue-800 cursor-default dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/10'
              }`}
            >
              {currentPlan === 'anual' ? 'Plano Ativo' : 'Assinar com MercadoPago'}
            </button>
          </div>
        </div>
      </div>

      {/* MercadoPago Simulated Integration Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Checkout Seguro - MercadoPago
                </h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                Você está assinando o <strong>Plano {showCheckoutModal === 'mensal' ? 'Mensal' : 'Anual'}</strong> por{' '}
                <strong>R$ {showCheckoutModal === 'mensal' ? '3,99' : '34,90'}</strong>.
              </span>
            </div>

            {checkoutError && (
              <p className="mb-4 text-xs font-semibold text-red-500 bg-red-50 p-2 rounded border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
                ⚠️ {checkoutError}
              </p>
            )}

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nome Impresso no Cartão
                </label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="CARLOS E SILVA"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Número do Cartão
                </label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4509 •••• •••• ••••"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Validade (MM/AA)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/30"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="•••"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!!loadingPlan}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
                >
                  {loadingPlan ? 'Confirmando...' : 'Pagar R$ ' + (showCheckoutModal === 'mensal' ? '3,99' : '34,90')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
