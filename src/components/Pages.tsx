import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserData, Income, Expense, ActionPlan, ShoppingItem, UserProfile, Wish } from '../types';
import { Plus, Trash2, Pencil, Check, X, Calendar, Search, Filter, CheckSquare, Square, DollarSign, Wallet, CreditCard, Tag, User, MapPin, Phone, Mail, Sparkles, TrendingUp, TrendingDown, Sliders, ArrowLeft, ArrowRight, AlertTriangle, Copy, Lock, KeyRound, ChevronDown, ChevronUp, LogOut, Eye, EyeOff, Target, CheckCircle2, Clock, Heart } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MonthlyExpenseTrendChart } from './CustomChart';

export interface PageProps {
  userData: UserData;
  userProfile: UserProfile;
  onUpdateUserData: (newData: Partial<UserData>) => void;
  onUpdateUserProfile: (name: string, address: string, phone: string, city?: string, state?: string, cpf?: string) => void;
  onNavigate?: (page: string, options?: { openAddExpense?: boolean; category?: string }) => void;
  initialShowAddForm?: boolean;
  initialCategory?: string;
  onClearInitialAdd?: () => void;
}

// ======================== BRAZILIAN CURRENCY FORMATTERS ========================
// Automatic thousand separators (.) and decimal comma (,) e.g. 1.500,00
export const parsePtBrNumber = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return 0;

  // 1. Se contém vírgula, a vírgula é o separador decimal oficial brasileiro (ex: 1.500,50 ou 1500,50)
  if (str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    return parseFloat(clean) || 0;
  }

  // 2. Se contém ponto: verificar se é separador de milhar (ex: 1.000, 1.500, 10.000, 1.000.000)
  if (str.includes('.')) {
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    // Se o último bloco tem exatamente 3 dígitos e temos múltiplos blocos, é separador de milhar
    if (lastPart.length === 3 && parts.length >= 2) {
      const clean = str.replace(/\./g, '').replace(/[^\d]/g, '');
      return parseFloat(clean) || 0;
    }
    // Se tem apenas 2 blocos e o último tem 1 ou 2 dígitos (ex: 15.5 ou 1500.50 colado de teclado US), trata como decimal
    if (lastPart.length <= 2 && parts.length === 2) {
      const clean = str.replace(/[^\d.]/g, '');
      return parseFloat(clean) || 0;
    }
    // Caso padrão com pontos: remove pontos de milhar
    const clean = str.replace(/\./g, '').replace(/[^\d]/g, '');
    return parseFloat(clean) || 0;
  }

  // 3. Apenas dígitos inteiros
  const clean = str.replace(/[^\d]/g, '');
  return parseFloat(clean) || 0;
};

