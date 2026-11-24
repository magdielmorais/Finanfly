import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  Search,
  Database,
  X,
} from 'lucide-react';
import { UserProfile } from '../types';
import { getAuthHeaders } from '../utils/authToken';

export interface UserBackupSummary {
  incomes: number;
  expenses: number;
  investments: number;
  trips: number;
  wishes: number;
  shoppingList: number;
  actionPlans: number;
  deficitActions: number;
  annualPlanning: number;
  categoriesCount: number;
  totalRecords: number;
}

export interface UserBackupListItem {
  id: string;
  email: string;
  userName: string;
  triggerType: 'auto' | 'manual' | 'pre_restore' | 'user_restore' | string;
  summary: UserBackupSummary;
  createdAt: string;
  expiresAt: string;
}

export interface UserBackupDetail extends UserBackupListItem {
  snapshot: Record<string, any>;
}

interface AdminBackupsTabProps {
  adminEmail: string;
  users: UserProfile[];
  onNavigateToConnection: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  auto: 'Automático',
  manual: 'Manual (Admin)',
  pre_restore: 'Pré-Restauração',
  user_restore: 'Importação Usuário',
};

function formatRemainingWindow(createdAtIso: string): string {
  const createdMs = new Date(createdAtIso).getTime();
  if (!Number.isFinite(createdMs)) return '-';
  const expiresMs = createdMs + 3 * 24 * 60 * 60 * 1000;
  const remainingMs = expiresMs - Date.now();
  if (remainingMs <= 0) return 'Expirado';
  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `Expira em ${days}d ${hours}h`;
  const mins = Math.max(1, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));
  return totalHours > 0 ? `Expira em ${totalHours}h ${mins}m` : `Expira em ${mins}m`;
}

