import React, { useState, useMemo } from 'react';
import { UserData } from '../types';
import {
  AnnualComparisonChart,
  TopItemsBarChart,
  ExpenseBudgetComparisonChart,
  ExpenseClassificationPieChart,
  Investment5YearTotalChart,
  Investment5YearStackedChart,
  InvestmentMonthlyDonutChart,
  TYPE_COLOR_MAP,
  STATUS_COLOR_MAP
} from './CustomChart';
import { ArrowUpRight, ArrowDownRight, Wallet, Filter, Calendar, Activity, PieChart, TrendingUp, Layers, Tag } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface DashboardProps {
  userData: UserData;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userData, onNavigate }) => {
  const [filterType, setFilterType] = useState<'Receitas' | 'Despesas'>('Receitas');

  // New state variables for filters
  const [selectedKpiYear, setSelectedKpiYear] = useState<string>('all');
  const [budgetComparisonYear, setBudgetComparisonYear] = useState<number>(new Date().getFullYear());
  const [recentFilter, setRecentFilter] = useState<'Todos' | 'Receitas' | 'Despesas'>('Todos');
  const [classificationMonth, setClassificationMonth] = useState<number>(new Date().getMonth());
  const [classificationYear, setClassificationYear] = useState<number>(new Date().getFullYear());

  // Investment filters state
  const [investmentMonth, setInvestmentMonth] = useState<number>(new Date().getMonth());
  const [investmentYear, setInvestmentYear] = useState<number>(new Date().getFullYear());

  const fiveYears = useMemo(() => [2022, 2023, 2024, 2025, 2026], []);

  // Investments list from userData
  const investments = useMemo(() => userData.investments || [], [userData.investments]);

  // 5-Year total investments data
  const investment5YearTotals = useMemo(() => {
    return fiveYears.map(year => {
      const total = investments
        .filter(inv => inv.date && new Date(inv.date).getFullYear() === year)
        .reduce((sum, inv) => sum + (inv.value || 0), 0);
      return { year, total };
    });
  }, [investments, fiveYears]);

  // All investment types available
  const allInvestmentTypes = useMemo(() => {
    const typesSet = new Set<string>();
    investments.forEach(inv => { if (inv.type) typesSet.add(inv.type); });
    if (userData.investmentTypes) {
      userData.investmentTypes.forEach(t => typesSet.add(t));
    }
    if (typesSet.size === 0) {
      ['Ações', 'FIIs', 'Renda Fixa', 'Tesouro Direto', 'CDB / RDB', 'Criptomoedas', 'Fundos', 'Outros'].forEach(t => typesSet.add(t));
    }
    return Array.from(typesSet);
  }, [investments, userData.investmentTypes]);

  // 5-Year investment breakdown by type
  const investment5YearTypesData = useMemo(() => {
    return fiveYears.map(year => {
      const yearInvs = investments.filter(inv => inv.date && new Date(inv.date).getFullYear() === year);
      const totalsMap: Record<string, number> = {};
      let grandTotal = 0;
      yearInvs.forEach(inv => {
        const t = inv.type || 'Outros';
        totalsMap[t] = (totalsMap[t] || 0) + (inv.value || 0);
        grandTotal += (inv.value || 0);
      });
      return { year, totalsMap, grandTotal };
    });
  }, [investments, fiveYears]);

  // All investment statuses available
  const allInvestmentStatuses = useMemo(() => {
    const statusesSet = new Set<string>();
    investments.forEach(inv => { if (inv.status) statusesSet.add(inv.status); });
    if (userData.investmentStatuses) {
      userData.investmentStatuses.forEach(s => statusesSet.add(s));
    }
    if (statusesSet.size === 0) {
      ['Ativo', 'Resgatado', 'Em Andamento', 'Pendente'].forEach(s => statusesSet.add(s));
    }
    return Array.from(statusesSet);
  }, [investments, userData.investmentStatuses]);

  // 5-Year investment breakdown by status
  const investment5YearStatusesData = useMemo(() => {
    return fiveYears.map(year => {
      const yearInvs = investments.filter(inv => inv.date && new Date(inv.date).getFullYear() === year);
      const totalsMap: Record<string, number> = {};
      let grandTotal = 0;
      yearInvs.forEach(inv => {
        const s = inv.status || 'Ativo';
        totalsMap[s] = (totalsMap[s] || 0) + (inv.value || 0);
        grandTotal += (inv.value || 0);
      });
      return { year, totalsMap, grandTotal };
    });
  }, [investments, fiveYears]);

  // Selected month/year investment breakdown by Type
  const monthlyInvestmentTypesData = useMemo(() => {
    const filtered = investments.filter(inv => {
      if (!inv.date) return false;
      const parts = inv.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === investmentYear && m === investmentMonth;
      }
      return false;
    });

    const totalsMap: Record<string, number> = {};
    let totalVal = 0;
    filtered.forEach(inv => {
      const t = inv.type || 'Outros';
      totalsMap[t] = (totalsMap[t] || 0) + (inv.value || 0);
      totalVal += (inv.value || 0);
    });

    const list = Object.keys(totalsMap).map((typeKey) => {
      const info = TYPE_COLOR_MAP[typeKey] || { color: '#64748b', bgClass: 'bg-slate-500' };
      return {
        name: typeKey,
        value: totalsMap[typeKey],
        color: info.color,
        bgClass: info.bgClass
      };
    });

    return { list, totalVal };
  }, [investments, investmentMonth, investmentYear]);

  // Selected month/year investment breakdown by Status
  const monthlyInvestmentStatusesData = useMemo(() => {
    const filtered = investments.filter(inv => {
      if (!inv.date) return false;
      const parts = inv.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === investmentYear && m === investmentMonth;
      }
      return false;
    });

    const totalsMap: Record<string, number> = {};
    let totalVal = 0;
    filtered.forEach(inv => {
      const s = inv.status || 'Ativo';
      totalsMap[s] = (totalsMap[s] || 0) + (inv.value || 0);
      totalVal += (inv.value || 0);
    });

    const list = Object.keys(totalsMap).map((statusKey) => {
      const info = STATUS_COLOR_MAP[statusKey] || { color: '#8b5cf6', bgClass: 'bg-purple-500' };
      return {
        name: statusKey,
        value: totalsMap[statusKey],
        color: info.color,
        bgClass: info.bgClass
      };
    });

    return { list, totalVal };
  }, [investments, investmentMonth, investmentYear]);

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

  // Calculate Total Budgeted based on annual planning and selected filter
  const totalBudgeted = useMemo(() => {
    const plans = selectedKpiYear === 'all'
      ? userData.annualPlanning
      : userData.annualPlanning.filter(p => p.year === parseInt(selectedKpiYear, 10));

    let total = 0;
    plans.forEach(plan => {
      plan.monthlyBudgets.forEach(mb => {
        if (mb.categoryBudgets && mb.categoryBudgets.length > 0) {
          total += mb.categoryBudgets.reduce((sum, cb) => sum + (cb.budgetedValue || 0), 0);
        } else {
          total += (mb.expenseBudget || 0);
        }
      });
    });
    return total;
  }, [userData.annualPlanning, selectedKpiYear]);

  // 2. Aggregate Incomes, Expenses, and Budgeted for the last 5 Years (2022 to 2026)
  const annualData = useMemo(() => {
    const years = [2022, 2023, 2024, 2025, 2026];
    return years.map(year => {
      const yearIncomes = userData.incomes
        .filter(item => new Date(item.date).getFullYear() === year)
        .reduce((sum, item) => sum + item.value, 0);

      const yearExpenses = userData.expenses
        .filter(item => new Date(item.date).getFullYear() === year)
        .reduce((sum, item) => sum + item.value, 0);

      const yearPlan = userData.annualPlanning.find(p => p.year === year);
      let yearBudgeted = 0;
      if (yearPlan) {
        yearPlan.monthlyBudgets.forEach(mb => {
          if (mb.categoryBudgets && mb.categoryBudgets.length > 0) {
            yearBudgeted += mb.categoryBudgets.reduce((s, cb) => s + (cb.budgetedValue || 0), 0);
          } else {
            yearBudgeted += (mb.expenseBudget || 0);
          }
        });
      }

      return {
        year,
        income: yearIncomes,
        budgeted: yearBudgeted,
        expense: yearExpenses
      };
    });
  }, [userData]);

  // Monthly comparison data for budgeted vs realized expenses vs balance
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

      const balance = budgeted - realized;
        
      return {
        month: monthName,
        budgeted,
        realized,
        balance
      };
    });
  }, [userData.annualPlanning, userData.expenses, budgetComparisonYear]);

  // Expense Classification Pie Chart Data for selected month/year
  const classificationData = useMemo(() => {
    let fixo = 0;
    let variavel = 0;
    let eventual = 0;

    userData.expenses.forEach(exp => {
      if (!exp.date) return;
      const parts = exp.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y === classificationYear && m === classificationMonth) {
          const classif = (exp.classification || 'Fixo').trim().toLowerCase();
          if (classif.includes('variáv') || classif.includes('variavel')) {
            variavel += exp.value;
          } else if (classif.includes('eventual')) {
            eventual += exp.value;
          } else {
            fixo += exp.value;
          }
        }
      }
    });

    return [
      { name: 'Fixo', value: fixo, color: '#3b82f6', bgClass: 'bg-blue-500' },
      { name: 'Variável', value: variavel, color: '#f59e0b', bgClass: 'bg-amber-500' },
      { name: 'Eventual', value: eventual, color: '#a855f7', bgClass: 'bg-purple-500' }
    ];
  }, [userData.expenses, classificationMonth, classificationYear]);

  const classificationTotal = useMemo(() => {
    return classificationData.reduce((acc, curr) => acc + curr.value, 0);
  }, [classificationData]);

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
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [userData.incomes, userData.expenses, recentFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title above filter bar: Resumo Financeiro */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Resumo Financeiro
        </h2>
      </div>

      {/* KPI Year Filter Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs sm:text-sm gap-3">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Painel de Controle (Receitas/Despesas/Saldo)
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm">Ano dos Cards:</span>
          <select
            value={selectedKpiYear}
            onChange={(e) => setSelectedKpiYear(e.target.value)}
            className="rounded-lg border border-slate-200/50 bg-white px-3 py-1.5 font-bold text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white text-xs sm:text-sm"
          >
            <option value="all">Todos os Anos</option>
            {availableYears.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line with text: RECEITAS VS DESPESAS GERAL */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative bg-slate-50 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          RECEITAS VS DESPESAS GERAL
        </div>
      </div>

      {/* Movement Cards Group */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Income Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total de Receitas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white font-mono">
              R$ {totals.incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedKpiYear === 'all' ? 'Todo o histórico cadastrado' : `Ano de ${selectedKpiYear}`}
            </p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total de Despesas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white font-mono">
              R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedKpiYear === 'all' ? 'Todo o histórico cadastrado' : `Ano de ${selectedKpiYear}`}
            </p>
          </div>
        </div>

        {/* Saldo Receitas x Despesas Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Saldo Receitas x Despesas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-xl font-bold font-mono ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Total de Receitas (-) Total de Despesas
            </p>
          </div>
        </div>
      </div>

      {/* Highlighted Divider Bar */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative bg-slate-50 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Orçamento vs Execução Financeira
        </div>
      </div>

      {/* Budget & Consolidated Cards Group */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Orçado Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Orçado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              R$ {totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Soma do plano anual configurado
            </p>
          </div>
        </div>

        {/* Total Realizado Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Realizado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white font-mono">
              R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Igual ao total de despesas realizadas
            </p>
          </div>
        </div>

        {/* Saldo Consolidado Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Saldo Consolidado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {(() => {
              const consolidatedBalance = totalBudgeted - totals.expenses;
              return (
                <h3 className={`text-xl font-bold font-mono ${consolidatedBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  R$ {consolidatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              );
            })()}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Total Orçado (-) Total Realizado
            </p>
          </div>
        </div>
      </div>

      {/* Line with text: GRÁFICOS FINANCEIROS */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative bg-slate-50 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          GRÁFICOS FINANCEIROS
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        {/* Left Column: Annual comparison and new expense comparison */}
        <div className="space-y-6 min-w-0">
          {/* Annual Chart Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Gráfico Comparativo Anual (Últimos 5 Anos)
              </h3>
              <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">2022 - 2026</span>
            </div>
            <AnnualComparisonChart data={annualData} />
          </div>

          {/* Budget vs Realized Expense Comparison Chart Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Despesas: Orçado vs Realizado
              </h3>
              
              {/* Year Filter Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">Ano:</span>
                <select
                  value={budgetComparisonYear}
                  onChange={(e) => setBudgetComparisonYear(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-200/50 bg-white px-2 py-1 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <ExpenseBudgetComparisonChart data={monthlyExpenseComparisonData} />
          </div>

          {/* Expense Classification Pie Chart Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PieChart className="h-4 w-4 text-blue-500" />
                Classificação das Despesas ({MONTH_NAMES[classificationMonth]}/{classificationYear})
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Month Selector */}
                <select
                  value={classificationMonth}
                  onChange={(e) => setClassificationMonth(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-200/50 bg-white px-2 py-1 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx} value={idx}>{mName}</option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={classificationYear}
                  onChange={(e) => setClassificationYear(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-200/50 bg-white px-2 py-1 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <ExpenseClassificationPieChart data={classificationData} totalValue={classificationTotal} />
          </div>
        </div>

        {/* Top 10 Items Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-500" />
              Maiores Lançamentos (Top 10)
            </h3>
            {/* Filter buttons - only Receitas and Despesas */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg dark:bg-slate-800">
              {(['Receitas', 'Despesas'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-all ${
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

      {/* Recent Activity List (Full width, Ações Rápidas card removed) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full">
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
                className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-all ${
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

      {/* Divider line: GRÁFICO DE INVESTIMENTO */}
      <div className="relative my-8 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-purple-200 dark:border-purple-900/60" />
        </div>
        <div className="relative bg-purple-100 px-5 py-1.5 rounded-full border border-purple-300 dark:border-purple-800 dark:bg-purple-950 text-xs font-black uppercase tracking-widest text-purple-900 dark:text-purple-200 shadow-xs">
          GRÁFICO DE INVESTIMENTO
        </div>
      </div>

      {/* 5-Year Investment Charts Section */}
      <div className="space-y-6">
        <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Investimentos: Visão Geral dos Últimos 5 Anos (2022 - 2026)
        </h3>

        <div className="grid gap-6 lg:grid-cols-3 min-w-0">
          {/* Chart 1: Total Investments (Last 5 Years) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Wallet className="h-4 w-4 text-purple-600" />
                Total por Ano
              </h4>
            </div>
            <Investment5YearTotalChart data={investment5YearTotals} />
          </div>

          {/* Chart 2: Types of Investments (Last 5 Years) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Layers className="h-4 w-4 text-purple-600" />
                Tipos de Investimentos
              </h4>
            </div>
            <Investment5YearStackedChart
              data={investment5YearTypesData}
              categories={allInvestmentTypes}
              colorMap={TYPE_COLOR_MAP}
            />
          </div>

          {/* Chart 3: Status of Investments (Last 5 Years) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Tag className="h-4 w-4 text-purple-600" />
                Status dos Investimentos
              </h4>
            </div>
            <Investment5YearStackedChart
              data={investment5YearStatusesData}
              categories={allInvestmentStatuses}
              colorMap={STATUS_COLOR_MAP}
            />
          </div>
        </div>
      </div>

      {/* Monthly Investment Filter & Charts Section */}
      <div className="space-y-6 pt-2">
        {/* Month / Year Filter Bar */}
        <div className="flex flex-wrap items-center justify-between bg-purple-50/80 p-4 rounded-xl dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs sm:text-sm gap-3">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-extrabold uppercase text-xs">
            <Filter className="h-4 w-4 text-purple-600 shrink-0" />
            Filtro Mensal de Investimentos ({MONTH_NAMES[investmentMonth]}/{investmentYear})
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">Mês:</span>
              <select
                value={investmentMonth}
                onChange={(e) => setInvestmentMonth(parseInt(e.target.value, 10))}
                className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 font-bold text-slate-800 focus:outline-none dark:border-purple-800 dark:bg-slate-950 dark:text-white text-xs"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={idx} value={idx}>{mName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">Ano:</span>
              <select
                value={investmentYear}
                onChange={(e) => setInvestmentYear(parseInt(e.target.value, 10))}
                className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 font-bold text-slate-800 focus:outline-none dark:border-purple-800 dark:bg-slate-950 dark:text-white text-xs"
              >
                {fiveYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Investment Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2 min-w-0">
          {/* Chart 4: Monthly Investments by Type */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Layers className="h-4 w-4 text-purple-600" />
                Tipos de Investimento ({MONTH_NAMES[investmentMonth]}/{investmentYear})
              </h4>
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                R$ {monthlyInvestmentTypesData.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <InvestmentMonthlyDonutChart
              data={monthlyInvestmentTypesData.list}
              totalValue={monthlyInvestmentTypesData.totalVal}
              emptyLabel="Sem dados neste mês"
            />
          </div>

          {/* Chart 5: Monthly Investments by Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Tag className="h-4 w-4 text-purple-600" />
                Status dos Investimentos ({MONTH_NAMES[investmentMonth]}/{investmentYear})
              </h4>
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                R$ {monthlyInvestmentStatusesData.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <InvestmentMonthlyDonutChart
              data={monthlyInvestmentStatusesData.list}
              totalValue={monthlyInvestmentStatusesData.totalVal}
              emptyLabel="Sem dados neste mês"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

