import crypto from "crypto";

export const ALLOWED_USER_DATA_KEYS = [
  "receiptTypes",
  "receiptStatuses",
  "paymentTypes",
  "paymentStatuses",
  "incomeCategories",
  "expenseCategories",
  "incomes",
  "expenses",
  "annualPlanning",
  "shoppingList",
  "actionPlans",
  "deficitActions",
  "trips",
  "wishes",
  "investments",
  "investmentTypes",
  "investmentStatuses",
] as const;

export const ALLOWED_USER_DATA_KEY_SET = new Set<string>(ALLOWED_USER_DATA_KEYS);

export class ForeignRowOwnershipError extends Error {
  public readonly statusCode = 403;
  public readonly table: string;
  public readonly conflictingIds: string[];

  constructor(table: string, conflictingIds: string[]) {
    super(`Acesso negado: um ou mais identificadores pertencem a outro usuário (${table}).`);
    this.name = "ForeignRowOwnershipError";
    this.table = table;
    this.conflictingIds = conflictingIds;
  }
}

/**
 * Filtra estritamente apenas as chaves de domínio financeiro permitidas e válidas (arrays),
 * descartando quaisquer propriedades extras enviadas pelo cliente.
 */
export function pickAllowedUserDataFields(input: unknown): Record<string, any[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const source = input as Record<string, unknown>;
  const sanitized: Record<string, any[]> = {};

  for (const key of ALLOWED_USER_DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key) && Array.isArray(source[key])) {
      sanitized[key] = source[key] as any[];
    }
  }

  return sanitized;
}

/**
 * Sanitiza filtros de e-mail antes de interpolar em predicados `.or()` do PostgREST,
 * removendo vírgulas, parênteses, espaços e operadores que alterariam a consulta.
 */
export function sanitizePostgrestEmailFilter(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, "")
    .slice(0, 120);
}

/**
 * Impede sobrescrita entre usuários em tabelas cuja chave primária é `id` global.
 * Consulta o proprietário atual dos IDs informados no banco antes de qualquer upsert.
 */
