import React, { useState, useMemo } from 'react';
import { UserData, Investment } from '../types';
import {
  TrendingUp,
  DollarSign,
  Plus,
  Filter,
  Calendar,
  Edit,
  Trash2,
  Tag,
  CheckCircle2,
  PieChart,
  X,
  Settings,
  Coins,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface PageProps {
  userData: UserData;
  onUpdateUserData: (newData: Partial<UserData>) => void;
}

const DEFAULT_TYPES = [
  'Ações',
  'Fundos Imobiliários (FIIs)',
  'Renda Fixa',
  'CDB / LCI / LCA',
  'Tesouro Direto',
  'Criptomoedas',
  'Previdência Privada',
  'Outros'
];

const DEFAULT_STATUSES = [
  'Ativo',
  'Resgatado',
  'Em Andamento',
  'Pendente',
  'Cancelado'
];

export const InvestimentosPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const investments = userData.investments || [];
  const investmentTypes = (userData.investmentTypes && userData.investmentTypes.length > 0)
    ? userData.investmentTypes
    : DEFAULT_TYPES;
  const investmentStatuses = (userData.investmentStatuses && userData.investmentStatuses.length > 0)
    ? userData.investmentStatuses
    : DEFAULT_STATUSES;

  // Filters State
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterYear, setFilterYear] = useState<string>('todos');

  // Modal State for Add / Edit Investment
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>(investmentTypes[0] || 'Ações');
  const [status, setStatus] = useState<string>(investmentStatuses[0] || 'Ativo');
  const [value, setValue] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Modal State for Types & Statuses Management
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newStatusName, setNewStatusName] = useState<string>('');

  // Available Years extracted from investments
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    investments.forEach((inv) => {
      if (inv.date) {
        const y = inv.date.split('-')[0];
        if (y && y.length === 4) yearsSet.add(y);
      }
    });
    const currentYearStr = new Date().getFullYear().toString();
    yearsSet.add(currentYearStr);
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [investments]);

  // Filtered Investments
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      const matchType = filterType === 'todos' || inv.type === filterType;
      const invYear = inv.date ? inv.date.split('-')[0] : '';
      const matchYear = filterYear === 'todos' || invYear === filterYear;
      return matchType && matchYear;
    });
  }, [investments, filterType, filterYear]);

  // Stats for the Summary Card
  const overallStats = useMemo(() => {
    let totalValue = 0;
    let activeValue = 0;
    let redeemedValue = 0;
    let activeCount = 0;
    let redeemedCount = 0;

    investments.forEach((inv) => {
      const val = Number(inv.value) || 0;
      totalValue += val;
      if (inv.status === 'Resgatado') {
        redeemedValue += val;
        redeemedCount++;
      } else {
        activeValue += val;
        activeCount++;
      }
    });

    return {
      totalCount: investments.length,
      totalValue,
      activeValue,
      redeemedValue,
      activeCount,
      redeemedCount
    };
  }, [investments]);

  const filteredStats = useMemo(() => {
    let totalValue = 0;
    filteredInvestments.forEach((inv) => {
      totalValue += Number(inv.value) || 0;
    });
    return {
      count: filteredInvestments.length,
      totalValue
    };
  }, [filteredInvestments]);

  // Handle Add / Edit Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value) return;

    const numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) return;

    if (editingId) {
      // Edit
      const updated = investments.map((inv) =>
        inv.id === editingId
          ? {
              ...inv,
              name: name.trim(),
              type,
              status,
              value: numericValue,
              date,
              notes: notes.trim()
            }
          : inv
      );
      onUpdateUserData({ investments: updated });
    } else {
      // Create
      const newInv: Investment = {
        id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: name.trim(),
        type,
        status,
        value: numericValue,
        date,
        notes: notes.trim()
      };
      onUpdateUserData({ investments: [newInv, ...investments] });
    }

    closeModal();
  };

  const handleEditClick = (inv: Investment) => {
    setEditingId(inv.id);
    setName(inv.name);
    setType(inv.type || investmentTypes[0]);
    setStatus(inv.status || investmentStatuses[0]);
    setValue(inv.value.toString());
    setDate(inv.date || new Date().toISOString().split('T')[0]);
    setNotes(inv.notes || '');
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      const updated = investments.filter((inv) => inv.id !== id);
      onUpdateUserData({ investments: updated });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setName('');
    setType(investmentTypes[0] || 'Ações');
    setStatus(investmentStatuses[0] || 'Ativo');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  // Type & Status Management
  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    const cleanType = newTypeName.trim();
    if (!investmentTypes.includes(cleanType)) {
      const updated = [...investmentTypes, cleanType];
      onUpdateUserData({ investmentTypes: updated });
    }
    setNewTypeName('');
  };

  const handleDeleteType = (typeToDelete: string) => {
    if (investmentTypes.length <= 1) {
      alert('É necessário manter ao menos um tipo cadastrado.');
      return;
    }
    const updated = investmentTypes.filter((t) => t !== typeToDelete);
    onUpdateUserData({ investmentTypes: updated });
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;
    const cleanStatus = newStatusName.trim();
    if (!investmentStatuses.includes(cleanStatus)) {
      const updated = [...investmentStatuses, cleanStatus];
      onUpdateUserData({ investmentStatuses: updated });
    }
    setNewStatusName('');
  };

  const handleDeleteStatus = (statusToDelete: string) => {
    if (investmentStatuses.length <= 1) {
      alert('É necessário manter ao menos um status cadastrado.');
      return;
    }
    const updated = investmentStatuses.filter((s) => s !== statusToDelete);
    onUpdateUserData({ investmentStatuses: updated });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getStatusBadgeStyle = (statusStr: string) => {
    switch (statusStr.toLowerCase()) {
      case 'ativo':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'resgatado':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'em andamento':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'pendente':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Investimentos</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre seus aportes, gerencie categorias de ativos e acompanhe a evolução do seu patrimônio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Cadastrar e gerenciar Tipos e Status de investimentos"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Cadastrar Tipos e Status</span>
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setType(investmentTypes[0] || 'Ações');
              setStatus(investmentStatuses[0] || 'Ativo');
              setValue('');
              setDate(new Date().toISOString().split('T')[0]);
              setNotes('');
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Investimento</span>
          </button>
        </div>
      </div>

      {/* Main Card: Summary Stats & Filters (Card logo abaixo do título com quantidade, total monetário e filtros) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        
        {/* Top Filters bar inside the card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Filter className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Filtro de Investimentos
            </span>
            {(filterType !== 'todos' || filterYear !== 'todos') && (
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Filtro ativo
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="todos" className="dark:bg-slate-900">Todos os Tipos</option>
                {investmentTypes.map((t) => (
                  <option key={t} value={t} className="dark:bg-slate-900">{t}</option>
                ))}
              </select>
            </div>

            {/* Filter by Year */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-500 uppercase">Ano:</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="todos" className="dark:bg-slate-900">Todos os Anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
                ))}
              </select>
            </div>

            {(filterType !== 'todos' || filterYear !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('todos');
                  setFilterYear('todos');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 font-bold transition-colors text-xs dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400"
                title="Limpar todos os filtros"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Quantidade de Investimentos */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-400 tracking-wider">
                Quantidade
              </span>
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 font-mono">
                {filterType !== 'todos' || filterYear !== 'todos' ? filteredStats.count : overallStats.totalCount}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                  {filteredStats.count === 1 ? 'investimento' : 'investimentos'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {filterType !== 'todos' || filterYear !== 'todos'
                  ? `Exibindo ${filteredStats.count} de ${overallStats.totalCount} no filtro`
                  : `${overallStats.activeCount} ativos • ${overallStats.redeemedCount} resgatados`}
              </p>
            </div>
          </div>

          {/* Card 2: Total Monetário dos Investimentos */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex flex-col justify-between sm:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                Total Monetário dos Investimentos
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
              <div>
                <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                  {formatCurrency(filterType !== 'todos' || filterYear !== 'todos' ? filteredStats.totalValue : overallStats.totalValue)}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {filterType !== 'todos' || filterYear !== 'todos'
                    ? `Soma monetária dos itens no filtro selecionado`
                    : `Soma de todo o capital aportado registrado`}
                </p>
              </div>

              {/* Sub-breakdown for overall */}
              {filterType === 'todos' && filterYear === 'todos' && (
                <div className="flex items-center gap-3 text-xs pt-2 md:pt-0 border-t md:border-t-0 border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Ativo</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(overallStats.activeValue)}
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Resgatado</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                      {formatCurrency(overallStats.redeemedValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Tipos Registrados */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                Tipos e Status
              </span>
              <div className="p-1.5 rounded-lg bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                {investmentTypes.length} tipos
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {investmentStatuses.length} status cadastrados
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Investments Table / List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Carteira de Investimentos
            </h3>
            <span className="ml-2 rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
              {filteredInvestments.length}
            </span>
          </div>

          {filteredInvestments.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total nesta lista: <strong className="text-slate-800 dark:text-white font-mono">{formatCurrency(filteredStats.totalValue)}</strong>
            </div>
          )}
        </div>

        {filteredInvestments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum investimento encontrado
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filterType !== 'todos' || filterYear !== 'todos'
                ? 'Nenhum investimento corresponde aos filtros selecionados. Tente alterar ou limpar os filtros.'
                : 'Sua carteira de investimentos está vazia. Clique no botão abaixo para adicionar seu primeiro investimento.'}
            </p>
            {filterType === 'todos' && filterYear === 'todos' && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setType(investmentTypes[0] || 'Ações');
                  setStatus(investmentStatuses[0] || 'Ativo');
                  setValue('');
                  setDate(new Date().toISOString().split('T')[0]);
                  setNotes('');
                  setShowModal(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Investimento</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-950/70 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Investimento / Ativo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Data da Aplicação</th>
                  <th className="px-4 py-3 text-right">Valor (R$)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvestments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Name & Notes */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {inv.name}
                      </div>
                      {inv.notes && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                          {inv.notes}
                        </div>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                        <Tag className="h-3 w-3 text-blue-500" />
                        {inv.type || 'Ações'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {formatDate(inv.date)}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(Number(inv.value) || 0)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(inv.status)}`}>
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {inv.status || 'Ativo'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(inv)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 dark:hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(inv.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Inserir / Editar Investimento */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 text-xs animate-slide-down">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingId ? 'Editar Investimento' : 'Novo Investimento'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome do Ativo */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Nome do Investimento / Ativo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PETR4, Tesouro SELIC 2029, CDB Banco Inter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Tipo e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">
                      Tipo de Investimento *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Cadastrar Tipo
                    </button>
                  </div>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {investmentTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">
                      Status *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Cadastrar Status
                    </button>
                  </div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {investmentStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Valor Investido (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Data da Aplicação *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Observações / Notas (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Rentabilidade esperada 115% do CDI, vencimento em 2028."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Investimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro & Gerenciamento de Tipos e Status */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-5 text-xs animate-slide-down max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Cadastro de Tipos e Status
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cadastro de Tipos */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-blue-500" />
                <span>Tipos de Investimentos</span>
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo tipo (ex: ETFs, Previdência)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddType())}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddType}
                  className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-500 transition-colors"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {investmentTypes.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleDeleteType(t)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5"
                      title="Excluir Tipo"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Cadastro de Status */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Status de Investimentos</span>
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo status (ex: Reaplicado, Vendido)"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatus())}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddStatus}
                  className="rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {investmentStatuses.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <span>{s}</span>
                    <button
                      onClick={() => handleDeleteStatus(s)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5"
                      title="Excluir Status"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="rounded-lg bg-slate-800 px-5 py-2 font-bold text-white hover:bg-slate-700 transition-colors"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
