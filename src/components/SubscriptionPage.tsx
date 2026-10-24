import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, SubscriptionHistoryItem } from '../types';
import { getSubscriptionDetails } from '../utils/subscriptionUtils';
import { 
  Check, 
  AlertCircle, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  History, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  Zap,
  UserCheck
} from 'lucide-react';

interface SubscriptionPageProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  message?: string;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onUpdateUser, message }) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const [prices, setPrices] = useState<{
    mensal_de: string;
    mensal_por: string;
    anual_de: string;
    anual_por: string;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Histórico de assinaturas
  const [historyList, setHistoryList] = useState<SubscriptionHistoryItem[]>(user.subscriptionHistory || []);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/user/subscription-history', {
        headers: {
          'x-user-email': user.email
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setHistoryList(data.history);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de assinaturas:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, user.subscription?.validUntil, user.subscription?.plan]);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestPrices = () => {
      fetch('/api/plan-prices')
        .then(res => res.json())
        .then(data => {
          if (isMounted && data && data.mensal_por) {
            setPrices(data);
          }
        })
        .catch(err => console.error('Erro ao buscar valores dos planos:', err))
        .finally(() => {
          if (isMounted) setLoadingPrices(false);
        });
    };

    fetchLatestPrices();

    const handlePricesUpdated = (e: any) => {
      if (e?.detail && e.detail.mensal_por) {
        setPrices(e.detail);
        setLoadingPrices(false);
      } else {
        fetchLatestPrices();
      }
    };

    window.addEventListener('planPricesUpdated', handlePricesUpdated);
    window.addEventListener('focus', fetchLatestPrices);

    return () => {
      isMounted = false;
      window.removeEventListener('planPricesUpdated', handlePricesUpdated);
      window.removeEventListener('focus', fetchLatestPrices);
    };
  }, []);

  const details = getSubscriptionDetails(user);
  const isFreePlanUsed = user.subscription?.freePlanUsed || false;
  const currentPlan = details.resolvedPlan || user.subscription?.plan || 'none';
  const validUntil = user.subscription?.validUntil;

  // Cálculo da parcela mensal do plano anual: valor do plano anual dividido por 12
  const annualPerMonth = useMemo(() => {
    if (!prices?.anual_por) return null;
    const cleanStr = prices.anual_por.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleanStr);
    if (isNaN(val) || val <= 0) return null;
    const perMonth = val / 12;
    return `R$ ${perMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [prices?.anual_por]);

  // Lista consolidada de histórico de assinaturas
  const resolvedHistory: SubscriptionHistoryItem[] = useMemo(() => {
    if (historyList && historyList.length > 0) {
      return historyList;
    }
    if (user.subscriptionHistory && user.subscriptionHistory.length > 0) {
      return user.subscriptionHistory;
    }
    if (user.subscription && user.subscription.plan && user.subscription.plan !== 'none') {
      return [{
        id: 'initial_active_plan',
        plan: user.subscription.plan,
        createdAt: user.subscription.selectedAt || user.createdAt || new Date().toISOString(),
        validUntil: user.subscription.validUntil || null,
        source: user.subscription.plan === 'gratis' ? 'cadastro' : 'assinatura',
        status: user.subscription.plan === 'inativo' || user.isBlocked ? 'Inativo' : 'Ativo',
        description: user.subscription.plan === 'gratis'
          ? 'Período Grátis de Boas-vindas (Cadastro)'
          : user.subscription.plan === 'livre'
          ? 'Acesso Livre Vitalício'
          : `Plano ${user.subscription.plan === 'mensal' ? 'Mensal' : user.subscription.plan === 'anual' ? 'Anual' : user.subscription.plan} Ativo`
      }];
    }
    return [];
  }, [historyList, user.subscriptionHistory, user.subscription, user.createdAt, user.isBlocked]);

  const formatDateTime = (isoDate?: string | null) => {
    if (!isoDate) return '—';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      const datePart = d.toLocaleDateString('pt-BR');
      const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} às ${timePart}`;
    } catch {
      return isoDate;
    }
  };

  const formatValidUntil = (validUntilIso?: string | null, planName?: string) => {
    if (planName === 'livre' || !validUntilIso) {
      return 'Vitalício / Sem expiração';
    }
    try {
      const d = new Date(validUntilIso);
      if (isNaN(d.getTime())) return validUntilIso;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return validUntilIso;
    }
  };

  const getPlanBadge = (planKey?: string) => {
    switch (planKey) {
      case 'anual':
        return {
          label: 'Plano Anual',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        };
      case 'mensal':
        return {
          label: 'Plano Mensal',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        };
      case 'gratis':
        return {
          label: 'Período Grátis',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        };
      case 'livre':
        return {
          label: 'Acesso Livre',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
        };
      case 'inativo':
        return {
          label: 'Inativo',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        };
      default:
        return {
          label: planKey ? `Plano ${planKey}` : 'Nenhum',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
    }
  };

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
        const res = await fetch('/api/payment/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user.email
          },
          body: JSON.stringify({
            planName: plan
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

      {user.subscription?.freePlanUsedReason && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-200 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <span className="font-bold">Aviso importante:</span> {user.subscription.freePlanUsedReason} O período de experiência grátis já foi utilizado em algum momento por este CPF ou E-mail.
          </div>
        </div>
      )}

      {/* Subscription Status HUD */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase">Status Atual</span>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-0.5">
            {!details.isActive && 'Nenhum plano ativo ou expirado ❌'}
            {details.isActive && currentPlan === 'gratis' && 'Período Grátis (Trial Ativo) ⏳'}
            {details.isActive && currentPlan === 'mensal' && 'Plano Mensal Ativo 🔵'}
            {details.isActive && currentPlan === 'anual' && 'Plano Anual Premium Ativo ✨'}
            {details.isActive && currentPlan === 'livre' && 'Acesso Livre Vitalício ✨'}
          </h3>
          {details.isActive && details.formattedDate && (
            <p className="text-xs text-slate-400 mt-1">
              Válido até:{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {details.formattedDate}
              </span>
              {details.subtitle && (
                <span className="ml-1 text-emerald-500 font-bold">({details.subtitle})</span>
              )}
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
            {user.subscription?.freePlanUsedReason && (
              <p className="mt-2 text-[10px] text-red-500 font-semibold text-center leading-tight">
                * CPF ou E-mail já usou o período de experiência grátis.
              </p>
            )}
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
              <span className="text-xs text-slate-400 line-through">de R$ {prices?.mensal_de || '...'}</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                  {prices ? `R$ ${prices.mensal_por}` : 'Carregando...'}
                </span>
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
              <span className="text-xs text-slate-400 line-through">de R$ {prices?.anual_de || '...'}</span>
              <div className="flex items-baseline text-slate-900 dark:text-white mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {prices ? `R$ ${prices.anual_por}` : 'Carregando...'}
                </span>
                <span className="ml-1 text-xs text-slate-400">/ ano</span>
              </div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                somente {annualPerMonth || '...'} / mês
              </p>
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

      {/* Card Histórico de Assinaturas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shadow-sm">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Histórico de assinaturas
                <span className="text-xs font-normal text-slate-400">
                  ({resolvedHistory.length} {resolvedHistory.length === 1 ? 'registro' : 'registros'})
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro detalhado das suas assinaturas contratadas, pagamentos confirmados e extensões de validade.
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchHistory()}
            disabled={loadingHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            title="Atualizar histórico de assinaturas"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin text-blue-500' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {loadingHistory && resolvedHistory.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span>Carregando histórico de assinaturas...</span>
          </div>
        ) : resolvedHistory.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <History className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Nenhuma assinatura registrada até o momento.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Ao assinar um plano ou ter seu prazo estendido pelo administrador, o registro completo com data, horário e validade aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="py-2.5 px-3">Plano</th>
                  <th className="py-2.5 px-3">Data e Horário</th>
                  <th className="py-2.5 px-3">Validade do Plano</th>
                  <th className="py-2.5 px-3">Origem / Status</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                {resolvedHistory.map((item, index) => {
                  const badge = getPlanBadge(item.plan);
                  const isLatest = index === 0;
                  return (
                    <tr 
                      key={item.id || index}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Plano */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.badgeClass}`}>
                            {item.plan === 'anual' ? (
                              <Sparkles className="h-3 w-3" />
                            ) : item.plan === 'mensal' ? (
                              <CreditCard className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {badge.label}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                              Mais recente
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-tight">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Data e Horário */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Validade do Plano */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatValidUntil(item.validUntil, item.plan)}
                          </span>
                        </div>
                      </td>

                      {/* Origem e Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {item.source === 'administrador' ? (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">Administrador</span>
                            ) : item.source?.includes('Mercado Pago') ? (
                              <span className="text-teal-600 dark:text-teal-400 font-semibold">{item.source}</span>
                            ) : item.source === 'cadastro' ? (
                              <span className="text-slate-500">Cadastro Inicial</span>
                            ) : (
                              <span>{item.source || 'Sistema'}</span>
                            )}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            {item.status || 'Ativo'}
                          </span>
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                        {item.price || (item.plan === 'gratis' ? 'R$ 0,00' : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