export async function assertNoForeignRowOwnership(
  supabase: any,
  table: string,
  ownerEmail: string,
  candidateIds: string[],
  runQuery: <T = any>(fn: () => PromiseLike<T>, label: string) => Promise<T> = (fn) => Promise.resolve(fn())
): Promise<void> {
  const normalizedOwner = String(ownerEmail || "").toLowerCase().trim();
  const uniqueIds = Array.from(
    new Set(
      (candidateIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );

  if (!normalizedOwner || uniqueIds.length === 0) return;

  for (let i = 0; i < uniqueIds.length; i += 200) {
    const chunk = uniqueIds.slice(i, i + 200);
    const { data, error } = await runQuery<any>(
      () => supabase.from(table).select("id, email").in("id", chunk),
      `ownershipCheck:${table}`
    );
    if (error) {
      throw new Error(`[${table}] Erro ao validar propriedade dos registros: ${error.message}`);
    }
    const foreignIds = (data || [])
      .filter((row: any) => String(row?.email || "").toLowerCase().trim() !== normalizedOwner)
      .map((row: any) => String(row.id));

    if (foreignIds.length > 0) {
      throw new ForeignRowOwnershipError(table, foreignIds);
    }
  }
}

/**
 * Em restauração de backups JSON, remapeia com segurança quaisquer IDs que já pertençam
 * a outro usuário no banco para novos UUIDs, preservando os dados do proprietário original.
 */
export async function remapCollidingImportIds(
  supabase: any,
  ownerEmail: string,
  userData: Record<string, any>,
  entityTablePairs: ReadonlyArray<{ key: string; table: string; prefix: string }>,
  runQuery: <T = any>(fn: () => PromiseLike<T>, label: string) => Promise<T> = (fn) => Promise.resolve(fn())
): Promise<{ userData: Record<string, any>; remappedCount: number }> {
  const normalizedOwner = String(ownerEmail || "").toLowerCase().trim();
  const nextData: Record<string, any> = { ...userData };
  let remappedCount = 0;

  for (const { key, table, prefix } of entityTablePairs) {
    const items = nextData[key];
    if (!Array.isArray(items) || items.length === 0) continue;

    const candidateIds = Array.from(
      new Set(
        items
          .map((it: any) => String(it?.id || "").trim())
          .filter(Boolean)
      )
    );

    const foreignIdSet = new Set<string>();
    for (let i = 0; i < candidateIds.length; i += 200) {
      const chunk = candidateIds.slice(i, i + 200);
      const { data, error } = await runQuery<any>(
        () => supabase.from(table).select("id, email").in("id", chunk),
        `remapCheck:${table}`
      );
      if (error) {
        throw new Error(`[${table}] Erro ao verificar colisões de backup: ${error.message}`);
      }
      for (const row of data || []) {
        if (String(row?.email || "").toLowerCase().trim() !== normalizedOwner) {
          foreignIdSet.add(String(row.id));
        }
      }
    }

    const seenInImport = new Set<string>();
    nextData[key] = items.map((item: any) => {
      if (!item || typeof item !== "object") return item;
      const rawId = String(item.id || "").trim();
      const needsNewId = !rawId || foreignIdSet.has(rawId) || seenInImport.has(rawId);
      if (needsNewId) {
        remappedCount++;
        const newId = `${prefix}-${crypto.randomUUID()}`;
        seenInImport.add(newId);
        return { ...item, id: newId };
      }
      seenInImport.add(rawId);
      return item;
    });
  }

  return { userData: nextData, remappedCount };
}

const DATE_YEAR_SCOPED_KEYS = ["incomes", "expenses", "deficitActions", "investments"] as const;

/**
 * Mescla uma atualização enviada por um cliente que carregou inicialmente apenas um ano (`?year=YYYY`)
 * com os registros de outros anos já existentes no banco, evitando que lançamentos históricos sejam removidos.
 */
export function mergeScopedYearUserData(
  currentData: Record<string, any>,
  sanitizedNewData: Record<string, any[]>,
  scopedYear: number
): Record<string, any[]> {
  if (!Number.isInteger(scopedYear) || scopedYear < 2000 || scopedYear > 2100) {
    return sanitizedNewData;
  }

  const merged: Record<string, any[]> = { ...sanitizedNewData };

  for (const key of DATE_YEAR_SCOPED_KEYS) {
    if (!Array.isArray(sanitizedNewData[key])) continue;
    const incomingItems = sanitizedNewData[key];
    const incomingIds = new Set(
      incomingItems.map((it: any) => String(it?.id || "").trim()).filter(Boolean)
    );
    const existingItems = Array.isArray(currentData?.[key]) ? currentData[key] : [];
    const preservedOtherYears = existingItems.filter((it: any) => {
      if (!it || typeof it !== "object") return false;
      const id = String(it.id || "").trim();
      if (id && incomingIds.has(id)) return false;
      const itemYear = Number(String(it.date || "").slice(0, 4));
      return itemYear !== scopedYear;
    });
    merged[key] = [...incomingItems, ...preservedOtherYears];
  }

  if (Array.isArray(sanitizedNewData.annualPlanning)) {
    const incomingPlans = sanitizedNewData.annualPlanning;
    const incomingYears = new Set(
      incomingPlans.map((p: any) => Number(p?.year)).filter((y) => Number.isInteger(y))
    );
    const existingPlans = Array.isArray(currentData?.annualPlanning) ? currentData.annualPlanning : [];
    const preservedOtherYearPlans = existingPlans.filter((p: any) => {
      const y = Number(p?.year);
      return Number.isInteger(y) && y !== scopedYear && !incomingYears.has(y);
    });
    merged.annualPlanning = [...incomingPlans, ...preservedOtherYearPlans];
  }

  return merged;
}

/**
 * Normaliza timestamps de versão otimista (_version / user_data.updated_at) para formato
 * ISO UTC canônico (`YYYY-MM-DDTHH:mm:ss.sssZ`), eliminando falsos conflitos 409 causados pela
 * diferença de serialização do PostgreSQL TIMESTAMPTZ (`+00:00` vs `Z`, zeros finais omitidos).
 */
export function normalizeVersionTimestamp(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const parsedMs = Date.parse(trimmed);
  if (Number.isFinite(parsedMs)) {
    return new Date(parsedMs).toISOString();
  }
  return trimmed;
}

/**
 * Compara duas versões otimistas de forma canônica (equivalência de instante UTC).
 * Retorna `false` se qualquer uma estiver ausente ou não corresponder à outra.
 */
export function versionsMatch(expected: unknown, current: unknown): boolean {
  const normExpected = normalizeVersionTimestamp(expected);
  const normCurrent = normalizeVersionTimestamp(current);
  if (!normExpected || !normCurrent) return false;
  return normExpected === normCurrent;
}

/**
 * Gera a próxima versão monotônica em ISO UTC (`...Z`), garantindo avanço estrito de pelo
 * menos +1ms mesmo quando chamadas consecutivas ocorrem no mesmo milissegundo ou com clock skew.
 */
export function nextMonotonicVersion(prevVersion?: unknown, nowMs: number = Date.now()): string {
  const normPrev = normalizeVersionTimestamp(prevVersion);
  const prevMs = normPrev ? Date.parse(normPrev) : Number.NaN;
  const targetMs = Number.isFinite(prevMs) && prevMs >= nowMs ? prevMs + 1 : nowMs;
  return new Date(targetMs).toISOString();
}
