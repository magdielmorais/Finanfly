import React, { useState, useMemo } from 'react';
import { UserData } from '../types';
import { AnnualComparisonChart, TopItemsBarChart } from './CustomChart';
import { ArrowUpRight, ArrowDownRight, Wallet, Filter, Calendar, Activity } from 'lucide-react';

interface DashboardProps {
  userData: UserData;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [filterType, setFilterType] = useState<'Todas' | 'Receitas' | 'Despesas'>('Todas');

  // 1. Calculate Core KPI Counters
  const totals = useMemo(() => {
    const totalIncomes = userData.incomes.reduce((acc, curr) => acc + curr.value, 0);
    const totalExpenses = userData.expenses.reduce((acc, curr) => acc + curr.value, 0);
    return {
      incomes: totalIncomes,
      expenses: totalExpenses,
      balance: totalIncomes - totalExpenses
    };
  }, [userData]);

  // 2. Aggregate Incomes & Expenses for the last 5 Years (2022 to 2026)
  const annualData = useMemo(() => {
    const years = [2022, 2023, 2024, 2025, 2026];
    return years.map(year => {
      // Find matching items
      const yearIncomes = userData.incomes
        .filter(item => new Date(item.date).getFullYear() === year)
        .reduce((sum, item) => sum + item.value, 0);

      const yearExpenses = userData.expenses
        .filter(item => new Date(item.date).getFullYear() === year)
        .reduce((sum, item) => sum + item.value, 0);

      return {
        year,
        income: yearIncomes,
        expense: yearExpenses
      };
    });
  }, [userData]);

  // 3. Extract the last 10 greatest incomes & expenses for Top Items Chart
  const topIncomes = useMemo(() => {
    return userData.incomes.map(inc => ({
      description: inc.description,
      value: inc.value,
      date: inc.date,
      category: inc.category,
      type: 'receita' as const
    }));
  }, [userData.incomes]);

  const topExpenses = useMemo(() => {
    return userData.expenses.map(exp => ({
      description: exp.description,
      value: exp.value,
      date: exp.date,
      category: exp.category,
      type: 'despesa' as const
    }));
  }, [userData.expenses]);

  // 4. Combined transactions sorted by date descending (for Recent Activity list)
  const recentTransactions = useMemo(() => {
    const combined = [
      ...userData.incomes.map(inc => ({ ...inc, type: 'receita' as const })),
      ...userData.expenses.map(exp => ({ ...exp, type: 'despesa' as const }))
    ];
    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [userData.incomes, userData.expenses]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upper Cards grid (KPI counters) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Income Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Receitas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
              R$ {totals.incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">Todo o histórico cadastrado</p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Despesas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
              R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">Todo o histórico cadastrado</p>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Saldo Consolidado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-2xl font-bold font-mono ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">Patrimônio líquido estimado</p>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Annual Chart Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Comparativo Anual (Últimos 5 Anos)
            </h3>
            <span className="text-[10px] text-slate-400">2022 - 2026</span>
          </div>
          <AnnualComparisonChart data={annualData} />
        </div>

        {/* Top 10 Items Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-500" />
              Maiores Lançamentos (Top 10)
            </h3>
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg dark:bg-slate-800">
              {(['Todas', 'Receitas', 'Despesas'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    filterType === type
                      ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <TopItemsBarChart incomes={topIncomes} expenses={topExpenses} filter={filterType} />
        </div>
      </div>

      {/* Recent Activity List & CTA Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent activity card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5 dark:border-slate-800/60">
            <Activity className="h-4 w-4 text-blue-500" />
            Lançamentos Recentes
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">Nenhum lançamento recente registrado.</p>
            ) : (
              recentTransactions.map((item, idx) => {
                const isIncome = item.type === 'receita';
                return (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isIncome ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-red-50 text-red-500 dark:bg-red-950/40'
                      }`}>
                        <span className="text-lg font-bold">{isIncome ? '＋' : '－'}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.description}</p>
                        <p className="text-[10px] text-slate-400">{item.category} • {item.paymentType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold font-mono ${isIncome ? 'text-blue-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'} R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {item.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Ações Rápidas</h3>
            <p className="text-xs text-slate-400 mb-4">Adicione registros ou planeje sua semana imediatamente.</p>
          </div>
          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('Receitas')}
              className="flex w-full items-center justify-between rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm"
            >
              <span>Nova Receita</span>
              <span className="text-sm">＋</span>
            </button>
            <button
              onClick={() => onNavigate('Despesas')}
              className="flex w-full items-center justify-between rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 text-xs font-bold transition-all border border-slate-700/50"
            >
              <span>Nova Despesa</span>
              <span className="text-sm">＋</span>
            </button>
            <button
              onClick={() => onNavigate('Lista de compras')}
              className="flex w-full items-center justify-between rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Ir para Lista de Compras</span>
              <span className="text-sm">🛒</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
