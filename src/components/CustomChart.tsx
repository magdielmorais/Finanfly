import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Wallet } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';

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
  sumBudget?: number;
}> = ({ expenses, selectedYear, selectedMonth, monthName, sumBudget = 0 }) => {
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

  // Dimensões do gráfico (compacto com eixo horizontal para os dias em vertical)
  const chartHeight = 185;
  const topPadding = 16;
  const bottomPadding = 36;
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
  const avgBudgetPerDay = daysInMonth > 0 ? (sumBudget / daysInMonth) : 0;
  const avgRealSpentPerDay = activeDaysCount > 0 ? (totalMonthExpense / activeDaysCount) : 0;

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
              <span className="w-2.5 h-2.5 rounded bg-amber-400/85 dark:bg-amber-400/60" />
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

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-950/20">
            {/* Eixo Y fixo na esquerda */}
            <div className="absolute left-0 top-0 bottom-0 z-10 bg-white/90 dark:bg-slate-900/90 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between pointer-events-none" style={{ width: `${yAxisWidth}px`, padding: `${topPadding}px 4px ${bottomPadding}px 2px` }}>
              {yTicks.map((tick) => (
                <span key={`y-tick-${tick.val}`} className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 text-right pr-0.5 leading-none" style={{ height: '0', display: 'flex', alignItems: 'center', justifyContent: 'end' }}>
                  {formatYTickCompact(tick.val)}
                </span>
              ))}
            </div>

            {/* Container rolável */}
            <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar" style={{ paddingLeft: `${yAxisWidth}px` }}>
              <div style={{ width: `${chartWidth}px`, height: `${chartHeight}px`, position: 'relative' }}>
                <svg width={chartWidth} height={chartHeight} style={{ overflow: 'visible' }}>
                  {/* Grid Lines */}
                  {yTicks.map((tick) => (
                    <line key={`grid-${tick.val}`} x1={0} y1={tick.yPos} x2={chartWidth} y2={tick.yPos} stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeDasharray="3 3" />
                  ))}

                  {/* SVG Area Path */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#trend-area-grad)" opacity={0.15} />
                  )}

                  {/* SVG Line Path */}
                  {linePath && (
                    <path d={linePath} fill="none" stroke="currentColor" className="text-rose-500 dark:text-rose-400" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Defs para gradiente */}
                  <defs>
                    <linearGradient id="trend-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Barras de Gasto do Dia (fundo) */}
                  {pointsWithCoords.map((p) => (
                    <rect key={`bar-${p.day}`} x={p.x - p.colWidth * 0.3} y={p.barY} width={p.colWidth * 0.6} height={p.barHeight} fill={hoveredDay === p.day ? '#f59e0b' : '#fbbf24'} opacity={hoveredDay === p.day ? 0.9 : 0.4} rx={1} />
                  ))}

                  {/* Eixo X - Linha horizontal base */}
                  <line
                    x1={0}
                    y1={getY(0)}
                    x2={chartWidth}
                    y2={getY(0)}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth={1}
                  />

                  {/* Eixo X - Ticks e Rótulos verticais dos Dias */}
                  {pointsWithCoords.map((p) => {
                    const isHovered = hoveredDay === p.day;
                    return (
                      <g
                        key={`x-axis-day-${p.day}`}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredDay(p.day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => setHoveredDay(hoveredDay === p.day ? null : p.day)}
                      >
                        {/* Linha vertical de tick no eixo */}
                        <line
                          x1={p.x}
                          y1={getY(0)}
                          x2={p.x}
                          y2={getY(0) + (isHovered ? 6 : 4)}
                          stroke="currentColor"
                          className={isHovered ? "text-rose-500 dark:text-rose-400 stroke-[1.5]" : "text-slate-300 dark:text-slate-700"}
                        />
                        {/* Rótulo do dia na vertical (90 graus) */}
                        <text
                          x={p.x}
                          y={getY(0) + 7}
                          transform={`rotate(90, ${p.x}, ${getY(0) + 7})`}
                          textAnchor="start"
                          dominantBaseline="central"
                          style={{ fontSize: '9px', userSelect: 'none' }}
                          className={`font-mono transition-colors duration-150 ${
                            isHovered
                              ? "fill-rose-600 dark:fill-rose-400 font-bold"
                              : p.dayTotal > 0
                              ? "fill-slate-800 dark:fill-slate-200 font-semibold"
                              : p.isWeekend
                              ? "fill-slate-400 dark:fill-slate-500 font-normal opacity-70"
                              : "fill-slate-500 dark:fill-slate-400 font-medium"
                          }`}
                        >
                          {String(p.day).padStart(2, '0')}
                        </text>
                      </g>
                    );
                  })}

                  {/* Pontos de Interação */}
                  {pointsWithCoords.map((p) => (
                    <g key={`point-g-${p.day}`}>
                      <circle cx={p.x} cy={p.y} r={hoveredDay === p.day ? 6 : p.dayTotal > 0 ? 3.5 : 2} fill={hoveredDay === p.day ? '#f43f5e' : p.dayTotal > 0 ? '#ef4444' : '#cbd5e1'} className="transition-all duration-150" style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredDay(p.day)} onMouseLeave={() => setHoveredDay(null)} />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards / Indicadores rápidos de Tendência */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-1">Total Acumulado Gastos</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums mt-auto">
            R$ {totalMonthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-0.5">Média Gastos Previsto</span>
            <span className="block text-[8.5px] text-slate-400 dark:text-slate-500 normal-case leading-tight break-words whitespace-normal pb-1">(orçado do mês dividido por número de dias no mês)</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums mt-auto">
            R$ {avgBudgetPerDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-0.5">Média Gastos Real</span>
            <span className="block text-[8.5px] text-slate-400 dark:text-slate-500 normal-case leading-tight break-words whitespace-normal pb-1">(total gasto até o momento dividido pelos dias com gastos)</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums mt-auto">
            R$ {avgRealSpentPerDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-1">Média por Lançamento</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums mt-auto">
            R$ {averagePerExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-1">Pico de Gasto</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums mt-auto">
            {peakAmount > 0 ? `Dia ${peakDay} (R$ ${peakAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : 'R$ 0,00'}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[92px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 break-words whitespace-normal leading-tight pb-1">Dias com Despesas</span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-700 dark:text-slate-200 tabular-nums mt-auto">
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
      ) : null}
    </div>
  );
};

// --- Color Maps ---
export const TYPE_COLOR_MAP: Record<string, { color: string; bgClass: string }> = {
  'Ações': { color: '#3b82f6', bgClass: 'bg-blue-500' },
  'FIIs': { color: '#10b981', bgClass: 'bg-emerald-500' },
  'Renda Fixa': { color: '#f59e0b', bgClass: 'bg-amber-500' },
  'Tesouro Direto': { color: '#ef4444', bgClass: 'bg-rose-500' },
  'CDB / RDB': { color: '#6366f1', bgClass: 'bg-indigo-500' },
  'Criptomoedas': { color: '#ec4899', bgClass: 'bg-pink-500' },
  'Fundos': { color: '#8b5cf6', bgClass: 'bg-purple-500' },
  'Outros': { color: '#64748b', bgClass: 'bg-slate-500' }
};

export const STATUS_COLOR_MAP: Record<string, { color: string; bgClass: string }> = {
  'Ativo': { color: '#10b981', bgClass: 'bg-emerald-500' },
  'Resgatado': { color: '#ef4444', bgClass: 'bg-rose-500' },
  'Em Andamento': { color: '#3b82f6', bgClass: 'bg-blue-500' },
  'Pendente': { color: '#f59e0b', bgClass: 'bg-amber-500' }
};

// --- AnnualComparisonChart ---
export const AnnualComparisonChart: React.FC<{
  data: { year: number; income: number; budgeted: number; expense: number }[];
}> = ({ data }) => {
  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
          <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip 
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            contentStyle={{ borderRadius: '8px', padding: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="budgeted" name="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- TopItemsBarChart ---
export const TopItemsBarChart: React.FC<{
  incomes: any[];
  expenses: any[];
  filter: string;
}> = ({ incomes, expenses, filter }) => {
  const items = useMemo(() => {
    let combined: any[] = [];
    if (filter === 'Todos' || filter === 'Receitas') {
      combined = [...combined, ...incomes];
    }
    if (filter === 'Todos' || filter === 'Despesas') {
      combined = [...combined, ...expenses];
    }
    return combined
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [incomes, expenses, filter]);

  if (items.length === 0) {
    return <p className="text-center text-xs py-10 text-slate-400">Nenhum dado encontrado para exibir.</p>;
  }

  return (
    <div className="w-full space-y-3.5">
      {items.map((item, idx) => {
        const percentage = Math.max(5, Math.min(100, (item.value / items[0].value) * 100));
        const isReceita = item.type === 'receita';
        return (
          <div key={idx} className="space-y-1 text-xs">
            <div className="flex items-center justify-between font-medium">
              <span className="truncate max-w-[200px] text-slate-700 dark:text-slate-300 font-semibold">
                {item.description || 'Sem descrição'}
              </span>
              <span className={`font-mono font-bold ${isReceita ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isReceita ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- ExpenseBudgetComparisonChart ---
export const ExpenseBudgetComparisonChart: React.FC<{
  data: { month: string; budgeted: number; realized: number; balance: number }[];
}> = ({ data }) => {
  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            contentStyle={{ borderRadius: '8px', padding: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="budgeted" name="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="realized" name="Realizado" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- ExpenseClassificationPieChart ---
export const ExpenseClassificationPieChart: React.FC<{
  data: { name: string; value: number; color: string; bgClass: string }[];
  totalValue: number;
}> = ({ data, totalValue }) => {
  const chartData = useMemo(() => {
    return data.filter(d => d.value > 0);
  }, [data]);

  if (chartData.length === 0) {
    return <p className="text-center text-xs py-10 text-slate-400">Nenhum gasto registrado neste período.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-[240px]">
      <div className="w-1/2 h-full min-h-[160px] relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
          <span className="text-xs sm:text-sm font-black font-mono text-slate-800 dark:text-slate-100">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2.5">
        {data.map((item, index) => {
          const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
          return (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${item.bgClass}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
              </div>
              <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                <span>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({percent.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Investment5YearTotalChart ---
export const Investment5YearTotalChart: React.FC<{
  data: { year: number; total: number }[];
}> = ({ data }) => {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity="0.4"/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
          <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', padding: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
          />
          <Area type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Investment5YearStackedChart ---
export const Investment5YearStackedChart: React.FC<{
  data: { year: number; totalsMap: Record<string, number>; grandTotal: number }[];
  categories: string[];
  colorMap: Record<string, { color: string; bgClass: string }>;
}> = ({ data, categories, colorMap }) => {
  const chartData = useMemo(() => {
    return data.map(item => {
      const row: any = { year: item.year };
      categories.forEach(cat => {
        row[cat] = item.totalsMap[cat] || 0;
      });
      return row;
    });
  }, [data, categories]);

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
          <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', padding: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
          />
          {categories.map((cat, index) => {
            const info = colorMap[cat] || { color: '#64748b' };
            return (
              <Bar 
                key={cat} 
                dataKey={cat} 
                name={cat} 
                stackId="a" 
                fill={info.color} 
                radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- InvestmentMonthlyDonutChart ---
export const InvestmentMonthlyDonutChart: React.FC<{
  data: { name: string; value: number; color: string; bgClass: string }[];
  totalValue: number;
  emptyLabel?: string;
}> = ({ data, totalValue, emptyLabel = "Sem dados" }) => {
  const chartData = useMemo(() => {
    return data.filter(d => d.value > 0);
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 text-xs">
        <Wallet className="h-8 w-8 opacity-40 mb-1" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-[200px]">
      <div className="w-1/2 h-full min-h-[140px] relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
          <span className="text-[11px] sm:text-xs font-black font-mono text-slate-800 dark:text-slate-100">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
        {data.map((item, index) => {
          const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
          return (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${item.bgClass}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[90px]" title={item.name}>{item.name}</span>
              </div>
              <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                <span>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-slate-400 ml-1 font-normal">({percent.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