export const AdminBackupsTab: React.FC<AdminBackupsTabProps> = ({
  adminEmail,
  users,
  onNavigateToConnection,
}) => {
  const [backups, setBackups] = useState<UserBackupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  // Action states
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingRestoreItem, setPendingRestoreItem] = useState<UserBackupListItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Inspection Modal state
  const [inspectLoadingId, setInspectLoadingId] = useState<string | null>(null);
  const [inspectedBackup, setInspectedBackup] = useState<UserBackupDetail | null>(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      (a.name || a.email).localeCompare(b.name || b.email, 'pt-BR', { sensitivity: 'base' })
    );
  }, [users]);

  const fetchBackups = async (emailOverride?: string, triggerOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const targetEmail = emailOverride !== undefined ? emailOverride : selectedUserEmail;
      const targetTrigger = triggerOverride !== undefined ? triggerOverride : triggerFilter;
      const params = new URLSearchParams();
      if (targetEmail) params.set('email', targetEmail);
      if (targetTrigger) params.set('triggerType', targetTrigger);

      const queryString = params.toString();
      const res = await fetch(`/api/admin/user-backups${queryString ? `?${queryString}` : ''}`, {
        headers: getAuthHeaders({ 'x-user-email': adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar backups dos usuários.');
      }
      setBackups(Array.isArray(data.backups) ? data.backups : []);
      setTableMissing(!!data.tableMissing);
    } catch (err: any) {
      setError(err?.message || 'Erro ao consultar backups no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const filteredBackups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return backups.filter((b) => {
      if (selectedUserEmail && b.email.toLowerCase() !== selectedUserEmail.toLowerCase()) {
        return false;
      }
      if (triggerFilter && b.triggerType !== triggerFilter) {
        return false;
      }
      if (q) {
        const matchesText =
          b.email.toLowerCase().includes(q) ||
          b.userName.toLowerCase().includes(q) ||
          (TRIGGER_LABELS[b.triggerType] || b.triggerType).toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      return true;
    });
  }, [backups, selectedUserEmail, triggerFilter, searchQuery]);

  const handleCreateBackupNow = async () => {
    setCreatingBackup(true);
    setFeedback(null);
    setError('');
    try {
      const payload = selectedUserEmail
        ? { targetEmail: selectedUserEmail }
        : { allUsers: true };

      const res = await fetch('/api/admin/user-backups/create', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
        }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao gerar backup.');
      }
      setFeedback({
        type: 'success',
        message: data?.message || 'Backup gerado com sucesso!',
      });
      await fetchBackups();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao gerar backup dos dados.',
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleInspectBackup = async (item: UserBackupListItem) => {
    setInspectLoadingId(item.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/user-backups/${encodeURIComponent(item.id)}`, {
        headers: getAuthHeaders({ 'x-user-email': adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao abrir detalhes do backup.');
      }
      setInspectedBackup(data.backup);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Não foi possível carregar os detalhes deste backup.',
      });
    } finally {
      setInspectLoadingId(null);
    }
  };

  const handleDownloadBackup = async (item: UserBackupListItem) => {
    setDownloadingId(item.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/user-backups/${encodeURIComponent(item.id)}`, {
        headers: getAuthHeaders({ 'x-user-email': adminEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data?.backup) {
        throw new Error(data?.error || 'Erro ao baixar arquivo de backup.');
      }

      const exportObj = {
        app: 'FinanFly',
        formatVersion: 1,
        exportedAt: data.backup.createdAt,
        retentionYears: 3,
        email: data.backup.email,
        userData: data.backup.snapshot,
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeUser = data.backup.email.replace(/[^a-z0-9@._-]/gi, '_');
      const stamp = new Date(data.backup.createdAt).toISOString().slice(0, 16).replace(/[:T]/g, '-');
      link.href = url;
      link.download = `finanfly-backup-${safeUser}-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao exportar arquivo JSON do backup.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreItem) return;
    setRestoringId(pendingRestoreItem.id);
    setFeedback(null);
    setError('');
    try {
      const res = await fetch('/api/admin/user-backups/restore', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
        }),
        body: JSON.stringify({ backupId: pendingRestoreItem.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao restaurar backup selecionado.');
      }
      setFeedback({
        type: 'success',
        message:
          data?.message ||
          `Backup de ${pendingRestoreItem.userName} restaurado com sucesso! Um ponto pré-restauração do estado anterior também foi salvo.`,
      });
      setPendingRestoreItem(null);
      await fetchBackups();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao restaurar backup no Supabase.',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    setDeletingId(backupId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/user-backups/${encodeURIComponent(backupId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'x-user-email': adminEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao remover registro de backup.');
      }
      setBackups((prev) => prev.filter((b) => b.id !== backupId));
      setPendingDeleteId(null);
      setFeedback({
        type: 'success',
        message: 'Registro de backup removido com sucesso.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao excluir backup.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Backups e Restauração dos Usuários (Últimos 3 dias)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visualize os pontos de backup salvos nos últimos 3 dias (72 horas) para cada usuário e escolha exatamente qual versão restaurar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateBackupNow}
              disabled={creatingBackup || tableMissing}
              className="flex h-9 px-3.5 items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>
                {creatingBackup
                  ? 'Gerando Backup...'
                  : selectedUserEmail
                  ? 'Gerar Backup do Usuário'
                  : 'Gerar Backup Agora'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => fetchBackups()}
              disabled={loading}
              className="flex h-9 px-3.5 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Atualizar Lista</span>
            </button>
          </div>
        </div>

        {/* Missing Table Banner */}
        {tableMissing && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">
                  Tabela <code className="font-mono">user_backups</code> ainda não criada no Supabase.
                </span>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Acesse a aba <strong>Conexão</strong>, execute o <strong>Script Diferencial Seguro</strong> no SQL Editor do Supabase (e o script <strong>RLS Restritivo</strong> caso utilize isolamento em produção) para ativar o histórico de backups dos últimos 3 dias.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToConnection}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 self-end sm:self-center"
            >
              Ir para Conexão
            </button>
          </div>
        )}

        {/* Feedback / Error Banners */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300 flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-4 rounded-xl border p-3 text-xs font-semibold flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-4">
            <select
              value={selectedUserEmail}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedUserEmail(val);
                fetchBackups(val, triggerFilter);
              }}
              aria-label="Filtrar por usuário"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os usuários cadastrados</option>
              {sortedUsers.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar na lista por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={triggerFilter}
              onChange={(e) => {
                const val = e.target.value;
                setTriggerFilter(val);
                fetchBackups(selectedUserEmail, val);
              }}
              aria-label="Filtrar por tipo de backup"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as origens</option>
              <option value="auto">Automático</option>
              <option value="manual">Manual (Admin)</option>
              <option value="pre_restore">Pré-Restauração</option>
              <option value="user_restore">Importação Usuário</option>
            </select>
          </div>

          <div className="md:col-span-1 flex items-center justify-end">
            {(selectedUserEmail || searchQuery || triggerFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUserEmail('');
                  setSearchQuery('');
                  setTriggerFilter('');
                  fetchBackups('', '');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Summary Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <span>{filteredBackups.length} backup(s) disponível(is)</span>
            <span aria-hidden="true">·</span>
            <span>Janela de retenção: últimos 3 dias (72 horas)</span>
          </div>
          <span>Antes de restaurar, um ponto pré-restauração do estado atual é gravado automaticamente.</span>
        </div>

        {/* Backups Table */}
        <div className="mt-3 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[460px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
              <tr>
                <th className="px-3.5 py-2.5">Data / Hora do Backup</th>
                <th className="px-3.5 py-2.5">Usuário</th>
                <th className="px-3.5 py-2.5">Origem</th>
                <th className="px-3.5 py-2.5">Resumo dos Dados</th>
                <th className="px-3.5 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-3">
                      <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="h-3.5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center">
                    <Database className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Nenhum backup dos últimos 3 dias encontrado para os filtros selecionados.
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Os backups automáticos são gravados conforme os usuários salvam alterações, ou você pode gerar um ponto de backup agora mesmo.
                    </p>
                    {!tableMissing && (
                      <button
                        type="button"
                        onClick={handleCreateBackupNow}
                        disabled={creatingBackup}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>{creatingBackup ? 'Gerando...' : 'Gerar Backup Agora'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBackups.map((item) => {
                  const s = item.summary || ({} as UserBackupSummary);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 font-mono tabular-nums">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatRemainingWindow(item.createdAt)}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
                          {item.userName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                          {item.email}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                        {TRIGGER_LABELS[item.triggerType] || item.triggerType}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                          <span>{s.incomes ?? 0} rec</span>
                          <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                          <span>{s.expenses ?? 0} desp</span>
                          <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                          <span>{s.investments ?? 0} inv</span>
                          <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                          <span>{(s.actionPlans ?? 0) + (s.wishes ?? 0)} metas</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                          Total: {s.totalRecords ?? 0} lançamento(s) · {s.categoriesCount ?? 0} categoria(s)
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectBackup(item)}
                            disabled={inspectLoadingId === item.id}
                            title="Visualizar detalhes deste backup"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{inspectLoadingId === item.id ? 'Abrindo...' : 'Detalhes'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadBackup(item)}
                            disabled={downloadingId === item.id}
                            title="Baixar arquivo JSON deste backup"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{downloadingId === item.id ? '...' : '.json'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingRestoreItem(item)}
                            disabled={restoringId === item.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>{restoringId === item.id ? 'Restaurando...' : 'Restaurar'}</span>
                          </button>

                          {pendingDeleteId === item.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(item.id)}
                                disabled={deletingId === item.id}
                                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-2 py-1.5 text-[11px] font-bold text-white whitespace-nowrap shrink-0"
                              >
                                {deletingId === item.id ? '...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(item.id)}
                              title="Remover ponto de backup"
                              aria-label="Remover ponto de backup"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Backup Restoration */}
      {pendingRestoreItem && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
          onClick={() => !restoringId && setPendingRestoreItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                    Confirmar Restauração de Backup
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pendingRestoreItem.userName} ({pendingRestoreItem.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!!restoringId}
                onClick={() => setPendingRestoreItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Você escolheu restaurar o ponto de backup salvo em{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {new Date(pendingRestoreItem.createdAt).toLocaleString('pt-BR')}
                </strong>{' '}
                ({TRIGGER_LABELS[pendingRestoreItem.triggerType] || pendingRestoreItem.triggerType}).
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-mono tabular-nums text-[11px] grid grid-cols-2 gap-1.5">
                <div>Receitas: <strong>{pendingRestoreItem.summary?.incomes ?? 0}</strong></div>
                <div>Despesas: <strong>{pendingRestoreItem.summary?.expenses ?? 0}</strong></div>
                <div>Investimentos: <strong>{pendingRestoreItem.summary?.investments ?? 0}</strong></div>
                <div>Viagens: <strong>{pendingRestoreItem.summary?.trips ?? 0}</strong></div>
                <div>Metas / Planos: <strong>{pendingRestoreItem.summary?.actionPlans ?? 0}</strong></div>
                <div>Desejos / Compras: <strong>{(pendingRestoreItem.summary?.wishes ?? 0) + (pendingRestoreItem.summary?.shoppingList ?? 0)}</strong></div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  Os dados atuais da conta serão substituídos por este backup (mantendo apenas registros dos últimos 3 anos). Por segurança, uma cópia pré-restauração do estado atual será gravada automaticamente antes da troca.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={!!restoringId}
                onClick={() => setPendingRestoreItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!!restoringId}
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {restoringId ? 'Restaurando Dados...' : 'Confirmar Restauração'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Inspection Modal for Backup Snapshot Contents */}
      {inspectedBackup && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setInspectedBackup(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Conteúdo do Backup — {inspectedBackup.userName}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {inspectedBackup.email} · Salvo em {new Date(inspectedBackup.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBackup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Structured Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono tabular-nums">
              {[
                ['Receitas', inspectedBackup.summary?.incomes ?? 0],
                ['Despesas', inspectedBackup.summary?.expenses ?? 0],
                ['Investimentos', inspectedBackup.summary?.investments ?? 0],
                ['Viagens', inspectedBackup.summary?.trips ?? 0],
                ['Desejos', inspectedBackup.summary?.wishes ?? 0],
                ['Lista Compras', inspectedBackup.summary?.shoppingList ?? 0],
                ['Metas / Planos', inspectedBackup.summary?.actionPlans ?? 0],
                ['Planej. Anual', inspectedBackup.summary?.annualPlanning ?? 0],
              ].map(([label, count]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                >
                  <div className="font-sans text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{count}</div>
                </div>
              ))}
            </div>

            {/* Sample preview of recent entries inside snapshot */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Prévia dos últimos lançamentos registrados neste ponto de backup
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Descrição / Título</th>
                      <th className="px-3 py-2">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                    {[
                      ...(Array.isArray(inspectedBackup.snapshot?.incomes)
                        ? inspectedBackup.snapshot.incomes.slice(0, 8).map((i: any) => ({
                            kind: 'Receita',
                            date: i.date || '-',
                            label: i.description || '-',
                            cat: i.category || '-',
                          }))
                        : []),
                      ...(Array.isArray(inspectedBackup.snapshot?.expenses)
                        ? inspectedBackup.snapshot.expenses.slice(0, 8).map((e: any) => ({
                            kind: 'Despesa',
                            date: e.date || '-',
                            label: e.description || '-',
                            cat: e.category || '-',
                          }))
                        : []),
                      ...(Array.isArray(inspectedBackup.snapshot?.investments)
                        ? inspectedBackup.snapshot.investments.slice(0, 5).map((v: any) => ({
                            kind: 'Investimento',
                            date: v.date || '-',
                            label: v.name || '-',
                            cat: v.type || '-',
                          }))
                        : []),
                      ...(Array.isArray(inspectedBackup.snapshot?.actionPlans)
                        ? inspectedBackup.snapshot.actionPlans.slice(0, 5).map((p: any) => ({
                            kind: 'Meta',
                            date: p.targetDate || '-',
                            label: p.title || p.description || '-',
                            cat: p.status || '-',
                          }))
                        : []),
                    ].length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Este backup contém apenas configurações/categorias ou está vazio.
                        </td>
                      </tr>
                    ) : (
                      [
                        ...(Array.isArray(inspectedBackup.snapshot?.incomes)
                          ? inspectedBackup.snapshot.incomes.slice(0, 8).map((i: any) => ({
                              kind: 'Receita',
                              date: i.date || '-',
                              label: i.description || '-',
                              cat: i.category || '-',
                            }))
                          : []),
                        ...(Array.isArray(inspectedBackup.snapshot?.expenses)
                          ? inspectedBackup.snapshot.expenses.slice(0, 8).map((e: any) => ({
                              kind: 'Despesa',
                              date: e.date || '-',
                              label: e.description || '-',
                              cat: e.category || '-',
                            }))
                          : []),
                        ...(Array.isArray(inspectedBackup.snapshot?.investments)
                          ? inspectedBackup.snapshot.investments.slice(0, 5).map((v: any) => ({
                              kind: 'Investimento',
                              date: v.date || '-',
                              label: v.name || '-',
                              cat: v.type || '-',
                            }))
                          : []),
                        ...(Array.isArray(inspectedBackup.snapshot?.actionPlans)
                          ? inspectedBackup.snapshot.actionPlans.slice(0, 5).map((p: any) => ({
                              kind: 'Meta',
                              date: p.targetDate || '-',
                              label: p.title || p.description || '-',
                              cat: p.status || '-',
                            }))
                          : []),
                      ]
                        .slice(0, 20)
                        .map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
                              {row.kind}
                            </td>
                            <td className="px-3 py-1.5 font-mono tabular-nums text-slate-500">
                              {row.date}
                            </td>
                            <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                              {row.label}
                            </td>
                            <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">
                              {row.cat}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDownloadBackup(inspectedBackup)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectedBackup;
                  setInspectedBackup(null);
                  setPendingRestoreItem(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar este Backup</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
