import React, { useState, useMemo } from 'react';
import { UserData } from '../types';
import { AnnualComparisonChart, TopItemsBarChart, ExpenseBudgetComparisonChart } from './CustomChart';
import { ArrowUpRight, ArrowDownRight, Wallet, Filter, Calendar, Activity } from 'lucide-react';

interface DashboardProps {
  userData: UserData;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [filterType, setFilterType] = useState<'Todas' | 'Receitas' | 'Despesas'>('Todas');

  // New state variables for filters
  const [selectedKpiYear, setSelectedKpiYear] = useState<string>('all');
  const [budgetComparisonYear, setBudgetComparisonYear] = useState<number>(new Date().getFullYear());
  const [recentFilter, setRecentFilter] = useState<'Todos' | 'Receitas' | 'Despesas'>('Todos');

  // Extract available years dynamically
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    userData.incomes.forEach(inc => {
      if (inc.date) {
        const y = new Date(inc.date).getFullYear();
        if (y) years.add(y);
      }
    });
    userData.expenses.forEach(exp => {
      if (exp.date) {
        const y = new Date(exp.date).getFullYear();
        if (y) years.add(y);
      }
    });
    // Add current year as dynamic baseline
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [userData.incomes, userData.expenses]);

  // Adjust budgetComparisonYear if current selection is not available
  useMemo(() => {
    if (availableYears.length > 0 && !availableYears.includes(budgetComparisonYear)) {
      setBudgetComparisonYear(availableYears[0]);
    }
  }, [availableYears]);

  // 1. Calculate Core KPI Counters with year filter
  const totals = useMemo(() => {
    const filteredIncomes = selectedKpiYear === 'all' 
      ? userData.incomes 
      : userData.incomes.filter(inc => inc.date && new Date(inc.date).getFullYear() === parseInt(selectedKpiYear, 10));

    const filteredExpenses = selectedKpiYear === 'all' 
      ? userData.expenses 
      : userData.expenses.filter(exp => exp.date && new Date(exp.date).getFullYear() === parseInt(selectedKpiYear, 10));

    const totalIncomes = filteredIncomes.reduce((acc, curr) => acc + curr.value, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.value, 0);
    return {
      incomes: totalIncomes,
      expenses: totalExpenses,
      balance: totalIncomes - totalExpenses
    };
  }, [userData, selectedKpiYear]);

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

  // Monthly comparison data for budgeted vs realized expenses
  const monthlyExpenseComparisonData = useMemo(() => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    const yearPlan = userData.annualPlanning.find(p => p.year === budgetComparisonYear);
    
    return months.map((monthName, idx) => {
      const monthBudget = yearPlan?.monthlyBudgets.find(b => b.month === idx);
      const budgeted = monthBudget?.expenseBudget || 0;
      
      const realized = userData.expenses
        .filter(exp => {
          if (!exp.date) return false;
          const parts = exp.date.split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            return y === budgetComparisonYear && m === idx;
          }
          return false;
        })
        .reduce((sum, item) => sum + item.value, 0);
        
      return {
        month: monthName,
        budgeted,
        realized
      };
    });
  }, [userData.annualPlanning, userData.expenses, budgetComparisonYear]);

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
    let combined: any[] = [];
    if (recentFilter === 'Todos' || recentFilter === 'Receitas') {
      combined = [...combined, ...userData.incomes.map(inc => ({ ...inc, type: 'receita' as const }))];
    }
    if (recentFilter === 'Todos' || recentFilter === 'Despesas') {
      combined = [...combined, ...userData.expenses.map(exp => ({ ...exp, type: 'despesa' as const }))];
    }
    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [userData.incomes, userData.expenses, recentFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Year Filter Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs gap-3">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Painel de Controle (Receitas/Despesas/Saldo)
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Ano dos Cards:</span>
          <select
            value={selectedKpiYear}
            onChange={(e) => setSelectedKpiYear(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="all">Todos os Anos</option>
            {availableYears.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
        </div>
      </div>

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
            <p className="mt-1 text-[10px] text-slate-400">
              {selectedKpiYear === 'all' ? 'Todo o histórico cadastrado' : `Ano de ${selectedKpiYear}`}
            </p>
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
            <p className="mt-1 text-[10px] text-slate-400">
              {selectedKpiYear === 'all' ? 'Todo o histórico cadastrado' : `Ano de ${selectedKpiYear}`}
            </p>
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
            <p className="mt-1 text-[10px] text-slate-400">
              {selectedKpiYear === 'all' ? 'Patrimônio líquido estimado' : `Patrimônio estimado em ${selectedKpiYear}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Annual comparison and new expense comparison */}
        <div className="space-y-6">
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

          {/* New Budget vs Realized Expense Comparison Chart Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Despesas: Orçado vs Realizado
              </h3>
              
              {/* Year Filter Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Ano:</span>
                <select
                  value={budgetComparisonYear}
                  onChange={(e) => setBudgetComparisonYear(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <ExpenseBudgetComparisonChart data={monthlyExpenseComparisonData} />
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3.5 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Lançamentos Recentes
            </h3>
            {/* Recent transaction filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg dark:bg-slate-800">
              {(['Todos', 'Receitas', 'Despesas'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setRecentFilter(type)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    recentFilter === type
                      ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
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
            <button
              onClick={() => onNavigate('Metas')}
              className="flex w-full items-center justify-between rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Ir para Metas</span>
              <span className="text-sm">🎯</span>
            </button>
            <button
              onClick={() => onNavigate('Planejamento anual')}
              className="flex w-full items-center justify-between rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Configurar Planejamento Anual</span>
              <span className="text-sm">📅</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
