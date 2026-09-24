import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Calendar, 
  X, 
  Check, 
  Info,
  Compass,
  RotateCcw,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { UserData, Trip, TripExpense } from '../types';

interface ViagemPageProps {
  userData: UserData;
  onUpdateUserData: (newData: Partial<UserData>) => Promise<void>;
}

export const ViagemPage: React.FC<ViagemPageProps> = ({ userData, onUpdateUserData }) => {
  const trips = userData.trips || [];

  // State for Trip Modal / Form (Create / Edit Trip Name)
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripName, setTripName] = useState('');

  // State for Suspended Window (Modal de Detalhes da Viagem)
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // State for Filters inside Suspended Window
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all' | 'Pago' | 'Não pago' | custom
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State for Expense Modal / Form (Create / Edit Expense)
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseValue, setExpenseValue] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePaymentType, setExpensePaymentType] = useState('');
  const [expenseStatus, setExpenseStatus] = useState('Pago'); // Default "Pago"

  // Neutral clear confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Accordion state for Aviso card
  const [isAvisoOpen, setIsAvisoOpen] = useState(false);

  // Active Trip Object
  const activeTrip = useMemo(() => {
    if (!activeTripId) return null;
    return trips.find(t => t.id === activeTripId) || null;
  }, [trips, activeTripId]);

  // Calculations
  const calculateTripTotal = (trip: Trip) => {
    return trip.expenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  };

  const totalGeneralExpenses = useMemo(() => {
    return trips.reduce((sum, trip) => sum + calculateTripTotal(trip), 0);
  }, [trips]);

  // Payment types suggestions from user preferences or defaults
  const availablePaymentTypes = useMemo(() => {
    const list = new Set<string>();
    if (userData.paymentTypes && userData.paymentTypes.length > 0) {
      userData.paymentTypes.forEach(p => list.add(p));
    }
    // Add common fallback types
    ['Cartão de Crédito', 'Pix', 'Dinheiro', 'Cartão de Débito', 'Boleto', 'Transferência'].forEach(p => list.add(p));
    
    // Also include any custom payment types already used in expenses
    trips.forEach(t => {
      t.expenses.forEach(e => {
        if (e.paymentType && e.paymentType.trim()) {
          list.add(e.paymentType.trim());
        }
      });
    });
    return Array.from(list);
  }, [userData.paymentTypes, trips]);

  // Filtered expenses for the active trip modal
  const filteredActiveExpenses = useMemo(() => {
    if (!activeTrip) return [];
    return activeTrip.expenses.filter(exp => {
      // Filter by Payment Type
      if (filterPaymentType !== 'all') {
        const expPay = (exp.paymentType || '').toLowerCase().trim();
        if (expPay !== filterPaymentType.toLowerCase().trim()) {
          return false;
        }
      }

      // Filter by Status (Pago, Não pago)
      if (filterStatus !== 'all') {
        const expStatus = (exp.status || 'Não pago').toLowerCase().trim();
        const targetStatus = filterStatus.toLowerCase().trim();
        if (expStatus !== targetStatus) {
          // Check for variations like "não pago" vs "nao pago" / "pendente"
          if (targetStatus === 'não pago' || targetStatus === 'nao pago') {
            if (expStatus === 'pago') return false;
          } else {
            return false;
          }
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const descMatch = exp.description.toLowerCase().includes(q);
        const payMatch = (exp.paymentType || '').toLowerCase().includes(q);
        const statusMatch = (exp.status || '').toLowerCase().includes(q);
        if (!descMatch && !payMatch && !statusMatch) return false;
      }

      return true;
    });
  }, [activeTrip, filterPaymentType, filterStatus, searchQuery]);

  // Filtered sum
  const filteredActiveTotal = useMemo(() => {
    return filteredActiveExpenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  }, [filteredActiveExpenses]);

  // Distinct payment types present in the active trip
  const activeTripPaymentTypes = useMemo(() => {
    if (!activeTrip) return [];
    const types = new Set<string>();
    activeTrip.expenses.forEach(e => {
      if (e.paymentType && e.paymentType.trim()) {
        types.add(e.paymentType.trim());
      }
    });
    return Array.from(types);
  }, [activeTrip]);

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

  // Trigger edit trip name
  const startEditTrip = (trip: Trip, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTripId(trip.id);
    setTripName(trip.name);
    setShowTripForm(true);
  };

  // Delete trip handler
  const handleDeleteTrip = (tripId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Tem certeza de que deseja excluir esta viagem e todas as suas despesas?')) {
      const updatedTrips = trips.filter(t => t.id !== tripId);
      onUpdateUserData({ trips: updatedTrips });
      if (activeTripId === tripId) {
        setActiveTripId(null);
      }
    }
  };

  // Create / Edit Expense handler
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim() || !expenseValue || !selectedTripId) return;

    const val = parseFloat(expenseValue);
    if (isNaN(val) || val <= 0) return;

    const cleanPaymentType = expensePaymentType.trim() || 'Outro';
    const cleanStatus = expenseStatus.trim() || 'Não pago';

    const updatedTrips = trips.map(t => {
      if (t.id === selectedTripId) {
        if (editingExpenseId) {
          // Edit expense inside this trip
          const updatedExpenses = t.expenses.map(exp => 
            exp.id === editingExpenseId 
              ? { 
                  ...exp, 
                  description: expenseDescription.trim(), 
                  value: val, 
                  date: expenseDate,
                  paymentType: cleanPaymentType,
                  status: cleanStatus
                }
              : exp
          );
          return { ...t, expenses: updatedExpenses };
        } else {
          // Create new expense inside this trip
          const newExpense: TripExpense = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
            description: expenseDescription.trim(),
            value: val,
            date: expenseDate,
            paymentType: cleanPaymentType,
            status: cleanStatus
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
    setExpensePaymentType('');
    setExpenseStatus('Pago');
  };

  // Open expense form for a specific trip
  const openNewExpenseForTrip = (tripId: string) => {
    resetExpenseForm();
    setSelectedTripId(tripId);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpensePaymentType('Cartão de Crédito');
    setExpenseStatus('Pago');
    setShowExpenseForm(true);
  };

  // Trigger edit expense
  const startEditExpense = (tripId: string, expense: TripExpense) => {
    setSelectedTripId(tripId);
    setEditingExpenseId(expense.id);
    setExpenseDescription(expense.description);
    setExpenseValue(expense.value.toString());
    setExpenseDate(expense.date || new Date().toISOString().split('T')[0]);
    setExpensePaymentType(expense.paymentType || 'Cartão de Crédito');
    setExpenseStatus(expense.status || 'Pago');
    setShowExpenseForm(true);
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

  // Quick toggle status between "Pago" and "Não pago"
  const handleToggleExpenseStatus = (tripId: string, expense: TripExpense) => {
    const isCurrentlyPago = (expense.status || '').toLowerCase().trim() === 'pago';
    const newStatus = isCurrentlyPago ? 'Não pago' : 'Pago';

    const updatedTrips = trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          expenses: t.expenses.map(e => e.id === expense.id ? { ...e, status: newStatus } : e)
        };
      }
      return t;
    });

    onUpdateUserData({ trips: updatedTrips });
  };

  // Clear all expenses inside all trips
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
            Clique em qualquer viagem para abrir a janela com os detalhes e lançamentos com filtros de pagamento e situação.
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
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-sm shadow-blue-500/15 transition-all hover:-translate-y-0.5 active:translate-y-0"
            id="btn-nova-viagem"
          >
            <Plus className="h-4 w-4" />
            Nova Viagem
          </button>
          
          {trips.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 rounded-xl transition-all"
              id="btn-limpar-despesas-viagem"
              title="Limpa os lançamentos de despesas de todas as viagens"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar Lançamentos
            </button>
          )}
        </div>
      </div>

      {/* Info Warning Card (Accordion Sanfona) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <button
          onClick={() => setIsAvisoOpen(!isAvisoOpen)}
          className="w-full p-4 flex items-center justify-between text-left focus:outline-none transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-white block">Instruções do Módulo de Viagens</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Clique para ver detalhes de funcionamento</p>
            </div>
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold px-2.5 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/80">
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
              <div className="p-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-900/20 leading-relaxed space-y-2">
                <p>
                  As despesas deste módulo são gerenciadas de forma independente para planejamento de roteiros, rateios e turismo, permanecendo <strong className="text-slate-800 dark:text-white">desconectadas</strong> do fluxo orçamentário principal para não distorcer suas estatísticas do mês a mês.
                </p>
                <p className="text-[11px] text-slate-400">
                  💡 <strong>Como usar:</strong> Cada cartão abaixo exibe o nome e o valor total acumulado da viagem. Basta <strong>clicar em cima do cartão</strong> para abrir a janela com todos os lançamentos detalhados, cadastrar novas despesas e filtrar por <strong>Tipo de Pagamento</strong> e <strong>Situação (Pago / Não pago)</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Trips Section: Clean view showing ONLY Trip Name & Total Value */}
      {trips.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-xl mx-auto bg-white/40 dark:bg-slate-900/40">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/50">
            <Plane className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1.5">Nenhuma viagem cadastrada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Cadastre o nome do seu destino ou roteiro de viagem para começar a organizar despesas de forma isolada e inteligente.
          </p>
          <button
            onClick={() => {
              setEditingTripId(null);
              setTripName('');
              setShowTripForm(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Primeira Viagem
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Viagens Cadastradas ({trips.length})
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Clique na viagem para ver lançamentos e filtros
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const tripTotal = calculateTripTotal(trip);

              return (
                <motion.div
                  key={trip.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setActiveTripId(trip.id);
                    setFilterPaymentType('all');
                    setFilterStatus('all');
                    setSearchQuery('');
                  }}
                  className="group relative cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-200 flex flex-col justify-between"
                  title="Clique para abrir detalhes e lançamentos desta viagem"
                >
                  {/* Top row: Trip Name & Action Buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0 group-hover:scale-105 transition-transform">
                        <Plane className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {trip.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                          {trip.expenses.length} {trip.expenses.length === 1 ? 'lançamento' : 'lançamentos'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit name and Delete */}
                    <div className="flex items-center gap-1 shrink-0 -mr-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => startEditTrip(trip, e)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar nome da viagem"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Excluir viagem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom row: Total Value Only */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Valor Total
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {tripTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <span>Ver detalhes</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregate Sum Section */}
      {trips.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm overflow-hidden relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-blue-500" />
                Soma Geral de Todas as Viagens
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total acumulado somando todas as {trips.length} viagens cadastradas.
              </p>
            </div>

            <div className="flex items-baseline gap-2.5 bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Geral:
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                {totalGeneralExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUSPENDED WINDOW (JANELA SUSPENSA): DETALHES DE LANÇAMENTOS DA VIAGEM      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden"
              id="janela-suspensa-viagem"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                    <Plane className="h-4 w-4 shrink-0" />
                    <span>Detalhes da Viagem</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                    {activeTrip.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Total da Viagem:{' '}
                      <strong className="text-slate-900 dark:text-white font-mono font-bold">
                        {calculateTripTotal(activeTrip).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activeTrip.expenses.length} {activeTrip.expenses.length === 1 ? 'lançamento cadastrado' : 'lançamentos cadastrados'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openNewExpenseForTrip(activeTrip.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
                    id="btn-adicionar-lancamento-modal"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Lançar Despesa</span>
                  </button>
                  <button
                    onClick={() => setActiveTripId(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Fechar janela"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="p-4 sm:px-6 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Filter by Tipo de Pagamento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                      Tipo de Pagamento
                    </label>
                    <select
                      value={filterPaymentType}
                      onChange={(e) => setFilterPaymentType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todos os tipos de pagamento</option>
                      {activeTripPaymentTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Situação (Pago, Não pago) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Situação
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setFilterStatus('all')}
                        className={`py-1 px-2 text-[11px] font-bold rounded-lg transition-colors text-center ${
                          filterStatus === 'all'
                            ? 'bg-slate-900 text-white dark:bg-blue-600'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus('Pago')}
                        className={`py-1 px-2 text-[11px] font-bold rounded-lg transition-colors text-center ${
                          filterStatus === 'Pago'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus('Não pago')}
                        className={`py-1 px-2 text-[11px] font-bold rounded-lg transition-colors text-center ${
                          filterStatus === 'Não pago'
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Não pago
                      </button>
                    </div>
                  </div>

                  {/* Search Query */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      Buscar Lançamento
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Filtrar por nome ou valor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Summary Badge */}
                {(filterPaymentType !== 'all' || filterStatus !== 'all' || searchQuery.trim()) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Filtro ativo: exibindo <strong>{filteredActiveExpenses.length}</strong> de {activeTrip.expenses.length} lançamentos.
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/50">
                        Subtotal filtrado: {filteredActiveTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setFilterPaymentType('all');
                        setFilterStatus('all');
                        setSearchQuery('');
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Body: Expenses Table / List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                {activeTrip.expenses.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Nenhuma despesa lançada nesta viagem ainda.
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Cadastre os custos de passagens, hospedagem, passeios, alimentação ou transporte.
                    </p>
                    <button
                      onClick={() => openNewExpenseForTrip(activeTrip.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Lançar Primeira Despesa
                    </button>
                  </div>
                ) : filteredActiveExpenses.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <Filter className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </p>
                    <button
                      onClick={() => {
                        setFilterPaymentType('all');
                        setFilterStatus('all');
                        setSearchQuery('');
                      }}
                      className="mt-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      Resetar Filtros
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <th className="pb-3 pl-2">Descrição</th>
                          <th className="pb-3 px-2">Data</th>
                          <th className="pb-3 px-2">Tipo de Pagamento</th>
                          <th className="pb-3 px-2 text-center">Situação</th>
                          <th className="pb-3 px-2 text-right">Valor</th>
                          <th className="pb-3 pr-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredActiveExpenses.map((exp) => {
                          const isPago = (exp.status || '').toLowerCase().trim() === 'pago';

                          return (
                            <tr
                              key={exp.id}
                              className="group hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors"
                            >
                              {/* Descrição */}
                              <td className="py-3 pl-2 pr-3 font-semibold text-slate-800 dark:text-slate-100 max-w-xs">
                                <span className="block truncate">{exp.description}</span>
                              </td>

                              {/* Data */}
                              <td className="py-3 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {exp.date ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {exp.date.split('-').reverse().join('/')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              {/* Tipo de Pagamento */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                {exp.paymentType ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                                    <CreditCard className="h-3 w-3" />
                                    {exp.paymentType}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Não informado</span>
                                )}
                              </td>

                              {/* Situação */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleExpenseStatus(activeTrip.id, exp)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                                    isPago
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  }`}
                                  title="Clique para alternar entre Pago e Não pago"
                                >
                                  {isPago ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                      Pago
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                      Não pago
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Valor */}
                              <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {exp.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>

                              {/* Ações */}
                              <td className="py-3 pr-2 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => startEditExpense(activeTrip.id, exp)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Editar despesa"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(activeTrip.id, exp.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Excluir despesa"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Total desta viagem:{' '}
                  <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">
                    {calculateTripTotal(activeTrip).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </span>

                <button
                  onClick={() => setActiveTripId(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* FORM CADASTRO / EDIÇÃO DE VIAGEM                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showTripForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 text-xs"
              id="form-cadastro-viagem"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Plane className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {editingTripId ? 'Editar Nome da Viagem' : 'Cadastrar Nova Viagem'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowTripForm(false)} 
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTrip} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Nome ou Destino da Viagem
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Férias em Gramado, Viagem de Negócios SP..."
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTripForm(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Salvar Viagem
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* FORM LANÇAR / EDITAR DESPESA (INCLUI TIPO DE PAGAMENTO E SITUAÇÃO)         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 text-xs"
              id="form-despesa-viagem"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {editingExpenseId ? 'Editar Despesa de Viagem' : 'Lançar Nova Despesa'}
                  </h3>
                </div>
                <button 
                  onClick={resetExpenseForm} 
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="grid gap-4 sm:grid-cols-2">
                {/* Viagem de Destino */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Viagem de Destino
                  </label>
                  <select
                    required
                    disabled={!!editingExpenseId}
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium disabled:opacity-60"
                  >
                    <option value="" disabled>Selecione uma viagem...</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Descrição do Gasto */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Descrição do Gasto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passagens aéreas, Hospedagem Hotel, Jantar, Uber..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium"
                    autoFocus
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-mono font-medium"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Data do Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium"
                  />
                </div>

                {/* CAMPO: Tipo de Pagamento (Permite escrever livremente ou sugerir) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Tipo de Pagamento</span>
                    <span className="text-[10px] text-blue-500 lowercase">escreva ou selecione</span>
                  </label>
                  <input
                    type="text"
                    list="viagem-payment-types-datalist"
                    placeholder="Ex: Cartão de Crédito, Pix, Dinheiro..."
                    value={expensePaymentType}
                    onChange={(e) => setExpensePaymentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium"
                  />
                  <datalist id="viagem-payment-types-datalist">
                    {availablePaymentTypes.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>

                  {/* Sugestões rápidas de 1 clique */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Cartão', 'Pix', 'Dinheiro', 'Débito'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setExpensePaymentType(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                          expensePaymentType.toLowerCase() === preset.toLowerCase()
                            ? 'bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CAMPO: Situação (Permite escrever livremente ou alternar entre Pago e Não pago) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Situação</span>
                    <span className="text-[10px] text-blue-500 lowercase">escreva ou selecione</span>
                  </label>
                  <input
                    type="text"
                    list="viagem-status-datalist"
                    placeholder="Pago ou Não pago"
                    value={expenseStatus}
                    onChange={(e) => setExpenseStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium"
                  />
                  <datalist id="viagem-status-datalist">
                    <option value="Pago" />
                    <option value="Não pago" />
                    <option value="Pendente" />
                    <option value="Parcelado" />
                  </datalist>

                  {/* Botões rápidos de 1 clique para Pago / Não pago */}
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpenseStatus('Pago')}
                      className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        expenseStatus.toLowerCase() === 'pago'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseStatus('Não pago')}
                      className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        expenseStatus.toLowerCase() === 'não pago' || expenseStatus.toLowerCase() === 'nao pago'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      Não pago
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={resetExpenseForm}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Salvar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO DE LIMPEZA DE TODAS AS DESPESAS                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-500">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Limpar Lançamentos de Viagem?</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Esta ação é irreversível</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Deseja realmente apagar todos os lançamentos de despesas de todas as viagens? Os nomes das viagens cadastradas serão preservados, mas os gastos individuais serão zerados.
              </p>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmClearAllExpenses}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20"
                >
                  Confirmar Limpeza
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
