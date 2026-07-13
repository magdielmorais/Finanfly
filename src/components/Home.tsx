import React from 'react';
import { BookOpen, TrendingUp, Shield, BarChart3, ShoppingBag, Settings, BadgePercent, ArrowRight } from 'lucide-react';

interface HomeProps {
  userName: string;
  onNavigate: (page: string) => void;
  isAdmin: boolean;
}

export const Home: React.FC<HomeProps> = ({ userName, onNavigate, isAdmin }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 p-8 text-white md:p-12 border border-slate-800">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400">
            👋 Bem-vindo de volta, {userName}!
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Sua saúde financeira, <br />
            <span className="text-blue-400">sob controle absoluto.</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-md">
            Acompanhe suas receitas, despesas, planeje seu ano e faça listas de compras. Tudo em um único lugar, adaptado para qualquer tela.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate(isAdmin ? 'Administrador' : 'Dashboard')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
            >
              Ir para o {isAdmin ? 'Painel Admin' : 'Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('Plano de ação')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50"
            >
              Criar Plano de Ação
            </button>
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">Fluxo de Caixa Simplificado</h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Cadastre receitas e despesas de forma imediata. Controle categorias ("Centro de Despesa"), formas de pagamento e status de recebimento.
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">Resumos Inteligentes</h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tenha uma visão consolidada mensal e anual. Visualize em gráficos as suas maiores despesas e receitas para otimizar seus hábitos de consumo.
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">Planejamento e Metas</h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Crie planos de ação com status de acompanhamento. Defina limites orçamentários mensais e acompanhe se você está cumprindo as metas.
          </p>
        </div>
      </div>

      {/* Financial Tips Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          Dicas para Saúde Financeira
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Regra 50-30-20</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Divida sua renda líquida: 50% para necessidades (aluguel, contas), 30% para desejos (lazer, compras) e 20% para poupança ou investimentos.
            </p>
          </div>
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Acompanhamento Semanal</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Reserve 10 minutos por semana para revisar suas receitas e despesas cadastradas no Finanfly. Pequenos ajustes evitam surpresas no fim do mês.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
