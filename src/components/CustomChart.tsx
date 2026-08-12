import React, { useState } from 'react';

// Pure React & SVG Interactive Charts - Styled with Tailwind CSS
// 100% responsive, compatible with React 19, and beautifully animated.

interface AnnualData {
  year: number;
  income: number;
  budgeted: number;
  expense: number;
}

interface ItemData {
  description: string;
  value: number;
  date: string;
  category: string;
  type: 'receita' | 'despesa';
}

export const AnnualComparisonChart: React.FC<{ data: AnnualData[] }> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum dado disponível para o gráfico anual.</p>
      </div>
    );
  }

  // Calculate scales
  const margin = { top: 25, right: 25, bottom: 45, left: 85 };
  const width = 650;
  const height = 320;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.budgeted, d.expense]), 1000);
  const roundedMax = Math.ceil(maxVal / 1000) * 1000;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  // Grid lines (y axis ticks)
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  // Bar dimensions for 3 bars per group
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(groupWidth * 0.25, 20);
  const gap = 3;

  return (
    <div className="w-full min-w-0">
      <div className="relative w-full overflow-x-auto pb-3 custom-scrollbar">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: '650px' }}
          className="w-full h-auto font-sans overflow-visible"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="budgetAnnualBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {ticks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-30"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-600 dark:fill-slate-300 text-[11px] font-semibold font-mono"
                >
                  R$ {tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const groupCenter = margin.left + (i + 0.5) * groupWidth;
            // 3 bars layout
            const totalWidth = 3 * barWidth + 2 * gap;
            const startX = groupCenter - totalWidth / 2;

            const xInc = startX;
            const xBud = startX + barWidth + gap;
            const xExp = startX + 2 * (barWidth + gap);

            const yInc = getY(d.income);
            const hInc = Math.max(yBaseline - yInc, 2);

            const yBud = getY(d.budgeted);
            const hBud = Math.max(yBaseline - yBud, 2);

            const yExp = getY(d.expense);
            const hExp = Math.max(yBaseline - yExp, 2);

            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                {/* Background column hover state */}
                <rect
                  x={margin.left + i * groupWidth}
                  y={margin.top}
                  width={groupWidth}
                  height={chartHeight}
                  fill={isHovered ? '#f1f5f9' : 'transparent'}
                  className="transition-colors duration-150 dark:fill-slate-800/20"
                  style={{ opacity: isHovered ? 0.4 : 0 }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Income Bar */}
                <rect
                  x={xInc}
                  y={yInc}
                  width={barWidth}
                  height={hInc}
                  fill="url(#incomeBarGrad)"
                  rx="3"
                  ry="3"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Budget Bar */}
                <rect
                  x={xBud}
                  y={yBud}
                  width={barWidth}
                  height={hBud}
                  fill="url(#budgetAnnualBarGrad)"
                  rx="3"
                  ry="3"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Expense Bar */}
                <rect
                  x={xExp}
                  y={yExp}
                  width={barWidth}
                  height={hExp}
                  fill="url(#expenseBarGrad)"
                  rx="3"
                  ry="3"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X axis labels */}
                <text
                  x={groupCenter}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-bold transition-colors cursor-pointer ${
                    isHovered ? 'fill-blue-600 dark:fill-blue-400' : 'fill-slate-700 dark:fill-slate-200'
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {d.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Fixed Legend below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-600 inline-block" />
          <span>Receitas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500 inline-block" />
          <span>Orçado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500 inline-block" />
          <span>Realizado</span>
        </div>
      </div>

      {/* Tooltip Overlay */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-2 flex flex-wrap items-center justify-around rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 transition-all dark:bg-slate-800 dark:border-slate-700 gap-2">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Ano: {data[hoveredIndex].year}</div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Receita: R$ {data[hoveredIndex].income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Orçado: R$ {data[hoveredIndex].budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-red-500 font-medium dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Realizado: R$ {data[hoveredIndex].expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            Saldo: R$ {(data[hoveredIndex].income - data[hoveredIndex].expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}
    </div>
  );
};

export const TopItemsBarChart: React.FC<{
  incomes: ItemData[];
  expenses: ItemData[];
  filter: 'Todas' | 'Receitas' | 'Despesas';
}> = ({ incomes, expenses, filter }) => {
  const [hoveredItem, setHoveredItem] = useState<ItemData | null>(null);

  // Combine or filter items based on selection
  let itemsToShow: ItemData[] = [];
  if (filter === 'Todas' || filter === 'Receitas') {
    itemsToShow = [...itemsToShow, ...incomes];
  }
  if (filter === 'Todas' || filter === 'Despesas') {
    itemsToShow = [...itemsToShow, ...expenses];
  }

  // Sort descending by value and get top 10
  itemsToShow = itemsToShow.sort((a, b) => b.value - a.value).slice(0, 10);

  if (itemsToShow.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum registro para exibir neste filtro.</p>
      </div>
    );
  }

  const maxVal = Math.max(...itemsToShow.map(item => item.value), 100);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2">
        {itemsToShow.map((item, index) => {
          const pct = (item.value / maxVal) * 100;
          const isIncome = item.type === 'receita';

          return (
            <div
              key={index}
              className="group flex flex-col gap-1 cursor-pointer"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isIncome ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-red-50 text-red-600 dark:bg-red-950/40'
                  }`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors truncate max-w-[150px] sm:max-w-[220px]">
                    {item.description}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.date.split('-').reverse().join('/')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md dark:bg-slate-800 dark:text-slate-400">
                    {item.category}
                  </span>
                  <span className={`font-mono font-bold ${isIncome ? 'text-blue-600' : 'text-red-500'}`}>
                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar Container */}
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isIncome ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-400 hover:bg-red-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip detail card */}
      {hoveredItem && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex justify-between items-center animate-fade-in">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100">{hoveredItem.description}</span>
            <span className="mx-1.5 text-slate-400">|</span>
            <span>Categoria: {hoveredItem.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Tipo: {hoveredItem.type === 'receita' ? '🔵 Receita' : '🔴 Despesa'}</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              R$ {hoveredItem.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export interface MonthlyComparisonData {
  month: string;
  budgeted: number;
  realized: number;
  balance: number;
}

export const ExpenseBudgetComparisonChart: React.FC<{ data: MonthlyComparisonData[] }> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum dado disponível para a comparação.</p>
      </div>
    );
  }

  // Calculate scales
  const margin = { top: 25, right: 25, bottom: 45, left: 85 };
  const width = 750;
  const height = 320;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.budgeted, d.realized, Math.max(d.balance, 0)]), 100);
  const roundedMax = Math.ceil(maxVal / 100) * 100;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  // Grid lines (y axis ticks)
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  // Bar dimensions for 3 bars per group
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.max(Math.min(groupWidth * 0.26, 14), 5);
  const gap = 2;

  return (
    <div className="w-full min-w-0">
      <div className="relative w-full overflow-x-auto pb-3 custom-scrollbar">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: '750px' }}
          className="w-full h-auto font-sans overflow-visible"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="budgetBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="realizedBarGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="realizedBarRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="balanceBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="1" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {ticks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-30"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-600 dark:fill-slate-300 text-[11px] font-semibold font-mono"
                >
                  R$ {tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const groupCenter = margin.left + (i + 0.5) * groupWidth;
            const totalWidth = 3 * barWidth + 2 * gap;
            const startX = groupCenter - totalWidth / 2;

            const xBudget = startX;
            const xRealized = startX + barWidth + gap;
            const xBalance = startX + 2 * (barWidth + gap);

            const yBudget = getY(d.budgeted);
            const hBudget = Math.max(yBaseline - yBudget, 2);

            const yRealized = getY(d.realized);
            const hRealized = Math.max(yBaseline - yRealized, 2);

            const positiveBalance = Math.max(d.balance, 0);
            const yBalance = getY(positiveBalance);
            const hBalance = Math.max(yBaseline - yBalance, 2);

            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                {/* Background column hover state */}
                <rect
                  x={margin.left + i * groupWidth}
                  y={margin.top}
                  width={groupWidth}
                  height={chartHeight}
                  fill={isHovered ? '#f1f5f9' : 'transparent'}
                  className="transition-colors duration-150 dark:fill-slate-800/20"
                  style={{ opacity: isHovered ? 0.4 : 0 }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Budget Bar (Orçado) */}
                <rect
                  x={xBudget}
                  y={yBudget}
                  width={barWidth}
                  height={hBudget}
                  fill="url(#budgetBarGrad)"
                  rx="2"
                  ry="2"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Realized Bar (Realizado) */}
                <rect
                  x={xRealized}
                  y={yRealized}
                  width={barWidth}
                  height={hRealized}
                  fill={d.realized <= d.budgeted ? "url(#realizedBarGreenGrad)" : "url(#realizedBarRedGrad)"}
                  rx="2"
                  ry="2"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Saldo Bar */}
                <rect
                  x={xBalance}
                  y={yBalance}
                  width={barWidth}
                  height={hBalance}
                  fill="url(#balanceBarGrad)"
                  rx="2"
                  ry="2"
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'brightness(1.05)' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X axis labels */}
                <text
                  x={groupCenter}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-bold transition-colors cursor-pointer ${
                    isHovered ? 'fill-blue-600 dark:fill-blue-400' : 'fill-slate-700 dark:fill-slate-200'
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Fixed Legend below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-600 inline-block" />
          <span>Orçado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500 inline-block" />
          <span>Realizado (No Limite)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500 inline-block" />
          <span>Realizado (Excedido)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-600 inline-block" />
          <span>Saldo</span>
        </div>
      </div>

      {/* Tooltip Overlay */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-2 flex flex-wrap items-center justify-around rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 transition-all dark:bg-slate-800 dark:border-slate-700 gap-2">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Mês: {data[hoveredIndex].month}</div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Orçado: R$ {data[hoveredIndex].budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {(() => {
            const isOk = data[hoveredIndex].realized <= data[hoveredIndex].budgeted;
            return (
              <div className={`flex items-center gap-1.5 font-medium ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                <span className={`h-2 w-2 rounded-full ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
                Realizado: R$ {data[hoveredIndex].realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            );
          })()}
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            Saldo: R$ {data[hoveredIndex].balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}
    </div>
  );
};

interface ClassificationPieData {
  name: string;
  value: number;
  color: string;
  bgClass: string;
}

export const ExpenseClassificationPieChart: React.FC<{
  data: ClassificationPieData[];
  totalValue: number;
}> = ({ data, totalValue }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 240;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = 95;
  const rInner = 60;

  const activeSlices = data.filter(d => d.value > 0);

  // If no expenses registered for this month
  if (totalValue === 0 || activeSlices.length === 0) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        <div className="relative flex items-center justify-center shrink-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-48 h-48">
            <circle
              cx={cx}
              cy={cy}
              r={(rOuter + rInner) / 2}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={rOuter - rInner}
              className="dark:stroke-slate-800"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <span className="text-xs text-slate-400 font-medium">Sem despesas</span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">R$ 0,00</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 min-w-[180px]">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${item.bgClass} opacity-40`} />
                <span>{item.name}</span>
              </div>
              <span>0%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generate slice paths
  let currentAngle = -Math.PI / 2; // Start from top
  const totalAngle = 2 * Math.PI;

  const slices = data.map((item, idx) => {
    if (item.value <= 0) return null;

    const angleVal = (item.value / totalValue) * totalAngle;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleVal;
    currentAngle = endAngle;

    if (activeSlices.length === 1) {
      const midR = (rOuter + rInner) / 2;
      const strokeW = rOuter - rInner;
      return {
        ...item,
        idx,
        isFullCircle: true,
        midR,
        strokeW,
        angleVal
      };
    }

    const gapAngle = 0.02; // Small gap between slices
    const actualStart = startAngle + gapAngle / 2;
    const actualEnd = endAngle - gapAngle / 2;

    const x1 = cx + rOuter * Math.cos(actualStart);
    const y1 = cy + rOuter * Math.sin(actualStart);
    const x2 = cx + rOuter * Math.cos(actualEnd);
    const y2 = cy + rOuter * Math.sin(actualEnd);

    const x3 = cx + rInner * Math.cos(actualEnd);
    const y3 = cy + rInner * Math.sin(actualEnd);
    const x4 = cx + rInner * Math.cos(actualStart);
    const y4 = cy + rInner * Math.sin(actualStart);

    const largeArc = (actualEnd - actualStart) > Math.PI ? 1 : 0;

    const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return {
      ...item,
      idx,
      d,
      isFullCircle: false
    };
  }).filter(Boolean);

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      {/* Donut SVG */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-52 h-52 overflow-visible">
          {slices.map((slice) => {
            if (!slice) return null;
            const isHovered = hoveredIndex === slice.idx;

            if (slice.isFullCircle) {
              return (
                <circle
                  key={slice.idx}
                  cx={cx}
                  cy={cy}
                  r={slice.midR}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={slice.strokeW}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1
                  }}
                  onMouseEnter={() => setHoveredIndex(slice.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            }

            return (
              <path
                key={slice.idx}
                d={slice.d}
                fill={slice.color}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${cx}px ${cy}px`,
                  filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                  opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1
                }}
                onMouseEnter={() => setHoveredIndex(slice.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label inside donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {hoveredItem ? hoveredItem.name : 'Total Mês'}
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">
            R$ {(hoveredItem ? hoveredItem.value : totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {hoveredItem && totalValue > 0
              ? `${((hoveredItem.value / totalValue) * 100).toFixed(1)}%`
              : 'Despesas'}
          </span>
        </div>
      </div>

      {/* Legend and Values List */}
      <div className="flex flex-col gap-2.5 w-full sm:w-auto min-w-[220px]">
        {data.map((item, idx) => {
          const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
          const isHovered = hoveredIndex === idx;

          const borderLeftClass = item.name === 'Fixo'
            ? 'border-l-4 border-l-blue-500'
            : item.name === 'Variável'
            ? 'border-l-4 border-l-amber-500'
            : 'border-l-4 border-l-purple-500';

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${borderLeftClass} ${
                isHovered
                  ? 'bg-slate-100/90 border-slate-300 dark:bg-slate-800 dark:border-slate-700 shadow-md scale-[1.02]'
                  : 'bg-slate-50 border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-4 w-4 rounded-md ${item.bgClass} shadow-sm shrink-0`} />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">{item.name}</span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{pct}% do total</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    {/* Horizontal Legend bar matching comparison chart above */}
    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onMouseEnter={() => setHoveredIndex(0)} onMouseLeave={() => setHoveredIndex(null)}>
        <span className="h-3.5 w-3.5 rounded bg-blue-500 shadow-xs inline-block" />
        <span>Despesas Fixas</span>
      </div>
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onMouseEnter={() => setHoveredIndex(1)} onMouseLeave={() => setHoveredIndex(null)}>
        <span className="h-3.5 w-3.5 rounded bg-amber-500 shadow-xs inline-block" />
        <span>Despesas Variáveis</span>
      </div>
      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onMouseEnter={() => setHoveredIndex(2)} onMouseLeave={() => setHoveredIndex(null)}>
        <span className="h-3.5 w-3.5 rounded bg-purple-500 shadow-xs inline-block" />
        <span>Despesas Eventuais</span>
      </div>
    </div>
    </div>
  );
};

