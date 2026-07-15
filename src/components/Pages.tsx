import React, { useState, useMemo } from 'react';
import { UserData, Income, Expense, ActionPlan, ShoppingItem, UserProfile } from '../types';
import { Plus, Trash2, Pencil, Check, X, Calendar, Search, Filter, CheckSquare, Square, DollarSign, Wallet, CreditCard, Tag, User, MapPin, Phone, Mail, Sparkles, TrendingUp, TrendingDown, Sliders, ArrowLeft, AlertTriangle, Copy } from 'lucide-react';

interface PageProps {
  userData: UserData;
  userProfile: UserProfile;
  onUpdateUserData: (newData: Partial<UserData>) => void;
  onUpdateUserProfile: (name: string, address: string, phone: string, city?: string, state?: string) => void;
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
  const [paymentType, setPaymentType] = useState(userData.paymentTypes[0] || 'Pix');
  const [status, setStatus] = useState(userData.paymentStatuses[0] || 'Pago');
  const [search, setSearch] = useState('');

  // Category and Payment Type Management States
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showManagePaymentTypes, setShowManagePaymentTypes] = useState(false);
  const [newPaymentTypeName, setNewPaymentTypeName] = useState('');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [editingPaymentType, setEditingPaymentType] = useState<string | null>(null);
  const [editPaymentTypeValue, setEditPaymentTypeValue] = useState('');

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
    const updatedIncomes = userData.incomes.map(inc => inc.paymentType === oldPt ? { ...inc, paymentType: trimmed } : inc);

    onUpdateUserData({
      paymentTypes: updatedPaymentTypes,
      incomes: updatedIncomes
    });

    if (paymentType === oldPt) {
      setPaymentType(trimmed);
    }
    setEditingPaymentType(null);
    setEditPaymentTypeValue('');
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Lançamento de Receitas</h2>
          <p className="text-xs text-slate-400">Registre todas as suas entradas de dinheiro e provisões.</p>
        </div>
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
              setPaymentType(userData.paymentTypes[0] || 'Pix');
              setStatus(userData.paymentStatuses[0] || 'Pago');
            }
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Receita
        </button>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-500" />
            <span>Como Lançar Receitas</span>
          </div>
          <span className="text-slate-400">
            {showHelp ? 'Ocultar Ajuda ▲' : 'Ver Ajuda ▼'}
          </span>
        </button>
        {showHelp && (
          <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2 animate-fade-in">
            <p className="font-medium text-slate-700 dark:text-slate-300">Siga estes passos simples para gerenciar suas receitas:</p>
            <ul className="list-decimal pl-4 space-y-1.5">
              <li>Clique no botão <strong className="text-slate-800 dark:text-white">Nova Receita</strong> no canto superior direito.</li>
              <li>Preencha os campos obrigatórios: <strong className="text-slate-800 dark:text-white">Descrição</strong>, <strong className="text-slate-800 dark:text-white">Valor</strong>, <strong className="text-slate-800 dark:text-white">Data</strong>, <strong className="text-slate-800 dark:text-white">Categoria</strong> e <strong className="text-slate-800 dark:text-white">Forma de Recebimento</strong>.</li>
              <li>Selecione o status da transação (<strong className="text-slate-800 dark:text-white">Pago</strong> para valores recebidos ou <strong className="text-slate-800 dark:text-white">Pendente</strong> para previsões).</li>
              <li>Clique em <strong className="text-blue-600 dark:text-blue-400">Salvar Registro</strong> para gravar a entrada.</li>
            </ul>
            <p className="mt-2 text-[11px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg">
              <strong>Dica Prática:</strong> Personalize suas categorias e meios de recebimento clicando nas opções <strong className="underline">Gerenciar Categorias</strong> e <strong className="underline">Gerenciar Formas</strong> disponíveis no próprio formulário.
            </p>
          </div>
        )}
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
                  setShowManageCategories(!showManageCategories);
                  setShowManagePaymentTypes(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {showManageCategories ? 'Fechar' : 'Gerenciar'}
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
              <label className="block text-[10px] font-bold uppercase text-slate-400">Forma de Recebimento</label>
              <button
                type="button"
                onClick={() => {
                  setShowManagePaymentTypes(!showManagePaymentTypes);
                  setShowManageCategories(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {showManagePaymentTypes ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {userData.paymentTypes.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Situação</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {userData.paymentStatuses.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>

          {/* Manage Categories Section */}
          {showManageCategories && (
            <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Gerenciar Categorias de Receita</span>
                <button
                  type="button"
                  onClick={() => setShowManageCategories(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Categorias Existentes</span>
                {userData.incomeCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px]">
                    {editingCategory === cat ? (
                      <div className="flex-1 flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditCategory(cat);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                          className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCategoryValue(cat);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Categoria"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  <p className="text-center text-slate-400 py-2">Nenhuma categoria cadastrada.</p>
                )}
              </div>
            </div>
          )}

          {/* Manage Payment Types Section */}
          {showManagePaymentTypes && (
            <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Gerenciar Formas de Recebimento</span>
                <button
                  type="button"
                  onClick={() => setShowManagePaymentTypes(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova forma"
                  value={newPaymentTypeName}
                  onChange={(e) => setNewPaymentTypeName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddPaymentType}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Formas Existentes</span>
                {userData.paymentTypes.map(pt => (
                  <div key={pt} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px]">
                    {editingPaymentType === pt ? (
                      <div className="flex-1 flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editPaymentTypeValue}
                          onChange={(e) => setEditPaymentTypeValue(e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditPaymentType(pt);
                            if (e.key === 'Escape') setEditingPaymentType(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditPaymentType(pt)}
                          className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPaymentType(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{pt}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentType(pt);
                              setEditPaymentTypeValue(pt);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Forma de Recebimento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentType(pt)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Excluir Forma de Recebimento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {userData.paymentTypes.length === 0 && (
                  <p className="text-center text-slate-400 py-2">Nenhuma forma cadastrada.</p>
                )}
              </div>
            </div>
          )}

          <div className="sm:col-span-3 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingIncomeId(null);
                setDescription('');
                setValue('');
                setShowManageCategories(false);
                setShowManagePaymentTypes(false);
                setNewCategoryName('');
                setNewPaymentTypeName('');
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors">
              {editingIncomeId ? 'Salvar Alterações' : 'Salvar Registro'}
            </button>
          </div>
        </form>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Pesquisar por descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200/50 bg-slate-50 py-2 pl-9 pr-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Year Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Anos</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Ano {y}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
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
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>

              {/* Quick back to Current Month shortcut if another/all is selected */}
              {selectedMonth !== currentMonthYearStr && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthYearStr);
                    const currentYear = currentMonthYearStr.substring(0, 4);
                    setSelectedYear(currentYear);
                  }}
                  className="rounded-lg border border-slate-200/50 hover:border-blue-400 hover:text-blue-600 bg-white px-3 py-2 font-semibold text-slate-500 transition-all dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-500"
                  title="Mudar para o Mês Corrente"
                >
                  Ir para Mês Corrente
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
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
                <X className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg font-bold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            Soma Filtrada: <span className="font-mono text-blue-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Data</th>
                <th className="pb-3 font-semibold">Descrição</th>
                <th className="pb-3 font-semibold">Categoria</th>
                <th className="pb-3 font-semibold">Tipo Pagamento</th>
                <th className="pb-3 font-semibold">Situação</th>
                <th className="pb-3 font-semibold text-right">Valor</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">Nenhum registro de receita localizado.</td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="py-3 text-slate-500 font-mono">{inc.date.split('-').reverse().join('/')}</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{inc.description}</td>
                    <td className="py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 dark:bg-slate-800 dark:text-slate-400">{inc.category}</span>
                    </td>
                    <td className="py-3 text-slate-500">{inc.paymentType}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inc.status === 'Pago' || inc.status === 'Recebido'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'
                      }`}>{inc.status}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-blue-600">R$ {inc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditStart(inc)}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar Registro"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inc.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Excluir Registro"
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
  const [category, setCategory] = useState(userData.expenseCategories[0] || 'Outros');
  const [paymentType, setPaymentType] = useState(userData.paymentTypes[0] || 'Pix');
  const [status, setStatus] = useState(userData.paymentStatuses[0] || 'Pendente');
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
            status
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
      const newExpense: Expense = {
        id: 'exp-' + Date.now(),
        date,
        description,
        value: parseFloat(value),
        category,
        paymentType,
        status
      };

      onUpdateUserData({
        expenses: [newExpense, ...userData.expenses]
      });
    }

    setDescription('');
    setValue('');
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
    const updatedIncomes = userData.incomes.map(inc => inc.paymentType === oldPt ? { ...inc, paymentType: trimmed } : inc);
    const updatedExpenses = userData.expenses.map(exp => exp.paymentType === oldPt ? { ...exp, paymentType: trimmed } : exp);

    onUpdateUserData({
      paymentTypes: updatedPaymentTypes,
      incomes: updatedIncomes,
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
    const updatedIncomes = userData.incomes.map(inc => inc.status === oldPs ? { ...inc, status: trimmed } : inc);
    const updatedExpenses = userData.expenses.map(exp => exp.status === oldPs ? { ...exp, status: trimmed } : exp);

    onUpdateUserData({
      paymentStatuses: updatedStatuses,
      incomes: updatedIncomes,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Lançamento de Despesas</h2>
          <p className="text-xs text-slate-400">Gerencie seus custos, contas de consumo e pagamentos.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
              setEditingExpenseId(null);
              setDescription('');
              setValue('');
            } else {
              setShowAddForm(true);
              setEditingExpenseId(null);
              setDescription('');
              setValue('');
              setDate(new Date().toISOString().split('T')[0]);
              setCategory(userData.expenseCategories[0] || 'Outros');
              setPaymentType(userData.paymentTypes[0] || 'Pix');
              setStatus(userData.paymentStatuses[0] || 'Pendente');
              setShowManageCategories(false);
              setShowManagePaymentTypes(false);
              setShowManagePaymentStatuses(false);
            }
          }}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Nova Despesa
        </button>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-rose-500" />
            <span>Como Lançar Despesas</span>
          </div>
          <span className="text-slate-400">
            {showHelp ? 'Ocultar Ajuda ▲' : 'Ver Ajuda ▼'}
          </span>
        </button>
        {showHelp && (
          <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2 animate-fade-in">
            <p className="font-medium text-slate-700 dark:text-slate-300">Siga estes passos simples para gerenciar suas despesas:</p>
            <ul className="list-decimal pl-4 space-y-1.5">
              <li>Clique no botão <strong className="text-slate-800 dark:text-white">Nova Despesa</strong> no canto superior direito.</li>
              <li>Defina os campos obrigatórios: <strong className="text-slate-800 dark:text-white">Descrição</strong>, <strong className="text-slate-800 dark:text-white">Valor</strong>, <strong className="text-slate-800 dark:text-white">Data</strong>, <strong className="text-slate-800 dark:text-white">Centro de Custo (Categoria)</strong> e <strong className="text-slate-800 dark:text-white">Forma de Pagamento</strong>.</li>
              <li>Determine a <strong className="text-slate-800 dark:text-white">Situação do Pagamento</strong> (se o item já está pago, pendente de pagamento ou em atraso).</li>
              <li>Clique em <strong className="text-rose-600 dark:text-rose-400">Salvar Registro</strong> para gravar a saída.</li>
            </ul>
            <p className="mt-2 text-[11px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg">
              <strong>Conselho Financeiro:</strong> Manter a situação de pagamento sempre em dia ajuda a monitorar os vencimentos futuros no seu fluxo de caixa para evitar multas, juros ou bloqueios.
            </p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl grid gap-4 sm:grid-cols-3 text-xs max-h-[90vh] overflow-y-auto">
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
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Centro de Despesa</label>
              <button
                type="button"
                onClick={() => {
                  setShowManageCategories(!showManageCategories);
                  setShowManagePaymentTypes(false);
                  setShowManagePaymentStatuses(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {showManageCategories ? 'Fechar' : 'Gerenciar'}
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
              <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo de Pagamento</label>
              <button
                type="button"
                onClick={() => {
                  setShowManagePaymentTypes(!showManagePaymentTypes);
                  setShowManageCategories(false);
                  setShowManagePaymentStatuses(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {showManagePaymentTypes ? 'Fechar' : 'Gerenciar'}
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
              <label className="block text-[10px] font-bold uppercase text-slate-400">Situação de Pagamento</label>
              <button
                type="button"
                onClick={() => {
                  setShowManagePaymentStatuses(!showManagePaymentStatuses);
                  setShowManageCategories(false);
                  setShowManagePaymentTypes(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {showManagePaymentStatuses ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {userData.paymentStatuses.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>

          {/* Manage Categories Section */}
          {showManageCategories && (
            <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Gerenciar Centros de Despesa</span>
                <button
                  type="button"
                  onClick={() => setShowManageCategories(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do novo centro de despesa"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Centros de Despesa Existentes</span>
                {userData.expenseCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px]">
                    {editingCategory === cat ? (
                      <div className="flex-1 flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditCategory(cat);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                          className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCategoryValue(cat);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Centro de Despesa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Excluir Centro de Despesa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {userData.expenseCategories.length === 0 && (
                  <p className="text-center text-slate-400 py-2">Nenhum centro de despesa cadastrado.</p>
                )}
              </div>
            </div>
          )}

          {/* Manage Payment Types Section */}
          {showManagePaymentTypes && (
            <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Gerenciar Tipos de Pagamento</span>
                <button
                  type="button"
                  onClick={() => setShowManagePaymentTypes(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do novo tipo de pagamento"
                  value={newPaymentTypeName}
                  onChange={(e) => setNewPaymentTypeName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddPaymentType}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tipos de Pagamento Existentes</span>
                {userData.paymentTypes.map(pt => (
                  <div key={pt} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px]">
                    {editingPaymentType === pt ? (
                      <div className="flex-1 flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editPaymentTypeValue}
                          onChange={(e) => setEditPaymentTypeValue(e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditPaymentType(pt);
                            if (e.key === 'Escape') setEditingPaymentType(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditPaymentType(pt)}
                          className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPaymentType(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{pt}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentType(pt);
                              setEditPaymentTypeValue(pt);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Tipo de Pagamento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentType(pt)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  <p className="text-center text-slate-400 py-2">Nenhum tipo de pagamento cadastrado.</p>
                )}
              </div>
            </div>
          )}

          {/* Manage Payment Statuses Section */}
          {showManagePaymentStatuses && (
            <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Gerenciar Situações de Pagamento</span>
                <button
                  type="button"
                  onClick={() => setShowManagePaymentStatuses(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova situação de pagamento"
                  value={newPaymentStatusName}
                  onChange={(e) => setNewPaymentStatusName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddPaymentStatus}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 transition-colors text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Situações de Pagamento Existentes</span>
                {userData.paymentStatuses.map(ps => (
                  <div key={ps} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors min-h-[44px]">
                    {editingPaymentStatus === ps ? (
                      <div className="flex-1 flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={editPaymentStatusValue}
                          onChange={(e) => setEditPaymentStatusValue(e.target.value)}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditPaymentStatus(ps);
                            if (e.key === 'Escape') setEditingPaymentStatus(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditPaymentStatus(ps)}
                          className="text-green-600 hover:text-green-500 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPaymentStatus(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{ps}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentStatus(ps);
                              setEditPaymentStatusValue(ps);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Situação de Pagamento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentStatus(ps)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
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
                  <p className="text-center text-slate-400 py-2">Nenhuma situação de pagamento cadastrada.</p>
                )}
              </div>
            </div>
          )}

          <div className="sm:col-span-3 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingExpenseId(null);
                setDescription('');
                setValue('');
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
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors"
            >
              {editingExpenseId ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </div>
        </form>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Pesquisar por descrição ou centro de despesa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200/50 bg-slate-50 py-2 pl-9 pr-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Year Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Anos</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Ano {y}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
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
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  ▼
                </span>
              </div>

              {/* Quick back to Current Month shortcut if another/all is selected */}
              {selectedMonth !== currentMonthYearStr && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthYearStr);
                    const currentYear = currentMonthYearStr.substring(0, 4);
                    setSelectedYear(currentYear);
                  }}
                  className="rounded-lg border border-slate-200/50 hover:border-blue-400 hover:text-blue-600 bg-white px-3 py-2 font-semibold text-slate-500 transition-all dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-500"
                  title="Mudar para o Mês Corrente"
                >
                  Ir para Mês Corrente
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200/50 bg-slate-50 pl-8 pr-8 py-2 font-medium text-slate-700 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-slate-300 appearance-none cursor-pointer"
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
                <X className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg font-bold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            Soma Filtrada: <span className="font-mono text-red-500">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Data</th>
                <th className="pb-3 font-semibold">Descrição</th>
                <th className="pb-3 font-semibold">Centro de Despesa</th>
                <th className="pb-3 font-semibold">Forma de Pagamento</th>
                <th className="pb-3 font-semibold">Situação</th>
                <th className="pb-3 font-semibold text-right">Valor</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">Nenhum registro de despesa localizado.</td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="py-3 text-slate-500 font-mono">{exp.date.split('-').reverse().join('/')}</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{exp.description}</td>
                    <td className="py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 dark:bg-slate-800 dark:text-slate-400">{exp.category}</span>
                    </td>
                    <td className="py-3 text-slate-500">{exp.paymentType}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        exp.status === 'Pago'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                          : exp.status === 'Pendente'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'
                          : 'bg-red-50 text-red-500 dark:bg-red-950/30'
                      }`}>{exp.status}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-red-500">R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditStart(exp)}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar Despesa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Excluir Despesa"
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
    </div>
  );
};

// ======================== RESUMO MENSAL ========================
export const ResumoMensalPage: React.FC<PageProps> = ({ userData }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(2026);

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
        balanceValue
      };
    }).sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));

    return {
      sumIncome,
      sumExpense,
      balance: sumIncome - sumExpense,
      catStats: Object.entries(catStats).map(([category, value]) => ({ category, value })),
      statement,
      categoriesTableData
    };
  }, [userData.incomes, userData.expenses, userData.annualPlanning, userData.expenseCategories, selectedMonth, selectedYear]);

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
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Receitas do Mês</span>
          <div className="text-xl font-bold text-blue-600 mt-1 font-mono">
            + R$ {monthData.sumIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Despesas do Mês</span>
          <div className="text-xl font-bold text-red-500 mt-1 font-mono">
            - R$ {monthData.sumExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Resultado Líquido</span>
          <div className={`text-xl font-bold mt-1 font-mono ${monthData.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            R$ {monthData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Performance by Cost Center Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Desempenho por Centro de Custo Mensal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <th className="pb-3.5 font-semibold">Centro de Custo</th>
                <th className="pb-3.5 font-semibold text-right">Orçado Mês</th>
                <th className="pb-3.5 font-semibold text-right">Realizado Mês</th>
                <th className="pb-3.5 font-semibold text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {monthData.categoriesTableData.map((item) => (
                <tr key={item.category} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                  <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{item.category}</td>
                  <td className="py-3 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                    R$ {item.budgetedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    R$ {item.realizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${item.balanceValue < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    R$ {item.balanceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {monthData.categoriesTableData.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">Nenhum Centro de Custo cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ======================== RESUMO ANUAL ========================
export const ResumoAnualPage: React.FC<PageProps> = ({ userData }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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
      const yearPlan = userData.annualPlanning.find(p => p.year === selectedYear);
      const budget = yearPlan?.monthlyBudgets.find(b => b.month === idx);
      const plannedExp = budget?.expenseBudget || 0;
      yearPlannedExpenses += plannedExp;

      return {
        monthIndex: idx,
        monthName: monthsList[idx],
        income: monthIncomes,
        expense: monthExpenses,
        budget: plannedExp,
        balance: plannedExp - monthExpenses
      };
    });

    return {
      yearIncomes,
      yearExpenses,
      balance: yearIncomes - yearExpenses,
      monthlySummary
    };
  }, [userData.incomes, userData.expenses, userData.annualPlanning, selectedYear]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Resumo Consolidado Anual</h2>
          <p className="text-xs text-slate-400">Analise seu desempenho orçamentário anual, metas planejadas e realistas.</p>
        </div>
        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border border-slate-200/50 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white">
          {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Receita Total {selectedYear}</span>
          <div className="text-xl font-bold text-blue-600 mt-1 font-mono">
            R$ {annualStats.yearIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Despesa Total {selectedYear}</span>
          <div className="text-xl font-bold text-red-500 mt-1 font-mono">
            R$ {annualStats.yearExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Resultado Acumulado</span>
          <div className={`text-xl font-bold mt-1 font-mono ${annualStats.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            R$ {annualStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Monthly grid breakdown with comparison to budget */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Desempenho Mês a Mês</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <th className="pb-3.5 font-semibold">Mês</th>
                <th className="pb-3.5 font-semibold text-right">Orçado</th>
                <th className="pb-3.5 font-semibold text-right">Realizado</th>
                <th className="pb-3.5 font-semibold text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {annualStats.monthlySummary.map((m) => {
                return (
                  <tr key={m.monthIndex} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{m.monthName}</td>
                    <td className="py-3 text-right font-mono font-extrabold text-slate-950 dark:text-white">R$ {m.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      R$ {m.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 text-right font-mono font-bold ${m.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      R$ {m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Metas</h2>
          <p className="text-xs text-slate-400">Defina objetivos de curto/médio prazo (comprar carro, fundo de reserva) e acompanhe seu progresso.</p>
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

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 grid gap-4 sm:grid-cols-2 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">
              {editingPlanId ? 'Editar Título da Meta' : 'Título da Meta'}
            </label>
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
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleCancelEdit} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900">Cancelar</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors">
              {editingPlanId ? 'Salvar Alterações' : 'Cadastrar Meta'}
            </button>
          </div>
        </form>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-4 bg-slate-100/60 p-4 rounded-xl dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-xs items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          Filtrar Metas
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
                  <span className="text-slate-400">Meta até:</span>
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Ação de melhoria</h2>
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
        <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 grid gap-4 sm:grid-cols-5 text-xs">
          <div>
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
          <div className="sm:col-span-5 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900">Cancelar</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors">Adicionar na Lista</button>
          </div>
        </form>
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
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Planejamento Orçamentário Anual</h2>
          <p className="text-xs text-slate-400">Defina suas metas de ganho e teto máximo de gastos para cada mês do ano.</p>
        </div>
        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border border-slate-200/50 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-900 dark:text-white">
          {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Help Accordion Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
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
          <div className="px-4 pb-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2 animate-fade-in">
            <p className="font-medium text-slate-700 dark:text-slate-300">Siga estes passos simples para estruturar seu orçamento anual:</p>
            <ul className="list-decimal pl-4 space-y-1.5">
              <li>No topo da página, selecione o <strong className="text-slate-800 dark:text-white">ano de exercício</strong> desejado.</li>
              <li>Na seção de limites mensais, estipule sua <strong className="text-slate-800 dark:text-white">Receita Orçada</strong> e seu limite máximo de <strong className="text-slate-800 dark:text-white">Despesa Orçada</strong> para cada mês do ano.</li>
              <li>Para detalhar despesas específicas de forma granular por categoria, utilize o botão <strong className="text-slate-800 dark:text-white">Orçar por Item</strong> destacado abaixo. Ele permite que você associe limites de gastos individuais para cada uma das suas categorias cadastradas.</li>
              <li>Sempre clique em <strong className="text-blue-600 dark:text-blue-400">Salvar Planejamento</strong> após realizar ajustes gerais ou detalhados.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Definição de Limites por Mês</h3>
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
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 text-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200/60 pb-1.5 mb-2 dark:border-slate-800/60">{m}</div>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Receita (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${monthRealIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        disabled={true}
                        className="w-full rounded border px-2.5 py-1.5 font-mono text-slate-500 bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        title="Preenchido automaticamente com o total de receitas reais do mês"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Orçado mensal (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${detailedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        disabled={true}
                        className="w-full rounded border px-2.5 py-1.5 font-mono text-slate-500 bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        title="Calculado a partir do orçamento detalhado"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 mt-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {currentBudget.categoryBudgets && currentBudget.categoryBudgets.length > 0
                        ? `${currentBudget.categoryBudgets.length} item(ns) orçado(s)`
                        : 'Nenhum detalhe'}
                    </span>
                    <button
                      onClick={() => openDetailedBudget(idx)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-[10px] font-extrabold text-white shadow shadow-blue-500/20 transition-all shrink-0 animate-pulse hover:animate-none hover:scale-105"
                    >
                      <Sliders className="h-2.5 w-2.5" />
                      Orçar por Item
                    </button>
                  </div>
                  <button
                    onClick={() => copyPreviousMonthBudget(idx)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-800/80"
                    title={idx === 0 ? "Copiar do Dezembro do ano anterior" : "Copiar do mês anterior"}
                  >
                    <Copy className="h-3 w-3 text-slate-400 shrink-0" />
                    copiar orçado mês anterior
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
export const DadosPessoaisPage: React.FC<PageProps> = ({ userProfile, onUpdateUserProfile }) => {
  const [name, setName] = useState(userProfile.name);
  const [address, setAddress] = useState(userProfile.address || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [state, setState] = useState(userProfile.state || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
        body: JSON.stringify({ name, address, phone, city, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUpdateUserProfile(name, address, phone, city, state);
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
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Dados Cadastrais e Pessoais</h2>
        <p className="text-xs text-slate-400">Gerencie suas informações de contato e faturamento para relatórios personalizados.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 font-semibold text-center">
            ✓ Informações atualizadas com sucesso no banco de dados!
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400">E-mail de Cadastro (Id da Conta)</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="email"
              disabled
              value={userProfile.email}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2 pl-10 pr-3 text-slate-500 font-mono focus:outline-none dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">E-mail utilizado no login. Não pode ser alterado por segurança.</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400">Nome Completo</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400">Telefone / WhatsApp</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Phone className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Ex: (11) 98888-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400">Endereço Completo</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <MapPin className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Ex: Rua das Palmeiras, 100"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Paulo"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Estado</label>
            <input
              type="text"
              placeholder="Ex: SP"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-slate-800 focus:outline-none focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Atualizar Meus Dados'}
        </button>
      </form>

      {/* Supabase Status Dashboard */}
      <SupabaseStatusDashboard />
    </div>
  );
};

// Sub-component for Supabase Status & Schema Helper
const SupabaseStatusDashboard: React.FC = () => {
  const [status, setStatus] = useState<{ active: boolean; url: string; schema: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    fetch('/api/supabase-status')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching Supabase status:', err);
        setLoading(false);
      });
  }, []);

  const handleCopySchema = () => {
    if (status?.schema) {
      navigator.clipboard.writeText(status.schema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center text-xs text-slate-400">
        Carregando status do banco de dados Supabase...
      </div>
    );
  }

  const isConnected = !!status?.active;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <h3 className="font-bold text-slate-800 dark:text-white">Status da Conexão Supabase</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isConnected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
          {isConnected ? 'Nuvem Conectada' : 'Modo Backup Local'}
        </span>
      </div>

      {isConnected ? (
        <div className="space-y-2">
          <p className="text-slate-500 leading-relaxed">
            Parabéns! Sua aplicação está conectada com sucesso ao banco de dados do **Supabase**. Todos os acessos de login, cadastro e lançamentos financeiros estão sendo persistidos de forma segura na nuvem.
          </p>
          <div className="rounded-lg bg-slate-50 p-2 text-[10px] font-mono text-slate-500 dark:bg-slate-950 dark:text-slate-400 break-all border border-slate-100 dark:border-slate-800">
            <strong>SUPABASE_URL:</strong> {status?.url}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start space-x-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-slate-500 leading-relaxed">
              As variáveis de ambiente do Supabase não foram configuradas no seu arquivo `.env`. Por segurança, a aplicação está rodando no **Modo Backup Local** salvando seus dados localmente no servidor.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <p className="font-bold">Para ativar a persistência em Nuvem com Supabase:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Crie um projeto grátis em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-semibold">supabase.com</a></li>
              <li>Acesse as configurações de API do projeto para obter a URL e a Anon Key.</li>
              <li>Adicione as variáveis ao seu arquivo `.env` da aplicação.</li>
            </ol>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 dark:text-slate-300">Esquema do Banco de Dados (DDL)</span>
          <button
            onClick={handleCopySchema}
            className="flex items-center space-x-1.5 rounded bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <Copy className="h-3 w-3" />
            <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
          </button>
        </div>
        <p className="text-slate-400 text-[10px]">
          Execute o script abaixo no **SQL Editor** do painel do seu Supabase para criar as tabelas estruturadas necessárias para a sua conta de login e lançamentos:
        </p>
        <pre className="rounded-lg bg-slate-950 p-3 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-slate-800">
          {status?.schema}
        </pre>
      </div>
    </div>
  );
};

