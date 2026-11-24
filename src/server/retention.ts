export const RETENTION_YEARS = 3;
export const TRASH_RETENTION_DAYS = 3;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const BACKUP_RETENTION_DAYS = 3;
export const BACKUP_RETENTION_MS = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

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

export interface RetentionCutoff {
  cutoffDate: Date;
  cutoffDateStr: string; // YYYY-MM-DD
  cutoffYear: number;
}

export interface RetentionResult<T> {
  prunedData: T;
  removedByEntity: Record<string, string[]>;
  removedAnnualYears: number[];
  totalRemoved: number;
  cutoffDateStr: string;
  cutoffYear: number;
}

export function getRetentionCutoff(referenceDate: Date = new Date()): RetentionCutoff {
  const cutoffDate = new Date(referenceDate.getTime());
  cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);
  const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
  const cutoffYear = cutoffDate.getFullYear();
  return { cutoffDate, cutoffDateStr, cutoffYear };
}

export function isDateWithinRetention(dateValue: unknown, cutoffDateStr: string): boolean {
  if (!dateValue || typeof dateValue !== 'string') {
    return true;
  }
  const trimmed = dateValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return true;
  }
  return trimmed.slice(0, 10) >= cutoffDateStr;
}

export function isWithinTrashRestoreWindow(deletedAt: string | Date, referenceDate: Date = new Date()): boolean {
  const deletedMs = deletedAt instanceof Date ? deletedAt.getTime() : new Date(deletedAt).getTime();
  if (!Number.isFinite(deletedMs)) {
    return false;
  }
  const elapsedMs = referenceDate.getTime() - deletedMs;
  return elapsedMs >= 0 && elapsedMs <= TRASH_RETENTION_MS;
}

export function isWithinBackupRestoreWindow(createdAt: string | Date, referenceDate: Date = new Date()): boolean {
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) {
    return false;
  }
  const elapsedMs = referenceDate.getTime() - createdMs;
  return elapsedMs >= 0 && elapsedMs <= BACKUP_RETENTION_MS;
}

export function summarizeUserDataSnapshot(data: Record<string, any> | null | undefined): UserBackupSummary {
  const safe = data && typeof data === 'object' ? data : {};
  const arrLen = (key: string) => (Array.isArray(safe[key]) ? safe[key].length : 0);
  const incomes = arrLen('incomes');
  const expenses = arrLen('expenses');
  const investments = arrLen('investments');
  const trips = arrLen('trips');
  const wishes = arrLen('wishes');
  const shoppingList = arrLen('shoppingList');
  const actionPlans = arrLen('actionPlans');
  const deficitActions = arrLen('deficitActions');
  const annualPlanning = arrLen('annualPlanning');
  const categoriesCount =
    arrLen('receiptTypes') +
    arrLen('paymentTypes') +
    arrLen('receiptStatuses') +
    arrLen('paymentStatuses') +
    arrLen('incomeCategories') +
    arrLen('expenseCategories') +
    arrLen('investmentTypes') +
    arrLen('investmentStatuses');

  const totalRecords =
    incomes +
    expenses +
    investments +
    trips +
    wishes +
    shoppingList +
    actionPlans +
    deficitActions +
    annualPlanning;

  return {
    incomes,
    expenses,
    investments,
    trips,
    wishes,
    shoppingList,
    actionPlans,
    deficitActions,
    annualPlanning,
    categoriesCount,
    totalRecords,
  };
}

export function applyThreeYearRetention<T extends Record<string, any>>(
  data: T,
  referenceDate: Date = new Date()
): RetentionResult<T> {
  const { cutoffDateStr, cutoffYear } = getRetentionCutoff(referenceDate);
  const removedByEntity: Record<string, string[]> = {
    incomes: [],
    expenses: [],
    investments: [],
    deficitActions: [],
    shoppingList: [],
    trips: [],
    actionPlans: [],
    wishes: [],
  };
  const removedAnnualYears: number[] = [];

  if (!data || typeof data !== 'object') {
    return {
      prunedData: data,
      removedByEntity,
      removedAnnualYears,
      totalRemoved: 0,
      cutoffDateStr,
      cutoffYear,
    };
  }

  const next: Record<string, any> = { ...data };

  const datedEntities = ['incomes', 'expenses', 'investments', 'deficitActions', 'shoppingList'] as const;
  for (const key of datedEntities) {
    if (Array.isArray(data[key])) {
      const kept: any[] = [];
      for (const item of data[key]) {
        if (isDateWithinRetention(item?.date, cutoffDateStr)) {
          kept.push(item);
        } else if (item?.id) {
          removedByEntity[key].push(String(item.id));
        }
      }
      next[key] = kept;
    }
  }

  if (Array.isArray(data.trips)) {
    const keptTrips: any[] = [];
    for (const trip of data.trips) {
      const expenses = Array.isArray(trip?.expenses) ? trip.expenses : [];
      const datedExpenses = expenses.filter((e: any) => typeof e?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date.trim()));
      const keptTripExpenses = expenses.filter((e: any) => isDateWithinRetention(e?.date, cutoffDateStr));

      if (datedExpenses.length > 0 && keptTripExpenses.length === 0 && expenses.length === datedExpenses.length) {
        if (trip?.id) {
          removedByEntity.trips.push(String(trip.id));
        }
      } else {
        keptTrips.push(
          keptTripExpenses.length !== expenses.length ? { ...trip, expenses: keptTripExpenses } : trip
        );
      }
    }
    next.trips = keptTrips;
  }

  if (Array.isArray(data.annualPlanning)) {
    const keptPlans: any[] = [];
    for (const plan of data.annualPlanning) {
      const y = Number(plan?.year);
      if (!Number.isFinite(y) || y >= cutoffYear) {
        keptPlans.push(plan);
      } else {
        removedAnnualYears.push(y);
      }
    }
    next.annualPlanning = keptPlans;
  }

  // Keep open/active goals and wishes; only prune completed ones older than 3 years
  for (const goalKey of ['actionPlans', 'wishes'] as const) {
    if (Array.isArray(data[goalKey])) {
      const keptGoals: any[] = [];
      for (const item of data[goalKey]) {
        const isCompleted = String(item?.status || '').toLowerCase() === 'concluído';
        if (isCompleted && item?.targetDate && !isDateWithinRetention(item.targetDate, cutoffDateStr)) {
          if (item?.id) {
            removedByEntity[goalKey].push(String(item.id));
          }
        } else {
          keptGoals.push(item);
        }
      }
      next[goalKey] = keptGoals;
    }
  }

  const totalRemoved =
    Object.values(removedByEntity).reduce((acc, list) => acc + list.length, 0) +
    removedAnnualYears.length;

  return {
    prunedData: next as T,
    removedByEntity,
    removedAnnualYears,
    totalRemoved,
    cutoffDateStr,
    cutoffYear,
  };
}
