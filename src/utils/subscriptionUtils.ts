import { UserProfile } from '../types';

/**
 * Utilitários unificados e precisos para controle de expiração e validade de assinaturas.
 * 
 * Regras cruciais:
 * 1. Respeita fielmente a data final de expiração (validUntil):
 *    - Usuário com prazo válido (seja trial de cadastro, seja prorrogação pelo administrador) TEM ACESSO total.
 *    - O acesso se estende até o final do dia da expiração (23:59:59.999).
 * 2. Suporta cadastro com dias grátis:
 *    - Usuários cadastrados recentemente cujo tempo desde a criação (createdAt) é menor que os dias de teste têm acesso garantido.
 * 3. Tolerância a fusos horários e formatos:
 *    - 'YYYY-MM-DD', ISO com UTC midnight ou timestamps completos são tratados sem cortar o usuário prematuramente.
 */

/**
 * Analisa e converte a string de validade em uma data limite segura (fim do dia de vencimento).
 */
export function parseExpirationDate(validUntil: string | null | undefined): Date | null {
  if (!validUntil || typeof validUntil !== 'string' || !validUntil.trim()) {
    return null;
  }

  const trimmed = validUntil.trim();

  // Caso seja formato estrito de data YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    if (!year || !month || !day) return null;
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    return isNaN(d.getTime()) ? null : d;
  }

  // Se contiver horário meia-noite (T00:00:00) ou formato ISO padrão de data
  if (trimmed.includes('T00:00:00') || trimmed.includes('T00:00:00.000Z')) {
    const base = new Date(trimmed);
    if (isNaN(base.getTime())) return null;
    // Estende para o final daquele dia no fuso local/UTC para não expirar na virada
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;

  return parsed;
}

/**
 * Verifica se a data de validade informada ainda é válida (igual ou posterior ao momento atual).
 * Se a expiração cai no dia de hoje, concede acesso até o término completo de hoje.
 */
export function isSubscriptionDateValid(validUntil: string | null | undefined): boolean {
  const expDate = parseExpirationDate(validUntil);
  if (!expDate) return false;

  const now = new Date();
  const nowTime = now.getTime();
  const expTime = expDate.getTime();

  // Se expiração for estritamente futura
  if (expTime >= nowTime) return true;

  // Se a data de expiração corresponde à data de hoje (mesmo dia do calendário),
  // o usuário tem direito ao acesso até 23:59:59.999
  const expDay = expDate.toLocaleDateString('pt-BR');
  const today = now.toLocaleDateString('pt-BR');
  if (expDay === today) return true;

  return false;
}

/**
 * Calcula se a data de cadastro (createdAt) ainda está dentro do período de teste grátis (trial).
 */
export function getTrialFromRegistration(
  createdAt: string | null | undefined,
  freeTrialDays = 60
): { isValid: boolean; validUntilDate: Date | null; daysRemaining: number } {
  if (!createdAt) {
    return { isValid: false, validUntilDate: null, daysRemaining: 0 };
  }

  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) {
    return { isValid: false, validUntilDate: null, daysRemaining: 0 };
  }

  const trialEnd = new Date(createdDate.getTime() + freeTrialDays * 24 * 60 * 60 * 1000);
  trialEnd.setHours(23, 59, 59, 999);

  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isValid = diffTime >= 0 || trialEnd.toLocaleDateString('pt-BR') === now.toLocaleDateString('pt-BR');

  return { isValid, validUntilDate: trialEnd, daysRemaining };
}

/**
 * Validação mestra de acesso do usuário.
 * Retorna true se o usuário tiver acesso ativo às funcionalidades financeiras.
 */
