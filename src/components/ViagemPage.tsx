import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  X, 
  Check, 
  Info,
  Compass,
  ArrowRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { UserData, Trip, TripExpense } from '../types';

interface ViagemPageProps {
  userData: UserData;
  onUpdateUserData: (newData: Partial<UserData>) => Promise<void>;
}

export const ViagemPage: React.FC<ViagemPageProps> = ({ userData, onUpdateUserData }) => {
  const trips = userData.trips || [];

  // State for Trip Modal / Form
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripName, setTripName] = useState('');

  // State for Expense Modal / Form (both local inside card or via global button)
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseValue, setExpenseValue] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Neutral clear confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Accordion state for Aviso card
  const [isAvisoOpen, setIsAvisoOpen] = useState(false);

  // Calculations
  const calculateTripTotal = (trip: Trip) => {
    return trip.expenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  };

  const totalGeneralExpenses = trips.reduce((sum, trip) => sum + calculateTripTotal(trip), 0);

  // Scroll Helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Create / Edit Trip handler
  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) return;

    if (editingTripId) {
      // Edit mode
      const updatedTrips = trips.map(t => 
        t.id === editingTripId ? { ...t, name: tripName.trim() } : t
      );
      onUpdateUserData({ trips: updatedTrips });
      setEditingTripId(null);
    } else {
      // Create mode
      const newTrip: Trip = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        name: tripName.trim(),
        expenses: []
      };
      onUpdateUserData({ trips: [...trips, newTrip] });
    }

    setTripName('');
    setShowTripForm(false);
  };

  // Trigger edit trip
  const startEditTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripName(trip.name);
    setShowTripForm(true);
    scrollToTop();
  };

  // Delete trip handler
  const handleDeleteTrip = (tripId: string) => {
    if (window.confirm('Tem certeza de que deseja excluir esta viagem e todas as suas despesas?')) {
      const updatedTrips = trips.filter(t => t.id !== tripId);
      onUpdateUserData({ trips: updatedTrips });
    }
  };

  // Create / Edit Expense handler
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim() || !expenseValue || !selectedTripId) return;

    const val = parseFloat(expenseValue);
    if (isNaN(val) || val <= 0) return;

    const updatedTrips = trips.map(t => {
      if (t.id === selectedTripId) {
        if (editingExpenseId) {
          // Edit expense inside this trip
          const updatedExpenses = t.expenses.map(exp => 
            exp.id === editingExpenseId 
              ? { ...exp, description: expenseDescription.trim(), value: val, date: expenseDate }
              : exp
          );
          return { ...t, expenses: updatedExpenses };
        } else {
          // Create new expense inside this trip
          const newExpense: TripExpense = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
            description: expenseDescription.trim(),
            value: val,
            date: expenseDate
          };
          return { ...t, expenses: [...t.expenses, newExpense] };
        }
      }
      return t;
    });

    onUpdateUserData({ trips: updatedTrips });
    resetExpenseForm();
  };

  const resetExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpenseId(null);
    setSelectedTripId('');
    setExpenseDescription('');
    setExpenseValue('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  // Trigger edit expense
  const startEditExpense = (tripId: string, expense: TripExpense) => {
    setSelectedTripId(tripId);
    setEditingExpenseId(expense.id);
    setExpenseDescription(expense.description);
    setExpenseValue(expense.value.toString());
    setExpenseDate(expense.date || new Date().toISOString().split('T')[0]);
    setShowExpenseForm(true);
    scrollToTop();
  };

  // Delete expense handler
  const handleDeleteExpense = (tripId: string, expenseId: string) => {
    if (window.confirm('Excluir este lançamento de despesa?')) {
      const updatedTrips = trips.map(t => {
        if (t.id === tripId) {
          return { ...t, expenses: t.expenses.filter(exp => exp.id !== expenseId) };
        }
        return t;
      });
      onUpdateUserData({ trips: updatedTrips });
    }
  };

  // Clear all expenses inside all trips (main page trigger)
  const handleClearAllExpenses = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAllExpenses = () => {
    const updatedTrips = trips.map(t => ({ ...t, expenses: [] }));
    onUpdateUserData({ trips: updatedTrips });
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-1 sm:p-4" id="viagem-page-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="h-4 w-4" />
            <span>Módulo de Viagens</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gestão de Viagens</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle e planeje despesas de viagens de forma isolada, sem afetar seu fluxo orçamentário principal.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingTripId(null);
              setTripName('');
              setShowTripForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg shadow-sm shadow-blue-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
            id="btn-nova-viagem"
          >
            <Plus className="h-4 w-4" />
            Nova Viagem
          </button>
          
          {trips.length > 0 && (
            <>
              <button
                onClick={() => {
                  resetExpenseForm();
                  setSelectedTripId(trips[0].id); // default to first trip
                  setShowExpenseForm(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-white rounded-lg shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                id="btn-lancar-despesa-viagem"
              >
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Lançar Despesa
              </button>

              <button
                onClick={handleClearAllExpenses}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 rounded-lg transition-all"
                id="btn-limpar-despesas-viagem"
                title="Limpa os lançamentos de despesas de todas as viagens"
              >
                <RotateCcw className="h-4 w-4" />
                Limpar Despesas
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Warning Card (Accordion Sanfona) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <button
          onClick={() => setIsAvisoOpen(!isAvisoOpen)}
          className="w-full p-4 flex items-center justify-between text-left focus:outline-none transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
              <Info className="h-4.5 w-4.5 text-blue-500 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-white block">Aviso lançamento despesas de viagem</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Clique para ler as orientações de uso</p>
            </div>
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold px-2 py-1 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-100 dark:border-slate-800/80">
            {isAvisoOpen ? 'Ocultar ▲' : 'Visualizar ▼'}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isAvisoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80"
            >
              <div className="p-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 leading-relaxed space-y-2">
                <p>
                  As transações lançadas nesta página servem exclusivamente para o rateio e levantamento de custos de turismo ou viagens corporativas, permanecendo completamente <strong className="underline text-slate-800 dark:text-white">desconectadas</strong> dos seus demonstrativos gerais de Receitas, Despesas e Fluxo de Caixa.
                </p>
                <p className="text-[10px] text-slate-400">
                  Isso permite planejar e lançar despesas de viagem de maneira isolada sem poluir suas estatísticas gerais mensais e anuais.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals & Forms Container (AnimatePresence) */}
      <AnimatePresence mode="wait">
        {/* Save/Edit Trip Name Card Form */}
        {showTripForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-4 text-xs animate-slide-down"
              id="form-cadastro-viagem"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {editingTripId ? 'Editar Nome da Viagem' : 'Cadastrar Nova Viagem'}
                </h3>
                <button 
                  onClick={() => setShowTripForm(false)} 
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveTrip} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nome do Destino / Identificação da Viagem
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Férias em Gramado - Julho, Viagem de Negócios SP, etc."
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTripForm(false)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Salvar Viagem
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Save/Edit Expense Form */}
        {showExpenseForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down"
              id="form-despesa-viagem"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {editingExpenseId ? 'Editar Despesa' : 'Lançar Despesa'}
                </h3>
                <button 
                  onClick={resetExpenseForm} 
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveExpense} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Viagem de Destino
                  </label>
                  <select
                    required
                    disabled={!!editingExpenseId}
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white"
                  >
                    <option value="" disabled>Selecione uma viagem...</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Descrição do Gasto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passagens aéreas, Aluguel de carro, Jantar, etc."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={expenseValue}
                    onChange={(e) => setExpenseValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Data do Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={resetExpenseForm}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Salvar Despesa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid/List */}
      {trips.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <Plane className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Nenhuma viagem cadastrada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Comece criando sua primeira pasta de viagem para agrupar e gerenciar todos os gastos específicos dela de forma simples e organizada.
          </p>
          <button
            onClick={() => {
              setEditingTripId(null);
              setTripName('');
              setShowTripForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg shadow"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Primeira Viagem
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {trips.map((trip) => {
            const tripTotal = calculateTripTotal(trip);

            return (
              <motion.div
                key={trip.id}
                layout
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-snug flex items-center gap-2">
                      <Plane className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{trip.name}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {trip.expenses.length} lançamento(s) de despesa avulsa
                    </p>
                  </div>

                  {/* Actions for Trip itself */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditTrip(trip)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Editar nome da viagem"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Excluir viagem"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body - Expenses List inside this Trip */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <span>Descrição do Gasto</span>
                      <span>Valor (R$)</span>
                    </div>

                    {trip.expenses.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Nenhuma despesa lançada nesta viagem.
                        <button
                          onClick={() => {
                            resetExpenseForm();
                            setSelectedTripId(trip.id);
                            setShowExpenseForm(true);
                            scrollToTop();
                          }}
                          className="block text-[11px] text-blue-500 hover:underline mx-auto mt-2 font-medium"
                        >
                          + Lançar primeira despesa
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                        {trip.expenses.map((exp) => (
                          <div 
                            key={exp.id} 
                            className="py-2.5 flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-1 rounded transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-slate-800 dark:text-slate-200">
                                {exp.description}
                              </p>
                              {exp.date && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {exp.date.split('-').reverse().join('/')}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                                {exp.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>

                              {/* Edit/Delete individual expense buttons */}
                              <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditExpense(trip.id, exp)}
                                  className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded"
                                  title="Editar despesa"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(trip.id, exp.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded"
                                  title="Excluir despesa"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Trip Specific Sum */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/20 -mx-5 -mb-5 px-5 py-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total da Viagem
                    </span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                      {tripTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Aggregate Sum Section - "soma geral da despesa de viagem logo abaixo" */}
      {trips.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Plane className="w-32 h-32 text-slate-900 dark:text-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />
                Soma Geral das Viagens
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total acumulado investido em todas as suas viagens e passeios cadastrados.
              </p>
            </div>

            <div className="flex items-baseline gap-2 bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Geral:
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {totalGeneralExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Neutral Confirmation Modal for Clearing All Expenses */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <RotateCcw className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Limpar Todas as Despesas?</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Esta ação é irreversível</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Deseja realmente <strong className="text-slate-800 dark:text-white">LIMPAR TODAS</strong> as despesas de todas as viagens cadastradas? Os nomes das viagens serão mantidos, mas todos os lançamentos de gastos individuais serão apagados de forma definitiva.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClearAllExpenses}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-slate-500/10"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
