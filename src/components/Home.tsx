import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, TrendingDown, Shield, BarChart3, ShoppingBag, Settings, BadgePercent, ArrowRight, PlusCircle, ChevronDown, ChevronUp, Info, Smartphone } from 'lucide-react';
import { FinanFlyLogo } from './FinanFlyLogo';

interface HomeProps {
  userName: string;
  onNavigate: (page: string) => void;
  isAdmin: boolean;
}

export const Home: React.FC<HomeProps> = ({ userName, onNavigate, isAdmin }) => {
  const [isComoComecarOpen, setIsComoComecarOpen] = useState(false);
  const [notices, setNotices] = useState({
    fluxoCaixa: {
      title: 'Fluxo de Caixa Simplificado',
      message: 'Cadastre receitas e despesas de forma imediata. Controle categorias, tipos de pagamento e status de recebimento.'
    },
    resumosInteligentes: {
      title: 'Resumos Inteligentes',
      message: 'Tenha uma visão consolidada mensal e anual. Visualize em gráficos as suas maiores despesas e receitas para otimizar seus hábitos de consumo.'
    },
    planejamentoObjetivos: {
      title: 'Planejamento e Objetivos',
      message: 'Crie planos de ação com status de acompanhamento. Defina limites orçamentários mensais e acompanhe se você está cumprindo os seus objetivos.'
    },
    rule50_30_20: {
      title: 'Regra 50/30/20',
      message: 'A regra de ouro das finanças recomenda destinar 50% dos seus rendimentos para necessidades básicas, 30% para desejos pessoais e 20% para prioridades financeiras ou investimentos.'
    },
    weeklyCheck: {
      title: 'Check-in Semanal',
      message: 'Reserve 10 minutos no início ou fim de cada semana para registrar todas as suas receitas e despesas. Manter seus lançamentos atualizados evita surpresas no final do mês!'
    }
  });

  useEffect(() => {
    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setNotices({
            fluxoCaixa: {
              title: data.fluxoCaixa?.title || '',
              message: data.fluxoCaixa?.message || ''
            },
            resumosInteligentes: {
              title: data.resumosInteligentes?.title || '',
              message: data.resumosInteligentes?.message || ''
            },
            planejamentoObjetivos: {
              title: data.planejamentoObjetivos?.title || '',
              message: data.planejamentoObjetivos?.message || ''
            },
            rule50_30_20: {
              title: data.rule50_30_20?.title || '',
              message: data.rule50_30_20?.message || ''
            },
            weeklyCheck: {
              title: data.weeklyCheck?.title || '',
              message: data.weeklyCheck?.message || ''
            }
          });
        }
      })
      .catch(err => console.error('Erro ao carregar avisos sincronizados na Home:', err));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white md:p-10 border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <FinanFlyLogo size={46} rounded="rounded-2xl" shadow />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 text-xs font-semibold text-blue-300">
                  👋 Bem-vindo {userName}!
                </span>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">FinanFly • Controle Financeiro Inteligente</p>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Sua saúde financeira, <br />
              <span className="text-blue-400">sob controle absoluto.</span>
            </h1>
            <p className="text-slate-200 text-base max-w-xl leading-relaxed">
              Acompanhe suas receitas, despesas e investimentos, planeje seu ano, viagens e objetivos. Controle sua lista de compras, anote seus desejos e seus planos de ações para melhoria contínua de finanças. Tudo em um único lugar, adaptado para qualquer tela.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate(isAdmin ? 'Administrador' : 'Painel')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all cursor-pointer"
              >
                Ir para o {isAdmin ? 'Painel Admin' : 'Painel'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onNavigate('Receitas (Ganhos)')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
                Adicionar Receitas
              </button>
              <button
                onClick={() => onNavigate('Despesas (Gastos)')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-rose-400 animate-pulse" />
                Adicionar Despesas
              </button>
            </div>

            {/* Botão Modo Celular abaixo de Adicionar Despesas linkado para Modo App Web */}
            <div className="pt-1">
              <button
                id="btn-home-modo-celular"
                onClick={() => onNavigate('Modo app Web')}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-bold shadow-md shadow-emerald-950/30 transition-all hover:scale-[1.02] active:scale-100 border border-emerald-400/40 cursor-pointer"
              >
                <Smartphone className="h-4 w-4 text-emerald-100" />
                Modo Celular
              </button>
            </div>
          </div>

          {/* Logo Badge in Hero on medium+ screens */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/40 border border-slate-800/80 backdrop-blur-sm shrink-0 shadow-2xl">
            <FinanFlyLogo size={120} rounded="rounded-3xl" shadow />
            <span className="mt-3 text-sm font-extrabold tracking-wider text-white">FinanFly</span>
            <span className="text-[11px] font-bold text-sky-400 tracking-wide">Finanças Inteligente</span>
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Fluxo de Caixa */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.fluxoCaixa.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.fluxoCaixa.message}
          </p>
        </div>

        {/* Card 2: Resumos Inteligentes */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.resumosInteligentes.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.resumosInteligentes.message}
          </p>
        </div>

        {/* Card 3: Planejamento e Objetivos */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.planejamentoObjetivos.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.planejamentoObjetivos.message}
          </p>
        </div>
      </div>

      {/* Card COMO COMEÇAR (Separated above) */}
      <div className="bg-white rounded-xl border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition-all duration-300 shadow-sm">
        <button
          onClick={() => setIsComoComecarOpen(!isComoComecarOpen)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <span className="font-bold tracking-wide">COMO COMEÇAR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">
              {isComoComecarOpen ? 'Clique para fechar' : 'Clique para abrir'}
            </span>
            {isComoComecarOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>
        {isComoComecarOpen && (
          <div className="px-4 pb-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 animate-fade-in">
            Para começar você deve realizar o cadastro de <strong>Tipo de recebimento</strong>, <strong>Tipo de pagamento</strong>, <strong>Situação de recebimento</strong>, <strong>Situação de pagamento</strong>, <strong>Cadastro Categoria Receitas</strong> e <strong>Cadastro Categoria Despesas</strong>, posteriormente é necessário realizar a configuração em <strong>Planejamento anual</strong> clicando em <strong>Orçar por categoria</strong> e definir o Orçado de cada um centro de custo. Terminando, faça seus lançamentos e veja em resumo mensal e anual.
          </div>
        )}
      </div>

      {/* Financial Tips Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          Dicas para Saúde Financeira
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-blue-400 uppercase tracking-wider">{notices.rule50_30_20.title}</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {notices.rule50_30_20.message}
            </p>
          </div>
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-blue-400 uppercase tracking-wider">{notices.weeklyCheck.title}</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {notices.weeklyCheck.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