export const formatPtBrCurrency = (val: number): string => {
  if (!val || val === 0) return '';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatPtBrLiveInput = (raw: string): string => {
  if (!raw) return '';
  const val = raw.trim();
  if (!val) return '';

  // 1. Se o valor contém vírgula (separador decimal brasileiro)
  if (val.includes(',')) {
    const [intStr, ...rest] = val.split(',');
    const decStr = rest.join('').replace(/\D/g, '').slice(0, 2);
    const digitsInt = intStr.replace(/\D/g, '');
    const formattedInt = digitsInt ? parseInt(digitsInt, 10).toLocaleString('pt-BR') : '0';
    if (val.endsWith(',') && decStr.length === 0) {
      return `${formattedInt},`;
    }
    return decStr.length > 0 ? `${formattedInt},${decStr}` : `${formattedInt},`;
  }

  // 2. Se o usuário acabou de digitar um ponto no final (separador de milhar), mantém o ponto
  // sem converter erroneamente para vírgula, permitindo digitar 1.000 ou 1.500
  if (val.endsWith('.')) {
    const digitsInt = val.replace(/\D/g, '');
    if (!digitsInt) return '';
    const formattedInt = parseInt(digitsInt, 10).toLocaleString('pt-BR');
    return `${formattedInt}.`;
  }

  // 3. Formatação automática de milhar com ponto para números inteiros (ex: 1000 -> 1.000)
  const digitsOnly = val.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return parseInt(digitsOnly, 10).toLocaleString('pt-BR');
};

export const getNextMonthDate = (baseDateStr: string, monthsToAdd: number): string => {
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

// ======================== REUSABLE HELP ACCORDION CARD ========================
// Posicionado como último conteúdo da página lá em baixo de tudo.
// Ao clicar para expandir, rola suavemente a tela para centralizar todo o conteúdo.
// Ao rolar a tela pra cima, ele se oculta automaticamente.
export interface HelpCardProps {
  title: string;
  icon?: React.ReactNode;
  accentColor?: 'blue' | 'rose' | 'emerald' | 'amber' | 'indigo';
  children: React.ReactNode;
  badge?: string;
}

export const HelpCard: React.FC<HelpCardProps> = ({
  title,
  icon,
  accentColor = 'blue',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      const scrollToCenter = () => {
        if (!cardRef.current) return;
        const container = (cardRef.current.closest('.overflow-y-auto') as HTMLElement | null) ||
                          (document.querySelector('main .overflow-y-auto') as HTMLElement | null);
        if (container) {
          const cardRect = cardRef.current.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop = cardRect.top - containerRect.top;
          const targetScroll = container.scrollTop + relativeTop - (container.clientHeight / 2) + (cardRect.height / 2);
          container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        } else {
          cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
      setTimeout(scrollToCenter, 100);
      setTimeout(scrollToCenter, 280);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isOpeningPeriod = true;
    const graceTimer = setTimeout(() => {
      isOpeningPeriod = false;
    }, 600);

    const getScrollContainer = () => {
      return (cardRef.current?.closest('.overflow-y-auto') as HTMLElement | null) ||
             (document.querySelector('main .overflow-y-auto') as HTMLElement | null);
    };

    const getScrollPos = () => {
      const container = getScrollContainer();
      if (container) return container.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    let lastScrollY = getScrollPos();
    let touchStartY = 0;

    const handleScroll = () => {
      if (isOpeningPeriod) return;
      const currentScroll = getScrollPos();
      if (lastScrollY === -1) {
        lastScrollY = currentScroll;
        return;
      }

      // Ao rolar a tela pra cima (currentScroll diminui), fecha o card
      if (lastScrollY - currentScroll > 15) {
        setIsOpen(false);
      } else if (currentScroll > lastScrollY) {
        lastScrollY = currentScroll;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isOpeningPeriod) return;
      // Rolar a tela pra cima (deltaY negativo)
      if (e.deltaY < -10) {
        setIsOpen(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isOpeningPeriod) return;
      if (e.touches.length > 0) {
        const currentTouchY = e.touches[0].clientY;
        // Puxar o dedo para baixo movimenta a página para cima
        if (currentTouchY - touchStartY > 20) {
          setIsOpen(false);
        }
      }
    };

    const container = getScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      container.addEventListener('wheel', handleWheel, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
    }

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      clearTimeout(graceTimer);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  const colorStyles = {
    blue: {
      icon: 'text-blue-500',
      hover: 'hover:text-blue-600 dark:hover:text-blue-400',
      badge: 'text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/50',
      chevron: 'text-blue-500',
    },
    rose: {
      icon: 'text-rose-500',
      hover: 'hover:text-rose-600 dark:hover:text-rose-400',
      badge: 'text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/50',
      chevron: 'text-rose-500',
    },
    emerald: {
      icon: 'text-emerald-500',
      hover: 'hover:text-emerald-600 dark:hover:text-emerald-400',
      badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50',
      chevron: 'text-emerald-500',
    },
    indigo: {
      icon: 'text-indigo-500',
      hover: 'hover:text-indigo-600 dark:hover:text-indigo-400',
      badge: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/50',
      chevron: 'text-indigo-500',
    },
    amber: {
      icon: 'text-amber-500',
      hover: 'hover:text-amber-600 dark:hover:text-amber-400',
      badge: 'text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50',
      chevron: 'text-amber-500',
    },
  }[accentColor];

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden transition-all shadow-xs mt-6 mb-8"
    >
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-4 text-left font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 ${colorStyles.hover} transition-colors focus:outline-none cursor-pointer`}
      >
        <div className="flex items-center gap-2">
          {icon || <Sliders className={`h-4 w-4 ${colorStyles.icon}`} />}
          <span>{title}</span>
          {isOpen && (
            <span className={`text-[10px] ${colorStyles.badge} px-2 py-0.5 rounded-full font-medium`}>
              Aberto
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-xs">
            {isOpen ? 'Ocultar Ajuda' : 'Ver Ajuda'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              isOpen ? `rotate-180 ${colorStyles.chevron}` : 'rotate-0'
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ======================== RECEITAS PAGE ========================
export const ReceitasPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');

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

  const [paymentType, setPaymentType] = useState('');
  const [status, setStatus] = useState('');
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
    if (!date || !description || !value || !category || !paymentType || !status) return;
    const numValue = parsePtBrNumber(value);
    if (numValue <= 0) return;

    if (editingIncomeId) {
      // Edit mode
      const updatedIncomes = userData.incomes.map(inc => {
        if (inc.id === editingIncomeId) {
          return {
            ...inc,
            date,
            description,
            value: numValue,
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
        value: numValue,
        category,
        paymentType,
        status
      };

      onUpdateUserData({
        incomes: [newIncome, ...userData.incomes]
      });
    }

    const savedDate = date;
    setDate('');
    setDescription('');
    setValue('');
    setCategory('');
    setPaymentType('');
    setStatus('');
    setShowAddForm(false);
    
    // Automatically switch to the month of the added/edited income to let the user see it!
    if (savedDate.length >= 7) {
      setSelectedMonth(savedDate.substring(0, 7));
    }
  };

  const handleEditStart = (inc: Income) => {
    setEditingIncomeId(inc.id);
    setDate(inc.date);
    setDescription(inc.description);
    setValue(formatPtBrCurrency(inc.value));
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
                setDate('');
                setDescription('');
                setValue('');
                setCategory('');
                setPaymentType('');
                setStatus('');
              } else {
                setShowAddForm(true);
                setEditingIncomeId(null);
                setDate('');
                setDescription('');
                setValue('');
                setCategory('');
                setPaymentType('');
                setStatus('');
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



      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
              onClick={() => {
                setShowAddForm(false);
                setEditingIncomeId(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[88vh] overflow-hidden cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header fixo no topo do popup */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Plus className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                        {editingIncomeId ? 'Editar Registro de Receita' : 'Novo Registro de Receita'}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {editingIncomeId ? 'Modifique os dados da receita selecionada' : 'Preencha os campos para registrar uma nova entrada financeira'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingIncomeId && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded font-bold dark:bg-amber-950/30">
                        Modo de Edição
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingIncomeId(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Corpo do formulário com scroll interno customizado */}
                <form id="form-receitas-modal" onSubmit={handleAdd} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
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
                      <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="0,00"
                          value={value}
                          onChange={(e) => setValue(formatPtBrLiveInput(e.target.value))}
                          onBlur={() => {
                            if (value && value.trim()) {
                              const num = parsePtBrNumber(value);
                              if (num > 0) {
                                setValue(formatPtBrCurrency(num));
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                        />
                      </div>
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
                      <select required value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione a categoria...</option>
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
                      <select required value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione o tipo...</option>
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
                      <select required value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione a situação...</option>
                        {receiptStatusesList.map(ps => (
                          <option key={ps} value={ps}>{ps}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>

                {/* Rodapé com botões de ação fixo no rodapé do modal */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingIncomeId(null);
                      setDate('');
                      setDescription('');
                      setValue('');
                      setCategory('');
                      setPaymentType('');
                      setStatus('');
                      setShowManageCategories(false);
                      setShowManageReceiptTypes(false);
                      setShowManageReceiptStatuses(false);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-receitas-modal"
                    className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
                  >
                    {editingIncomeId ? 'Atualizar Registro' : 'Salvar Registro'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    {/* Manage Categories Popup Modal */}
    {showManageCategories && (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManageCategories(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Categoria"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManageReceiptTypes(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReceiptType(pt);
                            setEditReceiptTypeValue(pt);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Tipo de Recebimento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceiptType(pt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManageReceiptStatuses(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReceiptStatus(ps);
                            setEditReceiptStatusValue(ps);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Situação de Recebimento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceiptStatus(ps)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
                <th className="py-3.5 px-1.5 font-semibold whitespace-nowrap w-[68px]">Data</th>
                <th className="py-3.5 px-3 font-semibold w-[180px] min-w-[165px] max-w-[220px]">Descrição</th>
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
                    <td className="py-3.5 px-1.5 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-nowrap w-[68px]">
                      {formatShortDate(inc.date)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-100 text-sm w-[180px] min-w-[165px] max-w-[220px] break-words whitespace-normal leading-snug">
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Lançar Receitas"
        accentColor="blue"
        icon={<Sliders className="h-4 w-4 text-blue-500" />}
      >
        <div className="space-y-2">
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
      </HelpCard>
    </div>
  );
};

// ======================== DESPESAS PAGE ========================
export const DespesasPage: React.FC<PageProps> = ({ 
  userData, 
  onUpdateUserData,
  initialShowAddForm,
  initialCategory,
  onClearInitialAdd
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [category, setCategory] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [status, setStatus] = useState('');
  const [classification, setClassification] = useState<string>('');
  const [search, setSearch] = useState('');

  // Abertura automática quando acionado via botão Novo Lançamento em outras telas (ex: Resumo Mensal)
  useEffect(() => {
    if (initialShowAddForm) {
      setShowAddForm(true);
      if (initialCategory) {
        setCategory(initialCategory);
      }
      onClearInitialAdd?.();
    }
  }, [initialShowAddForm, initialCategory, onClearInitialAdd]);

  useEffect(() => {
    const handleOpenAddExpense = (e: Event) => {
      const customEvent = e as CustomEvent<{ category?: string }>;
      setShowAddForm(true);
      if (customEvent.detail?.category) {
        setCategory(customEvent.detail.category);
      }
    };

    try {
      const flag = localStorage.getItem('finanfly_auto_open_add_expense');
      if (flag) {
        localStorage.removeItem('finanfly_auto_open_add_expense');
        setShowAddForm(true);
        if (flag !== 'true') {
          setCategory(flag);
        }
      }
    } catch {}

    window.addEventListener('finanfly-open-new-expense', handleOpenAddExpense);
    return () => {
      window.removeEventListener('finanfly-open-new-expense', handleOpenAddExpense);
    };
  }, []);

  // Listas suspensas ordenadas em ordem crescente alfabética (A para Z)
  const sortedExpenseCategories = useMemo(() => {
    return [...(userData.expenseCategories || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.expenseCategories]);

  const sortedPaymentTypes = useMemo(() => {
    return [...(userData.paymentTypes || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.paymentTypes]);

  const sortedPaymentStatuses = useMemo(() => {
    return [...(userData.paymentStatuses || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.paymentStatuses]);

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

  // Travar rolagem do body e fechar com ESC quando o formulário de despesa estiver aberto
  useEffect(() => {
    if (showAddForm) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowAddForm(false);
          setEditingExpenseId(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showAddForm]);

  const currentMonthYearStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description || !value || !category || !paymentType || !status || !classification) return;
    const parsedVal = parsePtBrNumber(value);
    if (parsedVal <= 0) return;

    if (editingExpenseId) {
      // Edit mode
      const updatedExpenses = userData.expenses.map(exp => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            date,
            description,
            value: parsedVal,
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

    setDate('');
    setDescription('');
    setValue('');
    setCategory('');
    setPaymentType('');
    setStatus('');
    setClassification('');
    setInstallments(1);
    setShowAddForm(false);
  };

  const handleEditStart = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setDate(exp.date);
    setDescription(exp.description);
    setValue(formatPtBrCurrency(exp.value));
    setCategory(exp.category);
    setPaymentType(exp.paymentType);
    setStatus(exp.status);
    setClassification((exp.classification as any) || 'Fixo');
    setShowAddForm(true);
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

      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;

      if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;

      return true;
    });
  }, [userData.expenses, search, selectedMonth, selectedYear, selectedCategory, selectedStatus]);

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
                setDate('');
                setDescription('');
                setValue('');
                setCategory('');
                setPaymentType('');
                setStatus('');
                setClassification('');
                setInstallments(1);
              } else {
                setShowAddForm(true);
                setEditingExpenseId(null);
                setDate('');
                setDescription('');
                setValue('');
                setCategory('');
                setPaymentType('');
                setStatus('');
                setClassification('');
                setInstallments(1);
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



      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
              onClick={() => {
                setShowAddForm(false);
                setEditingExpenseId(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[88vh] overflow-hidden cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header fixo no topo do popup */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <Plus className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                        {editingExpenseId ? 'Editar Registro de Despesa' : 'Novo Registro de Despesa'}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {editingExpenseId ? 'Modifique os dados do lançamento selecionado' : 'Preencha os campos para registrar uma saída financeira'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingExpenseId && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded font-bold dark:bg-amber-950/30">
                        Modo de Edição
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingExpenseId(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Fechar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Corpo do formulário com scroll interno customizado */}
                <form id="form-despesas-modal" onSubmit={handleAdd} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
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
                      <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="0,00"
                          value={value}
                          onChange={(e) => setValue(formatPtBrLiveInput(e.target.value))}
                          onBlur={() => {
                            if (value && value.trim()) {
                              const num = parsePtBrNumber(value);
                              if (num > 0) {
                                setValue(formatPtBrCurrency(num));
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                        />
                      </div>
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
                      <select required value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione a categoria da despesa...</option>
                        {sortedExpenseCategories.map(cat => (
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
                      <select required value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione o tipo de pagamento...</option>
                        {sortedPaymentTypes.map(pt => (
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
                      <select required value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <option value="" disabled>Selecione a situação...</option>
                        {sortedPaymentStatuses.map(ps => (
                          <option key={ps} value={ps}>{ps}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Classificação de Despesa</label>
                      <select
                        required
                        value={classification}
                        onChange={(e) => setClassification(e.target.value as 'Fixo' | 'Variável' | 'Eventual')}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="" disabled>Selecione a classificação...</option>
                        <option value="Fixo">Fixo</option>
                        <option value="Variável">Variável</option>
                        <option value="Eventual">Eventual</option>
                      </select>
                    </div>
                  </div>
                </form>

                {/* Rodapé com botões de ação fixo no rodapé do modal */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingExpenseId(null);
                      setDate('');
                      setDescription('');
                      setValue('');
                      setCategory('');
                      setPaymentType('');
                      setStatus('');
                      setClassification('');
                      setInstallments(1);
                      setShowManageCategories(false);
                      setShowManagePaymentTypes(false);
                      setShowManagePaymentStatuses(false);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-despesas-modal"
                    className="rounded-lg bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-500 transition-colors shadow-sm shadow-rose-600/20 cursor-pointer"
                  >
                    {editingExpenseId ? 'Atualizar Registro' : 'Salvar Registro'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    {/* Manage Categories Popup Modal */}
    {showManageCategories && (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManageCategories(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryValue(cat);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Categoria de Despesa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManagePaymentTypes(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentType(pt);
                            setEditPaymentTypeValue(pt);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Tipo de Pagamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentType(pt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
        onClick={() => setShowManagePaymentStatuses(false)}
      >
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
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
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentStatus(ps);
                            setEditPaymentStatusValue(ps);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Editar Situação de Pagamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentStatus(ps)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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

            {/* Category and Status Filters Column (Categoria acima do filtro de Situação) */}
            <div className="flex flex-col items-start gap-1.5">
              {/* Category Filter Dropdown */}
              <div className="relative w-full">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                  title="Filtrar por Categoria"
                >
                  <option value="all">Todas as Categorias</option>
                  {sortedExpenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>

              {/* Status Filter Dropdown (Situação abaixo do filtro de Categoria) */}
              <div className="relative w-full">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                  title="Filtrar por Situação"
                >
                  <option value="all">Todas as Situações</option>
                  {sortedPaymentStatuses.map((st) => (
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
            {(search !== '' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50/50 hover:bg-red-50 text-red-600 px-3 py-2 font-bold transition-all dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
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
                <th className="py-3.5 px-1.5 font-semibold whitespace-nowrap w-[68px]">Data</th>
                <th className="py-3.5 px-3 font-semibold w-[180px] min-w-[165px] max-w-[220px]">Descrição</th>
                <th className="py-3.5 px-3.5 font-semibold text-right whitespace-nowrap w-[120px]">Valor</th>
                <th className="py-3.5 px-3 font-semibold whitespace-nowrap w-[130px]">Categoria</th>
                <th className="py-3.5 px-2.5 font-semibold whitespace-nowrap w-[110px]">Classificação</th>
                <th className="py-3.5 px-3 font-semibold whitespace-nowrap w-[130px]">Tipo</th>
                <th className="py-3.5 px-2.5 font-semibold whitespace-nowrap w-[120px]">Situação</th>
                <th className="py-3.5 px-2.5 font-semibold text-right whitespace-nowrap w-[90px]">Ações</th>
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
                    <td className="py-3.5 px-1.5 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-nowrap w-[68px]">
                      {formatShortDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-100 text-sm w-[180px] min-w-[165px] max-w-[220px] break-words whitespace-normal leading-snug">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap w-[120px]">
                      <span className="text-[11px] font-sans font-normal text-slate-400 dark:text-slate-500 mr-1 select-none">R$</span>{exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap w-[130px]">
                      <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-2.5 whitespace-nowrap w-[110px]">
                      <span className="inline-block bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-md text-xs font-semibold">
                        {exp.classification || 'Fixo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap w-[130px]">
                      {exp.paymentType}
                    </td>
                    <td className="py-3.5 px-2.5 whitespace-nowrap w-[120px]">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        exp.status === 'Pago'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : exp.status === 'Pendente'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>{exp.status}</span>
                    </td>
                    <td className="py-3.5 px-2.5 text-right whitespace-nowrap w-[90px]">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(exp);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
                          title="Editar Despesa"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(exp.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800"
                          title="Excluir Despesa"
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Lançar Despesas"
        accentColor="rose"
        icon={<Sliders className="h-4 w-4 text-rose-500" />}
      >
        <div className="space-y-2">
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
      </HelpCard>
    </div>
  );
};

// ======================== RESUMO MENSAL ========================
export const ResumoMensalPage: React.FC<PageProps> = ({ userData, onUpdateUserData, onNavigate }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string | null>(null);
  const [selectedRealizedCategory, setSelectedRealizedCategory] = useState<string | null>(null);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<string | null>(null);

  // Estados para o popup de Novo Registro de Despesa disparado no Resumo Mensal
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpDescription, setNewExpDescription] = useState('');
  const [newExpValue, setNewExpValue] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('');
  const [newExpPaymentType, setNewExpPaymentType] = useState('');
  const [newExpStatus, setNewExpStatus] = useState('');
  const [newExpClassification, setNewExpClassification] = useState<'Fixo' | 'Variável' | 'Eventual'>('Variável');
  const [newExpInstallments, setNewExpInstallments] = useState(1);

  const sortedExpenseCategories = useMemo(() => {
    return [...(userData.expenseCategories || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.expenseCategories]);

  const sortedPaymentTypes = useMemo(() => {
    return [...(userData.paymentTypes || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.paymentTypes]);

  const sortedPaymentStatuses = useMemo(() => {
    return [...(userData.paymentStatuses || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.paymentStatuses]);

  const openCategoryModal = (catName: string) => {
    setSelectedCategoryModal(catName);
  };

  const handleNovoLancamento = () => {
    const targetCat = selectedCategoryModal || sortedExpenseCategories[0] || 'Outros';
    setNewExpCategory(targetCat);
    setNewExpDescription('');
    setNewExpValue('');
    const now = new Date();
    const mm = String(selectedMonth + 1).padStart(2, '0');
    const day = (now.getFullYear() === selectedYear && now.getMonth() === selectedMonth)
      ? String(now.getDate()).padStart(2, '0')
      : '01';
    setNewExpDate(`${selectedYear}-${mm}-${day}`);
    setNewExpPaymentType(sortedPaymentTypes[0] || 'Pix');
    setNewExpStatus(sortedPaymentStatuses[0] || 'Pago');
    setNewExpClassification('Variável');
    setNewExpInstallments(1);
    setShowNewExpenseModal(true);
  };

  const handleSaveNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDate || !newExpDescription || !newExpValue || !newExpCategory || !newExpPaymentType || !newExpStatus || !newExpClassification) return;
    const parsedVal = parsePtBrNumber(newExpValue);
    if (parsedVal <= 0) return;

    if (newExpInstallments > 1) {
      const newExpensesList: Expense[] = [];
      const baseTimestamp = Date.now();
      for (let i = 1; i <= newExpInstallments; i++) {
        const instDate = getNextMonthDate(newExpDate, i - 1);
        newExpensesList.push({
          id: 'exp-' + baseTimestamp + '-' + i,
          date: instDate,
          description: `${newExpDescription} (${i}/${newExpInstallments})`,
          value: parsedVal,
          category: newExpCategory,
          paymentType: newExpPaymentType,
          status: i === 1 ? newExpStatus : (newExpStatus === 'Pago' ? 'Pendente' : newExpStatus),
          classification: newExpClassification
        });
      }
      onUpdateUserData({
        expenses: [...newExpensesList, ...userData.expenses]
      });
    } else {
      const newExpense: Expense = {
        id: 'exp-' + Date.now(),
        date: newExpDate,
        description: newExpDescription,
        value: parsedVal,
        category: newExpCategory,
        paymentType: newExpPaymentType,
        status: newExpStatus,
        classification: newExpClassification
      };

      onUpdateUserData({
        expenses: [newExpense, ...userData.expenses]
      });
    }

    // Fecha apenas o popup de Novo Registro de Despesa e mantém o popup de visualização de lançamentos da categoria aberto!
    setShowNewExpenseModal(false);
  };

  const handleListaDespesas = () => {
    setSelectedCategoryModal(null);
    setShowNewExpenseModal(false);
    if (onNavigate) {
      onNavigate('Despesas (Gastos)');
    }
  };

  // Travar a rolagem da página e adicionar suporte a tecla ESC enquanto o pop-up estiver aberto
  useEffect(() => {
    if (showNewExpenseModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowNewExpenseModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else if (selectedCategoryModal) {
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
  }, [showNewExpenseModal, selectedCategoryModal]);

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

    const budgetedCategoriesList = categoriesTableData
      .map(item => ({
        name: item.category,
        value: item.budgetedValue,
        percentage: sumBudget > 0 ? (item.budgetedValue / sumBudget) * 100 : 0,
        color: item.color
      }))
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    const budgetedPieSlices = budgetedCategoriesList.filter(item => item.value > 0);

    const realizedCategoriesList = categoriesTableData
      .map(item => ({
        name: item.category,
        value: item.realizedValue,
        percentage: sumExpense > 0 ? (item.realizedValue / sumExpense) * 100 : 0,
        color: item.color
      }))
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    const realizedPieSlices = realizedCategoriesList.filter(item => item.value > 0);

    return {
      expenses,
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

      {/* Gráfico de Tendência de Gastos (Evolução Acumulada Dia a Dia) */}
      <MonthlyExpenseTrendChart
        expenses={monthData.expenses}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        monthName={monthsList[selectedMonth]}
      />

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
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md cursor-pointer"
              onClick={() => setSelectedCategoryModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden cursor-default"
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

                {/* Rodapé do Pop-up com Novo lançamento, Lista de Despesas e Voltar */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Total nesta categoria:
                    </span>
                    <strong className="text-slate-900 dark:text-white font-mono font-bold text-sm sm:text-base">
                      {categoryModalTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </strong>
                  </div>

                  {/* Botões um abaixo do outro alinhados à direita: Novo lançamento por cima de todos, Lista de Despesas no meio e Voltar por último */}
                  <div className="flex flex-col items-end gap-2.5 pt-1 w-full">
                    <button
                      type="button"
                      onClick={handleNovoLancamento}
                      className="w-fit inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                      title="Abrir formulário de Novo Registro de Despesa"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>Novo lançamento</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleListaDespesas}
                      className="w-fit inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99] text-slate-800 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all border border-slate-300/50 dark:border-slate-700/50 cursor-pointer shadow-sm"
                      title="Ir para a Lista de Despesas (Gastos)"
                    >
                      <Wallet className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>Lista de Despesas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCategoryModal(null)}
                      className="w-fit inline-flex items-center justify-center px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 active:scale-[0.99] text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                      title="Voltar ao Resumo Mensal"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal / Popup de Novo Registro de Despesa (Abre por cima do popup de categorias sem sair da página) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showNewExpenseModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowNewExpenseModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[88vh] overflow-hidden cursor-default m-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header fixo no topo do popup */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <Plus className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                        Novo Registro de Despesa
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preencha os campos para registrar uma saída na categoria <strong className="text-slate-700 dark:text-slate-200">{newExpCategory || selectedCategoryModal}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewExpenseModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar e voltar à visualização de lançamentos"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Corpo do formulário com scroll customizado */}
                <form id="form-novo-registro-resumo" onSubmit={handleSaveNewExpense} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Data da Compra</label>
                      <input
                        type="date"
                        required
                        value={newExpDate}
                        onChange={(e) => setNewExpDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Descrição da Compra</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Supermercado / Farmácia"
                        value={newExpDescription}
                        onChange={(e) => setNewExpDescription(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Valor (R$)</label>
                      <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="0,00"
                          value={newExpValue}
                          onChange={(e) => setNewExpValue(formatPtBrLiveInput(e.target.value))}
                          onBlur={() => {
                            if (newExpValue && newExpValue.trim()) {
                              const num = parsePtBrNumber(newExpValue);
                              if (num > 0) {
                                setNewExpValue(formatPtBrCurrency(num));
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Quantidade de Parcelas</label>
                      <select
                        value={newExpInstallments}
                        onChange={(e) => setNewExpInstallments(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value={1}>1x (À vista / Sem parcelamento)</option>
                        {Array.from({ length: 59 }, (_, idx) => idx + 2).map(num => (
                          <option key={num} value={num}>{num}x</option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">
                        * Lançamentos subsequentes ocorrem a partir da 2ª parcela.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Categoria da despesa</label>
                      <select
                        required
                        value={newExpCategory}
                        onChange={(e) => setNewExpCategory(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="" disabled>Selecione a categoria...</option>
                        {sortedExpenseCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo de Pagamento</label>
                      <select
                        required
                        value={newExpPaymentType}
                        onChange={(e) => setNewExpPaymentType(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="" disabled>Selecione o tipo de pagamento...</option>
                        {sortedPaymentTypes.map(pt => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Situação</label>
                      <select
                        required
                        value={newExpStatus}
                        onChange={(e) => setNewExpStatus(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="" disabled>Selecione a situação...</option>
                        {sortedPaymentStatuses.map(ps => (
                          <option key={ps} value={ps}>{ps}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Classificação de Despesa</label>
                      <select
                        required
                        value={newExpClassification}
                        onChange={(e) => setNewExpClassification(e.target.value as 'Fixo' | 'Variável' | 'Eventual')}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="" disabled>Selecione a classificação...</option>
                        <option value="Fixo">Fixo</option>
                        <option value="Variável">Variável</option>
                        <option value="Eventual">Eventual</option>
                      </select>
                    </div>
                  </div>
                </form>

                {/* Rodapé com botões de ação */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
                  <button
                    type="button"
                    onClick={() => setShowNewExpenseModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer font-medium text-xs sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-novo-registro-resumo"
                    className="rounded-lg bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-500 transition-colors shadow-sm shadow-rose-600/20 cursor-pointer text-xs sm:text-sm"
                  >
                    Salvar Registro
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona o Resumo Mensal"
        accentColor="indigo"
        icon={<Sliders className="h-4 w-4 text-indigo-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">Entenda os indicadores e comparações do mês selecionado:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li><strong className="text-slate-800 dark:text-white">KPIs de Desempenho:</strong> No topo, acompanhe o total de Receitas, Despesas, Saldo Líquido e percentual de economia do mês.</li>
            <li><strong className="text-slate-800 dark:text-white">Orçado vs Realizado:</strong> Compare o limite planejado de cada categoria com o valor efetivamente gasto, identificando desvios em tempo real.</li>
            <li><strong className="text-slate-800 dark:text-white">Detalhamento por Categoria:</strong> Clique em qualquer categoria na lista para abrir o popup com todos os lançamentos, ver a lista completa ou criar um novo lançamento diretamente.</li>
            <li><strong className="text-slate-800 dark:text-white">Gráficos de Distribuição:</strong> Visualize os maiores centros de custo em formato visual para tomada rápida de decisões financeiras.</li>
          </ul>
        </div>
      </HelpCard>
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
        *o cálculo se dá pelo orçamento total configurado em Orçamento anual menos o Realizado total lançado em Despesas conforme o ano escolhido. Receitas total é só comparativo para o Orçado, se está acima ou abaixo do que foi previsto.
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
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md cursor-pointer"
              onClick={() => setSelectedMonthModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden cursor-default"
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona o Resumo Anual"
        accentColor="blue"
        icon={<Sliders className="h-4 w-4 text-blue-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">Monitore a evolução financeira completa ao longo dos 12 meses do ano:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li><strong className="text-slate-800 dark:text-white">Visão Mensal Consolidada:</strong> Acompanhe mês a mês as receitas totais, despesas e o saldo final acumulado.</li>
            <li><strong className="text-slate-800 dark:text-white">Taxa de Poupança Anual:</strong> Analise sua capacidade de poupança percentual em cada período do exercício financeiro.</li>
            <li><strong className="text-slate-800 dark:text-white">Detalhamento por Mês:</strong> Clique em qualquer mês da tabela para abrir o modal de detalhamento de categorias e despesas registradas naquele mês.</li>
            <li><strong className="text-slate-800 dark:text-white">Filtro de Ano:</strong> Alterne rapidamente entre anos anteriores e o ano vigente para comparar sua evolução patrimonial.</li>
          </ul>
        </div>
      </HelpCard>
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
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={handleCancelEdit}
        >
          <form 
            onSubmit={handleAdd} 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down cursor-default"
          >
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona o Planejamento de Metas"
        accentColor="amber"
        icon={<Sliders className="h-4 w-4 text-amber-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">Transforme seus objetivos em planos de economia claros e alcançáveis:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li><strong className="text-slate-800 dark:text-white">Criar Nova Meta:</strong> Clique em <strong className="text-amber-600 dark:text-amber-400">Nova Meta</strong> e defina o nome do objetivo, valor alvo, valor já guardado e data de realização.</li>
            <li><strong className="text-slate-800 dark:text-white">Barra de Progresso:</strong> Cada meta calcula automaticamente a porcentagem atingida e o valor restante.</li>
            <li><strong className="text-slate-800 dark:text-white">Estimativa Mensal:</strong> O sistema divide o saldo restante pelo número de meses até o prazo final, mostrando quanto você precisa poupar por mês.</li>
            <li><strong className="text-slate-800 dark:text-white">Status da Meta:</strong> Alterne entre Pendente, Em Andamento e Concluído conforme for poupando e atingindo seus sonhos.</li>
          </ul>
        </div>
      </HelpCard>
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
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={handleCancelEdit}
        >
          <form 
            onSubmit={handleAdd} 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down cursor-default"
          >
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona a Lista de Desejos"
        accentColor="rose"
        icon={<Sliders className="h-4 w-4 text-rose-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">Controle o consumo por impulso e priorize suas aquisições pessoais:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li><strong className="text-slate-800 dark:text-white">Adicionar Desejo:</strong> Registre o item desejado, valor estimado, nível de prioridade (Alta, Média ou Baixa) e link opcional.</li>
            <li><strong className="text-slate-800 dark:text-white">Regra dos 30 Dias:</strong> Deixar o desejo cadastrado antes de comprar evita decisões financeiras precipitadas.</li>
            <li><strong className="text-slate-800 dark:text-white">Mudança de Status:</strong> Marque o item como Pendente, Comprado ou Desistido conforme reavaliar sua real necessidade.</li>
          </ul>
        </div>
      </HelpCard>
    </div>
  );
};

// ======================== AÇÃO DE MELHORIA PAGE ========================
export const AcaoDeficitPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form Fields
  const [costCenter, setCostCenter] = useState('');
  const [reason, setReason] = useState('');
  const [correctionAction, setCorrectionAction] = useState('');
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluído'>('Pendente');

  const deficitActions = userData.deficitActions || [];

  React.useEffect(() => {
    if (userData.expenseCategories && userData.expenseCategories.length > 0 && !costCenter) {
      setCostCenter(userData.expenseCategories[0]);
    }
  }, [userData.expenseCategories, costCenter]);

  // Close popup with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAdd) {
        handleCancelEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAdd]);

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
    setDate(action.date || new Date().toISOString().split('T')[0]);
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
      <div className="flex flex-col items-start gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Plano de Ação para Déficit Orçamentário <span className="font-normal text-slate-600 dark:text-slate-400">(Não cumprimento do limite financeiro)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crie ações de aprendizados para as categorias de custos extrapolados, melhores os hábitos e comportamentos e tenha melhor controle sobre os gastos.</p>
        </div>
        <button
          onClick={() => {
            setEditingActionId(null);
            setCostCenter(userData.expenseCategories[0] || 'Outros');
            setReason('');
            setCorrectionAction('');
            setResponsible('');
            setDate(new Date().toISOString().split('T')[0]);
            setStatus('Pendente');
            setShowAdd(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold text-white rounded-xl shadow-sm shadow-red-600/15 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          id="btn-nova-acao"
        >
          <Plus className="h-4 w-4" />
          Nova Ação
        </button>
      </div>



      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancelEdit}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto cursor-pointer"
            >
              {/* Janela Popup com borda levemente destacada, cantos levemente arredondados e animação suave */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 max-h-[90vh] overflow-y-auto cursor-default m-auto"
              >
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                      {editingActionId ? 'Editar Ação de Aprendizado' : 'Nova Ação de Aprendizado'}
                    </h3>
                    {editingActionId && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold dark:bg-amber-950/30">
                        Modo de Edição
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Categoria</label>
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Execução</label>
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

                  <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-600/20 cursor-pointer"
                    >
                      {editingActionId ? 'Salvar Alterações' : 'Cadastrar Ação'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* List layout style rows (uma embaixo das outras estilo linhas) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Ações de aprendizado</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              {deficitActions.length} {deficitActions.length === 1 ? 'ação' : 'ações'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-800 shadow-xs">
              <tr>
                <th scope="col" className="px-3.5 py-3 text-left whitespace-nowrap">Categoria</th>
                <th scope="col" className="px-3.5 py-3 text-left min-w-[180px]">Motivo</th>
                <th scope="col" className="px-3.5 py-3 text-left min-w-[200px]">Ação de Correção</th>
                <th scope="col" className="px-3.5 py-3 text-left whitespace-nowrap">Responsável</th>
                <th scope="col" className="px-3 py-3 text-left whitespace-nowrap w-[90px]">Execução</th>
                <th scope="col" className="px-3 py-3 text-left whitespace-nowrap w-[110px]">Status</th>
                <th scope="col" className="px-3 py-3 text-center whitespace-nowrap w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
              {deficitActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Nenhuma ação de inconsistência financeira cadastrada.
                  </td>
                </tr>
              ) : (
                deficitActions.map((action) => (
                  <tr
                    key={action.id}
                    onClick={() => handleStartEdit(action)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    title="Clique para editar este lançamento"
                  >
                    <td className="px-3.5 py-3 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md dark:bg-red-950/40 dark:text-red-300 text-xs font-semibold">
                        {action.costCenter}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 text-sm max-w-xs break-words whitespace-normal leading-snug" title={action.reason}>
                      {action.reason}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 text-sm font-medium max-w-sm break-words whitespace-normal leading-snug" title={action.correctionAction}>
                      {action.correctionAction}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold text-sm">
                      {action.responsible}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-xs sm:text-sm">
                      {action.date ? action.date.split('-').reverse().join('/') : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        action.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : action.status === 'Em Andamento'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-400">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(action);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
                          title="Editar Ação"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(action.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800"
                          title="Excluir Ação"
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Lançar Ações de Inconsistência Financeira"
        accentColor="emerald"
        icon={<Sliders className="h-4 w-4 text-emerald-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">As Ações de aprendizado servem para registrar planos de ação quando despesas superam as previsões ou ocorrem inconsistências:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li>Clique no botão <strong className="text-slate-800 dark:text-white">Nova Ação</strong> abaixo do título para abrir a janela.</li>
            <li>Selecione a <strong className="text-slate-800 dark:text-white">Categoria</strong> e digite o <strong className="text-slate-800 dark:text-white">Motivo do Desvio</strong> (por que o gasto ultrapassou o planejado).</li>
            <li>Descreva a <strong className="text-slate-800 dark:text-white">Ação Corretiva</strong> (o que será executado para conter ou corrigir isso).</li>
            <li>Defina o <strong className="text-slate-800 dark:text-white">Responsável</strong> pela ação, a data de <strong className="text-slate-800 dark:text-white">Execução</strong> e a <strong className="text-slate-800 dark:text-white">Situação da Ação</strong>.</li>
            <li>Clique em <strong className="text-emerald-600 dark:text-emerald-400">Salvar Ação</strong> para concluir.</li>
          </ul>
          <p className="mt-2 text-[11px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg">
            <strong>Finalidade Pedagógica:</strong> Este painel ajuda a registrar o plano de ação necessário para reverter déficits orçamentários pontuais e garantir que desvios não se repitam no próximo ciclo.
          </p>
        </div>
      </HelpCard>
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
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={() => setShowAdd(false)}
        >
          <form 
            onSubmit={handleAdd} 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-4 text-xs animate-slide-down cursor-default"
          >
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

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona a Lista de Compras"
        accentColor="emerald"
        icon={<Sliders className="h-4 w-4 text-emerald-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">Faça suas compras no supermercado ou compras rotineiras com orçamento sob controle:</p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li><strong className="text-slate-800 dark:text-white">Adicionar Item:</strong> Cadastre produtos informando quantidade estimada, preço unitário previsto e categoria.</li>
            <li><strong className="text-slate-800 dark:text-white">Checklist em Tempo Real:</strong> Marque a caixinha do item conforme colocá-lo no carrinho físico de compras.</li>
            <li><strong className="text-slate-800 dark:text-white">Totalizador Imediato:</strong> Acompanhe no topo o valor total previsto versus o total dos itens já marcados no carrinho.</li>
          </ul>
        </div>
      </HelpCard>
    </div>
  );
};

// ======================== PLANEJAMENTO ANUAL ========================
export const PlanejamentoAnualPage: React.FC<PageProps> = ({ userData, onUpdateUserData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [localBudgets, setLocalBudgets] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmCopyMonthIdx, setConfirmCopyMonthIdx] = useState<number | null>(null);

  const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthsFull = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Available categories sorted alphabetically for clean and organized table display
  const categories = useMemo(() => {
    return [...(userData.expenseCategories || [])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [userData.expenseCategories]);

  // Load existing budgets into local state when selectedYear or userData.annualPlanning changes
  useEffect(() => {
    const yearPlan = userData.annualPlanning?.find(p => p.year === selectedYear);
    const newBudgets: Record<string, string> = {};

    if (yearPlan && yearPlan.monthlyBudgets) {
      yearPlan.monthlyBudgets.forEach(mb => {
        if (mb.categoryBudgets) {
          mb.categoryBudgets.forEach(cb => {
            if (cb.budgetedValue > 0) {
              newBudgets[`${cb.category}__${mb.month}`] = formatPtBrCurrency(cb.budgetedValue);
            }
          });
        }
      });
    }

    setLocalBudgets(newBudgets);
  }, [selectedYear, userData.annualPlanning]);

  // Handle cell value change (updates local state immediately with auto thousands and commas)
  const handleCellChange = (category: string, monthIdx: number, val: string) => {
    const formatted = formatPtBrLiveInput(val);
    setLocalBudgets(prev => ({
      ...prev,
      [`${category}__${monthIdx}`]: formatted
    }));
  };

  // Normalize to 2 decimal places on blur (e.g. 1.500 -> 1.500,00) and save
  const handleCellBlur = (category: string, monthIdx: number) => {
    const key = `${category}__${monthIdx}`;
    const current = localBudgets[key];
    if (current && current.trim()) {
      const num = parsePtBrNumber(current);
      const normalized = formatPtBrCurrency(num);
      const next = { ...localBudgets, [key]: normalized };
      setLocalBudgets(next);
      commitBudgets(next);
    } else {
      commitBudgets();
    }
  };

  // Commit changes to annualPlanning in userData
  const commitBudgets = (budgetsToCommit = localBudgets) => {
    setSaveStatus('saving');

    const yearPlanIdx = userData.annualPlanning.findIndex(p => p.year === selectedYear);
    const existingYearPlan = yearPlanIdx !== -1 ? userData.annualPlanning[yearPlanIdx] : null;

    const monthlyBudgets = Array.from({ length: 12 }, (_, monthIdx) => {
      const existingMb = existingYearPlan?.monthlyBudgets.find(b => b.month === monthIdx);
      const categoryBudgetsList: { category: string; budgetedValue: number }[] = [];
      let monthSum = 0;

      categories.forEach(cat => {
        const raw = budgetsToCommit[`${cat}__${monthIdx}`];
        const val = parsePtBrNumber(raw);
        if (val > 0) {
          categoryBudgetsList.push({ category: cat, budgetedValue: val });
          monthSum += val;
        }
      });

      return {
        month: monthIdx,
        incomeBudget: existingMb?.incomeBudget || 0,
        expenseBudget: monthSum, // Automatically updated to sum of all categories!
        categoryBudgets: categoryBudgetsList
      };
    });

    let updatedPlanningList = [...userData.annualPlanning];
    if (yearPlanIdx !== -1) {
      updatedPlanningList[yearPlanIdx] = {
        ...updatedPlanningList[yearPlanIdx],
        monthlyBudgets
      };
    } else {
      updatedPlanningList.push({
        year: selectedYear,
        monthlyBudgets
      });
    }

    onUpdateUserData({
      annualPlanning: updatedPlanningList
    });

    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
    }, 2500);
  };

  // Replicate first non-empty value of a category across all 12 months
  const copyCategoryToAllMonths = (cat: string) => {
    let sourceVal = '';
    for (let m = 0; m < 12; m++) {
      if (localBudgets[`${cat}__${m}`]) {
        sourceVal = localBudgets[`${cat}__${m}`];
        break;
      }
    }
    if (!sourceVal) return;

    const next = { ...localBudgets };
    for (let m = 0; m < 12; m++) {
      next[`${cat}__${m}`] = sourceVal;
    }
    setLocalBudgets(next);
    commitBudgets(next);
  };

  // Copy values from previous month
  const copyFromPreviousMonth = (targetMonthIdx: number) => {
    const sourceMonthIdx = targetMonthIdx === 0 ? 11 : targetMonthIdx - 1;
    const sourceYear = targetMonthIdx === 0 ? selectedYear - 1 : selectedYear;

    const next = { ...localBudgets };

    if (sourceYear === selectedYear) {
      categories.forEach(cat => {
        const val = localBudgets[`${cat}__${sourceMonthIdx}`] || '';
        next[`${cat}__${targetMonthIdx}`] = val;
      });
    } else {
      const prevYearPlan = userData.annualPlanning.find(p => p.year === sourceYear);
      const decBudget = prevYearPlan?.monthlyBudgets.find(b => b.month === 11);
      categories.forEach(cat => {
        const found = decBudget?.categoryBudgets?.find(cb => cb.category === cat);
        next[`${cat}__${targetMonthIdx}`] = found && found.budgetedValue > 0 ? formatPtBrCurrency(found.budgetedValue) : '';
      });
    }

    setLocalBudgets(next);
    commitBudgets(next);
  };

  // Calculations
  const getCategoryAnnualTotal = (cat: string) => {
    let sum = 0;
    for (let m = 0; m < 12; m++) {
      sum += parsePtBrNumber(localBudgets[`${cat}__${m}`]);
    }
    return sum;
  };

  const getMonthTotal = (monthIdx: number) => {
    let sum = 0;
    categories.forEach(cat => {
      sum += parsePtBrNumber(localBudgets[`${cat}__${monthIdx}`]);
    });
    return sum;
  };

  const grandAnnualTotal = useMemo(() => {
    let sum = 0;
    for (let m = 0; m < 12; m++) {
      categories.forEach(cat => {
        sum += parsePtBrNumber(localBudgets[`${cat}__${m}`]);
      });
    }
    return sum;
  }, [localBudgets, categories]);

  const monthlyAverageBudget = useMemo(() => {
    return grandAnnualTotal / 12;
  }, [grandAnnualTotal]);

  const monthsWeeks = useMemo(() => {
    return Array.from({ length: 12 }, (_, mIdx) => {
      // Quantidade de semanas completas no mês (quintas-feiras segundo a norma ISO-8601: entre 4 e 5)
      const lastDay = new Date(selectedYear, mIdx + 1, 0).getDate();
      let thursdays = 0;
      for (let d = 1; d <= lastDay; d++) {
        if (new Date(selectedYear, mIdx, d).getDay() === 4) {
          thursdays++;
        }
      }
      return thursdays;
    });
  }, [selectedYear]);

  const totalYearWeeks = useMemo(() => {
    return monthsWeeks.reduce((acc, curr) => acc + curr, 0);
  }, [monthsWeeks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Orçamento Anual
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Defina e acompanhe seu teto de gastos orçados por categoria em cada mês do ano.
          </p>
        </div>
      </div>

      {/* Centered Year Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
          <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Ano de Exercício:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner ml-1"
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelectedYear(new Date().getFullYear())}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors dark:bg-slate-950 dark:hover:bg-blue-950/30"
            title="Voltar para o ano atual"
          >
            Hoje
          </button>
        </div>

        {/* Quick hint badge */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Valores orçados salvos automaticamente ao preencher</span>
        </div>
      </div>

      {/* KPI Cards: Total Anual, Média Mensal, Categorias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Total Orçado Anual ({selectedYear})
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">
            {grandAnnualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Média Mensal Orçada
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
            {monthlyAverageBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Categorias Ativas na Tabela
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1 block">
            {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
          </span>
        </div>
      </div>

      {/* Botão Salvar Orçamento acima do card Matriz Orçamentária no lado esquerdo */}
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={() => commitBudgets()}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer ${
            saveStatus === 'saved'
              ? 'bg-emerald-600 shadow-emerald-500/20'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {saveStatus === 'saved' ? (
            <>
              <Check className="h-4 w-4" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : saveStatus === 'saving' ? (
            <span>Salvando...</span>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Salvar Orçamento</span>
            </>
          )}
        </button>
      </div>

      {/* Main Table Container with Fixed Category Column & Horizontal Scroll */}
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Sliders className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Nenhuma categoria de despesa cadastrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Cadastre categorias de despesa em <strong>Lançamento de Despesas</strong> para que elas apareçam automaticamente nesta tabela.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Matriz Orçamentária Anual • {selectedYear}
            </h3>
            <span className="text-xs text-slate-400">
              Role horizontalmente e verticalmente para navegar entre meses e categorias
            </span>
          </div>

          <div className="overflow-auto custom-scrollbar relative max-w-full max-h-[580px] sm:max-h-[640px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90">
                  {/* Sticky Category Column Header (pinned top & left) */}
                  <th
                    className="sticky left-0 top-0 z-40 bg-slate-100 dark:bg-slate-800 p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs sm:text-sm border-r-2 border-b-2 border-slate-200 dark:border-slate-700 w-[110px] min-w-[100px] max-w-[120px] shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)] break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-normal leading-tight align-middle"
                    style={{ verticalAlign: 'middle' }}
                  >
                    <div className="flex flex-col justify-between h-full min-h-[70px]">
                      <div className="pb-1 mb-1 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Semanas
                      </div>
                      <div className="flex items-center justify-start flex-1 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Categoria
                      </div>
                    </div>
                  </th>

                  {/* Months Columns (Jan a Dez) - Sticky Top with Weeks Line */}
                  {monthsShort.map((m, idx) => (
                    <th
                      key={idx}
                      className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 p-1.5 text-center min-w-[76px] w-[80px] border-r border-b-2 border-slate-200/70 dark:border-slate-700"
                    >
                      {/* Linha superior: Semanas completas (4 ou 5) */}
                      <div className="pb-1 mb-1 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center">
                        <span
                          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs sm:text-[13px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800/70 whitespace-nowrap leading-tight"
                          title={`${monthsWeeks[idx]} semanas completas em ${monthsFull[idx]} de ${selectedYear}`}
                        >
                          {monthsWeeks[idx]} sem.
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-white uppercase text-xs sm:text-sm leading-tight">
                        {m}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                        {monthsFull[idx]}
                      </div>
                      <div className="mt-1.5 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setConfirmCopyMonthIdx(idx)}
                          className="inline-flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900/90 border border-blue-200 dark:border-blue-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer w-full"
                          title={idx === 0 ? "Copiar de Dezembro do ano anterior" : `Copiar valores de ${monthsShort[idx - 1]}`}
                        >
                          <Copy className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span className="leading-tight text-center">Copiar anterior</span>
                        </button>
                      </div>
                    </th>
                  ))}

                  {/* Total Column Header - Sticky Top */}
                  <th
                    className="sticky top-0 z-20 bg-slate-200 dark:bg-slate-700 p-2 sm:p-2.5 text-right font-black text-slate-800 dark:text-white uppercase text-xs sm:text-sm min-w-[120px] border-l-2 border-b-2 border-slate-300 dark:border-slate-600 align-middle"
                    style={{ verticalAlign: 'middle' }}
                  >
                    <div className="flex flex-col justify-between h-full min-h-[70px]">
                      <div className="pb-1 mb-1 border-b border-slate-300/80 dark:border-slate-600/80 text-xs sm:text-[13px] font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {totalYearWeeks} semanas
                      </div>
                      <div className="flex items-center justify-end flex-1 font-black text-slate-800 dark:text-white text-xs sm:text-sm">
                        Total Anual
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {categories.map((cat) => {
                  const catAnnualTotal = getCategoryAnnualTotal(cat);
                  return (
                    <tr
                      key={cat}
                      className="group hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors"
                    >
                      {/* Sticky Category Name Cell - Centered Vertically with Auto Wrap */}
                      <td
                        className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/30 dark:group-hover:bg-slate-900 p-2 sm:p-2.5 font-bold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-700 w-[110px] min-w-[100px] max-w-[120px] shadow-[3px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors align-middle break-words [overflow-wrap:anywhere]"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <div className="flex flex-col justify-center items-start min-w-0 py-0.5 w-full">
                          <div className="flex items-start gap-1.5 min-w-0 w-full">
                            <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                            <span
                              className="break-words [overflow-wrap:anywhere] [word-break:break-word] hyphens-auto whitespace-normal leading-snug font-bold text-sm sm:text-[15px] text-slate-900 dark:text-white min-w-0 flex-1"
                              title={cat}
                              lang="pt-BR"
                            >
                              {cat}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyCategoryToAllMonths(cat)}
                            className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-6 group-hover:opacity-100 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded border border-blue-200/60 dark:border-blue-800/40 transition-all duration-150 self-start cursor-pointer group-hover:mt-1 ml-3.5"
                            title="Replicar o valor do primeiro mês preenchido para todos os 12 meses"
                          >
                            Replicar ano
                          </button>
                        </div>
                      </td>

                      {/* 12 Monthly Editable Input Cells */}
                      {monthsShort.map((_, mIdx) => {
                        const key = `${cat}__${mIdx}`;
                        const val = localBudgets[key] ?? '';
                        const numVal = parsePtBrNumber(val);

                        return (
                          <td
                            key={mIdx}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/60 text-center min-w-[76px] w-[80px] align-middle"
                            style={{ verticalAlign: 'middle' }}
                          >
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={val}
                                onChange={(e) => handleCellChange(cat, mIdx, e.target.value)}
                                onBlur={() => handleCellBlur(cat, mIdx)}
                                className={`w-full rounded-md border py-1.5 px-1 text-right font-mono text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 ${
                                  numVal > 0
                                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}

                      {/* Annual Category Total */}
                      <td
                        className="p-2 sm:p-2.5 text-right font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/30 border-l-2 border-slate-200 dark:border-slate-700 whitespace-nowrap align-middle min-w-[120px]"
                        style={{ verticalAlign: 'middle' }}
                      >
                        {catAnnualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <td
                    className="sticky left-0 bottom-0 z-30 bg-slate-100 dark:bg-slate-800 p-2.5 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs sm:text-sm border-r-2 border-slate-300 dark:border-slate-700 w-[110px] min-w-[100px] max-w-[120px] shadow-[3px_0_8px_-2px_rgba(0,0,0,0.1)] break-words [overflow-wrap:anywhere] whitespace-normal leading-tight align-middle"
                    style={{ verticalAlign: 'middle' }}
                  >
                    Total Mensal
                  </td>
                  {monthsShort.map((_, mIdx) => (
                    <td
                      key={mIdx}
                      className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 p-1.5 text-right font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[76px] w-[80px] align-middle"
                      style={{ verticalAlign: 'middle' }}
                    >
                      {getMonthTotal(mIdx).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  ))}
                  <td
                    className="sticky bottom-0 z-20 bg-blue-100 dark:bg-blue-950 p-2 sm:p-2.5 text-right font-mono font-black text-sm sm:text-base text-blue-700 dark:text-blue-300 border-l-2 border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[120px] align-middle"
                    style={{ verticalAlign: 'middle' }}
                  >
                    {grandAnnualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Copiar do mês anterior (Portal to body so it centers in current screen viewport) */}
      {typeof document !== 'undefined' && confirmCopyMonthIdx !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmCopyMonthIdx(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Copiar orçamento do mês anterior?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Tem certeza que deseja copiar os valores do mês anterior para {monthsFull[confirmCopyMonthIdx]}? Se houver valores cadastrados, eles serão sobrescritos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmCopyMonthIdx(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => {
                  copyFromPreviousMonth(confirmCopyMonthIdx);
                  setConfirmCopyMonthIdx(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01]"
              >
                Sim
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Help Card como último conteúdo da página */}
      <HelpCard
        title="Como Funciona a Tabela de Orçamento Anual"
        accentColor="blue"
        icon={<Sliders className="h-4 w-4 text-blue-500" />}
      >
        <div className="space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Gerencie todo o seu orçamento de despesas em uma única matriz intuitiva:
          </p>
          <ul className="list-decimal pl-4 space-y-1.5">
            <li>
              <strong className="text-slate-800 dark:text-white">Coluna Fixa de Categorias:</strong> Na lateral esquerda, todas as suas categorias de despesas aparecem fixas. Conforme você cadastra novas categorias no sistema, elas entram automaticamente nesta tabela.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Meses de Jan a Dez:</strong> Cada coluna representa um mês do ano de exercício selecionado. Você pode rolar a tabela na horizontal para ver todos os meses mantendo as categorias sempre visíveis.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Edição Direta:</strong> Digite o valor planejado diretamente na célula do mês e categoria desejada. O valor é salvo automaticamente ao mudar de campo ou clicar no botão Salvar.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Atalhos Práticos:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Clique em <em>Replicar ano</em> ao passar o mouse sobre a categoria para preencher todos os 12 meses com o mesmo valor.</li>
                <li>Clique em <em>Copiar ant.</em> no cabeçalho do mês para clonar os valores do mês anterior com apenas 1 clique.</li>
              </ul>
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Comparação Realizado vs Orçado:</strong> Os valores orçados alimentados nesta tabela são sincronizados imediatamente com o Painel/Dashboard e Relatórios para comparação com seus gastos reais.
            </li>
          </ul>
        </div>
      </HelpCard>
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
                    <div className="flex items-center gap-4 sm:gap-5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditValue(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
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
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={() => setShowDeleteConfirmModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-6 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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

