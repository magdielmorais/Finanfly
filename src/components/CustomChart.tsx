import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingDown, Calendar, ArrowLeft, ArrowRight, Activity, ChevronLeft, ChevronRight, Info } from 'lucide-react';

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
      <div 
        data-no-swipe="true"
        data-chart-scrollable="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="relative w-full overflow-x-auto pb-3 custom-scrollbar"
      >
        <div className="inline-flex min-w-full" style={{ width: `${width}px` }}>
          {/* Sticky Left Y-Axis */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)] pointer-events-none select-none"
            style={{ width: `${margin.left}px`, height: `${height}px` }}
          >
            <svg
              width={margin.left}
              height={height}
              viewBox={`0 0 ${margin.left} ${height}`}
              className="w-full h-full font-sans"
            >
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={i}>
                    <line
                      x1={margin.left - 5}
                      y1={y}
                      x2={margin.left}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      className="opacity-70 dark:stroke-slate-700"
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
              <line
                x1={0}
                y1={yBaseline}
                x2={margin.left}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-40 dark:stroke-slate-700"
              />
            </svg>
          </div>

          {/* Scrollable Bars Content */}
          <div
            className="shrink-0"
            style={{ width: `${chartWidth + margin.right}px`, height: `${height}px` }}
          >
            <svg
              width={chartWidth + margin.right}
              height={height}
              viewBox={`0 0 ${chartWidth + margin.right} ${height}`}
              className="w-full h-full font-sans overflow-visible"
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
                <linearGradient id="realizedGoldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="realizedRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.95" />
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
                  <line
                    key={i}
                    x1={0}
                    y1={y}
                    x2={chartWidth + margin.right}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="opacity-30"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={0}
                y1={yBaseline}
                x2={chartWidth + margin.right}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-50 dark:stroke-slate-700"
              />

              {/* Bars */}
              {data.map((d, i) => {
                const groupCenter = (i + 0.5) * groupWidth;
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
                      x={i * groupWidth}
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

                    {/* Expense Bar (Realizado) - Dourado, ou Vermelho se ultrapassar o orçado */}
                    <rect
                      x={xExp}
                      y={yExp}
                      width={barWidth}
                      height={hExp}
                      fill={d.expense > d.budgeted ? "url(#realizedRedGrad)" : "url(#realizedGoldGrad)"}
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
        </div>
      </div>

      {/* Fixed Legend below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-600 inline-block shadow-sm" />
          <span>Receitas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500 inline-block shadow-sm" />
          <span>Orçado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gradient-to-b from-amber-400 to-amber-600 inline-block shadow-sm" />
          <span>Realizado (Dourado)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gradient-to-b from-red-500 to-red-700 inline-block shadow-sm" />
          <span>Realizado Excedido (Vermelho)</span>
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
          {(() => {
            const isExceeded = data[hoveredIndex].expense > data[hoveredIndex].budgeted;
            return (
              <div className={`flex items-center gap-1.5 font-medium ${isExceeded ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                <span className={`h-2 w-2 rounded-full ${isExceeded ? 'bg-red-500' : 'bg-amber-500'}`} />
                Realizado: R$ {data[hoveredIndex].expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {isExceeded && (
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 ml-0.5">
                    (Excedeu Orçado)
                  </span>
                )}
              </div>
            );
          })()}
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

  // 1. Obter os 10 maiores lançamentos por valor
  const top10 = [...itemsToShow]
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 10);

  // 2. Classificar por data fazendo com que a data mais atual apareça em cima seguida pelas demais
  const parseDateSafe = (d?: string): number => {
    if (!d) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
      const [day, month, year] = d.split('/');
      return new Date(`${year}-${month}-${day}T00:00:00`).getTime() || 0;
    }
    const cleanDate = d.includes('T') ? d : `${d}T00:00:00`;
    const time = new Date(cleanDate).getTime();
    return isNaN(time) ? 0 : time;
  };

  itemsToShow = top10.sort((a, b) => {
    const timeA = parseDateSafe(a.date);
    const timeB = parseDateSafe(b.date);
    if (timeB !== timeA) {
      return timeB - timeA; // data mais atual em cima
    }
    return (b.value || 0) - (a.value || 0);
  });

  if (itemsToShow.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum registro para exibir neste filtro.</p>
      </div>
    );
  }

  const maxVal = Math.max(...itemsToShow.map(item => item.value), 100);

  return (
    <div className="w-full min-w-0 flex flex-col gap-3">
      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
        {itemsToShow.map((item, index) => {
          const pct = (item.value / maxVal) * 100;
          const isIncome = item.type === 'receita';

          return (
            <div
              key={index}
              className="group flex flex-col gap-1 cursor-pointer min-w-0"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isIncome ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-red-50 text-red-600 dark:bg-red-950/40'
                  }`}>
                    #{index + 1}
                  </span>
                  <span
                    className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors truncate min-w-0"
                    title={item.description}
                  >
                    {item.description}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {item.date ? (item.date.includes('/') ? item.date : item.date.split('-').reverse().join('/')) : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md dark:bg-slate-800 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[140px]"
                    title={item.category}
                  >
                    {item.category}
                  </span>
                  <span className={`font-mono font-bold whitespace-nowrap ${isIncome ? 'text-blue-600' : 'text-red-500'}`}>
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
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex flex-wrap justify-between items-center gap-2 animate-fade-in min-w-0">
          <div className="min-w-0 flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{hoveredItem.description}</span>
            <span className="text-slate-400 shrink-0">|</span>
            <span className="truncate">Categoria: {hoveredItem.category}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

  const maxVal = Math.max(...data.flatMap(d => [d.budgeted, d.realized, Math.abs(d.balance)]), 100);
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
      <div 
        data-no-swipe="true"
        data-chart-scrollable="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="relative w-full overflow-x-auto pb-3 custom-scrollbar"
      >
        <div className="inline-flex min-w-full" style={{ width: `${width}px` }}>
          {/* Sticky Left Y-Axis */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)] pointer-events-none select-none"
            style={{ width: `${margin.left}px`, height: `${height}px` }}
          >
            <svg
              width={margin.left}
              height={height}
              viewBox={`0 0 ${margin.left} ${height}`}
              className="w-full h-full font-sans"
            >
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={i}>
                    <line
                      x1={margin.left - 5}
                      y1={y}
                      x2={margin.left}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      className="opacity-70 dark:stroke-slate-700"
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
              <line
                x1={0}
                y1={yBaseline}
                x2={margin.left}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-40 dark:stroke-slate-700"
              />
            </svg>
          </div>

          {/* Scrollable Bars Content */}
          <div
            className="shrink-0"
            style={{ width: `${chartWidth + margin.right}px`, height: `${height}px` }}
          >
            <svg
              width={chartWidth + margin.right}
              height={height}
              viewBox={`0 0 ${chartWidth + margin.right} ${height}`}
              className="w-full h-full font-sans overflow-visible"
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
                <linearGradient id="balanceYellowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                  <stop offset="50%" stopColor="#eab308" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="balanceRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="balanceBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <line
                    key={i}
                    x1={0}
                    y1={y}
                    x2={chartWidth + margin.right}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="opacity-30"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={0}
                y1={yBaseline}
                x2={chartWidth + margin.right}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-50 dark:stroke-slate-700"
              />

              {/* Bars */}
              {data.map((d, i) => {
                const groupCenter = (i + 0.5) * groupWidth;
                const totalWidth = 3 * barWidth + 2 * gap;
                const startX = groupCenter - totalWidth / 2;

                const xBudget = startX;
                const xRealized = startX + barWidth + gap;
                const xBalance = startX + 2 * (barWidth + gap);

                const yBudget = getY(d.budgeted);
                const hBudget = Math.max(yBaseline - yBudget, 2);

                const yRealized = getY(d.realized);
                const hRealized = Math.max(yBaseline - yRealized, 2);

                const isExceeded = d.realized > d.budgeted;
                const balanceValue = isExceeded ? Math.abs(d.balance) : Math.max(d.balance, 0);
                const yBalance = getY(balanceValue);
                const hBalance = Math.max(yBaseline - yBalance, 2);

                const isHovered = hoveredIndex === i;

                return (
                  <g key={i}>
                    {/* Background column hover state */}
                    <rect
                      x={i * groupWidth}
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
                      fill={isExceeded ? "url(#balanceRedGrad)" : "url(#balanceYellowGrad)"}
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
        </div>
      </div>

      {/* Fixed Legend below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-600 inline-block shadow-sm" />
          <span>Orçado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500 inline-block shadow-sm" />
          <span>Realizado (No Limite)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500 inline-block shadow-sm" />
          <span>Realizado (Excedido)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gradient-to-b from-yellow-300 to-yellow-500 inline-block shadow-sm" />
          <span>Saldo (Amarelo)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gradient-to-b from-red-500 to-red-700 inline-block shadow-sm" />
          <span>Saldo Excedido (Vermelho)</span>
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
          {(() => {
            const isBalanceExceeded = data[hoveredIndex].realized > data[hoveredIndex].budgeted;
            return (
              <div className={`flex items-center gap-1.5 font-semibold ${isBalanceExceeded ? 'text-red-500 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                <span className={`h-2 w-2 rounded-full ${isBalanceExceeded ? 'bg-red-500' : 'bg-yellow-400'}`} />
                Saldo: R$ {data[hoveredIndex].balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {isBalanceExceeded && (
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 ml-0.5">
                    (Excedeu Orçado)
                  </span>
                )}
              </div>
            );
          })()}
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

// --- Investment Charts ---

export const TYPE_COLOR_MAP: Record<string, { color: string; bgClass: string }> = {
  'Ações': { color: '#3b82f6', bgClass: 'bg-blue-500' },
  'FIIs': { color: '#10b981', bgClass: 'bg-emerald-500' },
  'Renda Fixa': { color: '#f59e0b', bgClass: 'bg-amber-500' },
  'Tesouro Direto': { color: '#8b5cf6', bgClass: 'bg-purple-500' },
  'CDB / RDB': { color: '#ec4899', bgClass: 'bg-pink-500' },
  'Criptomoedas': { color: '#06b6d4', bgClass: 'bg-cyan-500' },
  'Fundos': { color: '#6366f1', bgClass: 'bg-indigo-500' },
  'Outros': { color: '#64748b', bgClass: 'bg-slate-500' },
};

export const STATUS_COLOR_MAP: Record<string, { color: string; bgClass: string }> = {
  'Ativo': { color: '#10b981', bgClass: 'bg-emerald-500' },
  'Resgatado': { color: '#3b82f6', bgClass: 'bg-blue-500' },
  'Em Andamento': { color: '#f59e0b', bgClass: 'bg-amber-500' },
  'Pendente': { color: '#ef4444', bgClass: 'bg-red-500' },
};

export const Investment5YearTotalChart: React.FC<{
  data: { year: number; total: number }[];
}> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum dado de investimento disponível.</p>
      </div>
    );
  }

  const margin = { top: 25, right: 25, bottom: 45, left: 85 };
  const width = 650;
  const height = 300;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.map(d => d.total), 1000);
  const roundedMax = Math.ceil(maxVal / 1000) * 1000;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(groupWidth * 0.45, 36);

  return (
    <div className="w-full min-w-0">
      <div 
        data-no-swipe="true"
        data-chart-scrollable="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="relative w-full overflow-x-auto pb-3 custom-scrollbar"
      >
        <div className="inline-flex min-w-full" style={{ width: `${width}px` }}>
          {/* Sticky Left Y-Axis */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)] pointer-events-none select-none"
            style={{ width: `${margin.left}px`, height: `${height}px` }}
          >
            <svg
              width={margin.left}
              height={height}
              viewBox={`0 0 ${margin.left} ${height}`}
              className="w-full h-full font-sans"
            >
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={i}>
                    <line
                      x1={margin.left - 5}
                      y1={y}
                      x2={margin.left}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      className="opacity-70 dark:stroke-slate-700"
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
              <line
                x1={0}
                y1={yBaseline}
                x2={margin.left}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-40 dark:stroke-slate-700"
              />
            </svg>
          </div>

          {/* Scrollable Bars Content */}
          <div
            className="shrink-0"
            style={{ width: `${chartWidth + margin.right}px`, height: `${height}px` }}
          >
            <svg
              width={chartWidth + margin.right}
              height={height}
              viewBox={`0 0 ${chartWidth + margin.right} ${height}`}
              className="w-full h-full font-sans overflow-visible"
            >
              <defs>
                <linearGradient id="invTotalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <line
                    key={i}
                    x1={0}
                    y1={y}
                    x2={chartWidth + margin.right}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="opacity-30"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={0}
                y1={yBaseline}
                x2={chartWidth + margin.right}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-50 dark:stroke-slate-700"
              />

              {/* Bars */}
              {data.map((d, i) => {
                const groupCenter = (i + 0.5) * groupWidth;
                const x = groupCenter - barWidth / 2;
                const y = getY(d.total);
                const h = Math.max(yBaseline - y, d.total > 0 ? 3 : 0);
                const isHovered = hoveredIndex === i;

                return (
                  <g key={i}>
                    <rect
                      x={i * groupWidth}
                      y={margin.top}
                      width={groupWidth}
                      height={chartHeight}
                      fill={isHovered ? '#f1f5f9' : 'transparent'}
                      className="transition-colors duration-150 dark:fill-slate-800/20"
                      style={{ opacity: isHovered ? 0.4 : 0 }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      fill="url(#invTotalGrad)"
                      rx="4"
                      ry="4"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                        opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1
                      }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {d.total > 0 && (
                      <text
                        x={groupCenter}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-purple-700 dark:fill-purple-300 text-[10px] font-bold font-mono"
                      >
                        R$ {d.total >= 1000000 ? `${(d.total / 1000000).toFixed(1)}M` : d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total.toFixed(0)}
                      </text>
                    )}

                    <text
                      x={groupCenter}
                      y={height - margin.bottom + 20}
                      textAnchor="middle"
                      className={`text-[11px] font-bold transition-colors cursor-pointer ${
                        isHovered ? 'fill-purple-600 dark:fill-purple-400' : 'fill-slate-700 dark:fill-slate-200'
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
        </div>
      </div>

      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-purple-50 p-2.5 text-xs border border-purple-100 dark:bg-purple-950/40 dark:border-purple-800">
          <span className="font-bold text-purple-900 dark:text-purple-200">Ano: {data[hoveredIndex].year}</span>
          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
            Total Investido: R$ {data[hoveredIndex].total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
};

export const Investment5YearStackedChart: React.FC<{
  data: { year: number; totalsMap: Record<string, number>; grandTotal: number }[];
  categories: string[];
  colorMap: Record<string, { color: string; bgClass: string }>;
}> = ({ data, categories, colorMap }) => {
  const [hoveredYearIndex, setHoveredYearIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-slate-400 text-sm">Nenhum dado disponível.</p>
      </div>
    );
  }

  const margin = { top: 25, right: 25, bottom: 45, left: 85 };
  const width = 650;
  const height = 320;
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...data.map(d => d.grandTotal), 1000);
  const roundedMax = Math.ceil(maxVal / 1000) * 1000;

  const getY = (val: number) => margin.top + chartHeight - (val / roundedMax) * chartHeight;
  const yBaseline = margin.top + chartHeight;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (roundedMax * i) / yTicks);

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(groupWidth * 0.45, 36);

  return (
    <div className="w-full min-w-0">
      <div 
        data-no-swipe="true"
        data-chart-scrollable="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="relative w-full overflow-x-auto pb-3 custom-scrollbar"
      >
        <div className="inline-flex min-w-full" style={{ width: `${width}px` }}>
          {/* Sticky Left Y-Axis */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)] pointer-events-none select-none"
            style={{ width: `${margin.left}px`, height: `${height}px` }}
          >
            <svg
              width={margin.left}
              height={height}
              viewBox={`0 0 ${margin.left} ${height}`}
              className="w-full h-full font-sans"
            >
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={i}>
                    <line
                      x1={margin.left - 5}
                      y1={y}
                      x2={margin.left}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      className="opacity-70 dark:stroke-slate-700"
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
              <line
                x1={0}
                y1={yBaseline}
                x2={margin.left}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-40 dark:stroke-slate-700"
              />
            </svg>
          </div>

          {/* Scrollable Bars Content */}
          <div
            className="shrink-0"
            style={{ width: `${chartWidth + margin.right}px`, height: `${height}px` }}
          >
            <svg
              width={chartWidth + margin.right}
              height={height}
              viewBox={`0 0 ${chartWidth + margin.right} ${height}`}
              className="w-full h-full font-sans overflow-visible"
            >
              {/* Grid lines */}
              {ticks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <line
                    key={i}
                    x1={0}
                    y1={y}
                    x2={chartWidth + margin.right}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="opacity-30"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={0}
                y1={yBaseline}
                x2={chartWidth + margin.right}
                y2={yBaseline}
                stroke="#cbd5e1"
                strokeWidth="1"
                className="opacity-50 dark:stroke-slate-700"
              />

              {/* Stacked Bars */}
              {data.map((d, i) => {
                const groupCenter = (i + 0.5) * groupWidth;
                const x = groupCenter - barWidth / 2;
                const isHovered = hoveredYearIndex === i;

                let currentStackY = yBaseline;

                return (
                  <g key={i} onMouseEnter={() => setHoveredYearIndex(i)} onMouseLeave={() => setHoveredYearIndex(null)}>
                    <rect
                      x={i * groupWidth}
                      y={margin.top}
                      width={groupWidth}
                      height={chartHeight}
                      fill={isHovered ? '#f1f5f9' : 'transparent'}
                      className="transition-colors duration-150 dark:fill-slate-800/20"
                      style={{ opacity: isHovered ? 0.4 : 0 }}
                    />

                    {categories.map((cat) => {
                      const val = d.totalsMap[cat] || 0;
                      if (val <= 0) return null;

                      const segHeight = (val / roundedMax) * chartHeight;
                      const segY = currentStackY - segHeight;
                      currentStackY = segY;

                      const itemColor = colorMap[cat]?.color || '#64748b';

                      return (
                        <rect
                          key={cat}
                          x={x}
                          y={segY}
                          width={barWidth}
                          height={segHeight}
                          fill={itemColor}
                          rx="1"
                          ry="1"
                          className="transition-all duration-200 cursor-pointer"
                          style={{
                            filter: isHovered ? 'brightness(1.1)' : 'none',
                            opacity: hoveredYearIndex !== null && !isHovered ? 0.6 : 1
                          }}
                        />
                      );
                    })}

                    <text
                      x={groupCenter}
                      y={height - margin.bottom + 20}
                      textAnchor="middle"
                      className={`text-[11px] font-bold transition-colors cursor-pointer ${
                        isHovered ? 'fill-blue-600 dark:fill-blue-400' : 'fill-slate-700 dark:fill-slate-200'
                      }`}
                    >
                      {d.year}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Legend below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
        {categories.map(cat => {
          const c = colorMap[cat]?.color || '#64748b';
          return (
            <div key={cat} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded inline-block" style={{ backgroundColor: c }} />
              <span>{cat}</span>
            </div>
          );
        })}
      </div>

      {/* Tooltip Overlay */}
      {hoveredYearIndex !== null && data[hoveredYearIndex] && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs border border-slate-200 dark:bg-slate-800 dark:border-slate-700 space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1 font-bold text-slate-800 dark:text-white">
            <span>Ano: {data[hoveredYearIndex].year}</span>
            <span className="font-mono">Total: R$ {data[hoveredYearIndex].grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {categories.map(cat => {
              const val = data[hoveredYearIndex].totalsMap[cat] || 0;
              if (val <= 0) return null;
              const c = colorMap[cat]?.color || '#64748b';
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-slate-600 dark:text-slate-300 truncate">{cat}:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-white">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const InvestmentMonthlyDonutChart: React.FC<{
  data: { name: string; value: number; color: string; bgClass: string }[];
  totalValue: number;
  emptyLabel?: string;
}> = ({ data, totalValue, emptyLabel = 'Sem investimentos' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 240;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = 95;
  const rInner = 60;

  const activeSlices = data.filter(d => d.value > 0);

  if (totalValue === 0 || activeSlices.length === 0) {
    return (
      <div className="w-full min-w-0">
        <div className="relative w-full overflow-x-auto pb-3 custom-scrollbar">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 min-w-[280px]">
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
                <span className="text-xs text-slate-400 font-medium">{emptyLabel}</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">R$ 0,00</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-[180px]">
              {data.slice(0, 5).map((item, i) => (
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
        </div>
      </div>
    );
  }

  let currentAngle = -Math.PI / 2;
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
        strokeW
      };
    }

    const gapAngle = 0.02;
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
    const pathD = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return {
      ...item,
      idx,
      pathD,
      isFullCircle: false
    };
  }).filter(Boolean);

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="w-full min-w-0">
      <div className="relative w-full overflow-x-auto pb-3 custom-scrollbar">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2 min-w-[300px]">
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
                  d={slice.pathD}
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
                : ''}
            </span>
          </div>
        </div>

        <div 
          data-no-swipe="true"
          className="flex flex-col gap-2 w-full sm:w-auto min-w-[220px] max-h-60 overflow-y-auto pr-1 custom-scrollbar"
        >
          {data.map((item, idx) => {
            if (item.value <= 0) return null;
            const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-slate-100/90 border-slate-300 dark:bg-slate-800 dark:border-slate-700 shadow-sm scale-[1.01]'
                    : 'bg-slate-50 border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-3.5 w-3.5 rounded ${item.bgClass} shadow-xs shrink-0`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{item.name}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{pct}%</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
};

// ======================== MONTHLY EXPENSE TREND CHART ========================
// Gráfico de linha mostrando os gastos dia a dia e a soma acumulada ao longo do mês
// com eixo vertical fixo na lateral esquerda durante a rolagem horizontal
export interface DailyTrendPoint {
  day: number;
  dateStr: string;
  weekday: string;
  isWeekend: boolean;
  dayTotal: number;
  accumulated: number;
  count: number;
}

export const MonthlyExpenseTrendChart: React.FC<{
  expenses: { date: string; value: number; description?: string; category?: string }[];
  selectedYear: number;
  selectedMonth: number; // 0-11
  monthName: string;
}> = ({ expenses, selectedYear, selectedMonth, monthName }) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const updateWidth = () => {
      if (el) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Quantidade de dias no mês selecionado
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Cálculo diário e soma acumulada dia a dia
  const { dailyData, totalMonthExpense, peakDay, peakAmount, dailyAverage, averagePerExpense, activeDaysCount } = useMemo(() => {
    let acc = 0;
    let maxDayExpense = 0;
    let maxDay = 1;
    let activeDays = 0;

    const points: DailyTrendPoint[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayExpenses = (expenses || []).filter(e => {
        if (!e.date) return false;
        const parts = e.date.split('-');
        if (parts.length >= 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return y === selectedYear && m === selectedMonth && day === d;
        }
        return false;
      });

      const dayTotal = dayExpenses.reduce((sum, e) => sum + e.value, 0);
      acc += dayTotal;

      if (dayTotal > 0) {
        activeDays++;
        if (dayTotal > maxDayExpense) {
          maxDayExpense = dayTotal;
          maxDay = d;
        }
      }

      const dateObj = new Date(selectedYear, selectedMonth, d);
      const dayOfWeekNum = dateObj.getDay();
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

      points.push({
        day: d,
        dateStr: `${String(d).padStart(2, '0')}/${String(selectedMonth + 1).padStart(2, '0')}`,
        weekday,
        isWeekend,
        dayTotal,
        accumulated: acc,
        count: dayExpenses.length
      });
    }

    return {
      dailyData: points,
      totalMonthExpense: acc,
      peakDay: maxDay,
      peakAmount: maxDayExpense,
      dailyAverage: daysInMonth > 0 ? acc / daysInMonth : 0,
      averagePerExpense: expenses.length > 0 ? acc / expenses.length : 0,
      activeDaysCount: activeDays
    };
  }, [expenses, selectedYear, selectedMonth, daysInMonth]);

  // Dimensões do gráfico (pequeno e compacto)
  const chartHeight = 165;
  const topPadding = 16;
  const bottomPadding = 16;
  const plotHeight = chartHeight - topPadding - bottomPadding;

  // Largura reduzida do eixo Y (apenas 38px) para maximizar a área útil dos dados na tela
  const yAxisWidth = 38;

  // Largura calculada para exibir muito mais dias na tela de uma só vez:
  // Passo compacto de 17px por dia (para 31 dias = apenas 527px).
  // Se o container da tela for maior, expande para preencher fluidamente sem rolagem.
  const minDayStep = 17;
  const minChartWidth = daysInMonth * minDayStep;
  const availableWidth = containerWidth > yAxisWidth ? containerWidth - yAxisWidth : 0;
  const chartWidth = availableWidth > minChartWidth ? availableWidth : minChartWidth;
  const hasOverflow = availableWidth > 0 && chartWidth > availableWidth;

  // Formatação ultra compacta dos números do eixo Y para caber perfeitamente em 38px
  const formatYTickCompact = (val: number) => {
    if (val <= 0) return '0';
    if (val >= 1000000) {
      const m = val / 1000000;
      return `${m % 1 === 0 ? m : m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return `${k % 1 === 0 ? k : k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
    }
    return `${Math.round(val)}`;
  };

  // Valor máximo para a escala do eixo Y
  const maxVal = Math.max(totalMonthExpense, 100);
  const roundFactor = maxVal > 10000 ? 2000 : maxVal > 5000 ? 1000 : maxVal > 1000 ? 500 : 100;
  const niceMax = Math.ceil(maxVal / roundFactor) * roundFactor;

  const getY = (val: number) => {
    return topPadding + plotHeight - (val / niceMax) * plotHeight;
  };

  const yTicksCount = 4;
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
    const val = (niceMax * (yTicksCount - i)) / yTicksCount;
    const yPos = getY(val);
    return { val, yPos };
  });

  // Coordenadas dos pontos diários
  const pointsWithCoords = useMemo(() => {
    const colWidth = chartWidth / daysInMonth;
    return dailyData.map((d) => {
      const x = (d.day - 0.5) * colWidth;
      const y = getY(d.accumulated);
      const barY = getY(d.dayTotal);
      const barHeight = Math.max(0, getY(0) - barY);
      return {
        ...d,
        x,
        y,
        barY,
        barHeight,
        colWidth
      };
    });
  }, [dailyData, chartWidth, daysInMonth, niceMax]);

  // Caminho da linha acumulada
  const linePath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    return pointsWithCoords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, [pointsWithCoords]);

  // Área preenchida sob a curva
  const areaPath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    const firstX = pointsWithCoords[0].x.toFixed(1);
    const lastX = pointsWithCoords[pointsWithCoords.length - 1].x.toFixed(1);
    const baseY = getY(0).toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [linePath, pointsWithCoords]);

  // Ações de rolagem rápida
  const scrollTo = (position: 'start' | 'end') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: position === 'start' ? 0 : scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  };

  const hoveredItem = hoveredDay ? pointsWithCoords.find(p => p.day === hoveredDay) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full animate-fade-in">
      {/* Header do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-rose-600 dark:bg-rose-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Tendência de Gastos
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              · {monthName} de {selectedYear}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Evolução dia a dia da soma acumulada para identificar períodos de maior desembolso
          </p>
        </div>

        {/* Botões de rolagem rápida e legenda concisa */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mr-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-0.5 bg-rose-600 dark:bg-rose-400 rounded-full" />
              Soma Acumulada
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-xs bg-amber-400/80 dark:bg-amber-400/60" />
              Gasto do Dia
            </span>
          </div>
          {hasOverflow && (
            <>
              <button
                type="button"
                onClick={() => scrollTo('start')}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                title="Rolar para o início do mês (Dia 1)"
              >
                <ChevronLeft className="h-3 w-3" />
                Início
              </button>
              <button
                type="button"
                onClick={() => scrollTo('end')}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                title="Rolar para o final do mês"
              >
                Fim
                <ChevronRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards / Indicadores rápidos de Tendência */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3">
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Acumulado</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            R$ {totalMonthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Média de Gastos</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums">
            R$ {dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Média p/ Lançamento</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums">
            R$ {averagePerExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Pico de Gasto</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {peakAmount > 0 ? `Dia ${peakDay} (R$ ${peakAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : 'R$ 0,00'}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Dias com Despesas</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums">
            {activeDaysCount} de {daysInMonth} dias
          </span>
        </div>
      </div>

      {/* Caixa de inspeção interativa ativa ao passar o mouse / tocar */}
      {hoveredItem ? (
        <div className="mb-2 p-2 px-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 flex flex-wrap items-center justify-between text-xs text-rose-950 dark:text-rose-200 animate-fade-in gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded text-[11px]">
              Dia {hoveredItem.day} ({hoveredItem.weekday})
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Gasto no dia: <strong className="font-mono text-slate-900 dark:text-white">R$ {hoveredItem.dayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              {hoveredItem.count > 0 && <span className="text-[10px] text-slate-500 ml-1">({hoveredItem.count} lanç.)</span>}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-300">
              Acumulado até o dia: <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">R$ {hoveredItem.accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="font-bold text-[11px] text-rose-700 dark:text-rose-300 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-800/40 font-mono">
              {totalMonthExpense > 0 ? ((hoveredItem.accumulated / totalMonthExpense) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
          <span>💡 Passe o cursor ou toque nos dias para inspecionar os valores pontuais e acumulados.</span>
          <span className="hidden sm:inline">Role a barra para navegar pelo mês mantendo o eixo Y fixo à esquerda.</span>
        </div>
      )}

      {/* Container do Gráfico com Rolagem Horizontal e Eixo Y Fixo à Esquerda */}
      <div className="relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden shadow-xs">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto custom-scrollbar select-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex" style={{ width: 'max-content', minWidth: '100%' }}>
            {/* Eixo Vertical Y (Fixo na Lateral Esquerda durante a rolagem com largura reduzida para 38px) */}
            <div
              className="sticky left-0 z-20 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_6px_rgba(0,0,0,0.03)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.35)]"
              style={{ width: `${yAxisWidth}px`, height: `${chartHeight + 36}px` }}
            >
              {/* Rótulo do Eixo Y no Topo */}
              <div className="pt-1 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                R$
              </div>

              {/* Ticks e Valores de Escala */}
              <div className="relative w-full" style={{ height: `${chartHeight}px` }}>
                {yTicks.map((tick, idx) => (
                  <div
                    key={`ytick-${idx}`}
                    className="absolute right-0 flex items-center justify-end pr-0.5 text-[8.5px] font-mono font-medium text-slate-500 dark:text-slate-400"
                    style={{
                      top: `${tick.yPos}px`,
                      transform: 'translateY(-50%)',
                      width: '100%'
                    }}
                  >
                    <span className="truncate pr-0.5 text-right">
                      {formatYTickCompact(tick.val)}
                    </span>
                    <span className="w-1 h-px bg-slate-300 dark:bg-slate-700 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Espaço correspondente ao rodapé do eixo X */}
              <div className="h-9 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                Dia
              </div>
            </div>

            {/* Corpo do Gráfico com Curva SVG e Linha do Tempo */}
            <div className="relative shrink-0 flex flex-col" style={{ width: `${chartWidth}px` }}>
              <svg
                width={chartWidth}
                height={chartHeight}
                className="overflow-visible"
              >
                <defs>
                  {/* Gradiente da área acumulada */}
                  <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                    <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                  </linearGradient>

                  {/* Gradiente das barras diárias */}
                  <linearGradient id="dailyBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Linhas de Grade Horizontais */}
                {yTicks.map((tick, idx) => (
                  <line
                    key={`grid-line-${idx}`}
                    x1="0"
                    y1={tick.yPos}
                    x2={chartWidth}
                    y2={tick.yPos}
                    stroke="currentColor"
                    className="text-slate-200/80 dark:text-slate-800/80"
                    strokeDasharray={idx === yTicks.length - 1 ? undefined : "3 3"}
                    strokeWidth={idx === yTicks.length - 1 ? "1.5" : "1"}
                  />
                ))}

                {/* Destaque sutil de finais de semana */}
                {pointsWithCoords.map((p) => {
                  if (!p.isWeekend) return null;
                  return (
                    <rect
                      key={`weekend-bg-${p.day}`}
                      x={p.x - p.colWidth / 2}
                      y={topPadding}
                      width={p.colWidth}
                      height={plotHeight}
                      className="fill-slate-100/50 dark:fill-slate-800/30"
                    />
                  );
                })}

                {/* Barras de Gasto no Dia (na base do gráfico) */}
                {pointsWithCoords.map((p) => {
                  if (p.dayTotal <= 0) return null;
                  const barW = Math.max(5, Math.min(8, p.colWidth * 0.42));
                  return (
                    <rect
                      key={`bar-${p.day}`}
                      x={p.x - barW / 2}
                      y={p.barY}
                      width={barW}
                      height={p.barHeight}
                      rx={1.5}
                      fill="url(#dailyBarGradient)"
                      stroke="#d97706"
                      strokeWidth={0.6}
                      strokeOpacity={0.7}
                      className="transition-opacity"
                    />
                  );
                })}

                {/* Área Preenchida da Tendência Acumulada */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#trendAreaGradient)"
                  />
                )}

                {/* Linha Contínua da Soma Acumulada */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dark:stroke-rose-400"
                  />
                )}

                {/* Marcadores nos dias com despesas */}
                {pointsWithCoords.map((p) => {
                  if (p.dayTotal <= 0) return null;
                  const isHovered = hoveredDay === p.day;
                  return (
                    <circle
                      key={`dot-${p.day}`}
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 4.5 : 2.5}
                      className="fill-rose-600 dark:fill-rose-400 stroke-white dark:stroke-slate-900 transition-all cursor-pointer"
                      strokeWidth={1.5}
                    />
                  );
                })}

                {/* Indicador Vertical e Ponto Ativo em Hover */}
                {hoveredItem && (
                  <g pointerEvents="none">
                    <line
                      x1={hoveredItem.x}
                      y1={topPadding}
                      x2={hoveredItem.x}
                      y2={getY(0)}
                      stroke="#e11d48"
                      strokeWidth={1.2}
                      strokeDasharray="2 2"
                      className="dark:stroke-rose-400 opacity-80"
                    />
                    <circle
                      cx={hoveredItem.x}
                      cy={hoveredItem.y}
                      r={5}
                      className="fill-rose-600 dark:fill-rose-400 stroke-white dark:stroke-slate-900 shadow-md"
                      strokeWidth={2}
                    />
                  </g>
                )}

                {/* Zonas Invisíveis de Toque / Hover por Coluna de Dia */}
                {pointsWithCoords.map((p) => (
                  <rect
                    key={`trigger-${p.day}`}
                    x={p.x - p.colWidth / 2}
                    y={0}
                    width={p.colWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(p.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(prev => prev === p.day ? null : p.day)}
                  />
                ))}
              </svg>

              {/* Eixo X com Dias do Mês (1 a 28/29/30/31) */}
              <div
                className="flex border-t border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 h-9"
                style={{ width: `${chartWidth}px` }}
              >
                {pointsWithCoords.map((p) => {
                  const isHovered = hoveredDay === p.day;
                  return (
                    <div
                      key={`day-col-${p.day}`}
                      style={{ width: `${p.colWidth}px` }}
                      onMouseEnter={() => setHoveredDay(p.day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => setHoveredDay(prev => prev === p.day ? null : p.day)}
                      className={`flex flex-col items-center justify-center cursor-pointer transition-colors border-r border-slate-100/80 dark:border-slate-800/40 ${
                        isHovered
                          ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 font-bold'
                          : p.isWeekend
                            ? 'text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/20'
                            : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`text-[9px] leading-none font-mono ${p.dayTotal > 0 ? 'font-black text-slate-900 dark:text-white' : ''}`}>
                        {p.day}
                      </span>
                      <span className="text-[7px] uppercase tracking-tighter opacity-70 leading-none mt-0.5">
                        {p.weekday.slice(0, 3)}
                      </span>
                      {p.dayTotal > 0 && (
                        <span className="mt-0.5 w-1 h-1 rounded-full bg-rose-500 dark:bg-rose-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


