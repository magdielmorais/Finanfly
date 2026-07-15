import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Check, AlertCircle, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';

interface SubscriptionPageProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  message?: string;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onUpdateUser, message }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const [prices, setPrices] = useState({
    mensal_de: '9,90',
    mensal_por: '2,99',
    anual_de: '118,80',
    anual_por: '29,99'
  });

  useEffect(() => {
    fetch('/api/plan-prices')
      .then(res => res.json())
      .then(data => {
        if (data && data.mensal_por) {
          setPrices(data);
        }
      })
      .catch(err => console.error('Erro ao buscar valores dos planos:', err));
  }, []);

  const isFreePlanUsed = user.subscription?.freePlanUsed || false;
  const currentPlan = user.subscription?.plan || 'none';
  const validUntil = user.subscription?.validUntil;

  const handleSelectPlan = async (plan: 'gratis' | 'mensal' | 'anual') => {
    if (plan === 'gratis' && isFreePlanUsed) {
      alert('Você já utilizou o período grátis de 60 dias anteriormente.');
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
        alert('Período grátis de 60 dias ativado com sucesso!');
      } catch (err: any) {
        alert(err.message || 'Erro ao ativar período grátis.');
      } finally {
        setLoadingPlan(null);
      }
    } else {
      // Paid plans: create Mercado Pago checkout preference and redirect
      setLoadingPlan(plan);
      try {
        const rawPrice = plan === 'mensal' ? prices.mensal_por : prices.anual_por;
        const numericPrice = parseFloat(rawPrice.replace(',', '.'));

        const res = await fetch('/api/payment/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user.email
          },
          body: JSON.stringify({
            planName: plan,
            price: numericPrice
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar checkout.');

        if (data.init_point) {
          // Redirect directly to Mercado Pago gateway
          window.location.href = data.init_point;
        } else {
          throw new Error('Link de checkout do Mercado Pago não recebido.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao conectar com o Mercado Pago.');
      } finally {
        setLoadingPlan(null);
      }
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
            {currentPlan === 'gratis' && 'Período Grátis (60 Dias) ⏳'}
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
            <p className="text-xs text-slate-400 mt-1">Experimente a plataforma por 60 dias completos sem custos.</p>
            
            <div className="mt-4 flex items-baseline text-slate-900 dark:text-white">
              <span className="text-3xl font-extrabold tracking-tight">R$ 0</span>
              <span className="ml-1 text-xs text-slate-400">/ 60 dias</span>
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
                : 'Iniciar Teste de 60 Dias'}
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
              <span className="text-xs text-slate-400 line-through">de R$ {prices.mensal_de}</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">R$ {prices.mensal_por}</span>
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
              <li className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                <span>+ todos itens do plano comece grátis</span>
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
              <span className="text-xs text-slate-400 line-through">de R$ {prices.anual_de}</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">R$ {prices.anual_por}</span>
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
              <li className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>+ todos itens do plano mensal</span>
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

    </div>
  );
};
