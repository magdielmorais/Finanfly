import React, { useState } from 'react';

// Pure React & SVG Interactive Charts - Styled with Tailwind CSS
// 100% responsive, compatible with React 19, and beautifully animated.

interface AnnualData {
  year: number;
  income: number;
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
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 600;
  const height = 300;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1000);
  const roundedMax = Math.ceil(maxVal / 1000) * 1000;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  // Grid lines (y axis ticks)
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  // Bar dimensions
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(groupWidth * 0.35, 24);
  const gap = 4;

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto font-sans overflow-visible">
          {/* Gradients */}
          <defs>
            <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
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
                  className="fill-black dark:fill-white text-[11px] font-bold font-mono"
                >
                  R$ {tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const groupCenter = margin.left + (i + 0.5) * groupWidth;
            const xInc = groupCenter - barWidth - gap / 2;
            const xExp = groupCenter + gap / 2;

            const yInc = getY(d.income);
            const hInc = Math.max(yBaseline - yInc, 2);

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
                  rx="4"
                  ry="4"
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
                  rx="4"
                  ry="4"
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
                  y={height - margin.bottom + 18}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors cursor-pointer ${
                    isHovered ? 'fill-blue-600 font-bold dark:fill-blue-400' : 'fill-slate-500'
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

      {/* Tooltip Overlay */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-2 flex items-center justify-around rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 transition-all dark:bg-slate-800 dark:border-slate-700">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Ano: {data[hoveredIndex].year}</div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Receita: R$ {data[hoveredIndex].income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-red-500 font-medium dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Despesa: R$ {data[hoveredIndex].expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 600;
  const height = 300;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.budgeted, d.realized]), 100);
  const roundedMax = Math.ceil(maxVal / 100) * 100;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  // Grid lines (y axis ticks)
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  // Bar dimensions
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.max(Math.min(groupWidth * 0.35, 12), 4);
  const gap = 2;

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto font-sans overflow-visible">
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
                  className="fill-black dark:fill-white text-[11px] font-bold font-mono"
                >
                  R$ {tick.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const groupCenter = margin.left + (i + 0.5) * groupWidth;
            const xBudget = groupCenter - barWidth - gap / 2;
            const xRealized = groupCenter + gap / 2;

            const yBudget = getY(d.budgeted);
            const hBudget = Math.max(yBaseline - yBudget, 2);

            const yRealized = getY(d.realized);
            const hRealized = Math.max(yBaseline - yRealized, 2);

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

                {/* X axis labels */}
                <text
                  x={groupCenter}
                  y={height - margin.bottom + 18}
                  textAnchor="middle"
                  className={`text-[10px] font-medium transition-colors cursor-pointer ${
                    isHovered ? 'fill-blue-600 font-bold dark:fill-blue-400' : 'fill-slate-500'
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

      {/* Tooltip Overlay */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-2 flex items-center justify-around rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 transition-all dark:bg-slate-800 dark:border-slate-700">
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
          {(() => {
            const diff = data[hoveredIndex].budgeted - data[hoveredIndex].realized;
            const underBudget = diff >= 0;
            return (
              <div className={`font-semibold ${underBudget ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {underBudget ? 'Economia:' : 'Excedido:'} R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