export function isUserSubscriptionActive(
  user: UserProfile | null | undefined,
  freeTrialDays = 60
): boolean {
  if (!user) return false;

  // Administrador tem acesso irrestrito
  if (user.role === 'admin') return true;

  // Se foi explicitamente bloqueado pelo admin ou plano marcado como inativo
  if (user.isBlocked || user.subscription?.plan === 'inativo') return false;

  // Plano vitalício / livre
  const plan = user.subscription?.plan || 'none';
  if (plan === 'livre') return true;

  // 1. Verificação fiel pela data final de expiração (validUntil)
  // Seja prorrogação do administrador, seja plano contratado ou trial ativo
  const validUntil = user.subscription?.validUntil;
  if (validUntil && isSubscriptionDateValid(validUntil)) {
    return true;
  }

  // 2. Verificação pelo cadastro e dias grátis (createdAt)
  // Se validUntil estiver vazio ou se o usuário acabou de se cadastrar
  if (user.createdAt && !user.subscription?.freePlanUsedReason) {
    const trial = getTrialFromRegistration(user.createdAt, freeTrialDays);
    if (trial.isValid) {
      return true;
    }
  }

  return false;
}

/**
 * Retorna detalhes completos da assinatura do usuário para exibição em tabelas, cabeçalhos e modais.
 */
export function getSubscriptionDetails(
  user: UserProfile | null | undefined,
  freeTrialDays = 60
): {
  isActive: boolean;
  isExpired: boolean;
  isLivre: boolean;
  formattedDate: string;
  subtitle: string;
  daysRemaining: number;
  resolvedPlan: string;
} {
  if (!user) {
    return {
      isActive: false,
      isExpired: true,
      isLivre: false,
      formattedDate: '-',
      subtitle: 'Sem assinatura',
      daysRemaining: 0,
      resolvedPlan: 'none'
    };
  }

  const isBlocked = !!user.isBlocked || user.subscription?.plan === 'inativo';
  const plan = user.subscription?.plan || 'none';
  const isLivre = plan === 'livre' || user.role === 'admin';

  if (isLivre) {
    return {
      isActive: true,
      isExpired: false,
      isLivre: true,
      formattedDate: 'Vitalício',
      subtitle: user.role === 'admin' ? 'Acesso Admin' : 'Sem expiração',
      daysRemaining: 9999,
      resolvedPlan: 'livre'
    };
  }

  if (isBlocked) {
    const validUntil = user.subscription?.validUntil;
    const expDate = parseExpirationDate(validUntil);
    return {
      isActive: false,
      isExpired: true,
      isLivre: false,
      formattedDate: expDate ? expDate.toLocaleDateString('pt-BR') : 'Inativo',
      subtitle: 'Acesso bloqueado/inativo',
      daysRemaining: 0,
      resolvedPlan: 'inativo'
    };
  }

  // Determina a data efetiva de expiração
  let expDate = parseExpirationDate(user.subscription?.validUntil);
  let resolvedPlan = plan;

  // Fallback para trial de cadastro se não houver validUntil
  if (!expDate && user.createdAt && !user.subscription?.freePlanUsedReason) {
    const trial = getTrialFromRegistration(user.createdAt, freeTrialDays);
    if (trial.isValid && trial.validUntilDate) {
      expDate = trial.validUntilDate;
      resolvedPlan = 'gratis';
    }
  }

  if (expDate) {
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const isToday = expDate.toLocaleDateString('pt-BR') === now.toLocaleDateString('pt-BR');
    const isExpired = diffTime < 0 && !isToday;

    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isToday) {
      diffDays = 0;
    }

    const formattedDate = expDate.toLocaleDateString('pt-BR');
    let subtitle = '';

    if (isExpired) {
      subtitle = diffDays === 0 ? 'Expirou hoje' : `Expirada há ${Math.abs(diffDays)}d`;
    } else {
      if (diffDays === 0) {
        subtitle = 'Expira hoje às 23:59';
      } else if (diffDays === 1) {
        subtitle = 'Vence amanhã';
      } else {
        subtitle = `Restam ${diffDays}d`;
      }
    }

    return {
      isActive: !isExpired,
      isExpired,
      isLivre: false,
      formattedDate,
      subtitle,
      daysRemaining: isExpired ? 0 : Math.max(0, diffDays),
      resolvedPlan: resolvedPlan === 'none' ? 'mensal' : resolvedPlan
    };
  }

  return {
    isActive: false,
    isExpired: true,
    isLivre: false,
    formattedDate: 'Pendente',
    subtitle: 'Sem assinatura',
    daysRemaining: 0,
    resolvedPlan: plan
  };
}
