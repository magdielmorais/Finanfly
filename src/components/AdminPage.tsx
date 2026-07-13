import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserData } from '../types';
import { Shield, UserPlus, Users, BadgeAlert, Sparkles, FolderSync, Mail, Phone, MapPin, Eye, RefreshCw, KeyRound, Pencil } from 'lucide-react';

interface AdminPageProps {
  adminUser: UserProfile;
}

export const AdminPage: React.FC<AdminPageProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newPlan, setNewPlan] = useState<'none' | 'gratis' | 'mensal' | 'anual' | 'livre'>('none');
  const [successMsg, setSuccessMsg] = useState('');

  // Password reminder state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEmail, setReminderEmail] = useState('');
  const [foundPassword, setFoundPassword] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPlan, setEditPlan] = useState<'none' | 'gratis' | 'mensal' | 'anual' | 'livre'>('none');
  const [editPassword, setEditPassword] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auditing inspector state
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<UserProfile | null>(null);
  const [auditData, setAuditData] = useState<UserData | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

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
    setAuditData(null);
    setLoadingAudit(true);

    try {
      const res = await fetch(`/api/admin/user-details/${encodeURIComponent(user.email)}`, {
        headers: { 'x-user-email': adminUser.email }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar dados.');
      setAuditData(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao obter registros financeiros.');
    } finally {
      setLoadingAudit(false);
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

      {/* Admin KPIs Row */}
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

      <div className="flex flex-col gap-4">
        {/* Panel header with "Cadastrar e Liberar Acesso" and "Relembrar Senha" triggers */}
        <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Usuários Cadastrados & Aprovações Manuais
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Gerencie os acessos, permissões e planos dos usuários da plataforma.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setShowReminderForm(false);
                setError('');
                setSuccessMsg('');
              }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              {showCreateForm ? 'Fechar Cadastro' : 'Cadastrar e Liberar Acesso'}
            </button>
            <button
              onClick={() => {
                setShowReminderForm(!showReminderForm);
                setShowCreateForm(false);
                setError('');
                setSuccessMsg('');
                setReminderEmail('');
                setFoundPassword('');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <KeyRound className="h-4 w-4 text-amber-500" />
              {showReminderForm ? 'Fechar Relembrar' : 'Relembrar Senha'}
            </button>
          </div>
        </div>

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
                  <input
                    type="password"
                    placeholder="Padrão: user123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
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
                    <option value="gratis">Grátis (45d)</option>
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
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
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
                    <option value="gratis">Grátis (45d)</option>
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
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                className="w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="approved">Aprovados / Ativos ✅</option>
                <option value="pending">Pendentes de Aprovação ⏳</option>
                <option value="expired">Inativos / Expirados ❌</option>
                <option value="admin">Administradores 🛡️</option>
              </select>
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
                            {plan === 'gratis' && 'Grátis (45d)'}
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

      {/* User audit detailed console */}
      {selectedUserForAudit && (
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
          <div className="grid gap-4 sm:grid-cols-3 mb-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>E-mail: <strong>{selectedUserForAudit.email}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>Telefone: <strong>{selectedUserForAudit.phone || 'Não cadastrado'}</strong></span>
            </div>
            <div className="flex items-start gap-2 sm:col-span-3 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 mt-1">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
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

          {loadingAudit ? (
            <p className="text-center text-xs text-slate-400 py-6">Buscando dados financeiros e cadastros de submenus...</p>
          ) : !auditData ? (
            <p className="text-center text-xs text-slate-400 py-6">Nenhum registro para este usuário.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Incomes audit */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 dark:bg-slate-900 dark:border-slate-800">
                <h4 className="text-xs font-bold text-blue-600 mb-2">Histórico de Receitas ({auditData.incomes?.length || 0})</h4>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {(!auditData.incomes || auditData.incomes.length === 0) ? (
                    <p className="text-[10px] text-slate-400 py-2">Nenhuma receita registrada.</p>
                  ) : (
                    auditData.incomes.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] pt-2">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-300">{item.description}</p>
                          <p className="text-[9px] text-slate-400">{item.category} • {item.paymentType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[8px] text-slate-400 font-mono">{item.date}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expenses audit */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 dark:bg-slate-900 dark:border-slate-800">
                <h4 className="text-xs font-bold text-red-500 mb-2">Histórico de Despesas ({auditData.expenses?.length || 0})</h4>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {(!auditData.expenses || auditData.expenses.length === 0) ? (
                    <p className="text-[10px] text-slate-400 py-2">Nenhuma despesa registrada.</p>
                  ) : (
                    auditData.expenses.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] pt-2">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-300">{item.description}</p>
                          <p className="text-[9px] text-slate-400">{item.category} • {item.paymentType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-500">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[8px] text-slate-400 font-mono">{item.date}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
