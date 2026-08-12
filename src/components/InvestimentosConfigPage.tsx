import React, { useState } from 'react';
import { UserData } from '../types';
import {
  Tag,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Vault,
  ArrowRight,
  Info
} from 'lucide-react';

interface Props {
  userData: UserData;
  onUpdateUserData: (newData: Partial<UserData>) => void;
  onNavigate?: (page: string) => void;
}

const DEFAULT_TYPES = [
  'Ações',
  'FIIs',
  'Renda Fixa',
  'Tesouro Direto',
  'CDB / RDB',
  'Criptomoedas',
  'Fundos',
  'Outros'
];

const DEFAULT_STATUSES = [
  'Ativo',
  'Resgatado',
  'Em Andamento',
  'Pendente'
];

export const InvestimentosConfigPage: React.FC<Props> = ({
  userData,
  onUpdateUserData,
  onNavigate
}) => {
  const types = (userData.investmentTypes && userData.investmentTypes.length > 0)
    ? userData.investmentTypes
    : DEFAULT_TYPES;

  const statuses = (userData.investmentStatuses && userData.investmentStatuses.length > 0)
    ? userData.investmentStatuses
    : DEFAULT_STATUSES;

  // Type state
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editTypeValue, setEditTypeValue] = useState('');

  // Status state
  const [newStatus, setNewStatus] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editStatusValue, setEditStatusValue] = useState('');

  // Active tab or section view
  const [activeTab, setActiveTab] = useState<'all' | 'types' | 'statuses'>('all');

  // Add Type handler
  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newType.trim();
    if (!clean) return;
    if (types.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      alert('Este tipo de investimento já está cadastrado.');
      return;
    }
    const updated = [...types, clean];
    onUpdateUserData({ investmentTypes: updated });
    setNewType('');
  };

  // Rename Type handler
  const handleSaveTypeEdit = (oldType: string) => {
    const clean = editTypeValue.trim();
    if (!clean) return;
    if (clean === oldType) {
      setEditingType(null);
      return;
    }
    if (types.some((t) => t.toLowerCase() === clean.toLowerCase() && t !== oldType)) {
      alert('Este tipo de investimento já existe.');
      return;
    }

    const updatedTypes = types.map((t) => (t === oldType ? clean : t));
    const investments = userData.investments || [];
    const updatedInvestments = investments.map((inv) =>
      inv.type === oldType ? { ...inv, type: clean } : inv
    );

    onUpdateUserData({
      investmentTypes: updatedTypes,
      investments: updatedInvestments
    });
    setEditingType(null);
    setEditTypeValue('');
  };

  // Delete Type handler
  const handleDeleteType = (typeToDelete: string) => {
    if (types.length <= 1) {
      alert('É necessário manter ao menos um tipo de investimento cadastrado.');
      return;
    }
    if (confirm(`Deseja remover o tipo "${typeToDelete}"?`)) {
      const updatedTypes = types.filter((t) => t !== typeToDelete);
      onUpdateUserData({ investmentTypes: updatedTypes });
    }
  };

  // Add Status handler
  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newStatus.trim();
    if (!clean) return;
    if (statuses.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      alert('Este status de investimento já está cadastrado.');
      return;
    }
    const updated = [...statuses, clean];
    onUpdateUserData({ investmentStatuses: updated });
    setNewStatus('');
  };

  // Rename Status handler
  const handleSaveStatusEdit = (oldStatus: string) => {
    const clean = editStatusValue.trim();
    if (!clean) return;
    if (clean === oldStatus) {
      setEditingStatus(null);
      return;
    }
    if (statuses.some((s) => s.toLowerCase() === clean.toLowerCase() && s !== oldStatus)) {
      alert('Este status de investimento já existe.');
      return;
    }

    const updatedStatuses = statuses.map((s) => (s === oldStatus ? clean : s));
    const investments = userData.investments || [];
    const updatedInvestments = investments.map((inv) =>
      inv.status === oldStatus ? { ...inv, status: clean } : inv
    );

    onUpdateUserData({
      investmentStatuses: updatedStatuses,
      investments: updatedInvestments
    });
    setEditingStatus(null);
    setEditStatusValue('');
  };

  // Delete Status handler
  const handleDeleteStatus = (statusToDelete: string) => {
    if (statuses.length <= 1) {
      alert('É necessário manter ao menos um status de investimento cadastrado.');
      return;
    }
    if (confirm(`Deseja remover o status "${statusToDelete}"?`)) {
      const updatedStatuses = statuses.filter((s) => s !== statusToDelete);
      onUpdateUserData({ investmentStatuses: updatedStatuses });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Vault className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
              Tipos e Status de Investimentos
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as opções de classificação e situação dos seus ativos. Estas opções serão exibidas no cadastro e filtros da tela de Investimentos.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('Investimentos')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <span>Ir para Investimentos</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p>
          Qualquer alteração efetuada aqui atualizará imediatamente os seletores na tela de <strong>Investimentos</strong>. Se você renomear um tipo ou status existente, todos os investimentos já cadastrados também serão sincronizados automaticamente.
        </p>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Ver Todos ({types.length + statuses.length})
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'types'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Tipos ({types.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'statuses'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Status ({statuses.length})</span>
        </button>

        {activeTab !== 'all' && (
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 ml-auto"
            title="Limpar filtro de abas"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar filtro</span>
          </button>
        )}
      </div>

      {/* Grid containing two main sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: Tipos de Investimento */}
        {(activeTab === 'all' || activeTab === 'types') && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                    Tipos de Investimento
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {types.length} {types.length === 1 ? 'tipo cadastrado' : 'tipos cadastrados'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Add Type */}
            <form onSubmit={handleAddType} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Previdência, ETFs, BDRs"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 font-bold transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar</span>
              </button>
            </form>

            {/* List of Types */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
              {types.map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between py-2.5 font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]"
                >
                  {editingType === t ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editTypeValue}
                        onChange={(e) => setEditTypeValue(e.target.value)}
                        className="flex-1 rounded-lg border border-blue-500 bg-slate-50 px-2.5 py-1 text-xs dark:bg-slate-950 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveTypeEdit(t);
                          }
                          if (e.key === 'Escape') setEditingType(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveTypeEdit(t)}
                        className="text-emerald-600 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingType(null)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{t}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingType(t);
                            setEditTypeValue(t);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors"
                          title="Editar Nome"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteType(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                          title="Excluir Tipo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: Status de Investimento */}
        {(activeTab === 'all' || activeTab === 'statuses') && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                    Status de Investimento
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {statuses.length} {statuses.length === 1 ? 'status cadastrado' : 'status cadastrados'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Add Status */}
            <form onSubmit={handleAddStatus} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Reaplicado, Vendido, Suspenso"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 font-bold transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar</span>
              </button>
            </form>

            {/* List of Statuses */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
              {statuses.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between py-2.5 font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]"
                >
                  {editingStatus === s ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editStatusValue}
                        onChange={(e) => setEditStatusValue(e.target.value)}
                        className="flex-1 rounded-lg border border-emerald-500 bg-slate-50 px-2.5 py-1 text-xs dark:bg-slate-950 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveStatusEdit(s);
                          }
                          if (e.key === 'Escape') setEditingStatus(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStatusEdit(s)}
                        className="text-emerald-600 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStatus(null)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStatus(s);
                            setEditStatusValue(s);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-colors"
                          title="Editar Nome"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStatus(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                          title="Excluir Status"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
