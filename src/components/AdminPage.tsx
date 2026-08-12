import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserData } from '../types';
import { Shield, UserPlus, Users, BadgeAlert, Sparkles, FolderSync, Mail, Phone, MapPin, Eye, EyeOff, RefreshCw, KeyRound, Pencil, Trash2, Settings, DollarSign, Clock, Bell, FileText, Database, CheckCircle2, XCircle, Copy, AlertTriangle, MessageSquare, Save } from 'lucide-react';

interface AdminPageProps {
  adminUser: UserProfile;
}

export const AdminPage: React.FC<AdminPageProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Supabase Connection Verification State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    loading: boolean;
    active: boolean | null;
    url: string;
    message: string;
    schema?: string;
  }>({
    loading: true,
    active: null,
    url: '',
    message: '',
    schema: '',
  });

  const [copiedSchema, setCopiedSchema] = useState(false);

  const checkSupabaseStatus = async () => {
    setSupabaseStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/supabase-status');
      const data = await res.json();
      setSupabaseStatus({
        loading: false,
        active: !!data.active,
        url: data.url || '',
        message: data.message || (data.active ? 'Conectado ao Supabase com sucesso!' : 'Desconectado do Supabase'),
        schema: data.schema || '',
      });
    } catch (err) {
      setSupabaseStatus({
        loading: false,
        active: false,
        url: '',
        message: 'Erro ao verificar conexão com o Supabase.',
        schema: '',
      });
    }
  };

  const handleCopySchema = () => {
    if (supabaseStatus.schema) {
      navigator.clipboard.writeText(supabaseStatus.schema);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
  }, []);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'gestao' | 'config-valores' | 'limite-uso-gratuito' | 'avisos' | 'relatorios'>('gestao');

  // Reports filters state
  const [reportStateFilter, setReportStateFilter] = useState('all');
  const [reportCityFilter, setReportCityFilter] = useState('all');

  // Values configuration state
  const [pricesDePor, setPricesDePor] = useState({
    mensal_de: '',
    mensal_por: '',
    anual_de: '',
    anual_por: ''
  });
  const [fetchingPrices, setFetchingPrices] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesSuccess, setPricesSuccess] = useState('');
  const [pricesError, setPricesError] = useState('');

  // Free trial days state
  const [freeTrialDaysInput, setFreeTrialDaysInput] = useState('60');
  const [freeTrialLoading, setFreeTrialLoading] = useState(false);
  const [freeTrialSuccess, setFreeTrialSuccess] = useState('');
  const [freeTrialError, setFreeTrialError] = useState('');

  // Notices state
  const [rule50_30_20Title, setRule50_30_20Title] = useState('Regra 50-30-20');
  const [rule50_30_20Message, setRule50_30_20Message] = useState('Divida sua renda líquida: 50% para necessidades (aluguel, contas), 30% para desejos (lazer, compras) e 20% para poupança ou investimentos.');
  const [weeklyCheckTitle, setWeeklyCheckTitle] = useState('Acompanhamento Semanal');
  const [weeklyCheckMessage, setWeeklyCheckMessage] = useState('Reserve 10 minutos por semana para revisar suas receitas e despesas cadastradas no FinanFly. Pequenos ajustes evitam surpresas no fim do mês.');
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesSuccess, setNoticesSuccess] = useState('');
  const [noticesError, setNoticesError] = useState('');

  useEffect(() => {
    fetch('/api/plan-prices')
      .then(res => res.json())
      .then(data => {
        if (data && data.mensal_por) {
          setPricesDePor(data);
        }
      })
      .catch(err => console.error('Erro ao carregar valores no admin:', err))
      .finally(() => setFetchingPrices(false));

    fetch('/api/free-trial-days')
      .then(res => res.json())
      .then(data => {
        if (data && data.days !== undefined) {
          setFreeTrialDaysInput(String(data.days));
        }
      })
      .catch(err => console.error('Erro ao carregar limite grátis no admin:', err));

    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        if (data && data.rule50_30_20) {
          setRule50_30_20Title(data.rule50_30_20.title || '');
          setRule50_30_20Message(data.rule50_30_20.message || '');
          setWeeklyCheckTitle(data.weeklyCheck.title || '');
          setWeeklyCheckMessage(data.weeklyCheck.message || '');
        }
      })
      .catch(err => console.error('Erro ao carregar avisos no admin:', err));
  }, []);

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newPlan, setNewPlan] = useState<'none' | 'gratis' | 'mensal' | 'anual' | 'livre'>('none');
  const [successMsg, setSuccessMsg] = useState('');

  // Password reminder state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEmail, setReminderEmail] = useState('');
  const [foundPassword, setFoundPassword] = useState('');

  // Email password reminder state
  const [showEmailReminderForm, setShowEmailReminderForm] = useState(false);
  const [selectedEmailForReminder, setSelectedEmailForReminder] = useState('');
  const [emailReminderSuccess, setEmailReminderSuccess] = useState('');
  const [emailReminderError, setEmailReminderError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // User delete confirmation state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deletingUserLoading, setDeletingUserLoading] = useState(false);

  // Editing state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPlan, setEditPlan] = useState<'none' | 'gratis' | 'mensal' | 'anual' | 'livre'>('none');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auditing inspector state
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<UserProfile | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditUserMessage, setAuditUserMessage] = useState('');
  const [savingAuditMessage, setSavingAuditMessage] = useState(false);
  const [auditSaveSuccess, setAuditSaveSuccess] = useState('');
  const [auditSaveError, setAuditSaveError] = useState('');

  // Helper memo to compute audit statistics and last 30 entries (without values)
  const auditAnalysis = useMemo(() => {
    if (!auditData) return { totalEntriesCount: 0, incomesCount: 0, expensesCount: 0, investmentsCount: 0, tripsCount: 0, wishesCount: 0, shoppingCount: 0, plansCount: 0, recent30AuditEntries: [] };

    const uData = auditData.userData || auditData || {};
    const incomes = Array.isArray(uData.incomes) ? uData.incomes : [];
    const expenses = Array.isArray(uData.expenses) ? uData.expenses : [];
    const investments = Array.isArray(uData.investments) ? uData.investments : [];
    const trips = Array.isArray(uData.trips) ? uData.trips : [];
    const wishes = Array.isArray(uData.wishes) ? uData.wishes : [];
    const shoppingList = Array.isArray(uData.shoppingList) ? uData.shoppingList : [];
    const actionPlans = Array.isArray(uData.actionPlans) ? uData.actionPlans : [];

    const incomesCount = incomes.length;
    const expensesCount = expenses.length;
    const investmentsCount = investments.length;
    const tripsCount = trips.length;
    const wishesCount = wishes.length;
    const shoppingCount = shoppingList.length;
    const plansCount = actionPlans.length;

    const totalEntriesCount = incomesCount + expensesCount + investmentsCount + tripsCount + wishesCount + shoppingCount + plansCount;

    const list: Array<{
      type: string;
      typeBadge: string;
      description: string;
      details: string;
      date: string;
      timestamp: number;
    }> = [];

    // Incomes
    incomes.forEach((inc: any) => {
      const d = inc.date || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Receita',
        typeBadge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        description: inc.description || 'Sem descrição',
        details: [inc.category ? `Categoria: ${inc.category}` : null, inc.paymentType ? `Tipo: ${inc.paymentType}` : null].filter(Boolean).join(' • ') || 'Sem detalhes',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Expenses
    expenses.forEach((exp: any) => {
      const d = exp.date || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Despesa',
        typeBadge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
        description: exp.description || 'Sem descrição',
        details: [exp.category ? `Categoria: ${exp.category}` : null, exp.paymentType ? `Tipo: ${exp.paymentType}` : null, exp.classification ? `Classificação: ${exp.classification}` : null].filter(Boolean).join(' • ') || 'Sem detalhes',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Investments
    investments.forEach((inv: any) => {
      const d = inv.date || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Investimento',
        typeBadge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        description: inv.name || 'Sem nome',
        details: [inv.type ? `Tipo: ${inv.type}` : null, inv.status ? `Status: ${inv.status}` : null].filter(Boolean).join(' • ') || 'Investimento',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Trips
    trips.forEach((trip: any) => {
      const d = trip.startDate || (trip.year ? `${trip.year}-01-01` : '');
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Viagem',
        typeBadge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
        description: trip.title || trip.destination || 'Viagem',
        details: trip.destination ? `Destino: ${trip.destination}` : 'Viagem',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Wishes
    wishes.forEach((wish: any) => {
      const d = wish.targetDate || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Desejo / Sonho',
        typeBadge: 'bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300 border border-pink-200 dark:border-pink-800',
        description: wish.title || 'Desejo',
        details: wish.category ? `Categoria: ${wish.category}` : 'Desejo',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Shopping List
    shoppingList.forEach((shop: any) => {
      const d = shop.date || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Lista de Compras',
        typeBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        description: shop.name || 'Item de compra',
        details: shop.category ? `Categoria: ${shop.category}` : 'Lista de Compras',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Action Plans
    actionPlans.forEach((plan: any) => {
      const d = plan.deadline || '';
      const ts = d ? new Date(d).getTime() : 0;
      list.push({
        type: 'Plano de Ação',
        typeBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        description: plan.description || 'Plano de Ação',
        details: plan.target ? `Alvo: ${plan.target}` : 'Ação',
        date: d,
        timestamp: isNaN(ts) ? 0 : ts
      });
    });

    // Sort by timestamp descending
    list.sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalEntriesCount,
      incomesCount,
      expensesCount,
      investmentsCount,
      tripsCount,
      wishesCount,
      shoppingCount,
      plansCount,
      recent30AuditEntries: list.slice(0, 30)
    };
  }, [auditData]);

  // Dynamic calculations for Reports
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    users.forEach(u => {
      if (u.state && u.state.trim()) {
        states.add(u.state.trim().toUpperCase());
      }
    });
    return Array.from(states).sort();
  }, [users]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    users.forEach(u => {
      if (u.city && u.city.trim()) {
        const matchesState = reportStateFilter === 'all' || (u.state && u.state.trim().toUpperCase() === reportStateFilter);
        if (matchesState) {
          cities.add(u.city.trim());
        }
      }
    });
    return Array.from(cities).sort();
  }, [users, reportStateFilter]);

  const filteredReportUsers = useMemo(() => {
    return users.filter(u => {
      const matchesState = reportStateFilter === 'all' || (u.state && u.state.trim().toUpperCase() === reportStateFilter);
      const matchesCity = reportCityFilter === 'all' || (u.city && u.city.trim().toLowerCase() === reportCityFilter.toLowerCase());
      return matchesState && matchesCity;
    });
  }, [users, reportStateFilter, reportCityFilter]);

  const handleReportStateChange = (val: string) => {
    setReportStateFilter(val);
    setReportCityFilter('all');
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-user-email': adminUser.email }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar usuários.');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrievePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setFoundPassword('');
    if (!reminderEmail) return;

    try {
      const res = await fetch(`/api/admin/retrieve-password/${encodeURIComponent(reminderEmail.trim())}`, {
        headers: {
          'x-user-email': adminUser.email,
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao recuperar senha.');
      }
      setFoundPassword(data.password);
      setSuccessMsg(`Senha localizada com sucesso!`);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    }
  };

  const handleDeleteUser = async (targetEmail: string) => {
    setDeletingUserLoading(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({ targetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir o registro.');

      setUsers(prev => prev.filter(u => u.email !== targetEmail));
      setUserToDelete(null);
      alert('Usuário e todos os seus dados foram excluídos permanentemente com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao tentar deletar o usuário.');
    } finally {
      setDeletingUserLoading(false);
    }
  };

  const handleSendPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmailForReminder) {
      setEmailReminderError('Por favor, selecione um usuário.');
      return;
    }
    setSendingEmail(true);
    setEmailReminderError('');
    setEmailReminderSuccess('');
    try {
      const res = await fetch('/api/admin/send-password-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({ targetEmail: selectedEmailForReminder })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar a senha por e-mail.');
      setEmailReminderSuccess(data.message || `E-mail enviado com sucesso para ${selectedEmailForReminder}.`);
    } catch (err: any) {
      setEmailReminderError(err.message || 'Erro de envio.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'user');
    setEditPlan(user.subscription?.plan || 'none');
    setEditPassword('');
    setEditAddress(user.address || '');
    setEditPhone(user.phone || '');
    setEditCity(user.city || '');
    setEditState(user.state || '');
    setError('');
    setSuccessMsg('');
    setShowCreateForm(false);
    setShowReminderForm(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!editingUser) return;

    try {
      const res = await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({
          targetEmail: editingUser.email,
          name: editName,
          role: editRole,
          plan: editPlan,
          password: editPassword,
          address: editAddress,
          phone: editPhone,
          city: editCity,
          state: editState
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações.');

      setSuccessMsg('Usuário atualizado com sucesso!');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados do usuário.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate admin KPIs
  const stats = useMemo(() => {
    const total = users.length;
    let active = 0;
    let expired = 0;
    let pendingApproval = 0;

    users.forEach(u => {
      if (u.role === 'admin') return;
      const validUntil = u.subscription?.validUntil;
      const isApproved = u.subscription?.approved;
      const hasPlan = u.subscription?.plan && u.subscription.plan !== 'none';

      if (hasPlan) {
        const isValid = u.subscription?.plan === 'livre' || (validUntil && new Date(validUntil) > new Date());
        if (isValid) {
          if (isApproved) {
            active++;
          } else {
            pendingApproval++;
          }
        } else {
          expired++;
        }
      } else {
        expired++;
      }
    });

    return { total, active, expired, pendingApproval };
  }, [users]);

  // Compute filtered users based on selected status and search query
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Filter by search query (name or email)
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filter by status Filter
      if (statusFilter === 'all') return true;

      const isApproved = user.subscription?.approved;
      const plan = user.subscription?.plan || 'none';
      const valid = plan === 'livre' || (user.subscription?.validUntil && new Date(user.subscription.validUntil) > new Date());

      if (statusFilter === 'admin') {
        return user.role === 'admin';
      }

      if (user.role === 'admin') {
        // If they filter specifically for non-admin states, admins shouldn't show up.
        return false;
      }

      if (statusFilter === 'approved') {
        // Approved and has active plan
        return isApproved && plan !== 'none' && valid;
      }

      if (statusFilter === 'pending') {
        // Pending approval (even if plan exists, but not approved)
        return !isApproved && plan !== 'none' && valid;
      }

      if (statusFilter === 'expired') {
        // No plan or expired plan
        return plan === 'none' || !valid;
      }

      return true;
    });
  }, [users, statusFilter, searchQuery]);

  const handleToggleApproval = async (targetEmail: string, currentApprovedStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({ targetEmail, approve: !currentApprovedStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar aprovação.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newEmail || !newName) {
      setError('E-mail e Nome Completo são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({
          targetEmail: newEmail,
          password: newPassword || 'user123',
          name: newName,
          role: newRole,
          plan: newPlan
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar usuário.');

      setSuccessMsg('Usuário criado com sucesso!');
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('user');
      setNewPlan('none');
      
      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário.');
    }
  };

  // Inspect user data
  const handleInspectUser = async (user: UserProfile) => {
    setSelectedUserForAudit(user);
    setAuditUserMessage(user.userMessage || user.mensagemUsuario || '');
    setAuditSaveSuccess('');
    setAuditSaveError('');
    setAuditData(null);
    setLoadingAudit(true);

    try {
      const res = await fetch(`/api/admin/user-details/${encodeURIComponent(user.email)}`, {
        headers: { 'x-user-email': adminUser.email }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar dados.');
      setAuditData(data);
      if (data.userProfile) {
        const msg = data.userProfile.userMessage || data.userProfile.mensagemUsuario || '';
        setAuditUserMessage(msg);
        setSelectedUserForAudit(prev => prev ? { ...prev, ...data.userProfile, userMessage: msg, mensagemUsuario: msg } : data.userProfile);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao obter registros financeiros.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSaveAuditMessage = async () => {
    if (!selectedUserForAudit) return;
    setSavingAuditMessage(true);
    setAuditSaveSuccess('');
    setAuditSaveError('');

    try {
      const res = await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({
          targetEmail: selectedUserForAudit.email,
          userMessage: auditUserMessage,
          mensagemUsuario: auditUserMessage
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar mensagem.');

      const updatedUser = {
        ...selectedUserForAudit,
        userMessage: auditUserMessage,
        mensagemUsuario: auditUserMessage
      };

      setSelectedUserForAudit(updatedUser);
      setUsers(prev => prev.map(u => u.email.toLowerCase() === selectedUserForAudit.email.toLowerCase() ? updatedUser : u));
      setAuditSaveSuccess('Mensagem salva com sucesso!');
      setTimeout(() => setAuditSaveSuccess(''), 4000);
    } catch (err: any) {
      setAuditSaveError(err.message || 'Erro ao salvar.');
    } finally {
      setSavingAuditMessage(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricesLoading(true);
    setPricesSuccess('');
    setPricesError('');

    try {
      const res = await fetch('/api/admin/plan-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify(pricesDePor)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar valores.');
      setPricesSuccess('Valores salvos e sincronizados com a página de assinaturas com sucesso!');
      if (data.prices) {
        setPricesDePor(data.prices);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('planPricesUpdated', { detail: data.prices }));
        }
      }
    } catch (err: any) {
      setPricesError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setPricesLoading(false);
    }
  };

  const handleSaveFreeTrialDays = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreeTrialLoading(true);
    setFreeTrialSuccess('');
    setFreeTrialError('');

    try {
      const res = await fetch('/api/admin/free-trial-days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({ days: Number(freeTrialDaysInput) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar limite de uso gratuito.');
      setFreeTrialSuccess(data.message || 'Limite de uso gratuito salvo com sucesso!');
    } catch (err: any) {
      setFreeTrialError(err.message || 'Ocorreu um erro.');
    } finally {
      setFreeTrialLoading(false);
    }
  };

  const handleSaveNotices = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticesLoading(true);
    setNoticesSuccess('');
    setNoticesError('');

    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminUser.email
        },
        body: JSON.stringify({
          rule50_30_20: { title: rule50_30_20Title, message: rule50_30_20Message },
          weeklyCheck: { title: weeklyCheckTitle, message: weeklyCheckMessage }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar avisos.');
      setNoticesSuccess(data.message || 'Avisos atualizados com sucesso!');
    } catch (err: any) {
      setNoticesError(err.message || 'Ocorreu um erro.');
    } finally {
      setNoticesLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Painel Geral do Administrador
          </span>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            Gestão de Contas e Assinaturas
          </h2>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Dados
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto max-w-full border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('gestao')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'gestao'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Gestão de Usuários
        </button>
        <button
          onClick={() => setActiveTab('config-valores')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'config-valores'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          Configuração de Valores
        </button>
        <button
          onClick={() => setActiveTab('limite-uso-gratuito')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'limite-uso-gratuito'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Limite de Uso Gratuito
        </button>
        <button
          onClick={() => setActiveTab('avisos')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'avisos'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="h-4 w-4" />
          Avisos
        </button>
        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'relatorios'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Relatórios
        </button>
      </div>

      {/* Admin KPIs Row */}
      {activeTab === 'gestao' && (
        <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Usuários</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white font-mono">{stats.total}</h3>
            <p className="mt-1 text-[10px] text-slate-400">Contas registradas</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Planos Ativos</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.active}</h3>
            <p className="mt-1 text-[10px] text-slate-400">Assinaturas vigentes</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Planos Expirados / Inativos</span>
            <BadgeAlert className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.expired}</h3>
            <p className="mt-1 text-[10px] text-slate-400">Sem assinatura em dia</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Aprovações Pendentes</span>
            <FolderSync className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">{stats.pendingApproval}</h3>
            <p className="mt-1 text-[10px] text-slate-400">Aguardando liberação manual</p>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'gestao' && (
        <div className="flex flex-col gap-4">
        {/* Panel header with "Cadastrar e Liberar Acesso" and "Relembrar Senha" triggers */}
        <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Usuários Cadastrados & Aprovações Manuais
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Gerencie os acessos, permissões e planos dos usuários da plataforma.</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full">
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setShowReminderForm(false);
                setShowEmailReminderForm(false);
                setError('');
                setSuccessMsg('');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              {showCreateForm ? 'Fechar Cadastro' : 'Cadastrar e Liberar Acesso'}
            </button>
            <button
              onClick={() => {
                setShowReminderForm(!showReminderForm);
                setShowCreateForm(false);
                setShowEmailReminderForm(false);
                setError('');
                setSuccessMsg('');
                setReminderEmail('');
                setFoundPassword('');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors w-full sm:w-auto"
            >
              <KeyRound className="h-4 w-4 text-amber-500" />
              {showReminderForm ? 'Fechar Relembrar' : 'Relembrar Senha'}
            </button>
            <button
              onClick={() => {
                setShowEmailReminderForm(!showEmailReminderForm);
                setShowCreateForm(false);
                setShowReminderForm(false);
                setEmailReminderError('');
                setEmailReminderSuccess('');
                setSelectedEmailForReminder('');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors w-full sm:w-auto"
            >
              <Mail className="h-4 w-4 text-violet-500" />
              {showEmailReminderForm ? 'Fechar Lembrar E-mail' : 'Lembrar senha usuário e-mail'}
            </button>
          </div>
        </div>

        {/* Collapsible e-mail reminder form */}
        {showEmailReminderForm && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/10 p-5 shadow-sm dark:border-violet-900/40 dark:bg-violet-950/10 animate-fade-in space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-violet-500" />
              Lembrar senha usuário e-mail
            </h3>

            {emailReminderError && <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{emailReminderError}</p>}
            {emailReminderSuccess && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">{emailReminderSuccess}</p>}

            <form onSubmit={handleSendPasswordEmail} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Escolha o Usuário</label>
                  <select
                    value={selectedEmailForReminder}
                    onChange={(e) => {
                      setSelectedEmailForReminder(e.target.value);
                      setEmailReminderError('');
                      setEmailReminderSuccess('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Selecione o usuário para enviar a senha por e-mail --</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-violet-600 hover:bg-violet-700 px-5 py-2 font-bold text-white transition-colors shadow-md shadow-violet-500/10"
                    disabled={sendingEmail || !selectedEmailForReminder}
                  >
                    {sendingEmail ? 'Enviando...' : 'Enviar senha por e-mail'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailReminderForm(false);
                      setSelectedEmailForReminder('');
                      setEmailReminderError('');
                      setEmailReminderSuccess('');
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Collapsible reminder form */}
        {showReminderForm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/10 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/10 animate-fade-in space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Relembrar Senha de Usuário
            </h3>

            {error && <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{error}</p>}
            {successMsg && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">{successMsg}</p>}

            <form onSubmit={handleRetrievePassword} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Selecione o Usuário</label>
                  <select
                    value={reminderEmail}
                    onChange={(e) => {
                      setReminderEmail(e.target.value);
                      setFoundPassword('');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Escolha um usuário para consultar a senha --</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2 font-bold text-white transition-colors shadow-md shadow-amber-500/10"
                    disabled={!reminderEmail}
                  >
                    Recuperar Senha
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReminderForm(false);
                      setReminderEmail('');
                      setFoundPassword('');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {foundPassword && (
                <div className="mt-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-amber-200 space-y-1 animate-fade-in">
                  <p className="font-semibold text-xs text-amber-800 dark:text-amber-300">Credenciais Recuperadas:</p>
                  <div className="grid gap-1 sm:grid-cols-2 text-xs font-mono">
                    <div>E-mail: <span className="font-bold select-all text-slate-900 dark:text-white">{reminderEmail}</span></div>
                    <div>Senha: <span className="font-bold select-all text-amber-700 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">{foundPassword}</span></div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Collapsible registration form */}
        {showCreateForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/10 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/10 animate-fade-in space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-blue-500" />
              Cadastrar Novo Usuário e Liberar Acesso
            </h3>

            {error && <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{error}</p>}
            {successMsg && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">{successMsg}</p>}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Souza"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Senha Provisória</label>
                  <div className="relative mt-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Padrão: user123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Nível</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Plano Inicial</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="none">Nenhum</option>
                    <option value="gratis">Grátis (60d)</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="livre">Plano Livre 🔓 (Sem cobrança / Vitalício)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 transition-colors"
                >
                  Criar Conta e Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Collapsible editing form */}
        {editingUser && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/10 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10 animate-fade-in space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Pencil className="h-4 w-4 text-emerald-500" />
              Editar Cadastro: {editingUser.name} ({editingUser.email})
            </h3>

            {error && <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{error}</p>}
            {successMsg && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">{successMsg}</p>}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Souza"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Alterar Senha</label>
                  <div className="relative mt-1">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Deixe em branco para manter a senha atual"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      title={showEditPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Endereço Completo</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Estado</label>
                  <input
                    type="text"
                    placeholder="Ex: SP"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Nível / Perfil</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Plano de Assinatura</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="none">Nenhum / Inativo</option>
                    <option value="gratis">Grátis (60d)</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual ✨</option>
                    <option value="livre">Plano Livre 🔓 (Sem cobrança / Vitalício)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users list panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="w-full sm:max-w-xs relative">
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200/50 bg-slate-50 px-3 py-1.5 pl-8 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white"
              />
              <div className="absolute left-2.5 top-2.5 text-slate-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <label className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Filtrar Status Acesso:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-slate-200/50 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-800/50 dark:bg-slate-950 dark:text-white font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="approved">Aprovados / Ativos ✅</option>
                <option value="pending">Pendentes de Aprovação ⏳</option>
                <option value="expired">Inativos / Expirados ❌</option>
                <option value="admin">Administradores 🛡️</option>
              </select>

              {(searchQuery !== '' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 text-xs font-bold transition-all dark:border-red-950 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 shrink-0"
                  title="Limpar filtros"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Nenhum usuário cadastrado.</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">Nenhum usuário corresponde aos filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                    <th className="pb-3.5 font-bold uppercase tracking-wider">Usuário</th>
                    <th className="pb-3.5 font-bold uppercase tracking-wider">Nível / Perfil</th>
                    <th className="pb-3.5 font-bold uppercase tracking-wider">Plano</th>
                    <th className="pb-3.5 font-bold uppercase tracking-wider">Data de Cadastro</th>
                    <th className="pb-3.5 font-bold uppercase tracking-wider text-center">Status Acesso</th>
                    <th className="pb-3.5 font-bold uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.map((user) => {
                    const plan = user.subscription?.plan || 'none';
                    const valid = plan === 'livre' || (user.subscription?.validUntil && new Date(user.subscription.validUntil) > new Date());
                    const isApproved = user.subscription?.approved;

                    return (
                      <tr key={user.email} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role === 'admin'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {plan === 'gratis' && 'Grátis (60d)'}
                            {plan === 'mensal' && 'Mensal'}
                            {plan === 'anual' && 'Anual ✨'}
                            {plan === 'livre' && 'Livre 🔓'}
                            {plan === 'none' && 'Nenhum'}
                          </div>
                          {plan !== 'livre' && user.subscription?.validUntil && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              Exp: {new Date(user.subscription.validUntil).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {plan === 'livre' && (
                            <div className="text-[9px] text-emerald-500 font-semibold">
                              Acesso Vitalício
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                          </div>
                          {user.createdAt && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              {new Date(user.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {user.role === 'admin' ? (
                            <span className="text-[10px] text-emerald-600 font-bold">Livre</span>
                          ) : (
                            <button
                              onClick={() => handleToggleApproval(user.email, isApproved)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40'
                                  : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40'
                              }`}
                            >
                              {isApproved ? 'Aprovado ✓' : 'Aprovar manual ➜'}
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectUser(user)}
                              title="Auditar dados do usuário"
                              aria-label="Auditar"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(user)}
                              title="Editar cadastro do usuário"
                              aria-label="Editar"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {user.email.toLowerCase().trim() !== adminUser.email.toLowerCase().trim() && (
                              <button
                                onClick={() => setUserToDelete(user)}
                                title="Excluir usuário e todos os seus dados"
                                aria-label="Excluir"
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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
      </div>
      )}

      {/* User audit detailed console */}
      {activeTab === 'gestao' && selectedUserForAudit && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-6 dark:border-blue-900/60 dark:bg-blue-950/10">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3 mb-4 dark:border-blue-900/40">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">
              Auditoria de Dados: {selectedUserForAudit.name}
            </h3>
            <button
              onClick={() => setSelectedUserForAudit(null)}
              className="text-blue-500 hover:text-blue-700 text-xs font-bold"
            >
              Fechar Visualização ✕
            </button>
          </div>

          {/* User profile details layout */}
          <div className="grid gap-3 sm:grid-cols-3 mb-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Mail className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">E-mail: <strong>{selectedUserForAudit.email}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Telefone: <strong>{selectedUserForAudit.phone || 'Não cadastrado'}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <Clock className="h-4 w-4 text-purple-500 shrink-0" />
              <span>
                Último Acesso:{' '}
                <strong>
                  {auditData?.lastAccess
                    ? new Date(auditData.lastAccess).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : selectedUserForAudit.createdAt
                    ? new Date(selectedUserForAudit.createdAt).toLocaleDateString('pt-BR')
                    : 'Não registrado'}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2 sm:col-span-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                <div>
                  Endereço: <strong className="text-slate-800 dark:text-white">{selectedUserForAudit.address || 'Não informado'}</strong>
                </div>
                {(selectedUserForAudit.city || selectedUserForAudit.state) && (
                  <div className="text-[11px] text-slate-500">
                    Cidade/Estado: <strong className="text-slate-700 dark:text-slate-200">{selectedUserForAudit.city || 'Não informado'} - {selectedUserForAudit.state || 'Não informado'}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Campo Mensagem Usuário (Atribuído aos dados pessoais do usuário, visível e editável exclusivamente pelo administrador na auditoria) */}
          <div className="mb-6 rounded-xl border border-blue-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  mensagem usuário
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Anotação interna de dados pessoais (visível apenas no painel do administrador)
              </span>
            </div>

            <div>
              <textarea
                rows={3}
                value={auditUserMessage}
                onChange={(e) => setAuditUserMessage(e.target.value)}
                placeholder="Escreva aqui a mensagem do usuário ou anotações internas..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {auditSaveSuccess && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {auditSaveSuccess}
                </span>
              )}
              {auditSaveError && (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  {auditSaveError}
                </span>
              )}
              {!auditSaveSuccess && !auditSaveError && <div />}

              <button
                type="button"
                onClick={handleSaveAuditMessage}
                disabled={savingAuditMessage}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 ml-auto"
              >
                <Save className="h-3.5 w-3.5" />
                {savingAuditMessage ? 'Salvando...' : 'Salvar tudo'}
              </button>
            </div>
          </div>

          {loadingAudit ? (
            <p className="text-center text-xs text-slate-400 py-6">Buscando auditoria de lançamentos do usuário...</p>
          ) : !auditData ? (
            <p className="text-center text-xs text-slate-400 py-6">Nenhum registro para este usuário.</p>
          ) : (
            <div className="space-y-6">
              {/* Status de lançamento de dados */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Status de Lançamento de Dados
                    </h4>
                  </div>
                  {auditAnalysis.totalEntriesCount > 0 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Realizando Lançamentos Ativamente
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1.5 w-fit">
                      <XCircle className="h-3.5 w-3.5 text-amber-600" />
                      Sem Lançamentos Cadastrados
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs text-slate-600 dark:text-slate-300">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Registrado</span>
                    <strong className="text-sm font-extrabold text-slate-800 dark:text-white">{auditAnalysis.totalEntriesCount} lançamentos</strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Receitas / Despesas</span>
                    <strong className="text-slate-800 dark:text-white font-bold">{auditAnalysis.incomesCount} Rec. / {auditAnalysis.expensesCount} Desp.</strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Investimentos</span>
                    <strong className="text-slate-800 dark:text-white font-bold">{auditAnalysis.investmentsCount} cadastros</strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Outros Módulos</span>
                    <strong className="text-slate-800 dark:text-white font-bold">{auditAnalysis.tripsCount + auditAnalysis.wishesCount + auditAnalysis.shoppingCount + auditAnalysis.plansCount} registros</strong>
                  </div>
                </div>
              </div>

              {/* Breve histórico dos últimos 30 tipos de lançamento (sem valores) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Últimos Lançamentos (Até 30 itens • Sem Exibição de Valores)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Histórico com os tipos, descrições e categorias das movimentações recentes do usuário.
                  </p>
                </div>

                {auditAnalysis.recent30AuditEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Nenhum lançamento foi realizado por este usuário até o momento.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                          <th className="py-2 px-3 w-10">#</th>
                          <th className="py-2 px-3">Tipo / Módulo</th>
                          <th className="py-2 px-3">Descrição do Lançamento</th>
                          <th className="py-2 px-3">Categoria / Detalhes</th>
                          <th className="py-2 px-3 text-right">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {auditAnalysis.recent30AuditEntries.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-[10px] font-mono text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${item.typeBadge}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {item.description}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                              {item.details}
                            </td>
                            <td className="py-2 px-3 text-right text-[10px] font-mono text-slate-500 whitespace-nowrap">
                              {item.date || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config-valores' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Configuração de Valores dos Planos de Assinatura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defina os valores "De" (original/riscado) e "Por" (atual/cobrado) para os planos mensal e anual. Esses valores serão exibidos na tela de contratação.
            </p>
          </div>

          {pricesSuccess && (
            <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              {pricesSuccess}
            </div>
          )}

          {pricesError && (
            <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900/30">
              {pricesError}
            </div>
          )}

          <form onSubmit={handleSavePrices} className="space-y-6 text-xs">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Plano Mensal Section */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Plano Mensal
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Valor Original ("De")
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 font-bold text-[11px]">R$</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="29,90"
                        value={pricesDePor.mensal_de}
                        onChange={(e) => setPricesDePor({ ...pricesDePor, mensal_de: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Valor Atual ("Por")
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 font-bold text-[11px]">R$</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="19,90"
                        value={pricesDePor.mensal_por}
                        onChange={(e) => setPricesDePor({ ...pricesDePor, mensal_por: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plano Anual Section */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Plano Anual
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Valor Original ("De")
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 font-bold text-[11px]">R$</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="299,00"
                        value={pricesDePor.anual_de}
                        onChange={(e) => setPricesDePor({ ...pricesDePor, anual_de: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Valor Atual ("Por")
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 font-bold text-[11px]">R$</span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="149,00"
                        value={pricesDePor.anual_por}
                        onChange={(e) => setPricesDePor({ ...pricesDePor, anual_por: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={pricesLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-blue-500/10 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {pricesLoading ? 'Salvando...' : 'Salvar Novos Valores'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'limite-uso-gratuito' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Limite de Uso Gratuito
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defina a quantidade de dias que o usuário terá de período de experiência (trial) ao selecionar o plano gratuito no sistema.
            </p>
          </div>

          {freeTrialSuccess && (
            <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900/30 animate-fade-in">
              {freeTrialSuccess}
            </div>
          )}

          {freeTrialError && (
            <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900/30 animate-fade-in">
              {freeTrialError}
            </div>
          )}

          <form onSubmit={handleSaveFreeTrialDays} className="space-y-6 text-xs">
            <div className="max-w-md p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Dias de Período de Experiência
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="60"
                    value={freeTrialDaysInput}
                    onChange={(e) => setFreeTrialDaysInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold text-slate-800 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Novos usuários ou alterações manuais para o plano gratuito usarão este período de tempo para definir a data limite de expiração da assinatura.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={freeTrialLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-blue-500/10 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {freeTrialLoading ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'avisos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Configuração de Avisos (Dicas de Saúde Financeira)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Personalize o título e as mensagens explicativas exibidas na página principal de todos os usuários do sistema.
            </p>
          </div>

          {noticesSuccess && (
            <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900/30 animate-fade-in">
              {noticesSuccess}
            </div>
          )}

          {noticesError && (
            <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900/30 animate-fade-in">
              {noticesError}
            </div>
          )}

          <form onSubmit={handleSaveNotices} className="space-y-6 text-xs">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Card Regra 50-30-20 */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Card1
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Título do Card
                    </label>
                    <input
                      type="text"
                      required
                      value={rule50_30_20Title}
                      onChange={(e) => setRule50_30_20Title(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Mensagem explicativa
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={rule50_30_20Message}
                      onChange={(e) => setRule50_30_20Message(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card Acompanhamento Semanal */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Card2
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Título do Card
                    </label>
                    <input
                      type="text"
                      required
                      value={weeklyCheckTitle}
                      onChange={(e) => setWeeklyCheckTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Mensagem explicativa
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={weeklyCheckMessage}
                      onChange={(e) => setWeeklyCheckMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 dark:text-white leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={noticesLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-blue-500/10 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {noticesLoading ? 'Salvando...' : 'Salvar Novos Avisos'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'relatorios' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Relatório de Distribuição de Usuários
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize a distribuição demográfica dos usuários cadastrados por Estado e Cidade.
            </p>
          </div>

          {/* Filters card */}
          <div className="grid gap-4 sm:grid-cols-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filtrar por Estado</label>
              <select
                value={reportStateFilter}
                onChange={(e) => handleReportStateChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white font-semibold"
              >
                <option value="all">Todos os Estados</option>
                {uniqueStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Filtrar por Cidade</label>
                {(reportStateFilter !== 'all' || reportCityFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportStateFilter('all');
                      setReportCityFilter('all');
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline"
                    title="Limpar filtros relatórios"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
              <select
                value={reportCityFilter}
                onChange={(e) => setReportCityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white font-semibold"
              >
                <option value="all">Todas as Cidades</option>
                {uniqueCities.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-blue-500">Total de Usuários</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {filteredReportUsers.length} {filteredReportUsers.length === 1 ? 'usuário' : 'usuários'}
              </div>
            </div>
          </div>

          {/* Table of matching users */}
          <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Plano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {filteredReportUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Nenhum usuário cadastrado corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredReportUsers.map(u => (
                    <tr key={u.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{u.state || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.city || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.plan === 'livre' || u.plan === 'anual' || u.plan === 'mensal'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supabase Connection Verification Card */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              supabaseStatus.loading
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                : supabaseStatus.active
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">
                  Status da Conexão com Supabase
                </span>
                {supabaseStatus.loading ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Verificando...
                  </span>
                ) : supabaseStatus.active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 border border-red-500/20">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-snug">
                {supabaseStatus.loading
                  ? 'Testando comunicação direta com o banco de dados...'
                  : supabaseStatus.message}
              </p>
              {supabaseStatus.url && (
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  URL: {supabaseStatus.url}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={checkSupabaseStatus}
            disabled={supabaseStatus.loading}
            className="flex h-9 px-3.5 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0 self-end sm:self-auto"
            title="Clique para re-testar a conexão com o Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${supabaseStatus.loading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>
      </div>

      {/* Database Connection Info & SQL Schema Card */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Estrutura e Tabelas do Banco de Dados</h3>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            supabaseStatus.active
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
          }`}>
            {supabaseStatus.active ? 'Nuvem Conectada' : 'Modo Backup Local'}
          </span>
        </div>

        {supabaseStatus.active ? (
          <div className="space-y-2">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Sua aplicação está conectada com sucesso ao banco de dados do <strong>Supabase</strong>. Todos os cadastros, acessos de login e lançamentos financeiros estão sendo persistidos com segurança na nuvem.
            </p>
            {supabaseStatus.url && (
              <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-600 dark:bg-slate-950 dark:text-slate-400 break-all border border-slate-100 dark:border-slate-800">
                <strong>SUPABASE_URL:</strong> {supabaseStatus.url}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start space-x-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                As variáveis de ambiente do Supabase não foram configuradas ou a chave de API está inválida. A aplicação está rodando no <strong>Modo Backup Local</strong> salvando os dados localmente no servidor.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <p className="font-bold">Para ativar a persistência em Nuvem com Supabase:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Crie um projeto em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-semibold">supabase.com</a></li>
                <li>Obtenha a URL e a Anon Key em API Settings.</li>
                <li>Adicione as variáveis de ambiente no sistema.</li>
              </ol>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">Esquema das Tabelas (Script SQL DDL)</span>
            <button
              type="button"
              onClick={handleCopySchema}
              className="flex items-center space-x-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-semibold"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedSchema ? 'Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            Execute o script abaixo no <strong>SQL Editor</strong> do seu painel Supabase para criar/atualizar todas as tabelas e permissões do sistema:
          </p>
          <pre className="rounded-lg bg-slate-950 p-3.5 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 border border-slate-800 leading-relaxed custom-scrollbar">
            {supabaseStatus.schema || 'Carregando esquema SQL...'}
          </pre>
        </div>
      </div>

      {/* Custom Confirmation Popup for User Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Confirmar Exclusão de Registro</h3>
                <p className="text-xs text-slate-500">Ação irreversível de segurança</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Você está prestes a excluir definitivamente o usuário{' '}
                <span className="font-bold text-slate-900 dark:text-white">{userToDelete.name || userToDelete.email}</span>{' '}
                (<span className="font-mono font-bold">{userToDelete.email}</span>) bem como todos os seus dados cadastrados.
              </p>
              <p className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg font-medium">
                Esta ação apagará permanentemente o perfil, as receitas, as despesas, as metas, as ações de melhoria, as listas de compras e todo o histórico financeiro deste usuário. Não será possível recuperar estas informações posteriormente.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => handleDeleteUser(userToDelete.email)}
                disabled={deletingUserLoading}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/15 disabled:opacity-50"
              >
                {deletingUserLoading ? 'Excluindo...' : 'Sim, Apagar Tudo'}
              </button>
              <button
                onClick={() => setUserToDelete(null)}
                disabled={deletingUserLoading}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
