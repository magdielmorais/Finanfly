import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserData, Income, Expense, ActionPlan, ShoppingItem, UserProfile, Wish } from '../types';
import { Plus, Trash2, Pencil, Check, X, Calendar, Search, Filter, CheckSquare, Square, DollarSign, Wallet, CreditCard, Tag, User, MapPin, Phone, Mail, Sparkles, TrendingUp, TrendingDown, Sliders, ArrowLeft, AlertTriangle, Copy, Lock, KeyRound, ChevronDown, ChevronUp, LogOut, Eye, EyeOff, Target, CheckCircle2, Clock, Heart } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PageProps {
  userData: UserData;
  userProfile: UserProfile;
  onUpdateUserData: (newData: Partial<UserData>) => void;
  onUpdateUserProfile: (name: string, address: string, phone: string, city?: string, state?: string, cpf?: string) => void;
}

// ======================== RECEITAS PAGE ========================
export const ReceitasPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(userData.incomeCategories[0] || 'Outros');

  const receiptTypesList = useMemo(() => {
    return (userData.receiptTypes && userData.receiptTypes.length > 0)
      ? userData.receiptTypes
      : (userData.paymentTypes && userData.paymentTypes.length > 0 ? userData.paymentTypes : ['Pix', 'Transferência Bancária', 'Dinheiro', 'Boleto', 'Cartão de Débito', 'Cartão de Crédito', 'Outros']);
  }, [userData.receiptTypes, userData.paymentTypes]);

  const receiptStatusesList = useMemo(() => {
    return (userData.receiptStatuses && userData.receiptStatuses.length > 0)
      ? userData.receiptStatuses
      : (userData.paymentStatuses && userData.paymentStatuses.length > 0 ? userData.paymentStatuses : ['Recebido', 'Pendente', 'Cancelado']);
  }, [userData.receiptStatuses, userData.paymentStatuses]);

  const [paymentType, setPaymentType] = useState(receiptTypesList[0] || 'Pix');
  const [status, setStatus] = useState(receiptStatusesList[0] || 'Recebido');
  const [search, setSearch] = useState('');

  // Category, Receipt Type and Receipt Status Management States
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showManageReceiptTypes, setShowManageReceiptTypes] = useState(false);
  const [newReceiptTypeName, setNewReceiptTypeName] = useState('');
  const [showManageReceiptStatuses, setShowManageReceiptStatuses] = useState(false);
  const [newReceiptStatusName, setNewReceiptStatusName] = useState('');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [editingReceiptType, setEditingReceiptType] = useState<string | null>(null);
  const [editReceiptTypeValue, setEditReceiptTypeValue] = useState('');
  const [editingReceiptStatus, setEditingReceiptStatus] = useState<string | null>(null);
  const [editReceiptStatusValue, setEditReceiptStatusValue] = useState('');

  // Auto-minimize "Como Lançar Receitas" when scrolling down the page
  useEffect(() => {
    if (!showHelp) return;

    let lastScrollY = -1;
    let touchStartY = 0;

    const handleScroll = (e: Event) => {
      let currentScroll = 0;
      const target = e.target as HTMLElement | Document | null;
      if (target && target instanceof HTMLElement && target.scrollHeight > target.clientHeight) {
        currentScroll = target.scrollTop;
      } else {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        currentScroll = scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      }

      if (lastScrollY === -1) {
        lastScrollY = currentScroll;
        return;
      }

      // If user scrolls down by more than 25px, auto-minimize
      if (currentScroll > lastScrollY + 25) {
        setShowHelp(false);
      } else if (currentScroll < lastScrollY) {
        lastScrollY = currentScroll;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // If user scrolls/wheels downwards
      if (e.deltaY > 15) {
        setShowHelp(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const currentTouchY = e.touches[0].clientY;
        // Swiping finger up means scrolling downward
        if (touchStartY - currentTouchY > 30) {
          setShowHelp(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showHelp]);

  const currentMonthYearStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<string>();
    
    // Always include current year
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);

    // Collect years from income dates
    userData.incomes.forEach(inc => {
      if (inc.date && inc.date.length >= 4) {
        yearsSet.add(inc.date.substring(0, 4)); // YYYY
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [userData.incomes]);

  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include current month if selected year is 'all' or matches current year
    const currentYear = currentMonthYearStr.substring(0, 4);
    if (selectedYear === 'all' || selectedYear === currentYear) {
      monthsSet.add(currentMonthYearStr);
    }

    // Collect months from income dates
    userData.incomes.forEach(inc => {
      if (inc.date && inc.date.length >= 7) {
        const incYear = inc.date.substring(0, 4);
        if (selectedYear === 'all' || selectedYear === incYear) {
          monthsSet.add(inc.date.substring(0, 7)); // YYYY-MM
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [userData.incomes, currentMonthYearStr, selectedYear]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (year !== 'all') {
      // If current selectedMonth does not belong to the newly selected year, reset it to 'all'
      if (selectedMonth !== 'all' && !selectedMonth.startsWith(year)) {
        setSelectedMonth('all');
      }
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== 'all') {
      const monthYear = month.substring(0, 4);
      setSelectedYear(monthYear);
    }
  };

  const formatMonthYearStr = (monthStr: string) => {
    if (!monthStr || monthStr === 'all') return 'Todos';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx] || ''} de ${year}`;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value) return;

    if (editingIncomeId) {
      // Edit mode
      const updatedIncomes = userData.incomes.map(inc => {
        if (inc.id === editingIncomeId) {
          return {
            ...inc,
            date,
            description,
            value: parseFloat(value),
            category,
            paymentType,
            status
          };
        }
        return inc;
      });

      onUpdateUserData({
        incomes: updatedIncomes
      });

      setEditingIncomeId(null);
    } else {
      // Create mode
      const newIncome: Income = {
        id: 'inc-' + Date.now(),
        date,
        description,
        value: parseFloat(value),
        category,
        paymentType,
        status
      };

      onUpdateUserData({
        incomes: [newIncome, ...userData.incomes]
      });
    }

    setDescription('');
    setValue('');
    setShowAddForm(false);
    
    // Automatically switch to the month of the added/edited income to let the user see it!
    if (date.length >= 7) {
      setSelectedMonth(date.substring(0, 7));
    }
  };

  const handleEditStart = (inc: Income) => {
    setEditingIncomeId(inc.id);
    setDate(inc.date);
    setDescription(inc.description);
    setValue(String(inc.value));
    setCategory(inc.category);
    setPaymentType(inc.paymentType);
    setStatus(inc.status);
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      incomes: userData.incomes.filter(i => i.id !== id)
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (userData.incomeCategories.includes(trimmed)) return;
    const updated = [...userData.incomeCategories, trimmed];
    onUpdateUserData({
      incomeCategories: updated
    });
    setNewCategoryName('');
    setCategory(trimmed); // Select newly created category
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updated = userData.incomeCategories.filter(cat => cat !== catToDelete);
    onUpdateUserData({
      incomeCategories: updated
    });
    if (category === catToDelete) {
      setCategory(updated[0] || 'Outros');
    }
  };

  const handleEditCategory = (oldCat: string) => {
    const trimmed = editCategoryValue.trim();
    if (!trimmed) return;
    if (userData.incomeCategories.includes(trimmed) && trimmed !== oldCat) return;

    const updatedCategories = userData.incomeCategories.map(cat => cat === oldCat ? trimmed : cat);
    const updatedIncomes = userData.incomes.map(inc => inc.category === oldCat ? { ...inc, category: trimmed } : inc);

    onUpdateUserData({
      incomeCategories: updatedCategories,
      incomes: updatedIncomes
    });

    if (category === oldCat) {
      setCategory(trimmed);
    }
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleAddReceiptType = () => {
    const trimmed = newReceiptTypeName.trim();
    if (!trimmed) return;
    if (receiptTypesList.includes(trimmed)) return;
    const updated = [...receiptTypesList, trimmed];
    onUpdateUserData({
      receiptTypes: updated
    });
    setNewReceiptTypeName('');
    setPaymentType(trimmed); // Select newly created receipt type
  };

  const handleDeleteReceiptType = (rtToDelete: string) => {
    const updated = receiptTypesList.filter(rt => rt !== rtToDelete);
    onUpdateUserData({
      receiptTypes: updated
    });
    if (paymentType === rtToDelete) {
      setPaymentType(updated[0] || 'Pix');
    }
  };

  const handleEditReceiptType = (oldRt: string) => {
    const trimmed = editReceiptTypeValue.trim();
    if (!trimmed) return;
    if (receiptTypesList.includes(trimmed) && trimmed !== oldRt) return;

    const updatedReceiptTypes = receiptTypesList.map(rt => rt === oldRt ? trimmed : rt);
    const updatedIncomes = userData.incomes.map(inc => inc.paymentType === oldRt ? { ...inc, paymentType: trimmed } : inc);

    onUpdateUserData({
      receiptTypes: updatedReceiptTypes,
      incomes: updatedIncomes
    });

    if (paymentType === oldRt) {
      setPaymentType(trimmed);
    }
    setEditingReceiptType(null);
    setEditReceiptTypeValue('');
  };

  const handleAddReceiptStatus = () => {
    const trimmed = newReceiptStatusName.trim();
    if (!trimmed) return;
    if (receiptStatusesList.includes(trimmed)) return;
    const updated = [...receiptStatusesList, trimmed];
    onUpdateUserData({
      receiptStatuses: updated
    });
    setNewReceiptStatusName('');
    setStatus(trimmed);
  };

  const handleDeleteReceiptStatus = (rsToDelete: string) => {
    const updated = receiptStatusesList.filter(rs => rs !== rsToDelete);
    onUpdateUserData({
      receiptStatuses: updated
    });
    if (status === rsToDelete) {
      setStatus(updated[0] || 'Recebido');
    }
  };

  const handleEditReceiptStatus = (oldRs: string) => {
    const trimmed = editReceiptStatusValue.trim();
    if (!trimmed) return;
    if (receiptStatusesList.includes(trimmed) && trimmed !== oldRs) return;

    const updatedStatuses = receiptStatusesList.map(rs => rs === oldRs ? trimmed : rs);
    const updatedIncomes = userData.incomes.map(inc => inc.status === oldRs ? { ...inc, status: trimmed } : inc);

    onUpdateUserData({
      receiptStatuses: updatedStatuses,
      incomes: updatedIncomes
    });

    if (status === oldRs) {
      setStatus(trimmed);
    }
    setEditingReceiptStatus(null);
    setEditReceiptStatusValue('');
  };

  const filteredIncomes = useMemo(() => {
    return userData.incomes.filter(i => {
      const matchesSearch = 
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      if (selectedYear !== 'all') {
        const incYear = i.date.substring(0, 4);
        if (incYear !== selectedYear) return false;
      }

      if (selectedMonth !== 'all' && !i.date.startsWith(selectedMonth)) return false;

      if (selectedStatus !== 'all' && i.status !== selectedStatus) return false;

      return true;
    });
  }, [userData.incomes, search, selectedMonth, selectedYear, selectedStatus]);

  const total = useMemo(() => {
    return filteredIncomes.reduce((acc, curr) => acc + curr.value, 0);
  }, [filteredIncomes]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Lançamento de Receitas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registre todas as suas entradas de dinheiro e provisões.</p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setEditingIncomeId(null);
                setDescription('');
                setValue('');
              } else {
                setShowAddForm(true);
                setEditingIncomeId(null);
                setDescription('');
                setValue('');
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(userData.incomeCategories[0] || 'Outros');
                setPaymentType(receiptTypesList[0] || 'Pix');
                setStatus(receiptStatusesList[0] || 'Recebido');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-sm shadow-blue-500/15 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            id="btn-nova-receita"
          >
            <Plus className="h-4 w-4" />
            Nova Receita
          </button>
        </div>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden transition-all shadow-xs">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-500" />
            <span>Como Lançar Receitas</span>
            {showHelp && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/50 px-2 py-0.5 rounded-full font-medium">
                Aberto
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-xs">
              {showHelp ? 'Ocultar Ajuda' : 'Ver Ajuda'}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showHelp ? 'rotate-180 text-blue-500' : 'rotate-0'}`} />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {showHelp && (
            <motion.div
              key="receitas-help-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-medium text-slate-700 dark:text-slate-300">Siga estes passos simples para gerenciar suas receitas:</p>
                <ul className="list-decimal pl-4 space-y-1.5">
                  <li>Clique no botão <strong className="text-slate-800 dark:text-white">Nova Receita</strong> no canto superior direito.</li>
                  <li>Preencha os campos obrigatórios: <strong className="text-slate-800 dark:text-white">Descrição</strong>, <strong className="text-slate-800 dark:text-white">Valor</strong>, <strong className="text-slate-800 dark:text-white">Data</strong>, <strong className="text-slate-800 dark:text-white">Categoria</strong> e <strong className="text-slate-800 dark:text-white">Tipo</strong>.</li>
                  <li>Selecione a situação da transação (<strong className="text-slate-800 dark:text-white">Recebido</strong> para valores recebidos ou <strong className="text-slate-800 dark:text-white">Pendente</strong> para previsões).</li>
                  <li>Clique em <strong className="text-blue-600 dark:text-blue-400">Salvar Registro</strong> para gravar a entrada.</li>
                </ul>
                <p className="mt-2 text-[11px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg">
                  <strong>Dica Prática:</strong> Personalize suas categorias, meios de recebimento e situações de recebimento clicando nas opções <strong className="underline">Gerenciar</strong> disponíveis no próprio formulário.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl grid gap-4 sm:grid-cols-3 text-xs max-h-[90vh] overflow-y-auto">
            <div className="sm:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                {editingIncomeId ? 'Editar Registro de Receita' : 'Novo Registro de Receita'}
              </h3>
            {editingIncomeId && (
              <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded font-bold dark:bg-amber-950/30">
                Modo de Edição
              </span>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Data do Recebimento</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Descrição da Receita</label>
            <input type="text" required placeholder="Ex: Salário Mensal" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Valor (R$)</label>
            <input type="number" required step="0.01" placeholder="R$ 1500,00" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Categoria / Tipo</label>
              <button
                type="button"
                onClick={() => {
                  setShowManageCategories(true);
                  setShowManageReceiptTypes(false);
                  setShowManageReceiptStatuses(false);
                }}
                className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
              >
                Gerenciar
              </button>
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {userData.incomeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo</label>
              <button
                type="button"
                onClick={() => {
                  setShowManageReceiptTypes(true);
                  setShowManageCategories(false);
                  setShowManageReceiptStatuses(false);
                }}
                className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
              >
                Gerenciar
              </button>
            </div>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {receiptTypesList.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Situação</label>
              <button
                type="button"
                onClick={() => {
                  setShowManageReceiptStatuses(true);
                  setShowManageCategories(false);
                  setShowManageReceiptTypes(false);
                }}
                className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
              >
                Gerenciar
              </button>
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {receiptStatusesList.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingIncomeId(null);
                setDescription('');
                setValue('');
                setShowManageCategories(false);
                setShowManageReceiptTypes(false);
                setShowManageReceiptStatuses(false);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors"
            >
              {editingIncomeId ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Manage Categories Popup Modal */}
    {showManageCategories && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Categorias de Receita</h3>
            <button
              type="button"
              onClick={() => setShowManageCategories(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome da nova categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Categorias Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {userData.incomeCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingCategory === cat ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditCategory(cat);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditCategory(cat)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{cat}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Categoria"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {userData.incomeCategories.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhuma categoria cadastrada.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManageCategories(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Manage Receipt Types Popup Modal */}
    {showManageReceiptTypes && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Tipos de Recebimento</h3>
            <button
              type="button"
              onClick={() => setShowManageReceiptTypes(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome do novo tipo de recebimento"
              value={newReceiptTypeName}
              onChange={(e) => setNewReceiptTypeName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddReceiptType}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipos Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {receiptTypesList.map(pt => (
                <div key={pt} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingReceiptType === pt ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editReceiptTypeValue}
                        onChange={(e) => setEditReceiptTypeValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditReceiptType(pt);
                          if (e.key === 'Escape') setEditingReceiptType(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditReceiptType(pt)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReceiptType(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{pt}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReceiptType(pt);
                            setEditReceiptTypeValue(pt);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Tipo de Recebimento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceiptType(pt)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Tipo de Recebimento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {receiptTypesList.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhum tipo de recebimento cadastrado.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManageReceiptTypes(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Manage Receipt Statuses Popup Modal */}
    {showManageReceiptStatuses && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Situações de Recebimento</h3>
            <button
              type="button"
              onClick={() => setShowManageReceiptStatuses(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome da nova situação de recebimento"
              value={newReceiptStatusName}
              onChange={(e) => setNewReceiptStatusName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddReceiptStatus}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Situações de Recebimento Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {receiptStatusesList.map(ps => (
                <div key={ps} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingReceiptStatus === ps ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editReceiptStatusValue}
                        onChange={(e) => setEditReceiptStatusValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditReceiptStatus(ps);
                          if (e.key === 'Escape') setEditingReceiptStatus(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditReceiptStatus(ps)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingReceiptStatus(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{ps}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReceiptStatus(ps);
                            setEditReceiptStatusValue(ps);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Situação de Recebimento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceiptStatus(ps)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Situação de Recebimento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {receiptStatusesList.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhuma situação de recebimento cadastrada.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManageReceiptStatuses(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Filter and Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Pesquisar por descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200/50 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Year Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Anos</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Ano {y}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Month Filter Dropdown */}
            <div className="flex flex-col items-start gap-1">
              <div className="relative w-full">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Meses</option>
                  {monthOptions.map((m) => {
                    const isCurrent = m === currentMonthYearStr;
                    return (
                      <option key={m} value={m}>
                        {formatMonthYearStr(m)} {isCurrent ? ' (Mês Corrente)' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>

              {/* Quick back to Current Month shortcut placed under the month selector */}
              {selectedMonth !== currentMonthYearStr && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthYearStr);
                    const currentYear = currentMonthYearStr.substring(0, 4);
                    setSelectedYear(currentYear);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.98] px-2.5 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-slate-900/15 cursor-pointer animate-fade-in"
                  title="Mudar para o Mês Corrente"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-200 shrink-0" />
                  <span>Ir para o mês corrente</span>
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todas as Situações</option>
                  {receiptStatusesList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(search !== '' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedStatus('all');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50/50 hover:bg-red-50 text-red-600 px-3 py-2 font-bold transition-all dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                title="Limpar todos os filtros"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg font-bold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            Soma Filtrada: <span className="font-mono text-blue-600"><span className="text-xs font-sans font-normal text-slate-400 dark:text-slate-500 mr-1 select-none">R$</span>{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Lançamentos Card Separado */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Lançamentos de Receitas</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              {filteredIncomes.length} {filteredIncomes.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-3.5 px-2 font-semibold whitespace-nowrap w-[76px]">Data</th>
                <th className="py-3.5 px-3.5 font-semibold w-[210px] min-w-[190px] max-w-[260px]">Descrição</th>
                <th className="py-3.5 px-3.5 font-semibold text-right whitespace-nowrap w-[120px]">Valor</th>
                <th className="py-3.5 px-3 font-semibold whitespace-nowrap w-[130px]">Categoria</th>
                <th className="py-3.5 px-3 font-semibold whitespace-nowrap w-[130px]">Tipo</th>
                <th className="py-3.5 px-3 font-semibold whitespace-nowrap w-[120px]">Situação</th>
                <th className="py-3.5 px-3 font-semibold text-right whitespace-nowrap w-[90px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Nenhum registro de receita localizado.</td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => handleEditStart(inc)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    title="Clique para editar este lançamento"
                  >
                    <td className="py-3.5 px-2 text-slate-600 dark:text-slate-400 font-mono text-xs sm:text-sm whitespace-nowrap w-[76px]">
                      {formatShortDate(inc.date)}
                    </td>
                    <td className="py-3.5 px-3.5 font-semibold text-slate-800 dark:text-slate-100 text-sm w-[210px] min-w-[190px] max-w-[260px] break-words whitespace-normal leading-snug">
                      {inc.description}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400 text-sm whitespace-nowrap w-[120px]">
                      <span className="text-[11px] font-sans font-normal text-slate-400 dark:text-slate-500 mr-1 select-none">R$</span>{inc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap w-[130px]">
                      <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium">
                        {inc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap w-[130px]">
                      {inc.paymentType}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap w-[120px]">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        inc.status === 'Pago' || inc.status === 'Recebido'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>{inc.status}</span>
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap w-[90px]">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(inc);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
                          title="Editar Registro"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(inc.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800"
                          title="Excluir Registro"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======================== DESPESAS PAGE ========================
export const DespesasPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [category, setCategory] = useState(userData.expenseCategories[0] || 'Outros');
  const [paymentType, setPaymentType] = useState(userData.paymentTypes[0] || 'Pix');
  const [status, setStatus] = useState(userData.paymentStatuses[0] || 'Pendente');
  const [classification, setClassification] = useState<'Fixo' | 'Variável' | 'Eventual'>('Fixo');
  const [search, setSearch] = useState('');

  // Category, Payment Type and Payment Status Management States
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showManagePaymentTypes, setShowManagePaymentTypes] = useState(false);
  const [newPaymentTypeName, setNewPaymentTypeName] = useState('');
  const [showManagePaymentStatuses, setShowManagePaymentStatuses] = useState(false);
  const [newPaymentStatusName, setNewPaymentStatusName] = useState('');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [editingPaymentType, setEditingPaymentType] = useState<string | null>(null);
  const [editPaymentTypeValue, setEditPaymentTypeValue] = useState('');
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null);
  const [editPaymentStatusValue, setEditPaymentStatusValue] = useState('');

  // Auto-minimize "Como Lançar Despesas" when scrolling down the page
  useEffect(() => {
    if (!showHelp) return;

    let lastScrollY = -1;
    let touchStartY = 0;

    const handleScroll = (e: Event) => {
      let currentScroll = 0;
      const target = e.target as HTMLElement | Document | null;
      if (target && target instanceof HTMLElement && target.scrollHeight > target.clientHeight) {
        currentScroll = target.scrollTop;
      } else {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        currentScroll = scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      }

      if (lastScrollY === -1) {
        lastScrollY = currentScroll;
        return;
      }

      // If user scrolls down by more than 25px, auto-minimize
      if (currentScroll > lastScrollY + 25) {
        setShowHelp(false);
      } else if (currentScroll < lastScrollY) {
        lastScrollY = currentScroll;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 15) {
        setShowHelp(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const currentTouchY = e.touches[0].clientY;
        if (touchStartY - currentTouchY > 30) {
          setShowHelp(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showHelp]);

  const currentMonthYearStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<string>();
    
    // Always include current year
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);

    // Collect years from expense dates
    userData.expenses.forEach(exp => {
      if (exp.date && exp.date.length >= 4) {
        yearsSet.add(exp.date.substring(0, 4)); // YYYY
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [userData.expenses]);

  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include current month if selected year is 'all' or matches current year
    const currentYear = currentMonthYearStr.substring(0, 4);
    if (selectedYear === 'all' || selectedYear === currentYear) {
      monthsSet.add(currentMonthYearStr);
    }

    // Collect months from expense dates
    userData.expenses.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        const expYear = exp.date.substring(0, 4);
        if (selectedYear === 'all' || selectedYear === expYear) {
          monthsSet.add(exp.date.substring(0, 7)); // YYYY-MM
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [userData.expenses, currentMonthYearStr, selectedYear]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (year !== 'all') {
      if (selectedMonth !== 'all' && !selectedMonth.startsWith(year)) {
        setSelectedMonth('all');
      }
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== 'all') {
      const monthYear = month.substring(0, 4);
      setSelectedYear(monthYear);
    }
  };

  const formatMonthYearStr = (monthStr: string) => {
    if (!monthStr || monthStr === 'all') return 'Todos';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx]} / ${year}`;
  };

  const getNextMonthDate = (baseDateStr: string, monthsToAdd: number): string => {
    if (monthsToAdd === 0) return baseDateStr;
    const [yearStr, monthStr, dayStr] = baseDateStr.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1 + monthsToAdd;
    let day = parseInt(dayStr, 10);

    year += Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;

    const daysInNewMonth = new Date(year, month + 1, 0).getDate();
    if (day > daysInNewMonth) {
      day = daysInNewMonth;
    }

    const newYyyy = String(year);
    const newMm = String(month + 1).padStart(2, '0');
    const newDd = String(day).padStart(2, '0');

    return `${newYyyy}-${newMm}-${newDd}`;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value) return;

    if (editingExpenseId) {
      // Edit mode
      const updatedExpenses = userData.expenses.map(exp => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            date,
            description,
            value: parseFloat(value),
            category,
            paymentType,
            status,
            classification
          };
        }
        return exp;
      });

      onUpdateUserData({
        expenses: updatedExpenses
      });

      setEditingExpenseId(null);
    } else {
      // Create mode
      const parsedVal = parseFloat(value);
      if (installments > 1) {
        const newExpensesList: Expense[] = [];
        const baseTimestamp = Date.now();
        for (let i = 1; i <= installments; i++) {
          const instDate = getNextMonthDate(date, i - 1);
          newExpensesList.push({
            id: 'exp-' + baseTimestamp + '-' + i,
            date: instDate,
            description: `${description} (${i}/${installments})`,
            value: parsedVal,
            category,
            paymentType,
            status: i === 1 ? status : (status === 'Pago' ? 'Pendente' : status),
            classification
          });
        }
        onUpdateUserData({
          expenses: [...newExpensesList, ...userData.expenses]
        });
      } else {
        const newExpense: Expense = {
          id: 'exp-' + Date.now(),
          date,
          description,
          value: parsedVal,
          category,
          paymentType,
          status,
          classification
        };

        onUpdateUserData({
          expenses: [newExpense, ...userData.expenses]
        });
      }
    }

    setDescription('');
    setValue('');
    setInstallments(1);
    setClassification('Fixo');
    setShowAddForm(false);
  };

  const handleEditStart = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setDate(exp.date);
    setDescription(exp.description);
    setValue(String(exp.value));
    setCategory(exp.category);
    setPaymentType(exp.paymentType);
    setStatus(exp.status);
    setClassification((exp.classification as any) || 'Fixo');
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      expenses: userData.expenses.filter(i => i.id !== id)
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (userData.expenseCategories.includes(trimmed)) return;
    const updated = [...userData.expenseCategories, trimmed];
    onUpdateUserData({
      expenseCategories: updated
    });
    setNewCategoryName('');
    setCategory(trimmed); // Select newly created category
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updated = userData.expenseCategories.filter(cat => cat !== catToDelete);
    onUpdateUserData({
      expenseCategories: updated
    });
    if (category === catToDelete) {
      setCategory(updated[0] || 'Outros');
    }
  };

  const handleEditCategory = (oldCat: string) => {
    const trimmed = editCategoryValue.trim();
    if (!trimmed) return;
    if (userData.expenseCategories.includes(trimmed) && trimmed !== oldCat) return;

    const updatedCategories = userData.expenseCategories.map(cat => cat === oldCat ? trimmed : cat);
    const updatedExpenses = userData.expenses.map(exp => exp.category === oldCat ? { ...exp, category: trimmed } : exp);

    onUpdateUserData({
      expenseCategories: updatedCategories,
      expenses: updatedExpenses
    });

    if (category === oldCat) {
      setCategory(trimmed);
    }
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleAddPaymentType = () => {
    const trimmed = newPaymentTypeName.trim();
    if (!trimmed) return;
    if (userData.paymentTypes.includes(trimmed)) return;
    const updated = [...userData.paymentTypes, trimmed];
    onUpdateUserData({
      paymentTypes: updated
    });
    setNewPaymentTypeName('');
    setPaymentType(trimmed); // Select newly created payment type
  };

  const handleDeletePaymentType = (ptToDelete: string) => {
    const updated = userData.paymentTypes.filter(pt => pt !== ptToDelete);
    onUpdateUserData({
      paymentTypes: updated
    });
    if (paymentType === ptToDelete) {
      setPaymentType(updated[0] || 'Pix');
    }
  };

  const handleEditPaymentType = (oldPt: string) => {
    const trimmed = editPaymentTypeValue.trim();
    if (!trimmed) return;
    if (userData.paymentTypes.includes(trimmed) && trimmed !== oldPt) return;

    const updatedPaymentTypes = userData.paymentTypes.map(pt => pt === oldPt ? trimmed : pt);
    const updatedExpenses = userData.expenses.map(exp => exp.paymentType === oldPt ? { ...exp, paymentType: trimmed } : exp);

    onUpdateUserData({
      paymentTypes: updatedPaymentTypes,
      expenses: updatedExpenses
    });

    if (paymentType === oldPt) {
      setPaymentType(trimmed);
    }
    setEditingPaymentType(null);
    setEditPaymentTypeValue('');
  };

  const handleAddPaymentStatus = () => {
    const trimmed = newPaymentStatusName.trim();
    if (!trimmed) return;
    if (userData.paymentStatuses.includes(trimmed)) return;
    const updated = [...userData.paymentStatuses, trimmed];
    onUpdateUserData({
      paymentStatuses: updated
    });
    setNewPaymentStatusName('');
    setStatus(trimmed); // Select newly created status
  };

  const handleDeletePaymentStatus = (psToDelete: string) => {
    const updated = userData.paymentStatuses.filter(ps => ps !== psToDelete);
    onUpdateUserData({
      paymentStatuses: updated
    });
    if (status === psToDelete) {
      setStatus(updated[0] || 'Pendente');
    }
  };

  const handleEditPaymentStatus = (oldPs: string) => {
    const trimmed = editPaymentStatusValue.trim();
    if (!trimmed) return;
    if (userData.paymentStatuses.includes(trimmed) && trimmed !== oldPs) return;

    const updatedStatuses = userData.paymentStatuses.map(ps => ps === oldPs ? trimmed : ps);
    const updatedExpenses = userData.expenses.map(exp => exp.status === oldPs ? { ...exp, status: trimmed } : exp);

    onUpdateUserData({
      paymentStatuses: updatedStatuses,
      expenses: updatedExpenses
    });

    if (status === oldPs) {
      setStatus(trimmed);
    }
    setEditingPaymentStatus(null);
    setEditPaymentStatusValue('');
  };

  const filteredExpenses = useMemo(() => {
    return userData.expenses.filter(e => {
      const matchesSearch = 
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      if (selectedYear !== 'all') {
        const expYear = e.date.substring(0, 4);
        if (expYear !== selectedYear) return false;
      }

      if (selectedMonth !== 'all' && !e.date.startsWith(selectedMonth)) return false;

      if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;

      return true;
    });
  }, [userData.expenses, search, selectedMonth, selectedYear, selectedStatus]);

  const total = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.value, 0);
  }, [filteredExpenses]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Lançamento de Despesas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie seus custos, contas de consumo e pagamentos.</p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setEditingExpenseId(null);
                setDescription('');
                setValue('');
                setInstallments(1);
              } else {
                setShowAddForm(true);
                setEditingExpenseId(null);
                setDescription('');
                setValue('');
                setInstallments(1);
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(userData.expenseCategories[0] || 'Outros');
                setPaymentType(userData.paymentTypes[0] || 'Pix');
                setStatus(userData.paymentStatuses[0] || 'Pendente');
                setClassification('Fixo');
                setShowManageCategories(false);
                setShowManagePaymentTypes(false);
                setShowManagePaymentStatuses(false);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-900 text-xs font-bold text-white rounded-xl shadow-sm shadow-red-950/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer dark:bg-red-900 dark:hover:bg-red-800"
            id="btn-nova-despesa"
          >
            <Plus className="h-4 w-4" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden transition-all shadow-xs">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-rose-500" />
            <span>Como Lançar Despesas</span>
            {showHelp && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/50 px-2 py-0.5 rounded-full font-medium">
                Aberto
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-xs">
              {showHelp ? 'Ocultar Ajuda' : 'Ver Ajuda'}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showHelp ? 'rotate-180 text-rose-500' : 'rotate-0'}`} />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {showHelp && (
            <motion.div
              key="despesas-help-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-medium text-slate-700 dark:text-slate-300">Siga estes passos simples para gerenciar suas despesas:</p>
                <ul className="list-decimal pl-4 space-y-1.5">
                  <li>Clique no botão <strong className="text-slate-800 dark:text-white">Nova Despesa</strong> no canto superior direito.</li>
                  <li>Defina os campos obrigatórios: <strong className="text-slate-800 dark:text-white">Descrição</strong>, <strong className="text-slate-800 dark:text-white">Valor</strong>, <strong className="text-slate-800 dark:text-white">Data</strong>, <strong className="text-slate-800 dark:text-white">Centro de Custo (Categoria)</strong> e <strong className="text-slate-800 dark:text-white">Tipo</strong>.</li>
                  <li>Determine a <strong className="text-slate-800 dark:text-white">Situação</strong> (se o item já está pago, pendente de pagamento ou em atraso).</li>
                  <li>Clique em <strong className="text-rose-600 dark:text-rose-400">Salvar Registro</strong> para gravar a saída.</li>
                </ul>
                <p className="mt-2 text-[11px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg">
                  <strong>Conselho Financeiro:</strong> Manter a situação de pagamento sempre em dia ajuda a monitorar os vencimentos futuros no seu fluxo de caixa para evitar multas, juros ou bloqueios.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl grid gap-4 sm:grid-cols-3 text-xs max-h-[90vh] overflow-y-auto">
            <div className="sm:col-span-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                {editingExpenseId ? 'Editar Registro de Despesa' : 'Novo Registro de Despesa'}
              </h3>
              {editingExpenseId && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded font-bold dark:bg-amber-950/30">
                  Modo de Edição
                </span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Data da Compra</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Descrição da Compra</label>
              <input type="text" required placeholder="Ex: Supermercado Semanal" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400">Valor (R$)</label>
              <input type="number" required step="0.01" placeholder="R$ 150,00" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            </div>
            {!editingExpenseId && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Quantidade de Parcelas</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value={1}>1x (À vista / Sem parcelamento)</option>
                  {Array.from({ length: 59 }, (_, idx) => idx + 2).map(num => (
                    <option key={num} value={num}>{num}x</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-normal">
                  * Os lançamentos automáticos nos meses subsequentes ocorrem a partir da 2ª parcela.
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Categoria da despesa</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManageCategories(true);
                    setShowManagePaymentTypes(false);
                    setShowManagePaymentStatuses(false);
                  }}
                  className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
                >
                  Gerenciar
                </button>
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                {userData.expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManagePaymentTypes(true);
                    setShowManageCategories(false);
                    setShowManagePaymentStatuses(false);
                  }}
                  className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
                >
                  Gerenciar
                </button>
              </div>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                {userData.paymentTypes.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Situação</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowManagePaymentStatuses(true);
                    setShowManageCategories(false);
                    setShowManagePaymentTypes(false);
                  }}
                  className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded transition-colors"
                >
                  Gerenciar
                </button>
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                {userData.paymentStatuses.map(ps => (
                  <option key={ps} value={ps}>{ps}</option>
                ))}
              </select>
            </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Classificação de Despesa</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as 'Fixo' | 'Variável' | 'Eventual')}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="Fixo">Fixo</option>
              <option value="Variável">Variável</option>
              <option value="Eventual">Eventual</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingExpenseId(null);
                setDescription('');
                setValue('');
                setInstallments(1);
                setShowManageCategories(false);
                setShowManagePaymentTypes(false);
                setShowManagePaymentStatuses(false);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 transition-colors"
            >
              {editingExpenseId ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Manage Categories Popup Modal */}
    {showManageCategories && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Categorias de Despesa</h3>
            <button
              type="button"
              onClick={() => setShowManageCategories(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome da nova categoria de despesa"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Categorias Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {userData.expenseCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingCategory === cat ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditCategory(cat);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditCategory(cat)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{cat}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Categoria de Despesa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Categoria de Despesa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {userData.expenseCategories.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhuma categoria de despesa cadastrada.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManageCategories(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Manage Payment Types Popup Modal */}
    {showManagePaymentTypes && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Tipos de Pagamento</h3>
            <button
              type="button"
              onClick={() => setShowManagePaymentTypes(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome do novo tipo de pagamento"
              value={newPaymentTypeName}
              onChange={(e) => setNewPaymentTypeName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddPaymentType}
              className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipos de Pagamento Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {userData.paymentTypes.map(pt => (
                <div key={pt} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingPaymentType === pt ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editPaymentTypeValue}
                        onChange={(e) => setEditPaymentTypeValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditPaymentType(pt);
                          if (e.key === 'Escape') setEditingPaymentType(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditPaymentType(pt)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPaymentType(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{pt}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentType(pt);
                            setEditPaymentTypeValue(pt);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Tipo de Pagamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentType(pt)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Tipo de Pagamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {userData.paymentTypes.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhum tipo de pagamento cadastrado.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManagePaymentTypes(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Manage Payment Statuses Popup Modal */}
    {showManagePaymentStatuses && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Gerenciar Situações de Pagamento</h3>
            <button
              type="button"
              onClick={() => setShowManagePaymentStatuses(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Nome da nova situação de pagamento"
              value={newPaymentStatusName}
              onChange={(e) => setNewPaymentStatusName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white text-xs sm:text-sm w-full"
            />
            <button
              type="button"
              onClick={handleAddPaymentStatus}
              className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1 w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          
          <div className="space-y-2 w-full">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Situações de Pagamento Existentes</span>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
              {userData.paymentStatuses.map(ps => (
                <div key={ps} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px] gap-2">
                  {editingPaymentStatus === ps ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editPaymentStatusValue}
                        onChange={(e) => setEditPaymentStatusValue(e.target.value)}
                        className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditPaymentStatus(ps);
                          if (e.key === 'Escape') setEditingPaymentStatus(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleEditPaymentStatus(ps)}
                        className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPaymentStatus(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm break-all">{ps}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentStatus(ps);
                            setEditPaymentStatusValue(ps);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Editar Situação de Pagamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentStatus(ps)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                          title="Excluir Situação de Pagamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {userData.paymentStatuses.length === 0 && (
                <p className="text-center text-slate-400 py-3 text-xs">Nenhuma situação de pagamento cadastrada.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManagePaymentStatuses(false)}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Filter and Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Pesquisar por descrição ou categoria da despesa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200/50 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Year Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Anos</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Ano {y}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Month Filter Dropdown */}
            <div className="flex flex-col items-start gap-1">
              <div className="relative w-full">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Meses</option>
                  {monthOptions.map((m) => {
                    const isCurrent = m === currentMonthYearStr;
                    return (
                      <option key={m} value={m}>
                        {formatMonthYearStr(m)} {isCurrent ? ' (Mês Corrente)' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>

              {/* Quick back to Current Month shortcut placed under the month selector */}
              {selectedMonth !== currentMonthYearStr && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthYearStr);
                    const currentYear = currentMonthYearStr.substring(0, 4);
                    setSelectedYear(currentYear);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.98] px-2.5 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-slate-900/15 cursor-pointer animate-fade-in"
                  title="Mudar para o Mês Corrente"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-200 shrink-0" />
                  <span>Ir para o mês corrente</span>
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todas as Situações</option>
                  {userData.paymentStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(search !== '' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedStatus('all');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50/50 hover:bg-red-50 text-red-600 px-3 py-2 font-bold transition-all dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                title="Limpar todos os filtros"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg font-bold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            Soma Filtrada: <span className="font-mono text-rose-600"><span className="text-xs font-sans font-normal text-slate-400 dark:text-slate-500 mr-1 select-none">R$</span>{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Lançamentos Card Separado */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Lançamentos de Despesas</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap w-[110px]">Data</th>
                <th className="py-3.5 px-4 font-semibold min-w-[200px]">Descrição</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap w-[150px]">Categoria</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap w-[120px]">Classificação</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap w-[160px]">Tipo</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap w-[140px]">Situação</th>
                <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap w-[130px]">Valor</th>
                <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Nenhum registro de despesa localizado.</td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    onClick={() => handleEditStart(exp)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    title="Clique para editar este lançamento"
                  >
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-sm whitespace-nowrap w-[110px]">
                      {formatShortDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100 text-sm min-w-[200px]">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap w-[150px]">
                      <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-md text-xs font-medium">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap w-[120px]">
                      <span className="inline-block bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {exp.classification || 'Fixo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap w-[160px]">
                      {exp.paymentType}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap w-[140px]">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        exp.status === 'Pago'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : exp.status === 'Pendente'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>{exp.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm sm:text-base whitespace-nowrap w-[130px]">
                      <span className="text-[11px] font-sans font-normal text-slate-400 dark:text-slate-500 mr-1 select-none">R$</span>{exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap w-[100px]">
                      <div className="flex items-center justify-end gap-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(exp);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
                          title="Editar Despesa"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(exp.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800"
                          title="Excluir Despesa"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======================== RESUMO MENSAL ========================
export const ResumoMensalPage: React.FC<PageProps> = ({ userData }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string | null>(null);
  const [selectedRealizedCategory, setSelectedRealizedCategory] = useState<string | null>(null);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<string | null>(null);

  const openCategoryModal = (catName: string) => {
    setSelectedCategoryModal(catName);
  };

  // Travar a rolagem da página e adicionar suporte a tecla ESC enquanto o pop-up estiver aberto
  useEffect(() => {
    if (selectedCategoryModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedCategoryModal(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedCategoryModal]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const monthData = useMemo(() => {
    // Filter incomes
    const incomes = userData.incomes.filter(inc => {
      if (!inc.date) return false;
      const parts = inc.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === selectedYear && m === selectedMonth;
      }
      return false;
    });

    // Filter expenses
    const expenses = userData.expenses.filter(exp => {
      if (!exp.date) return false;
      const parts = exp.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === selectedYear && m === selectedMonth;
      }
      return false;
    });

    const sumIncome = incomes.reduce((acc, curr) => acc + curr.value, 0);
    const sumExpense = expenses.reduce((acc, curr) => acc + curr.value, 0);

    // Grouping category statistics
    const catStats: { [name: string]: number } = {};
    expenses.forEach(e => {
      catStats[e.category] = (catStats[e.category] || 0) + e.value;
    });

    // Combine for visual statement
    const statement = [
      ...incomes.map(i => ({ ...i, type: 'receita' as const })),
      ...expenses.map(e => ({ ...e, type: 'despesa' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const yearPlan = userData.annualPlanning.find(p => p.year === selectedYear);
    const budget = yearPlan?.monthlyBudgets.find(b => b.month === selectedMonth);

    const CATEGORY_COLORS = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
      '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#EF4444',
      '#84CC16', '#D946EF', '#0284C7', '#E11D48', '#EAB308', '#22C55E',
      '#A855F7', '#38BDF8', '#FB7185', '#FACC15', '#4ADE80', '#64748B'
    ];

    const categoryColorMap: Record<string, string> = {};
    userData.expenseCategories.forEach((cat, idx) => {
      categoryColorMap[cat] = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    });

    const categoriesTableData = userData.expenseCategories.map(cat => {
      const catBudget = budget?.categoryBudgets?.find(cb => cb.category === cat);
      const budgetedValue = catBudget?.budgetedValue || 0;

      const realizedValue = expenses
        .filter(exp => exp.category === cat)
        .reduce((sum, item) => sum + item.value, 0);

      const balanceValue = budgetedValue - realizedValue;

      return {
        category: cat,
        budgetedValue,
        realizedValue,
        balanceValue,
        color: categoryColorMap[cat] || '#94A3B8'
      };
    }).sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));

    const sumBudget = categoriesTableData.reduce((sum, item) => sum + item.budgetedValue, 0);

    const budgetedCategoriesList = categoriesTableData.map(item => ({
      name: item.category,
      value: item.budgetedValue,
      percentage: sumBudget > 0 ? (item.budgetedValue / sumBudget) * 100 : 0,
      color: item.color
    }));

    const budgetedPieSlices = budgetedCategoriesList.filter(item => item.value > 0);

    const realizedCategoriesList = categoriesTableData.map(item => ({
      name: item.category,
      value: item.realizedValue,
      percentage: sumExpense > 0 ? (item.realizedValue / sumExpense) * 100 : 0,
      color: item.color
    }));

    const realizedPieSlices = realizedCategoriesList.filter(item => item.value > 0);

    return {
      sumIncome,
      sumExpense,
      sumBudget,
      balance: sumBudget - sumExpense,
      catStats: Object.entries(catStats).map(([category, value]) => ({ category, value })),
      statement,
      categoriesTableData,
      budgetedCategoriesList,
      budgetedPieSlices,
      realizedCategoriesList,
      realizedPieSlices
    };
  }, [userData.incomes, userData.expenses, userData.annualPlanning, userData.expenseCategories, selectedMonth, selectedYear]);

  const categoryModalLaunches = useMemo(() => {
    if (!selectedCategoryModal) return [];

    const exps = userData.expenses
      .filter(exp => {
        if (!exp.date || exp.category !== selectedCategoryModal) return false;
        const parts = exp.date.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return y === selectedYear && m === selectedMonth;
        }
        return false;
      })
      .map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        value: e.value,
        type: 'despesa' as const
      }));

    const incs = userData.incomes
      .filter(inc => {
        if (!inc.date || inc.category !== selectedCategoryModal) return false;
        const parts = inc.date.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return y === selectedYear && m === selectedMonth;
        }
        return false;
      })
      .map(i => ({
        id: i.id,
        date: i.date,
        description: i.description,
        value: i.value,
        type: 'receita' as const
      }));

    return [...exps, ...incs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userData.expenses, userData.incomes, selectedCategoryModal, selectedYear, selectedMonth]);

  const categoryModalTotal = useMemo(() => {
    return categoryModalLaunches.reduce((sum, item) => sum + item.value, 0);
  }, [categoryModalLaunches]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Resumo Financeiro Mensal</h2>
          <p className="text-xs text-slate-400">Visualize em detalhes o balanço e a distribuição de custos do mês selecionado.</p>
        </div>
        
        {/* Month and Year Filter */}
        <div className="flex items-center gap-2 text-xs">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="rounded-lg border border-slate-200/50 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white">
            {monthsList.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border border-slate-200/50 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white">
            {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSelectedMonth(new Date().getMonth());
              setSelectedYear(new Date().getFullYear());
            }}
            className="p-2 rounded-lg border border-slate-200/50 hover:border-red-300 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="Limpar filtros (voltar para mês e ano atuais)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ← selecione o filtro
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Orçados do Mês</span>
          <div className="text-xl font-bold text-blue-900 dark:text-sky-400 mt-1 font-mono">
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> {monthData.sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Realizados do Mês</span>
          <div className="text-xl font-bold text-red-500 mt-1 font-mono">
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> -{monthData.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saldo do Mês</span>
          <div className={`text-xl font-bold mt-1 font-mono ${
            Math.abs(monthData.balance) < 0.005
              ? 'text-slate-400 dark:text-slate-500 font-normal'
              : monthData.balance > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> {monthData.balance < 0 ? `-${Math.abs(monthData.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : monthData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Explanatory footnote */}
      <div className="text-[11px] text-slate-500 italic dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
        *O Saldo do Mês é calculado considerando o valor de Orçados do Mês e os Realizados do Mês. Orçados do Mês representa o planejamento configurado para o período.
      </div>

      {/* Performance by Category Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Resumo por Categoria Mensal</h3>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-900/40">
            💡 Clique na categoria para ver os lançamentos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="border-b-2 border-black text-slate-500 dark:border-slate-700 dark:text-slate-300">
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 w-[22%]">Categoria</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 text-right w-[26%]">Orçado</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 text-right w-[26%]">Realizado</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 text-right w-[26%]">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {monthData.categoriesTableData.map((item) => {
                const isZeroBalance = Math.abs(item.balanceValue) < 0.005 || (item.budgetedValue === 0 && item.realizedValue === 0);
                const isZeroBudget = Math.abs(item.budgetedValue) < 0.005;
                const isZeroExpense = Math.abs(item.realizedValue) < 0.005;

                const balanceColorClass = isZeroBalance
                  ? 'text-slate-400 dark:text-slate-500 font-normal'
                  : item.balanceValue > 0
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-red-600 dark:text-red-400 font-bold';

                return (
                  <tr 
                    key={item.category} 
                    onClick={() => openCategoryModal(item.category)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                    title={`Clique para ver todos os lançamentos de ${item.category}`}
                  >
                    <td className="py-3 font-bold break-words whitespace-normal leading-tight">
                      <span className="text-blue-600 dark:text-blue-400 group-hover:underline group-hover:text-blue-700 dark:group-hover:text-blue-300 flex items-center gap-1.5 font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-mono ${isZeroBudget ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-white font-bold'}`}>
                      <span className="text-[10px] mr-0.5 opacity-50 font-sans font-normal text-slate-500 dark:text-slate-400">R$</span>
                      <span>{item.budgetedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className={`py-3 text-right font-mono ${isZeroExpense ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-200 font-bold'}`}>
                      <span className="text-[10px] mr-0.5 opacity-50 font-sans font-normal text-slate-500 dark:text-slate-400">R$</span>
                      <span>{item.realizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className={`py-3 text-right font-mono ${balanceColorClass}`}>
                      <span className="text-[10px] mr-0.5 opacity-70 font-sans font-normal inline-block">R$</span>
                      <span>{item.balanceValue < 0 ? `-${Math.abs(item.balanceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : item.balanceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                );
              })}
              {monthData.categoriesTableData.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">Nenhuma Categoria cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção com Separadores e Gráficos Tipo Pizza: Orçado e Realizado */}
      <div className="space-y-4 pt-2">
        {/* Line with pill badge in the style of GRÁFICOS FINANCEIROS do Painel */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative bg-emerald-100/80 border border-emerald-300 dark:border-emerald-800/60 dark:bg-emerald-950/40 px-4 py-1.5 rounded-full text-xs sm:text-xs font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-300 shadow-sm text-center">
            Gráficos de percentuais
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card Gráfico Orçado */}
          <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="h-4 w-1 rounded-full bg-purple-600 dark:bg-sky-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Categorias - Orçado
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col items-center">
            {monthData.budgetedPieSlices.length > 0 ? (
              <>
                <div className="relative h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthData.budgetedPieSlices}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.name) {
                            setSelectedBudgetCategory(prev => prev === entry.name ? null : entry.name);
                          }
                        }}
                      >
                        {monthData.budgetedPieSlices.map((entry) => {
                          const isSelected = selectedBudgetCategory === entry.name;
                          return (
                            <Cell
                              key={`cell-budget-${entry.name}`}
                              fill={entry.color}
                              stroke={isSelected ? '#ffffff' : 'transparent'}
                              strokeWidth={isSelected ? 3 : 0}
                              opacity={selectedBudgetCategory ? (isSelected ? 1 : 0.35) : 1}
                              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Informação no centro da rosca ao clicar na fatia */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {(() => {
                      const sel = monthData.budgetedCategoriesList.find(c => c.name === selectedBudgetCategory);
                      if (sel && sel.value > 0) {
                        return (
                          <div className="text-center px-1.5 max-w-[100px]">
                            <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight" title={sel.name}>
                              {sel.name}
                            </div>
                            <div className="text-base font-black text-purple-600 dark:text-sky-400 leading-tight my-0.5 font-mono">
                              {sel.percentage.toFixed(1)}%
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate">
                              R$ {sel.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-center px-1.5 max-w-[100px]">
                          <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                            Clique na fatia
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            Orçado
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Banner com destaque da categoria e porcentagem ao clicar */}
                {(() => {
                  const sel = monthData.budgetedCategoriesList.find(c => c.name === selectedBudgetCategory);
                  if (!sel) return null;
                  return (
                    <div className="w-full my-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-4 w-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: sel.color }} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-purple-950 dark:text-purple-100 truncate">
                            {sel.name}
                          </div>
                          <div className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                            Valor Orçado: <span className="font-bold">R$ {sel.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="px-2.5 py-1 rounded-md bg-purple-600 dark:bg-sky-500 text-white font-mono font-bold text-xs shadow-sm">
                          {sel.percentage.toFixed(1)}%
                        </div>
                        <button
                          onClick={() => setSelectedBudgetCategory(null)}
                          className="p-1 rounded text-purple-500 hover:text-purple-800 hover:bg-purple-200/50 dark:text-purple-300 dark:hover:text-white dark:hover:bg-purple-900/60 transition-colors"
                          title="Desmarcar seleção"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="h-48 w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                <div className="h-24 w-24 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center mb-2">
                  <span className="font-semibold text-[11px] text-slate-400">R$ 0,00</span>
                </div>
                Nenhum valor orçado para as categorias neste mês.
              </div>
            )}

            {/* Legenda com TODAS as categorias de Cadastro Categoria Despesas */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 w-full">
              <div className="flex items-center justify-between pb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Todas as Categorias Cadastradas ({monthData.budgetedCategoriesList.length})</span>
                <span>Total: R$ {monthData.sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-56 overflow-y-auto pr-1">
                {monthData.budgetedCategoriesList.map((item) => {
                  const isSelected = selectedBudgetCategory === item.name;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setSelectedBudgetCategory(prev => prev === item.name ? null : item.name)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-purple-500 bg-purple-100/70 dark:bg-purple-950/60 dark:ring-sky-400 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className={`truncate ${isSelected ? 'font-bold text-purple-950 dark:text-purple-100' : 'font-medium text-slate-700 dark:text-slate-200'}`} title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-right">
                        <span className={`text-[11px] ${item.value > 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.value > 0 
                            ? isSelected
                              ? 'text-white bg-purple-600 dark:bg-sky-500'
                              : 'text-purple-700 dark:text-sky-300 bg-purple-100 dark:bg-sky-950/60' 
                            : 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/60'
                        }`}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card Gráfico Realizado */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="h-4 w-1 rounded-full bg-red-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Categorias - Realizado
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col items-center">
            {monthData.realizedPieSlices.length > 0 ? (
              <>
                <div className="relative h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthData.realizedPieSlices}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.name) {
                            setSelectedRealizedCategory(prev => prev === entry.name ? null : entry.name);
                          }
                        }}
                      >
                        {monthData.realizedPieSlices.map((entry) => {
                          const isSelected = selectedRealizedCategory === entry.name;
                          return (
                            <Cell
                              key={`cell-realized-${entry.name}`}
                              fill={entry.color}
                              stroke={isSelected ? '#ffffff' : 'transparent'}
                              strokeWidth={isSelected ? 3 : 0}
                              opacity={selectedRealizedCategory ? (isSelected ? 1 : 0.35) : 1}
                              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Informação no centro da rosca ao clicar na fatia */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {(() => {
                      const sel = monthData.realizedCategoriesList.find(c => c.name === selectedRealizedCategory);
                      if (sel && sel.value > 0) {
                        return (
                          <div className="text-center px-1.5 max-w-[100px]">
                            <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight" title={sel.name}>
                              {sel.name}
                            </div>
                            <div className="text-base font-black text-red-600 dark:text-red-400 leading-tight my-0.5 font-mono">
                              {sel.percentage.toFixed(1)}%
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate">
                              R$ {sel.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-center px-1.5 max-w-[100px]">
                          <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                            Clique na fatia
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            Realizado
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Banner com destaque da categoria e porcentagem ao clicar */}
                {(() => {
                  const sel = monthData.realizedCategoriesList.find(c => c.name === selectedRealizedCategory);
                  if (!sel) return null;
                  return (
                    <div className="w-full my-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-4 w-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: sel.color }} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-red-950 dark:text-red-100 truncate">
                            {sel.name}
                          </div>
                          <div className="text-[11px] font-mono text-red-700 dark:text-red-300">
                            Valor Realizado: <span className="font-bold">R$ {sel.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="px-2.5 py-1 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-sm">
                          {sel.percentage.toFixed(1)}%
                        </div>
                        <button
                          onClick={() => setSelectedRealizedCategory(null)}
                          className="p-1 rounded text-red-500 hover:text-red-800 hover:bg-red-200/50 dark:text-red-300 dark:hover:text-white dark:hover:bg-red-900/60 transition-colors"
                          title="Desmarcar seleção"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="h-48 w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                <div className="h-24 w-24 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center mb-2">
                  <span className="font-semibold text-[11px] text-slate-400">R$ 0,00</span>
                </div>
                Nenhuma despesa realizada neste mês.
              </div>
            )}

            {/* Legenda com TODAS as categorias de Cadastro Categoria Despesas */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 w-full">
              <div className="flex items-center justify-between pb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Todas as Categorias Cadastradas ({monthData.realizedCategoriesList.length})</span>
                <span>Total: R$ {monthData.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-56 overflow-y-auto pr-1">
                {monthData.realizedCategoriesList.map((item) => {
                  const isSelected = selectedRealizedCategory === item.name;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setSelectedRealizedCategory(prev => prev === item.name ? null : item.name)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-red-500 bg-red-100/70 dark:bg-red-950/60 dark:ring-red-400 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className={`truncate ${isSelected ? 'font-bold text-red-950 dark:text-red-100' : 'font-medium text-slate-700 dark:text-slate-200'}`} title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-right">
                        <span className={`text-[11px] ${item.value > 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.value > 0 
                            ? isSelected
                              ? 'text-white bg-red-600'
                              : 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60' 
                            : 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/60'
                        }`}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP: DETALHES DE LANÇAMENTOS DA CATEGORIA                               */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedCategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md"
              onClick={() => setSelectedCategoryModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cabeçalho do Pop-up */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      {selectedCategoryModal}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lançamentos de {monthsList[selectedMonth]} de {selectedYear}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCategoryModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar e voltar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Conteúdo / Tabela de Lançamentos */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {categoryModalLaunches.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Nenhum lançamento nesta categoria para este mês.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="pb-2.5 pl-1">Data</th>
                            <th className="pb-2.5 px-2">Descrição</th>
                            <th className="pb-2.5 pr-1 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {categoryModalLaunches.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-2.5 pl-1 pr-2 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                {formatShortDate(item.date)}
                              </td>
                              <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                {item.description || 'Sem descrição'}
                              </td>
                              <td
                                className={`py-2.5 pr-1 text-right font-mono font-bold whitespace-nowrap ${
                                  item.type === 'despesa'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {item.value.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Rodapé do Pop-up */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Total:{' '}
                    <strong className="text-slate-900 dark:text-white font-mono font-bold text-sm">
                      {categoryModalTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </strong>
                  </span>
                  <button
                    onClick={() => setSelectedCategoryModal(null)}
                    className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// ======================== RESUMO ANUAL ========================
export const ResumoAnualPage: React.FC<PageProps> = ({ userData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthModal, setSelectedMonthModal] = useState<number | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'categories' | 'expenses'>('categories');

  const fullMonthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  // Travar a rolagem da página e adicionar suporte a tecla ESC enquanto o pop-up estiver aberto
  useEffect(() => {
    if (selectedMonthModal !== null) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedMonthModal(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedMonthModal]);

  const annualStats = useMemo(() => {
    let yearIncomes = 0;
    let yearExpenses = 0;
    let yearPlannedExpenses = 0;

    // Allocate totals per month
    const monthlySummary = Array.from({ length: 12 }, (_, idx) => {
      const monthIncomes = userData.incomes
        .filter(inc => {
          if (!inc.date) return false;
          const parts = inc.date.split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            return y === selectedYear && m === idx;
          }
          return false;
        })
        .reduce((sum, item) => sum + item.value, 0);

      const monthExpenses = userData.expenses
        .filter(exp => {
          if (!exp.date) return false;
          const parts = exp.date.split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            return y === selectedYear && m === idx;
          }
          return false;
        })
        .reduce((sum, item) => sum + item.value, 0);

      yearIncomes += monthIncomes;
      yearExpenses += monthExpenses;

      // Find monthly planning budgets if registered
      const yearPlan = userData.annualPlanning?.find(p => p.year === selectedYear);
      const budget = yearPlan?.monthlyBudgets?.find(b => b.month === idx);
      
      const hasDetailedBudgets = budget?.categoryBudgets && budget.categoryBudgets.length > 0;
      const plannedExp = hasDetailedBudgets
        ? budget.categoryBudgets.reduce((sum, item) => sum + item.budgetedValue, 0)
        : (budget?.expenseBudget || 0);

      yearPlannedExpenses += plannedExp;

      return {
        monthIndex: idx,
        monthName: fullMonthsList[idx],
        income: monthIncomes,
        expense: monthExpenses,
        budget: plannedExp,
        balance: plannedExp - monthExpenses
      };
    });

    return {
      yearIncomes,
      yearExpenses,
      yearPlannedExpenses,
      balance: yearPlannedExpenses - yearExpenses,
      monthlySummary
    };
  }, [userData.incomes, userData.expenses, userData.annualPlanning, selectedYear]);

  // Despesas detalhadas do mês selecionado no popup
  const monthExpenses = useMemo(() => {
    if (selectedMonthModal === null) return [];
    return userData.expenses
      .filter(exp => {
        if (!exp.date) return false;
        const parts = exp.date.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return y === selectedYear && m === selectedMonthModal;
        }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userData.expenses, selectedYear, selectedMonthModal]);

  // Comparativo de categorias do mês selecionado (Orçado x Realizado)
  const monthCategoriesData = useMemo(() => {
    if (selectedMonthModal === null) return [];
    const yearPlan = userData.annualPlanning?.find(p => p.year === selectedYear);
    const budget = yearPlan?.monthlyBudgets?.find(b => b.month === selectedMonthModal);

    const categoriesSet = new Set<string>(userData.expenseCategories || []);
    budget?.categoryBudgets?.forEach(cb => {
      if (cb.category) categoriesSet.add(cb.category);
    });
    monthExpenses.forEach(e => {
      if (e.category) categoriesSet.add(e.category);
    });

    return Array.from(categoriesSet)
      .map(cat => {
        const catBudget = budget?.categoryBudgets?.find(cb => cb.category === cat);
        const budgetedValue = catBudget?.budgetedValue || 0;
        const realizedValue = monthExpenses
          .filter(exp => exp.category === cat)
          .reduce((sum, item) => sum + item.value, 0);
        const balanceValue = budgetedValue - realizedValue;

        return {
          category: cat,
          budgetedValue,
          realizedValue,
          balanceValue
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));
  }, [userData.annualPlanning, userData.expenseCategories, selectedYear, selectedMonthModal, monthExpenses]);

  const modalTotals = useMemo(() => {
    const sumBudget = monthCategoriesData.reduce((acc, curr) => acc + curr.budgetedValue, 0);
    const sumExpense = monthCategoriesData.reduce((acc, curr) => acc + curr.realizedValue, 0);
    return {
      sumBudget,
      sumExpense,
      balance: sumBudget - sumExpense
    };
  }, [monthCategoriesData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Resumo Consolidado Anual</h2>
          <p className="text-xs text-slate-400">Analise seu desempenho orçamentário anual, metas planejadas e realistas.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border border-slate-200/50 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white">
            {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelectedYear(new Date().getFullYear())}
            className="p-2 rounded-lg border border-slate-200/50 hover:border-red-300 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="Limpar filtro (voltar para o ano atual)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ← selecione o ano para filtrar
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Orçado Total {selectedYear}</span>
          <div className="text-xl font-bold text-blue-900 dark:text-sky-400 mt-1 font-mono">
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> {annualStats.yearPlannedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Realizado Total {selectedYear}</span>
          <div className="text-xl font-bold text-red-500 mt-1 font-mono">
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> -{annualStats.yearExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Saldo Total {selectedYear}</span>
          <div className={`text-xl font-bold mt-1 font-mono ${
            Math.abs(annualStats.balance) < 0.005
              ? 'text-slate-400 dark:text-slate-500 font-normal'
              : annualStats.balance > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            <span className="text-xs mr-0.5 opacity-60 font-sans font-normal">R$</span> {annualStats.balance < 0 ? `-${Math.abs(annualStats.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : annualStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Explanatory footnote */}
      <div className="text-[11px] text-slate-500 italic dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
        *o cálculo se dá pelo orçamento total configurado em Planejamento anual menos o Realizado total lançado em Despesas conforme o ano escolhido. Receitas total é só comparativo para o Orçado, se está acima ou abaixo do que foi previsto.
      </div>

      {/* Monthly grid breakdown with comparison to budget */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Desempenho Mês a Mês</h3>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-900/40 flex items-center gap-1.5">
            💡 Clique no mês para ver os lançamentos e categorias
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="border-b-2 border-black dark:border-white">
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 w-[20%]">Mês</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 text-right w-[26%]">Orçado</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 text-right w-[26%]">Realizado</th>
                <th className="pb-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 text-right w-[28%]">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {annualStats.monthlySummary.map((m) => {
                const isZeroBalance = Math.abs(m.balance) < 0.005 || (m.budget === 0 && m.expense === 0);
                const isZeroBudget = Math.abs(m.budget) < 0.005;
                const isZeroExpense = Math.abs(m.expense) < 0.005;

                const balanceColorClass = isZeroBalance
                  ? 'text-slate-400 dark:text-slate-500 font-normal'
                  : m.balance > 0
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-red-600 dark:text-red-400 font-bold';

                return (
                  <tr 
                    key={m.monthIndex} 
                    onClick={() => {
                      setSelectedMonthModal(m.monthIndex);
                      setModalActiveTab('categories');
                    }}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                    title={`Clique para ver as despesas e orçamento de ${m.monthName}`}
                  >
                    <td className="py-3 font-bold">
                      <span className="text-blue-600 dark:text-blue-400 group-hover:underline group-hover:text-blue-700 dark:group-hover:text-blue-300 flex items-center gap-1.5 font-bold">
                        {m.monthName}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-mono ${isZeroBudget ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-950 dark:text-white font-bold'}`}>
                      <span className="font-normal text-[10px] opacity-50 mr-0.5 inline-block">R$</span>
                      <span>{m.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className={`py-3 text-right font-mono ${isZeroExpense ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-200 font-bold'}`}>
                      <span className="font-normal text-[10px] opacity-50 mr-0.5 inline-block">R$</span>
                      <span>{m.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className={`py-3 text-right font-mono ${balanceColorClass}`}>
                      <span className="font-normal text-[10px] opacity-60 mr-0.5 inline-block">R$</span>
                      <span>{m.balance < 0 ? `-${Math.abs(m.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP: DETALHAMENTO DE DESPESAS E CATEGORIAS DO MÊS SELECIONADO            */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedMonthModal !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md"
              onClick={() => setSelectedMonthModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cabeçalho do Pop-up */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Despesas de {fullMonthsList[selectedMonthModal]} de {selectedYear}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Detalhamento por categoria com valor orçado e valor realizado
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMonthModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar e voltar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Linha de Mini Indicadores (Orçado, Realizado) */}
                <div className="grid grid-cols-2 gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orçado</span>
                    <span className={`font-mono text-sm ${modalTotals.sumBudget === 0 ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-blue-700 dark:text-sky-400 font-bold'}`}>
                      R$ {modalTotals.sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Realizado</span>
                    <span className={`font-mono text-sm ${modalTotals.sumExpense === 0 ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                      R$ {modalTotals.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Seletor de Abas */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 bg-slate-50/40 dark:bg-slate-950/30 shrink-0">
                  <button
                    onClick={() => setModalActiveTab('categories')}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      modalActiveTab === 'categories'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Categorias (Orçado x Realizado)
                  </button>
                  <button
                    onClick={() => setModalActiveTab('expenses')}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      modalActiveTab === 'expenses'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Lançamentos do Mês ({monthExpenses.length})
                  </button>
                </div>

                {/* Conteúdo da Aba */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {modalActiveTab === 'categories' ? (
                    monthCategoriesData.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs px-4">
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Nenhuma categoria com valores neste mês.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs table-fixed border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                          <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                            <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 pl-4 sm:pl-5 pr-2 w-[48%] border-b border-slate-200 dark:border-slate-800">
                              Categoria
                            </th>
                            <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 px-2 text-right w-[26%] border-b border-slate-200 dark:border-slate-800">
                              Orçado
                            </th>
                            <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 pl-2 pr-4 sm:pr-5 text-right w-[26%] border-b border-slate-200 dark:border-slate-800">
                              Realizado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {monthCategoriesData.map((item) => {
                            const isZeroBudget = Math.abs(item.budgetedValue) < 0.005;
                            const isZeroExpense = Math.abs(item.realizedValue) < 0.005;

                            return (
                              <tr
                                key={item.category}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-2.5 pl-4 sm:pl-5 pr-2 font-semibold text-slate-800 dark:text-slate-100 truncate" title={item.category}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                    <span className="truncate">{item.category}</span>
                                  </div>
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${
                                  isZeroBudget
                                    ? 'text-slate-400 dark:text-slate-500 font-normal'
                                    : 'text-slate-800 dark:text-slate-200 font-semibold'
                                }`}>
                                  <span className="text-[10px] opacity-50 mr-0.5">R$</span>
                                  <span>{item.budgetedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className={`py-2.5 pl-2 pr-4 sm:pr-5 text-right font-mono ${
                                  isZeroExpense
                                    ? 'text-slate-400 dark:text-slate-500 font-normal'
                                    : 'text-slate-900 dark:text-slate-100 font-bold'
                                }`}>
                                  <span className="text-[10px] opacity-50 mr-0.5">R$</span>
                                  <span>{item.realizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 shadow-[0_-1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_-1px_0_0_rgba(30,41,59,1)]">
                          <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50/95 dark:bg-slate-950/95">
                            <td className="sticky bottom-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 py-3 pl-4 sm:pl-5 pr-2 text-slate-900 dark:text-white uppercase text-[11px] border-t-2 border-slate-200 dark:border-slate-700">
                              Total
                            </td>
                            <td className={`sticky bottom-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 py-3 px-2 text-right font-mono border-t-2 border-slate-200 dark:border-slate-700 ${
                              modalTotals.sumBudget === 0
                                ? 'text-slate-400 dark:text-slate-500 font-normal'
                                : 'text-blue-700 dark:text-sky-400 font-bold'
                            }`}>
                              R$ {modalTotals.sumBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`sticky bottom-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 py-3 pl-2 pr-4 sm:pr-5 text-right font-mono border-t-2 border-slate-200 dark:border-slate-700 ${
                              modalTotals.sumExpense === 0
                                ? 'text-slate-400 dark:text-slate-500 font-normal'
                                : 'text-rose-600 dark:text-rose-400 font-bold'
                            }`}>
                              R$ {modalTotals.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )
                  ) : (
                    monthExpenses.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs px-4">
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Nenhum lançamento de despesa registrado para este mês.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                            <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 pl-4 sm:pl-5 pr-2 w-[85px] border-b border-slate-200 dark:border-slate-800">Data</th>
                              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 px-2 min-w-[140px] border-b border-slate-200 dark:border-slate-800">Descrição</th>
                              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 px-2 w-[120px] border-b border-slate-200 dark:border-slate-800">Categoria</th>
                              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 px-2 w-[110px] border-b border-slate-200 dark:border-slate-800">Tipo</th>
                              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-3 pl-2 pr-4 sm:pr-5 text-right w-[100px] border-b border-slate-200 dark:border-slate-800">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {monthExpenses.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-2.5 pl-4 sm:pl-5 pr-2 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                  {formatShortDate(item.date)}
                                </td>
                                <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                  {item.description || 'Sem descrição'}
                                </td>
                                <td className="py-2.5 px-2 whitespace-nowrap">
                                  <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                  {item.paymentType || '-'}
                                </td>
                                <td className="py-2.5 pl-2 pr-4 sm:pr-5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>

                {/* Rodapé do Pop-up */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Total Realizado:{' '}
                    <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold text-sm">
                      R$ {modalTotals.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                  <button
                    onClick={() => setSelectedMonthModal(null)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// ======================== METAS ========================
export const MetasPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluído'>('Pendente');

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !value) return;

    if (editingPlanId) {
      onUpdateUserData({
        actionPlans: userData.actionPlans.map(p =>
          p.id === editingPlanId
            ? { ...p, title, description, targetDate, value: parseFloat(value), status }
            : p
        )
      });
      setEditingPlanId(null);
    } else {
      const newPlan: ActionPlan = {
        id: 'plan-' + Date.now(),
        title,
        description,
        targetDate,
        value: parseFloat(value),
        status
      };

      onUpdateUserData({
        actionPlans: [...userData.actionPlans, newPlan]
      });
    }

    setTitle('');
    setDescription('');
    setTargetDate('');
    setValue('');
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleStartEdit = (plan: ActionPlan) => {
    setEditingPlanId(plan.id);
    setTitle(plan.title);
    setDescription(plan.description);
    setTargetDate(plan.targetDate);
    setValue(plan.value.toString());
    setStatus(plan.status);
    setShowAdd(true);
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setTitle('');
    setDescription('');
    setTargetDate('');
    setValue('');
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      actionPlans: userData.actionPlans.filter(p => p.id !== id)
    });
    if (editingPlanId === id) {
      handleCancelEdit();
    }
  };

  const handleStatusChange = (id: string, newStatus: 'Pendente' | 'Em Andamento' | 'Concluído') => {
    onUpdateUserData({
      actionPlans: userData.actionPlans.map(p => p.id === id ? { ...p, status: newStatus } : p)
    });
  };

  // Extract list of years dynamically for filters
  const planYears = useMemo(() => {
    const years = new Set<string>();
    userData.actionPlans.forEach(p => {
      if (p.targetDate) {
        const y = p.targetDate.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [userData.actionPlans]);

  // Filter actions
  const filteredPlans = useMemo(() => {
    return userData.actionPlans.filter(p => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const planYear = p.targetDate ? p.targetDate.split('-')[0] : '';
      const matchesYear = filterYear === 'all' || planYear === filterYear;
      return matchesStatus && matchesYear;
    });
  }, [userData.actionPlans, filterStatus, filterYear]);

  // Summary Stats
  const goalStats = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    let pendingValue = 0;
    let completedValue = 0;

    userData.actionPlans.forEach(plan => {
      const val = typeof plan.value === 'number' && !isNaN(plan.value) ? plan.value : 0;
      if (plan.status === 'Concluído') {
        closedCount++;
        completedValue += val;
      } else {
        openCount++;
        pendingValue += val;
      }
    });

    return {
      openCount,
      closedCount,
      totalCount: openCount + closedCount,
      pendingValue,
      completedValue,
      totalValue: pendingValue + completedValue
    };
  }, [userData.actionPlans]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Objetivos</h2>
          <p className="text-xs text-slate-400">Defina metas de curto/médio prazo (comprar carro, fundo de reserva) e acompanhe seu progresso.</p>
        </div>
        <button
          onClick={() => {
            if (showAdd) {
              handleCancelEdit();
            } else {
              setShowAdd(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {editingPlanId ? 'Editar Objetivo' : 'Novo Objetivo'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Quantidade de Objetivos */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Target className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Total de Objetivos
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-400 font-mono">
              {goalStats.totalCount} {goalStats.totalCount === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Abertos
              </span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {goalStats.openCount}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Fechados
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {goalStats.closedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Valores Monetários */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Valores dos Objetivos
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-400 font-mono">
              R$ {goalStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Pendente
              </span>
              <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">
                R$ {goalStats.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Realizado
              </span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                R$ {goalStats.completedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              {editingPlanId ? 'Editar Objetivo' : 'Cadastrar Novo Objetivo'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Título do Objetivo</label>
                <input type="text" required placeholder="Ex: Fundo de Emergência de 6 meses" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Descrição / Plano Detalhado</label>
                <textarea placeholder="Como você pretende juntar esse dinheiro? Ex: Guardar 10% do salário." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white h-20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Valor Alvo (R$)</label>
                <input type="number" required placeholder="Ex: 15000,00" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Data Limite</label>
                <input type="date" required value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={handleCancelEdit} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900">Cancelar</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors">
                {editingPlanId ? 'Salvar Alterações' : 'Cadastrar Objetivo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4 bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Objetivos
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ano Alvo:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Anos</option>
              {planYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(filterStatus !== 'all' || filterYear !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setFilterYear('all');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400"
              title="Limpar filtros de objetivos"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Action cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.length === 0 ? (
          <div className="sm:col-span-3 text-center py-12 text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
            Nenhum plano de ação encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    plan.status === 'Concluído'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                      : plan.status === 'Em Andamento'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>{plan.status}</span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(plan)}
                      className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Editar Meta"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Excluir Meta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{plan.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{plan.description || 'Sem descrição cadastrada.'}</p>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Valor Alvo:</span>
                  <span className="text-slate-800 font-mono font-bold dark:text-white">R$ {plan.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Objetivo até:</span>
                  <span className="text-slate-700 font-mono font-medium dark:text-slate-300">
                    {plan.targetDate ? plan.targetDate.split('-').reverse().join('/') : '-'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg dark:bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                  {(['Pendente', 'Em Andamento', 'Concluído'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(plan.id, s)}
                      className={`flex-1 py-1 rounded text-center transition-all ${
                        plan.status === s
                          ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      {s.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ======================== DESEJOS ========================
export const DesejosPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const wishesList = userData.wishes || [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'Pendente' | 'Concluído'>('Pendente');

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !value) return;

    if (editingWishId) {
      onUpdateUserData({
        wishes: wishesList.map(w =>
          w.id === editingWishId
            ? { ...w, title, description, targetDate, value: parseFloat(value), status }
            : w
        )
      });
      setEditingWishId(null);
    } else {
      const newWish: Wish = {
        id: 'wish-' + Date.now(),
        title,
        description,
        targetDate,
        value: parseFloat(value),
        status
      };

      onUpdateUserData({
        wishes: [...wishesList, newWish]
      });
    }

    setTitle('');
    setDescription('');
    setTargetDate('');
    setValue('');
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleStartEdit = (wish: Wish) => {
    setEditingWishId(wish.id);
    setTitle(wish.title);
    setDescription(wish.description);
    setTargetDate(wish.targetDate);
    setValue(wish.value.toString());
    setStatus(wish.status);
    setShowAdd(true);
  };

  const handleCancelEdit = () => {
    setEditingWishId(null);
    setTitle('');
    setDescription('');
    setTargetDate('');
    setValue('');
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      wishes: wishesList.filter(w => w.id !== id)
    });
    if (editingWishId === id) {
      handleCancelEdit();
    }
  };

  const handleStatusChange = (id: string, newStatus: 'Pendente' | 'Concluído') => {
    onUpdateUserData({
      wishes: wishesList.map(w => w.id === id ? { ...w, status: newStatus } : w)
    });
  };

  // Extract list of years dynamically for filters
  const wishYears = useMemo(() => {
    const years = new Set<string>();
    wishesList.forEach(w => {
      if (w.targetDate) {
        const y = w.targetDate.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [wishesList]);

  // Filter wishes
  const filteredWishes = useMemo(() => {
    return wishesList.filter(w => {
      const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
      const wishYear = w.targetDate ? w.targetDate.split('-')[0] : '';
      const matchesYear = filterYear === 'all' || wishYear === filterYear;
      return matchesStatus && matchesYear;
    });
  }, [wishesList, filterStatus, filterYear]);

  // Summary Stats
  const wishStats = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    let pendingValue = 0;
    let completedValue = 0;

    wishesList.forEach(wish => {
      const val = typeof wish.value === 'number' && !isNaN(wish.value) ? wish.value : 0;
      if (wish.status === 'Concluído') {
        closedCount++;
        completedValue += val;
      } else {
        openCount++;
        pendingValue += val;
      }
    });

    return {
      openCount,
      closedCount,
      totalCount: openCount + closedCount,
      pendingValue,
      completedValue,
      totalValue: pendingValue + completedValue
    };
  }, [wishesList]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Desejos</h2>
          <p className="text-xs text-slate-400">Registre seus desejos e acompanhe o status de realização.</p>
        </div>
        <button
          onClick={() => {
            if (showAdd) {
              handleCancelEdit();
            } else {
              setShowAdd(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {editingWishId ? 'Editar Desejo' : 'Novo Desejo'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Quantidade de Desejos */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
                <Heart className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Total de Desejos
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-400 font-mono">
              {wishStats.totalCount} {wishStats.totalCount === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Pendentes
              </span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {wishStats.openCount}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Concluídos
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {wishStats.closedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Valores Monetários */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Valores dos Desejos
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-400 font-mono">
              R$ {wishStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Pendente
              </span>
              <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">
                R$ {wishStats.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg p-2.5">
              <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Realizado
              </span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                R$ {wishStats.completedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              {editingWishId ? 'Editar Desejo' : 'Cadastrar Novo Desejo'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Título do Desejo</label>
                <input type="text" required placeholder="Ex: Viagem para o Japão, Notebook novo" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Descrição / Detalhes</label>
                <textarea placeholder="Detalhes do desejo ou como pretende realizá-lo." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white h-20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Valor Alvo (R$)</label>
                <input type="number" required placeholder="Ex: 5000,00" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Data Limite</label>
                <input type="date" required value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                  <option value="Pendente">Pendente</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={handleCancelEdit} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900">Cancelar</button>
              <button type="submit" className="rounded-lg bg-pink-600 px-5 py-2 font-bold text-white hover:bg-pink-500 transition-colors">
                {editingWishId ? 'Salvar Alterações' : 'Cadastrar Desejo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4 bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Desejos
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ano Alvo:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Anos</option>
              {wishYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(filterStatus !== 'all' || filterYear !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setFilterYear('all');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400"
              title="Limpar filtros de desejos"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Wish cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredWishes.length === 0 ? (
          <div className="sm:col-span-3 text-center py-12 text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
            Nenhum desejo encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredWishes.map((wish) => (
            <div key={wish.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    wish.status === 'Concluído'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                  }`}>{wish.status}</span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(wish)}
                      className="text-slate-400 hover:text-pink-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Editar Desejo"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(wish.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Excluir Desejo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{wish.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{wish.description || 'Sem descrição cadastrada.'}</p>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Valor Alvo:</span>
                  <span className="text-slate-800 font-mono font-bold dark:text-white">R$ {wish.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Desejo até:</span>
                  <span className="text-slate-700 font-mono font-medium dark:text-slate-300">
                    {wish.targetDate ? wish.targetDate.split('-').reverse().join('/') : '-'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg dark:bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                  {(['Pendente', 'Concluído'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(wish.id, s)}
                      className={`flex-1 py-1 rounded text-center transition-all ${
                        wish.status === s
                          ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ======================== AÇÃO DE MELHORIA PAGE ========================
export const AcaoDeficitPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form Fields
  const [costCenter, setCostCenter] = useState('');
  const [reason, setReason] = useState('');
  const [correctionAction, setCorrectionAction] = useState('');
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluído'>('Pendente');

  const deficitActions = userData.deficitActions || [];

  // Initialize Cost Center to first category
  React.useEffect(() => {
    if (userData.expenseCategories && userData.expenseCategories.length > 0 && !costCenter) {
      setCostCenter(userData.expenseCategories[0]);
    }
  }, [userData.expenseCategories, costCenter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costCenter || !reason || !correctionAction || !responsible || !date) return;

    if (editingActionId) {
      onUpdateUserData({
        deficitActions: deficitActions.map(a =>
          a.id === editingActionId
            ? { ...a, costCenter, reason, correctionAction, responsible, date, status }
            : a
        )
      });
      setEditingActionId(null);
    } else {
      const newAction = {
        id: 'deficit-' + Date.now(),
        costCenter,
        reason,
        correctionAction,
        responsible,
        date,
        status
      };
      onUpdateUserData({
        deficitActions: [...deficitActions, newAction]
      });
    }

    setReason('');
    setCorrectionAction('');
    setResponsible('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleStartEdit = (action: any) => {
    setEditingActionId(action.id);
    setCostCenter(action.costCenter);
    setReason(action.reason);
    setCorrectionAction(action.correctionAction);
    setResponsible(action.responsible);
    setDate(action.date);
    setStatus(action.status);
    setShowAdd(true);
  };

  const handleCancelEdit = () => {
    setEditingActionId(null);
    setReason('');
    setCorrectionAction('');
    setResponsible('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('Pendente');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      deficitActions: deficitActions.filter(a => a.id !== id)
    });
    if (editingActionId === id) {
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Melhoria financeira</h2>
          <p className="text-xs text-slate-400">Crie ações corretivas para os centros de custos estourados para gerar aprendizados e melhorias.</p>
        </div>
        <button
          onClick={() => {
            if (showAdd) {
              handleCancelEdit();
            } else {
              setShowAdd(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {editingActionId ? 'Editar Ação' : 'Nova ação'}
        </button>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-500" />
            <span>Como Lançar Ações de melhoria</span>
          </div>
          <span className="text-slate-400">
            {showHelp ? 'Ocultar Ajuda ▲' : 'Ver Ajuda ▼'}
          </span>
        </button>
        {showHelp && (
          <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2 animate-fade-in">
            <p className="font-medium text-slate-700 dark:text-slate-300">As Ações de Melhoria (5W2H simplificado) servem para corrigir desvios quando despesas superam as previsões:</p>
            <ul className="list-decimal pl-4 space-y-1.5">
              <li>Clique em <strong className="text-slate-800 dark:text-white">Nova Ação</strong> no canto superior direito para abrir o formulário.</li>
              <li>Selecione o <strong className="text-slate-800 dark:text-white">Centro de Custo Ocorrido</strong> e digite o <strong className="text-slate-800 dark:text-white">Motivo do Desvio</strong> (por que o gasto ultrapassou o planejado).</li>
              <li>Descreva a <strong className="text-slate-800 dark:text-white">Ação Corretiva</strong> (o que será executado para conter ou corrigir isso).</li>
              <li>Defina o <strong className="text-slate-800 dark:text-white">Responsável</strong> pela ação, a <strong className="text-slate-800 dark:text-white">Data Limite de Conclusão</strong> e a <strong className="text-slate-800 dark:text-white">Situação da Ação</strong>.</li>
              <li>Clique em <strong className="text-emerald-600 dark:text-emerald-400">Salvar Ação</strong> para concluir.</li>
            </ul>
            <p className="mt-2 text-[11px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg">
              <strong>Finalidade Pedagógica:</strong> Este painel ajuda a registrar o plano de ação necessário para reverter déficits orçamentários pontuais e garantir que desvios não se repitam no próximo ciclo.
            </p>
          </div>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Centro de Custo Ocorrido</label>
            <select
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              {userData.expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Geral">Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Responsável</label>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Motivo do Estouro</label>
            <textarea
              required
              placeholder="Ex: Compra de materiais de escritório não planejada devido a quebra de equipamentos antigos."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white h-20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Ação de Correção (Aprendizado)</label>
            <textarea
              required
              placeholder="Ex: Revisar a política de manutenção e reservar uma margem de segurança no orçamento de TI."
              value={correctionAction}
              onChange={(e) => setCorrectionAction(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white h-20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Data de Identificação / Execução</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-500 transition-colors"
            >
              {editingActionId ? 'Salvar Alterações' : 'Cadastrar Ação'}
            </button>
          </div>
        </form>
      )}

      {/* List layout style rows (uma embaixo das outras estilo linhas) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">Centro de Custo</th>
              <th scope="col" className="px-6 py-3 text-left">Motivo</th>
              <th scope="col" className="px-6 py-3 text-left">Ação de Correção</th>
              <th scope="col" className="px-6 py-3 text-left">Responsável</th>
              <th scope="col" className="px-6 py-3 text-left">Data</th>
              <th scope="col" className="px-6 py-3 text-left">Status</th>
              <th scope="col" className="px-6 py-3 text-center w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {deficitActions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                  Nenhuma ação de melhoria cadastrada.
                </td>
              </tr>
            ) : (
              deficitActions.map((action) => (
                <tr key={action.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md dark:bg-red-950/40 dark:text-red-300 text-[11px]">
                      {action.costCenter}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={action.reason}>
                    {action.reason}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={action.correctionAction}>
                    {action.correctionAction}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                    {action.responsible}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                    {action.date ? action.date.split('-').reverse().join('/') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      action.status === 'Concluído'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : action.status === 'Em Andamento'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {action.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-slate-400">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(action)}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Editar Ação"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(action.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Excluir Ação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ======================== LISTA DE COMPRAS ========================
export const ListaDeComprasPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters State
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newItem: ShoppingItem = {
      id: 'shop-' + Date.now(),
      name,
      quantity: parseInt(quantity) || 1,
      price: parseFloat(price) || 0,
      category,
      checked: false,
      date
    };

    onUpdateUserData({
      shoppingList: [...userData.shoppingList, newItem]
    });

    setName('');
    setQuantity('1');
    setPrice('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAdd(false);
  };

  const handleToggleCheck = (id: string) => {
    onUpdateUserData({
      shoppingList: userData.shoppingList.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    });
  };

  const handleDelete = (id: string) => {
    onUpdateUserData({
      shoppingList: userData.shoppingList.filter(item => item.id !== id)
    });
  };

  const handleClearCompleted = () => {
    onUpdateUserData({
      shoppingList: userData.shoppingList.filter(item => !item.checked)
    });
  };

  // Extract years dynamically
  const shoppingYears = useMemo(() => {
    const years = new Set<string>();
    userData.shoppingList.forEach(item => {
      if (item.date) {
        const y = item.date.split('-')[0];
        if (y) years.add(y);
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [userData.shoppingList]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return userData.shoppingList.filter(item => {
      if (!item.date) {
        return filterMonth === 'all' && filterYear === 'all';
      }
      const parts = item.date.split('-');
      const y = parts[0];
      const m = (parseInt(parts[1], 10) - 1).toString();

      const matchesMonth = filterMonth === 'all' || m === filterMonth;
      const matchesYear = filterYear === 'all' || y === filterYear;
      return matchesMonth && matchesYear;
    });
  }, [userData.shoppingList, filterMonth, filterYear]);

  // List calculations based on filtered items
  const stats = useMemo(() => {
    const totalCost = filteredItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const checkedCost = filteredItems.filter(i => i.checked).reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const totalItems = filteredItems.length;
    const checkedItems = filteredItems.filter(i => i.checked).length;

    return { totalCost, checkedCost, totalItems, checkedItems };
  }, [filteredItems]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Lista de Compras</h2>
          <p className="text-xs text-slate-400">Monte suas listas de supermercado ou bens planejados e estime custos reais.</p>
        </div>
        <div className="flex gap-2">
          {stats.checkedItems > 0 && (
            <button
              onClick={handleClearCompleted}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20"
            >
              Limpar Comprados
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Item
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              Adicionar Novo Item à Lista de Compras
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Item / Nome</label>
                <input type="text" required placeholder="Ex: Arroz Integral 5kg" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Quantidade</label>
                <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Preço Estimado Unitário (R$)</label>
                <input type="number" step="0.01" placeholder="Ex: 19,90" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Setor / Categoria</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                  <option value="Alimentação">Alimentação</option>
                  <option value="Higiene">Higiene</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Casa">Casa</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400">Data de Planejamento</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900">Cancelar</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors">Adicionar na Lista</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4 bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Lista
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Mês:</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Meses</option>
              {monthsList.map((m, idx) => (
                <option key={m} value={idx.toString()}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ano:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos os Anos</option>
              {shoppingYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(filterMonth !== 'all' || filterYear !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterMonth('all');
                setFilterYear('all');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400"
              title="Limpar filtros da lista"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3 text-xs">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-slate-400 uppercase font-bold text-[9px]">Custo Estimado Total</span>
          <p className="text-lg font-bold text-slate-800 mt-0.5 dark:text-white font-mono">R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-slate-400 uppercase font-bold text-[9px]">Valor Já Adquirido</span>
          <p className="text-lg font-bold text-emerald-600 mt-0.5 font-mono">R$ {stats.checkedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-slate-400 uppercase font-bold text-[9px]">Progresso de Itens</span>
          <p className="text-lg font-bold text-slate-800 mt-0.5 dark:text-white font-mono">{stats.checkedItems} / {stats.totalItems} comprados</p>
        </div>
      </div>

      {/* Shopping Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <th className="pb-3.5 font-semibold w-10">Status</th>
                <th className="pb-3.5 font-semibold">Item</th>
                <th className="pb-3.5 font-semibold">Categoria</th>
                <th className="pb-3.5 font-semibold">Data Planej.</th>
                <th className="pb-3.5 font-semibold text-center">Quant.</th>
                <th className="pb-3.5 font-semibold text-right">Preço Est. Unit.</th>
                <th className="pb-3.5 font-semibold text-right">Subtotal</th>
                <th className="pb-3.5 font-semibold text-right w-12">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">Nenhum item encontrado para os filtros selecionados.</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const subtotal = item.price * item.quantity;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/20 ${item.checked ? 'opacity-60' : ''}`}>
                      <td className="py-3">
                        <button onClick={() => handleToggleCheck(item.id)} className="text-blue-600 hover:text-blue-800 p-1 rounded">
                          {item.checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-300" />}
                        </button>
                      </td>
                      <td className={`py-3 font-bold text-slate-800 dark:text-slate-200 ${item.checked ? 'line-through text-slate-400' : ''}`}>
                        {item.name}
                      </td>
                      <td className="py-3"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-[10px] dark:bg-slate-800 dark:text-slate-400">{item.category}</span></td>
                      <td className="py-3 font-mono text-slate-500 dark:text-slate-400">
                        {item.date ? item.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="py-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-3 text-right font-mono">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-800 dark:text-white">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======================== PLANEJAMENTO ANUAL ========================
export const PlanejamentoAnualPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showHelp, setShowHelp] = useState(false);
  const [activeMonthForDetails, setActiveMonthForDetails] = useState<number | null>(null);
  const [localCategoryBudgets, setLocalCategoryBudgets] = useState<{ [category: string]: string }>({});
  const [detailSuccess, setDetailSuccess] = useState(false);

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Load budgets for this year, create default array of 12 if not exists
  const currentPlanning = useMemo(() => {
    let yearPlan = userData.annualPlanning.find(p => p.year === selectedYear);
    if (!yearPlan) {
      yearPlan = {
        year: selectedYear,
        monthlyBudgets: Array.from({ length: 12 }, (_, idx) => ({
          month: idx,
          incomeBudget: 0,
          expenseBudget: 0,
          categoryBudgets: []
        }))
      };
    }
    return yearPlan;
  }, [userData.annualPlanning, selectedYear]);

  const handleBudgetChange = (monthIdx: number, field: 'incomeBudget' | 'expenseBudget', val: string) => {
    const floatVal = parseFloat(val) || 0;
    
    // Find if the selected year's record already exists in list
    const existingYearPlanIdx = userData.annualPlanning.findIndex(p => p.year === selectedYear);
    let updatedPlanningList = [...userData.annualPlanning];

    if (existingYearPlanIdx !== -1) {
      // Modifying existing year record
      const updatedBudgets = updatedPlanningList[existingYearPlanIdx].monthlyBudgets.map(b => {
        if (b.month === monthIdx) {
          return { ...b, [field]: floatVal };
        }
        return b;
      });
      updatedPlanningList[existingYearPlanIdx] = {
        ...updatedPlanningList[existingYearPlanIdx],
        monthlyBudgets: updatedBudgets
      };
    } else {
      // Adding new year record
      const defaultBudgets = Array.from({ length: 12 }, (_, idx) => ({
        month: idx,
        incomeBudget: idx === monthIdx ? (field === 'incomeBudget' ? floatVal : 0) : 0,
        expenseBudget: idx === monthIdx ? (field === 'expenseBudget' ? floatVal : 0) : 0,
        categoryBudgets: []
      }));
      updatedPlanningList.push({
        year: selectedYear,
        monthlyBudgets: defaultBudgets
      });
    }

    onUpdateUserData({
      annualPlanning: updatedPlanningList
    });
  };

  const copyPreviousMonthBudget = (monthIdx: number) => {
    const targetYear = monthIdx === 0 ? selectedYear - 1 : selectedYear;
    const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;

    const yearPlan = userData.annualPlanning.find(p => p.year === targetYear);
    if (!yearPlan) return;

    const prevMonthBudget = yearPlan.monthlyBudgets.find(b => b.month === prevMonthIdx);
    if (!prevMonthBudget || !prevMonthBudget.categoryBudgets || prevMonthBudget.categoryBudgets.length === 0) {
      return;
    }

    const copiedCategories = prevMonthBudget.categoryBudgets.filter(cb =>
      userData.expenseCategories.includes(cb.category)
    );

    if (copiedCategories.length === 0) return;

    const sum = copiedCategories.reduce((s, item) => s + item.budgetedValue, 0);

    const existingYearPlanIdx = userData.annualPlanning.findIndex(p => p.year === selectedYear);
    let updatedPlanningList = [...userData.annualPlanning];

    if (existingYearPlanIdx !== -1) {
      const updatedBudgets = updatedPlanningList[existingYearPlanIdx].monthlyBudgets.map(b => {
        if (b.month === monthIdx) {
          return {
            ...b,
            expenseBudget: sum,
            categoryBudgets: copiedCategories
          };
        }
        return b;
      });
      updatedPlanningList[existingYearPlanIdx] = {
        ...updatedPlanningList[existingYearPlanIdx],
        monthlyBudgets: updatedBudgets
      };
    } else {
      const defaultBudgets = Array.from({ length: 12 }, (_, idx) => {
        if (idx === monthIdx) {
          return {
            month: idx,
            incomeBudget: 0,
            expenseBudget: sum,
            categoryBudgets: copiedCategories
          };
        }
        return {
          month: idx,
          incomeBudget: 0,
          expenseBudget: 0,
          categoryBudgets: []
        };
      });
      updatedPlanningList.push({
        year: selectedYear,
        monthlyBudgets: defaultBudgets
      });
    }

    onUpdateUserData({
      annualPlanning: updatedPlanningList
    });
  };

  const openDetailedBudget = (monthIdx: number) => {
    const monthBudget = currentPlanning.monthlyBudgets.find(b => b.month === monthIdx);
    const existingDetails = monthBudget?.categoryBudgets || [];
    
    const initialVals: { [category: string]: string } = {};
    userData.expenseCategories.forEach(cat => {
      const found = existingDetails.find(db => db.category === cat);
      initialVals[cat] = found ? String(found.budgetedValue) : '';
    });
    
    setLocalCategoryBudgets(initialVals);
    setActiveMonthForDetails(monthIdx);
  };

  const handleLocalCategoryValueChange = (cat: string, val: string) => {
    setLocalCategoryBudgets(prev => ({
      ...prev,
      [cat]: val
    }));
  };

  const saveDetailedBudget = () => {
    if (activeMonthForDetails === null) return;
    
    const list: { category: string; budgetedValue: number }[] = [];
    let sum = 0;
    
    userData.expenseCategories.forEach(cat => {
      const rawVal = localCategoryBudgets[cat];
      const val = parseFloat(rawVal) || 0;
      if (val > 0) {
        list.push({ category: cat, budgetedValue: val });
        sum += val;
      }
    });

    // We will update the annualPlanning list
    const existingYearPlanIdx = userData.annualPlanning.findIndex(p => p.year === selectedYear);
    let updatedPlanningList = [...userData.annualPlanning];

    if (existingYearPlanIdx !== -1) {
      const updatedBudgets = updatedPlanningList[existingYearPlanIdx].monthlyBudgets.map(b => {
        if (b.month === activeMonthForDetails) {
          return {
            ...b,
            expenseBudget: sum, // update total expense budget automatically to the sum!
            categoryBudgets: list
          };
        }
        return b;
      });
      updatedPlanningList[existingYearPlanIdx] = {
        ...updatedPlanningList[existingYearPlanIdx],
        monthlyBudgets: updatedBudgets
      };
    } else {
      const defaultBudgets = Array.from({ length: 12 }, (_, idx) => {
        if (idx === activeMonthForDetails) {
          return {
            month: idx,
            incomeBudget: 0,
            expenseBudget: sum,
            categoryBudgets: list
          };
        }
        return {
          month: idx,
          incomeBudget: 0,
          expenseBudget: 0,
          categoryBudgets: []
        };
      });
      updatedPlanningList.push({
        year: selectedYear,
        monthlyBudgets: defaultBudgets
      });
    }

    onUpdateUserData({
      annualPlanning: updatedPlanningList
    });

    setDetailSuccess(true);
    setTimeout(() => {
      setDetailSuccess(false);
      setActiveMonthForDetails(null);
    }, 1500);
  };

  // Calculate live sum in detailed budget screen
  const liveTotalBudgeted = useMemo(() => {
    let sum = 0;
    userData.expenseCategories.forEach(cat => {
      sum += parseFloat(localCategoryBudgets[cat]) || 0;
    });
    return sum;
  }, [localCategoryBudgets, userData.expenseCategories]);

  if (activeMonthForDetails !== null) {
    const monthName = monthsList[activeMonthForDetails];
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveMonthForDetails(null)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Orçamento Detalhado</h2>
              <p className="text-xs text-slate-400">{monthName} de {selectedYear} • Planejamento de Despesas</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Orçado</div>
            <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
              R$ {liveTotalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Definir Orçamento por Despesa Cadastrada</h3>
            <p className="text-xs text-slate-400 mt-1">Preencha o valor planejado para cada despesa. Itens zerados ou vazios não serão contabilizados.</p>
          </div>

          {userData.expenseCategories.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Sliders className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma despesa ou categoria de despesa cadastrada no sistema.</p>
              <p className="text-[10px] text-slate-400 mt-1">Cadastre categorias de despesa na tela de Lançamento de Despesas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[450px] overflow-y-auto pr-2 space-y-3 pt-1">
              {userData.expenseCategories.map((cat, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:w-48 shrink-0">
                    <span className="text-xs text-slate-400 font-bold uppercase shrink-0">Orçado:</span>
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        placeholder="0,00"
                        value={localCategoryBudgets[cat] || ''}
                        onChange={(e) => handleLocalCategoryValueChange(cat, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 font-mono text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveMonthForDetails(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={saveDetailedBudget}
              disabled={detailSuccess}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all shadow-sm ${
                detailSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {detailSuccess ? (
                <>
                  <Check className="h-4 w-4 animate-scale-up" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Salvar Orçamento
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Planejamento Anual</h2>
        <p className="text-xs text-slate-400 mt-1">Defina suas metas de ganho e teto máximo de gastos para cada mês do ano.</p>
      </div>

      {/* Centered Year Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-3.5 px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm text-center">
        <label className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
          Escolha o ano:
        </label>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner"
          >
            {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelectedYear(new Date().getFullYear())}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-red-300 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors dark:bg-slate-950 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="Limpar filtro (voltar para o ano atual)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-500" />
            <span>Como Configurar o Planejamento Anual</span>
          </div>
          <span className="text-slate-400">
            {showHelp ? 'Ocultar Ajuda ▲' : 'Ver Ajuda ▼'}
          </span>
        </button>
        {showHelp && (
          <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 animate-fade-in">
            <p className="font-medium text-slate-700 dark:text-slate-200">Siga estes passos simples para estruturar seu orçamento anual:</p>
            <ul className="list-decimal pl-4 space-y-1.5">
              <li>No filtro central, selecione o <strong className="text-slate-800 dark:text-white">ano de exercício</strong> desejado.</li>
              <li>Na seção de limites mensais, estipule sua <strong className="text-slate-800 dark:text-white">Receita estimativa (R$)</strong> e seu limite máximo de <strong className="text-slate-800 dark:text-white">Despesa Orçada</strong> para cada mês do ano.</li>
              <li>Para detalhar despesas específicas de forma granular por categoria, utilize o botão <strong className="text-slate-800 dark:text-white">Orçar por Categoria</strong> destacado abaixo. Ele permite que você associe limites de gastos individuais para cada uma das suas categorias cadastradas.</li>
              <li>Sempre clique em <strong className="text-blue-600 dark:text-blue-400">Salvar Planejamento</strong> após realizar ajustes gerais ou detalhados.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Definição de Limites por Mês</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {monthsList.map((m, idx) => {
            const currentBudget = currentPlanning.monthlyBudgets.find(b => b.month === idx) || { incomeBudget: 0, expenseBudget: 0, categoryBudgets: [] };
            const monthRealIncome = userData.incomes
              .filter(inc => {
                if (!inc.date) return false;
                const parts = inc.date.split('-');
                if (parts.length >= 2) {
                  const y = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  return y === selectedYear && m === idx;
                }
                return false;
              })
              .reduce((sum, item) => sum + item.value, 0);

            const hasDetailedBudgets = currentBudget.categoryBudgets && currentBudget.categoryBudgets.length > 0;
            const detailedSum = hasDetailedBudgets
              ? currentBudget.categoryBudgets.reduce((sum, item) => sum + item.budgetedValue, 0)
              : 0;

            return (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 text-xs sm:text-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase border-b border-slate-200/60 pb-1.5 mb-2.5 dark:border-slate-800/60">{m}</div>
                  
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Receita estimativa (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${monthRealIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        disabled={true}
                        className="w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-600 bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        title="Preenchido automaticamente com o total de receitas reais do mês"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Orçado mensal (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${detailedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        disabled={true}
                        className="w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-600 bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        title="Calculado a partir do orçamento detalhado"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 mt-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {currentBudget.categoryBudgets && currentBudget.categoryBudgets.length > 0
                        ? `${currentBudget.categoryBudgets.length} categoria(s)`
                        : 'Nenhum detalhe'}
                    </span>
                    <button
                      onClick={() => openDetailedBudget(idx)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow shadow-blue-500/20 transition-all shrink-0 hover:scale-105"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Orçar por categoria
                    </button>
                  </div>
                  <button
                    onClick={() => copyPreviousMonthBudget(idx)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700/80"
                    title={idx === 0 ? "Copiar do Dezembro do ano anterior" : "Copiar do mês anterior"}
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    Copiar do mês anterior
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ======================== CUSTOM CONFIGURATIONS (SUBMENUS) ========================
export const ListManagerPage: React.FC<{
  title: string;
  description: string;
  items: string[];
  placeholder: string;
  onUpdateItems: (newItems: string[]) => void;
  onRenameItem?: (oldVal: string, newVal: string) => void;
}> = ({ title, description, items, placeholder, onUpdateItems, onRenameItem }) => {
  const [newVal, setNewVal] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVal.trim()) return;
    if (items.includes(newVal.trim())) {
      alert('Este item já está cadastrado.');
      return;
    }
    onUpdateItems([...items, newVal.trim()]);
    setNewVal('');
  };

  const handleDelete = (itemToDelete: string) => {
    onUpdateItems(items.filter(item => item !== itemToDelete));
  };

  const handleSaveEdit = (oldVal: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (trimmed === oldVal) {
      setEditingItem(null);
      return;
    }
    if (items.includes(trimmed)) {
      alert('Este item já está cadastrado.');
      return;
    }
    if (onRenameItem) {
      onRenameItem(oldVal, trimmed);
    } else {
      onUpdateItems(items.map(item => item === oldVal ? trimmed : item));
    }
    setEditingItem(null);
    setEditValue('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
        <p className="text-xs text-slate-400">{description}</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 text-xs">
        <input
          type="text"
          required
          placeholder={placeholder}
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 font-bold transition-colors shrink-0"
        >
          Adicionar
        </button>
      </form>

      {/* Items list */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs">
        <h3 className="font-bold text-slate-400 mb-3 uppercase tracking-wider text-[10px]">Opções Cadastradas ({items.length})</h3>
        {items.length === 0 ? (
          <p className="text-slate-400 py-4 text-center">Nenhuma opção cadastrada.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item} className="flex items-center justify-between py-2.5 font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]">
                {editingItem === item ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEdit(item);
                    }}
                    className="flex-1 flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingItem(null);
                      }}
                    />
                    <button
                      type="submit"
                      className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Salvar"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{item}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditValue(item);
                        }}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ======================== DADOS PESSOAIS PAGE ========================
export const DadosPessoaisPage: React.FC<PageProps & { onLogout?: () => void }> = ({ userProfile, onUpdateUserProfile, onLogout }) => {
  const [name, setName] = useState(userProfile.name);
  const [address, setAddress] = useState(userProfile.address || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [state, setState] = useState(userProfile.state || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [cpf, setCpf] = useState(userProfile.cpf || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Accordion open/closed states
  const [isPasswordAccordionOpen, setIsPasswordAccordionOpen] = useState(false);
  const [isDeleteAccordionOpen, setIsDeleteAccordionOpen] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Mudar senha states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userProfile.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir a conta.');

      setShowDeleteConfirmModal(false);
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir a conta.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('A nova senha e a confirmação não conferem.');
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userProfile.email,
          oldPassword,
          newPassword
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar a senha.');

      setPasswordSuccess('Senha alterada com sucesso!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao alterar a senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userProfile.email
        },
        body: JSON.stringify({ name, address, phone, city, state, cpf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdateUserProfile(name, address, phone, city, state, data.user.cpf);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar dados cadastrais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800 text-center space-y-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Dados Cadastrais e Pessoais</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie suas informações de contato e faturamento para relatórios personalizados.</p>
        </div>
        {onLogout && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 px-5 py-2.5 text-sm font-bold transition-colors border border-red-200/60 dark:border-red-900/50 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 text-sm">
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 font-semibold text-center text-sm">
            ✓ Informações atualizadas com sucesso no banco de dados!
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">E-mail de Cadastro (Id da Conta)</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="email"
              disabled
              value={userProfile.email}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-3.5 text-sm text-slate-600 font-mono focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">E-mail utilizado no login. Não pode ser alterado por segurança.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Nome Completo</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Phone className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Ex: (11) 98888-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">CPF</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Ex: 123.456.789-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Endereço Completo</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <MapPin className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Ex: Rua das Palmeiras, 100"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Paulo"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Estado</label>
            <input
              type="text"
              placeholder="Ex: SP"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm sm:text-base font-extrabold text-white shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Atualizar Meus Dados'}
          </button>
        </div>
      </form>

      {/* Mudar Senha Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div 
          onClick={() => setIsPasswordAccordionOpen(!isPasswordAccordionOpen)}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Alterar Senha de Acesso
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Para sua segurança, escolha uma senha forte e não a compartilhe com terceiros.</p>
          </div>
          <div>
            {isPasswordAccordionOpen ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>

        {isPasswordAccordionOpen && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800/60 space-y-4 animate-slide-down">
            {passwordSuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 font-semibold text-center text-sm animate-fade-in">
                ✓ {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 text-rose-800 p-3 font-semibold text-center text-sm animate-fade-in">
                ✗ {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Senha Atual</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    title={showOldPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Nova Senha</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Confirmar Nova Senha</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Check className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      title={showConfirmNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-sm sm:text-base text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                {passwordLoading ? 'Alterando...' : 'Confirmar Nova Senha'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Excluir Conta Accordion Card */}
      <div className="rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-950/40 dark:bg-slate-900 overflow-hidden">
        <div 
          onClick={() => setIsDeleteAccordionOpen(!isDeleteAccordionOpen)}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-red-50/20 dark:hover:bg-red-950/10 transition-colors"
        >
          <div>
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Excluir Conta
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Remover completamente seu acesso e limpar seus dados.</p>
          </div>
          <div>
            {isDeleteAccordionOpen ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>

        {isDeleteAccordionOpen && (
          <div className="p-5 border-t border-red-100 dark:border-red-950/20 space-y-4 animate-slide-down text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
              Ao excluir sua conta, todos os seus dados pessoais, receitas, despesas, planejamentos, metas e configurações serão apagados permanentemente e **não será possível recuperá-los** de forma alguma.
            </p>

            {deleteError && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 text-rose-800 p-3 font-semibold text-center text-sm max-w-md mx-auto">
                ✗ {deleteError}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteConfirmModal(true)}
              className="px-6 py-3 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-500 transition-colors inline-flex items-center gap-2 shadow-md shadow-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Minha Conta
            </button>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Confirmar Exclusão de Conta</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Atenção: Este comando excluirá por completo a conta toda, sem ter como retornar com os dados e nem restituição de valores pagos. Deseja prosseguir com a exclusão?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                {deleteLoading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

