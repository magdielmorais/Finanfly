import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { DATABASE_SCHEMA_CATALOG, generateSafeSchemaScripts } from "./src/lib/databaseCatalog";
import {
  extractClientIp,
  createSecurityHeadersMiddleware,
  createStrictCorsMiddleware,
  createAuthLoginIpLimiter,
  createAuthSensitiveIpLimiter,
  createApiGeneralLimiter,
  LoginAttemptTracker,
} from "./src/server/security";
import {
  RETENTION_YEARS,
  TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  BACKUP_RETENTION_DAYS,
  BACKUP_RETENTION_MS,
  applyThreeYearRetention,
  isWithinTrashRestoreWindow,
  isWithinBackupRestoreWindow,
  summarizeUserDataSnapshot,
} from "./src/server/retention";
import {
  ForeignRowOwnershipError,
  pickAllowedUserDataFields,
  sanitizePostgrestEmailFilter,
  assertNoForeignRowOwnership,
  remapCollidingImportIds,
  mergeScopedYearUserData,
} from "./src/server/isolation";
import {
  verifyMercadoPagoWebhookSignature,
  isPaymentSimulationAllowed,
} from "./src/server/paymentSecurity";
import {
  PASSWORD_RESET_SETTING_PREFIX,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenActive,
  buildPasswordResetEmailPayload,
} from "./src/server/passwordReset";
import {
  ServerHealthMonitor,
  createHttpTelemetryMiddleware,
  sendMonitoringAlertWebhook,
  buildHealthPayload,
} from "./src/server/healthMonitor";

// Define _dirname de forma segura para ambientes ES Module (ESM) e CommonJS (CJS)
const _dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// Helper: verifica se uma string é um valor placeholder inválido
function isPlaceholderValue(v?: string): boolean {
  if (!v) return true;
  const clean = v.trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (!clean) return true;
  return (
    clean.includes("insira_") ||
    clean.includes("insira ") ||
    clean.includes("your_") ||
    clean.includes("placeholder") ||
    clean.includes("_aqui") ||
    clean === "aqui" ||
    clean.includes("<") ||
    clean.includes(">") ||
    clean.includes("seu_") ||
    clean.includes("sua_") ||
    clean.startsWith("your") ||
    clean.includes("your-anon-key")
  );
}

// Helper: limpa aspas e espaços de valores de ambiente
function cleanEnvString(v?: string): string {
  if (!v) return "";
  let clean = v.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  return clean;
}

// Helper: sanitiza a URL do Supabase removendo barras e sufixos /rest/v1
function cleanSupabaseUrl(rawUrl?: string): string {
  let url = cleanEnvString(rawUrl);
  if (!url) return "";
  if (url.endsWith("/rest/v1/")) {
    url = url.substring(0, url.length - 9);
  } else if (url.endsWith("/rest/v1")) {
    url = url.substring(0, url.length - 8);
  }
  if (url.endsWith("/")) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}

// Analisa pares chave=valor de um arquivo .env apenas em modo leitura
const parseEnvContent = (content: string) => {
  const map: Record<string, string> = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      val = cleanEnvString(val);
      if (!isPlaceholderValue(val)) {
        map[key] = val;
      }
    }
  }
  return map;
};

// Carrega variáveis de ambiente dos arquivos .env existentes sem criar/sobrescrever arquivos nem embutir segredos no código
function loadEnvFilesReadOnly() {
  const rootDir = process.cwd();
  const candidates = [
    path.join(rootDir, ".env"),
    path.join(rootDir, "nodejs", ".env"),
    path.join(_dirname, ".env"),
    path.join(_dirname, "nodejs", ".env"),
  ];

  for (const envPath of Array.from(new Set(candidates))) {
    try {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
        const parsed = parseEnvContent(fs.readFileSync(envPath, "utf-8"));
        for (const [k, v] of Object.entries(parsed)) {
          if (v && !isPlaceholderValue(v) && (!process.env[k] || isPlaceholderValue(process.env[k]))) {
            process.env[k] = v;
          }
        }
      }
    } catch {
      // ignora arquivo inacessível individual
    }
  }
}

loadEnvFilesReadOnly();

const app = express();
const PORT = 3000;
const serverStartedAt = Date.now();

const healthMonitor = new ServerHealthMonitor({
  onAlert: (event) => {
    const webhookUrl = (process.env.MONITORING_ALERT_WEBHOOK_URL || "").trim();
    if (webhookUrl && !isPlaceholderValue(webhookUrl)) {
      void sendMonitoringAlertWebhook(webhookUrl, event);
    }
  },
});

app.set("trust proxy", 1);
app.use(createSecurityHeadersMiddleware());
app.use("/api", createStrictCorsMiddleware());
app.use(express.json({ limit: "5mb" }));
app.use("/api", createHttpTelemetryMiddleware(healthMonitor));
app.use("/api", createApiGeneralLimiter());

const authLoginLimiter = createAuthLoginIpLimiter();
const authSensitiveLimiter = createAuthSensitiveIpLimiter();
const loginAttemptTracker = new LoginAttemptTracker();

import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let lastTestedKey: string = "";
let isSupabaseKeyInvalid: boolean = false;
let invalidKeyMarkedAt: number = 0;
let usingServiceRoleKey: boolean = false;

function markSupabaseKeyAsInvalid(reason?: string) {
  const now = Date.now();
  if (!isSupabaseKeyInvalid || (now - invalidKeyMarkedAt > 15000)) {
    isSupabaseKeyInvalid = true;
    invalidKeyMarkedAt = now;
    supabaseClient = null;
    console.error(`[Supabase Erro] A chave do Supabase é inválida ou expirou${reason ? ` (${reason})` : ""}. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY válidas nas variáveis de ambiente.`);
  }
}

function getSupabaseClient() {
  const rawUrl = process.env.SUPABASE_URL || process.env.supabase_url || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
  const rawAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.supabase_anon_key || process.env.supabase_key || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const cleanServiceKey = cleanEnvString(rawServiceKey);
  const hasValidServiceKey = Boolean(cleanServiceKey && !isPlaceholderValue(cleanServiceKey));
  usingServiceRoleKey = hasValidServiceKey;

  const rawKey = hasValidServiceKey ? cleanServiceKey : rawAnonKey;
  const cleanUrl = cleanSupabaseUrl(rawUrl);
  const cleanKey = cleanEnvString(rawKey);

  if (cleanKey !== lastTestedKey) {
    lastTestedKey = cleanKey;
    isSupabaseKeyInvalid = false;
    invalidKeyMarkedAt = 0;
  }

  if (isSupabaseKeyInvalid) {
    if (Date.now() - invalidKeyMarkedAt > 15000) {
      isSupabaseKeyInvalid = false;
      invalidKeyMarkedAt = 0;
    } else {
      return null;
    }
  }

  if (cleanUrl && cleanKey && !isPlaceholderValue(cleanUrl) && !isPlaceholderValue(cleanKey)) {
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      try {
        if (!supabaseClient || supabaseClient.supabaseKey !== cleanKey || supabaseClient.supabaseUrl !== cleanUrl) {
          supabaseClient = createClient(cleanUrl, cleanKey);
        }
        return supabaseClient;
      } catch (err) {
        console.error("[Supabase] Erro ao instanciar createClient:", err);
      }
    }
  }

  return null;
}

function isUsingServiceRole(): boolean {
  getSupabaseClient();
  return usingServiceRoleKey;
}

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Banco de dados Supabase não configurado ou indisponível no momento.");
  }
  return client;
}

async function logAuditEvent(params: {
  actorEmail?: string | null;
  targetEmail?: string | null;
  action: string;
  entity?: string;
  status?: "success" | "failed" | "blocked" | "warning" | "conflict";
  req?: express.Request;
  details?: Record<string, any>;
}) {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    const id = `aud_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const safeDetails = params.details ? { ...params.details } : {};
    delete (safeDetails as any).password;
    delete (safeDetails as any).token;

    const { error } = await client.from("audit_logs").insert({
      id,
      created_at: new Date().toISOString(),
      actor_email: params.actorEmail ? String(params.actorEmail).toLowerCase().trim() : null,
      target_email: params.targetEmail ? String(params.targetEmail).toLowerCase().trim() : null,
      action: params.action,
      entity: params.entity || null,
      status: params.status || "success",
      ip: params.req ? extractClientIp(params.req) : null,
      details: safeDetails,
    });
    if (error && !isMissingTableOrColumnError(error)) {
      console.warn("[Audit] Falha não bloqueante ao gravar log de auditoria:", error.message);
    }
  } catch {
    // Auditoria nunca deve derrubar o fluxo principal
  }
}

function isTransientNetworkError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

async function withSupabaseRetry<T = any>(fn: () => PromiseLike<T>, label: string, retries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries && isTransientNetworkError(err)) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Fila por usuário para serializar gravações concorrentes e impedir sobrescritas
const userWriteQueues = new Map<string, Promise<any>>();
function withUserWriteLock<T>(email: string, fn: () => Promise<T>): Promise<T> {
  const key = email.toLowerCase().trim();
  const prev = userWriteQueues.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  const tracked = next.catch(() => {});
  userWriteQueues.set(key, tracked);
  tracked.finally(() => {
    if (userWriteQueues.get(key) === tracked) {
      userWriteQueues.delete(key);
    }
  });
  return next;
}

// Criptografia de senhas (scrypt com salt aleatório por usuário + migração transparente de senhas legadas)
function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(plain: string, stored: string): { valid: boolean; needsUpgrade: boolean } {
  if (!stored || typeof plain !== "string") {
    return { valid: false, needsUpgrade: false };
  }
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const [, salt, hexHash] = parts;
    try {
      const derived = crypto.scryptSync(plain, salt, 64);
      const storedBuf = Buffer.from(hexHash, "hex");
      if (derived.length !== storedBuf.length) return { valid: false, needsUpgrade: false };
      return { valid: crypto.timingSafeEqual(derived, storedBuf), needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Registro legado ainda em texto plano: valida com timingSafeEqual e sinaliza migração imediata
  const a = Buffer.from(plain, "utf-8");
  const b = Buffer.from(stored, "utf-8");
  if (a.length !== b.length) return { valid: false, needsUpgrade: false };
  const valid = crypto.timingSafeEqual(a, b);
  return { valid, needsUpgrade: valid };
}

// ---------------- GESTÃO DE CONFIGURAÇÕES GLOBAIS NO SUPABASE (100% EM NUVEM) ----------------
let planPricesCache: { data: { mensal_de: string; mensal_por: string; anual_de: string; anual_por: string }; timestamp: number } | null = null;
let freeTrialDaysCache: { value: number; timestamp: number } | null = null;
let homeNoticesCache: { data: any; timestamp: number } | null = null;

async function getPlanPrices(): Promise<{ mensal_de: string; mensal_por: string; anual_de: string; anual_por: string }> {
  const supabase = requireSupabase();
  try {
    const { data, error } = await withSupabaseRetry<any>(
      () => supabase.from('system_settings').select('value').eq('key', 'plan_prices').maybeSingle(),
      'getPlanPrices'
    );
    if (!error && data && data.value && data.value.mensal_por) {
      planPricesCache = { data: data.value, timestamp: Date.now() };
      return data.value;
    }
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
  } catch (err) {
    if (planPricesCache && (Date.now() - planPricesCache.timestamp < 300000)) {
      return planPricesCache.data;
    }
    throw err;
  }

  return {
    mensal_de: "29,90",
    mensal_por: "19,90",
    anual_de: "299,00",
    anual_por: "149,00"
  };
}

async function savePlanPrices(prices: { mensal_de: string; mensal_por: string; anual_de: string; anual_por: string }): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('system_settings').upsert({
    key: 'plan_prices',
    value: prices,
    updated_at: new Date().toISOString()
  });
  if (error) {
    throw new Error(`Erro ao salvar valores dos planos no Supabase: ${error.message}`);
  }
  planPricesCache = { data: prices, timestamp: Date.now() };
}

async function getFreeTrialDays(): Promise<number> {
  const supabase = requireSupabase();
  try {
    const { data, error } = await withSupabaseRetry<any>(
      () => supabase.from('system_settings').select('value').eq('key', 'free_trial_days').maybeSingle(),
      'getFreeTrialDays'
    );

    if (!error && data && data.value && data.value.days !== undefined) {
      const days = Number(data.value.days);
      freeTrialDaysCache = { value: days, timestamp: Date.now() };
      return days;
    }
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
  } catch (err) {
    if (freeTrialDaysCache && (Date.now() - freeTrialDaysCache.timestamp < 300000)) {
      return freeTrialDaysCache.value;
    }
    throw err;
  }

  return 60;
}

async function saveFreeTrialDays(days: number): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('system_settings').upsert({
    key: 'free_trial_days',
    value: { days },
    updated_at: new Date().toISOString()
  });
  if (error) {
    throw new Error(`Erro ao salvar limite de teste grátis no Supabase: ${error.message}`);
  }
  freeTrialDaysCache = { value: days, timestamp: Date.now() };
}

// ---------------- GESTÃO DE MENSAGENS DE USUÁRIOS NO SUPABASE ----------------
let userMessagesCache: { data: Record<string, string>; timestamp: number } | null = null;

async function getUserMessagesMap(bypassCache = false): Promise<Record<string, string>> {
  if (!bypassCache && userMessagesCache && (Date.now() - userMessagesCache.timestamp < 15000)) {
    return userMessagesCache.data;
  }

  const supabase = requireSupabase();
  let map: Record<string, string> = {};

  try {
    const { data, error } = await withSupabaseRetry<any>(
      () => supabase.from('system_settings').select('value').eq('key', 'user_messages').maybeSingle(),
      'getUserMessagesMap'
    );

    if (!error && data && data.value && typeof data.value === 'object') {
      map = { ...data.value };
      userMessagesCache = { data: map, timestamp: Date.now() };
      return map;
    }
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
  } catch (err) {
    if (userMessagesCache) {
      return userMessagesCache.data;
    }
    console.warn('[Supabase] Aviso ao buscar user_messages:', err);
  }

  return map;
}

async function saveUserMessageToDatabase(email: string, message: string): Promise<void> {
  const lowerEmail = email.toLowerCase().trim();
  const cleanMsg = typeof message === 'string' ? message.trim() : '';
  const supabase = requireSupabase();

  const currentMap = await getUserMessagesMap(true);
  currentMap[lowerEmail] = cleanMsg;

  const { error } = await supabase.from('system_settings').upsert({
    key: 'user_messages',
    value: currentMap,
    updated_at: new Date().toISOString()
  });
  if (error) {
    throw new Error(`Erro ao gravar mensagem no Supabase: ${error.message}`);
  }
  userMessagesCache = { data: currentMap, timestamp: Date.now() };

  const cachedUser = userCache.get(lowerEmail);
  if (cachedUser) {
    cachedUser.data.userMessage = cleanMsg;
    cachedUser.data.mensagemUsuario = cleanMsg;
  }

  // Atualiza também profiles.user_message se a coluna existir
  try {
    await supabase.from('profiles').update({
      user_message: cleanMsg,
      updated_at: new Date().toISOString()
    }).eq('email', lowerEmail);
  } catch {
    // coluna opcional
  }

  // Atualiza user_data se existir
  try {
    const { data: udRow } = await supabase.from('user_data').select('data').eq('email', lowerEmail).maybeSingle();
    if (udRow && udRow.data) {
      udRow.data.userMessage = cleanMsg;
      udRow.data.mensagemUsuario = cleanMsg;
      await supabase.from('user_data').update({ data: udRow.data, updated_at: new Date().toISOString() }).eq('email', lowerEmail);
    }
  } catch {
    // opcional
  }
}

async function getHomeNotices(): Promise<{
  fluxoCaixa: { title: string; message: string };
  resumosInteligentes: { title: string; message: string };
  planejamentoObjetivos: { title: string; message: string };
  rule50_30_20: { title: string; message: string };
  weeklyCheck: { title: string; message: string };
}> {
  const supabase = requireSupabase();
  try {
    const { data, error } = await withSupabaseRetry<any>(
      () => supabase.from('system_settings').select('value').eq('key', 'home_notices').maybeSingle(),
      'getHomeNotices'
    );

    if (!error && data && data.value) {
      const val = data.value;
      const normalized = {
        fluxoCaixa: {
          title: val.fluxoCaixa?.title ?? '',
          message: val.fluxoCaixa?.message ?? ''
        },
        resumosInteligentes: {
          title: val.resumosInteligentes?.title ?? '',
          message: val.resumosInteligentes?.message ?? ''
        },
        planejamentoObjetivos: {
          title: val.planejamentoObjetivos?.title ?? '',
          message: val.planejamentoObjetivos?.message ?? ''
        },
        rule50_30_20: {
          title: val.rule50_30_20?.title ?? '',
          message: val.rule50_30_20?.message ?? ''
        },
        weeklyCheck: {
          title: val.weeklyCheck?.title ?? '',
          message: val.weeklyCheck?.message ?? ''
        }
      };
      homeNoticesCache = { data: normalized, timestamp: Date.now() };
      return normalized;
    }
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
  } catch (err) {
    if (homeNoticesCache && (Date.now() - homeNoticesCache.timestamp < 300000)) {
      return homeNoticesCache.data;
    }
    throw err;
  }

  return {
    fluxoCaixa: {
      title: "Fluxo de Caixa Simplificado",
      message: "Cadastre suas receitas e despesas de forma imediata, mantendo o controle total dos seus gastos diários sem perder tempo."
    },
    resumosInteligentes: {
      title: "Resumos Inteligentes",
      message: "Acompanhe a sua evolução financeira através de uma visão consolidada mensal e anual, identificando padrões de consumo e oportunidades de economia com facilidade, veja onde está o gargalo das suas finanças."
    },
    planejamentoObjetivos: {
      title: "Planejamento e Objetivos",
      message: "Transforme suas metas em realidade criando planos de ação personalizados com status de acompanhamento em tempo real, ajuste sua realidade de ganhos com os gastos."
    },
    rule50_30_20: {
      title: "Regra 70/30",
      message: "A regra de ouro das finanças recomenda destinar os seus rendimentos da seguinte forma:\n✳️ 70% para o BEM DA FAMÍLIA - Necessidades básicas, desejos, segurança, desenvolvimento, lazer, além do bem-estar físico e emocional.\n✳️ 10% para o BEM DO REINO - Reconhecendo que tudo vem do Criador, uma parte é destinada para expandir o Seu amor, apoiando, por exemplo, instituições religiosas focadas na evangelização.\n✳️ 10% para o BEM DAS PESSOAS - Demonstrando generosidade ao auxiliar o próximo em momentos de necessidade (cestas básicas, remédios, roupas e calçados) e ao celebrar conquistas (presentes de aniversário, casamento, formatura, etc.).\n✳️ 10% para o BEM FUTURO - Investimentos voltados à construção de riqueza, fazendo o dinheiro trabalhar por você para garantir uma aposentadoria farta e abundante."
    },
    weeklyCheck: {
      title: "Lançamento diário e Check-in Semanal",
      message: "Registre suas finanças assim que elas acontecerem. Depois, reserve apenas 10 minutos no início ou no fim da semana para revisar o resumo de receitas e despesas. Manter os lançamentos em dia é o segredo para evitar surpresas no fim do mês!"
    }
  };
}

async function saveHomeNotices(notices: any): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('system_settings').upsert({
    key: 'home_notices',
    value: notices,
    updated_at: new Date().toISOString()
  });
  if (error) {
    throw new Error(`Erro ao sincronizar avisos no Supabase: ${error.message}`);
  }
  homeNoticesCache = { data: notices, timestamp: Date.now() };
}

// Registra e-mail e CPF no histórico persistente de teste gratuito no Supabase
async function recordTrialHistory(email: string, cpf?: string): Promise<void> {
  const lowerEmail = email.toLowerCase().trim();
  const cleanCpf = cpf ? cpf.trim().replace(/\D/g, '') : '';
  const supabase = requireSupabase();

  const { error } = await supabase
    .from('trial_history')
    .upsert({
      email: lowerEmail,
      cpf: cleanCpf || null
    });
  if (error && !isMissingTableOrColumnError(error)) {
    throw new Error(`Erro ao registrar histórico de período grátis no Supabase: ${error.message}`);
  }
}

// Cache em memória de curto prazo exclusivamente alimentado por leituras válidas do Supabase
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const userCache = new Map<string, CacheEntry<any>>();
const userDataCache = new Map<string, CacheEntry<any>>();

function invalidateUserCache(email?: string) {
  if (email) {
    userCache.delete(email.toLowerCase().trim());
  } else {
    userCache.clear();
  }
}

function invalidateUserDataCache(email?: string) {
  if (email) {
    userDataCache.delete(email.toLowerCase().trim());
  } else {
    userDataCache.clear();
  }
}

// Helper to faithfully validate and normalize user subscription status
function normalizeUserSubscription(user: any, defaultTrialDays = 60) {
  if (!user) return user;
  if (!user.subscription) {
    user.subscription = {
      plan: 'none',
      validUntil: null,
      selectedAt: null,
      freePlanUsed: false,
      approved: false
    };
  }

  // 1. If validUntil is present, check expiration faithfully
  if (user.subscription.validUntil) {
    const validUntilStr = String(user.subscription.validUntil).trim();
    let expTime: number | null = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(validUntilStr)) {
      const [year, month, day] = validUntilStr.split('-').map(Number);
      expTime = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    } else if (validUntilStr.includes('T00:00:00')) {
      const base = new Date(validUntilStr);
      if (!isNaN(base.getTime())) {
        expTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999).getTime();
      }
    } else {
      const base = new Date(validUntilStr);
      if (!isNaN(base.getTime())) {
        expTime = base.getTime();
      }
    }

    if (expTime !== null) {
      const now = new Date();
      const expDate = new Date(expTime);
      const isToday = expDate.toLocaleDateString('pt-BR') === now.toLocaleDateString('pt-BR');
      const isValid = expTime >= now.getTime() || isToday;

      if (isValid && user.subscription.plan !== 'inativo' && !user.isBlocked) {
        // Faithful to expiration date: if expiration date is in future or today, user is approved and active
        user.subscription.approved = true;
        if (user.subscription.plan === 'none') {
          user.subscription.plan = 'mensal';
        }
      }
    }
  }

  // 2. Check registration trial: if validUntil is null/empty or plan is none/gratis,
  // and the user registered within freeTrialDays and is not blocked
  if (
    (!user.subscription.validUntil || user.subscription.plan === 'none') &&
    user.createdAt &&
    user.subscription.plan !== 'inativo' &&
    !user.isBlocked &&
    !user.subscription.freePlanUsedReason
  ) {
    const createdDate = new Date(user.createdAt);
    if (!isNaN(createdDate.getTime())) {
      const trialEnd = new Date(createdDate.getTime() + defaultTrialDays * 24 * 60 * 60 * 1000);
      trialEnd.setHours(23, 59, 59, 999);
      const now = new Date();
      const isToday = trialEnd.toLocaleDateString('pt-BR') === now.toLocaleDateString('pt-BR');
      if (trialEnd.getTime() >= now.getTime() || isToday) {
        // User registered with trial period still running: restore full access!
        user.subscription.validUntil = trialEnd.toISOString();
        user.subscription.plan = 'gratis';
        user.subscription.approved = true;
        user.subscription.freePlanUsed = true;
      }
    }
  }

  // Auto-seed initial history entry if user has an active plan but no history yet
  if ((!user.subscriptionHistory || user.subscriptionHistory.length === 0) && user.subscription && user.subscription.plan && user.subscription.plan !== 'none') {
    addSubscriptionHistoryEntry(user, {
      plan: user.subscription.plan,
      validUntil: user.subscription.validUntil || null,
      createdAt: user.subscription.selectedAt || user.createdAt || new Date().toISOString(),
      source: user.subscription.plan === 'gratis' ? 'cadastro' : 'assinatura',
      status: user.subscription.plan === 'inativo' || user.isBlocked ? 'Inativo' : 'Ativo',
      description: user.subscription.plan === 'gratis'
        ? 'Período Grátis de Experiência (Cadastro)'
        : user.subscription.plan === 'livre'
        ? 'Acesso Livre Vitalício'
        : `Plano ${user.subscription.plan === 'mensal' ? 'Mensal' : user.subscription.plan === 'anual' ? 'Anual' : user.subscription.plan} Ativo`
    });
  }

  return user;
}

// Helper to add and maintain subscription history entries
function addSubscriptionHistoryEntry(
  user: any,
  entry: {
    plan: string;
    validUntil: string | null;
    source?: string;
    status?: string;
    description?: string;
    price?: string;
    createdAt?: string;
    paymentId?: string;
  }
) {
  if (!user) return;
  if (!user.subscriptionHistory || !Array.isArray(user.subscriptionHistory)) {
    user.subscriptionHistory = [];
  }

  if (entry.paymentId && user.subscriptionHistory.some((h: any) => h?.paymentId && String(h.paymentId) === String(entry.paymentId))) {
    return;
  }

  const nowIso = entry.createdAt || new Date().toISOString();

  // Avoid duplicate log if an identical plan, validity and source was logged in the last 15 seconds
  const last = user.subscriptionHistory[0];
  if (
    last &&
    last.plan === entry.plan &&
    last.validUntil === entry.validUntil &&
    last.source === entry.source &&
    (Date.now() - new Date(last.createdAt).getTime() < 15000)
  ) {
    return;
  }

  const item: Record<string, any> = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    plan: entry.plan,
    createdAt: nowIso,
    validUntil: entry.validUntil,
    source: entry.source || 'sistema',
    status: entry.status || 'Ativo',
    description: entry.description || '',
    price: entry.price || ''
  };
  if (entry.paymentId) {
    item.paymentId = String(entry.paymentId);
  }

  user.subscriptionHistory.unshift(item);

  if (user.subscriptionHistory.length > 50) {
    user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);
  }
}

// Check if an email or CPF already used a free trial in Supabase
async function checkIsBlacklisted(email: string, cpf?: string): Promise<{ blacklisted: boolean; reason?: string }> {
  const lowerEmail = email.toLowerCase().trim();
  const cleanCpf = cpf ? cpf.trim().replace(/\D/g, '') : '';
  const supabase = requireSupabase();

  const { data: byEmail, error: emailErr } = await withSupabaseRetry<any>(
    () => supabase.from('trial_history').select('email').eq('email', lowerEmail).maybeSingle(),
    'checkIsBlacklisted:email'
  );
  if (emailErr && !isMissingTableOrColumnError(emailErr)) {
    throw new Error(`Erro ao consultar trial_history no Supabase: ${emailErr.message}`);
  }
  if (byEmail) {
    return { blacklisted: true, reason: `O e-mail ${lowerEmail} já utilizou o período de experiência grátis.` };
  }

  if (cleanCpf) {
    const { data: byCpf, error: cpfErr } = await withSupabaseRetry<any>(
      () => supabase.from('trial_history').select('cpf').eq('cpf', cleanCpf).maybeSingle(),
      'checkIsBlacklisted:cpf'
    );
    if (cpfErr && !isMissingTableOrColumnError(cpfErr)) {
      throw new Error(`Erro ao consultar trial_history por CPF no Supabase: ${cpfErr.message}`);
    }
    if (byCpf) {
      return { blacklisted: true, reason: `O CPF ${cpf} já utilizou o período de experiência grátis.` };
    }
  }

  return { blacklisted: false };
}

// Get user by email exclusively from Supabase (throws on transient DB error when requested)
async function getUserByEmail(
  email: string,
  options: boolean | { bypassCache?: boolean; throwOnError?: boolean } = false
): Promise<any> {
  const bypassCache = typeof options === 'boolean' ? options : Boolean(options?.bypassCache);
  const throwOnError = typeof options === 'boolean' ? false : Boolean(options?.throwOnError);
  const lowerEmail = email.toLowerCase().trim();

  if (!bypassCache) {
    const cached = userCache.get(lowerEmail);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
  }

  const supabase = requireSupabase();

  try {
    const [userRes, profileRes, subRes] = await withSupabaseRetry(async () => {
      const queryPromise = Promise.all([
        supabase.from('users').select('*').eq('email', lowerEmail).maybeSingle(),
        supabase.from('profiles').select('*').eq('email', lowerEmail).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('email', lowerEmail).maybeSingle()
      ]);
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_USER')), 15000));
      return Promise.race([queryPromise, timeoutPromise]);
    }, `getUserByEmail:${lowerEmail}`);

    if (userRes.error) {
      if (userRes.error.message?.includes("Invalid API key") || userRes.error.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
      }
      throw new Error(userRes.error.message || "Falha ao consultar tabela 'users' no Supabase.");
    }
    if (profileRes.error && !isMissingTableOrColumnError(profileRes.error)) {
      throw new Error(profileRes.error.message || "Falha ao consultar tabela 'profiles' no Supabase.");
    }
    if (subRes.error && !isMissingTableOrColumnError(subRes.error)) {
      throw new Error(subRes.error.message || "Falha ao consultar tabela 'subscriptions' no Supabase.");
    }

    const userData = userRes.data;
    if (!userData) {
      return null;
    }

    const profileData = profileRes.data;
    const subData = subRes.data;
    const cpfValue = profileData ? profileData.cpf : (userData.cpf || '');

    const messagesMap = await getUserMessagesMap();
    const resolvedUserMessage = (messagesMap[lowerEmail] !== undefined && messagesMap[lowerEmail] !== '')
      ? messagesMap[lowerEmail]
      : (profileData?.user_message !== undefined && profileData.user_message !== ''
          ? String(profileData.user_message).trim()
          : '');

    const isBlockedFromDb = (userData.is_blocked !== undefined)
      ? !!userData.is_blocked
      : (userData.isBlocked !== undefined
          ? !!userData.isBlocked
          : (profileData?.is_blocked !== undefined
              ? !!profileData.is_blocked
              : (subData ? subData.plan === 'inativo' : false)));

    const compiledUser = {
      email: userData.email,
      password: userData.password || '',
      role: userData.role || 'user',
      createdAt: userData.created_at || new Date().toISOString(),
      lastAccess: profileData?.updated_at || userData?.created_at || new Date().toISOString(),
      name: profileData ? profileData.name : (userData.name || ''),
      address: profileData ? profileData.address : (userData.address || ''),
      city: profileData ? profileData.city : (userData.city || ''),
      state: profileData ? profileData.state : (userData.state || ''),
      phone: profileData ? profileData.phone : (userData.phone || ''),
      cpf: cpfValue || '',
      userMessage: resolvedUserMessage,
      mensagemUsuario: resolvedUserMessage,
      isBlocked: isBlockedFromDb,
      subscription: subData ? {
        plan: subData.plan || 'none',
        validUntil: subData.valid_until,
        selectedAt: subData.selected_at,
        freePlanUsed: !!subData.free_plan_used,
        approved: !!subData.approved
      } : {
        plan: 'none',
        validUntil: null,
        selectedAt: null,
        freePlanUsed: false,
        approved: false
      },
      subscriptionHistory: Array.isArray(subData?.history) ? subData.history : []
    };

    const trialDays = await getFreeTrialDays().catch(() => 60);
    normalizeUserSubscription(compiledUser, trialDays);
    userCache.set(lowerEmail, { data: compiledUser, timestamp: Date.now() });
    return compiledUser;
  } catch (err: any) {
    if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
      markSupabaseKeyAsInvalid("Invalid API key");
    } else {
      console.error("Falha ao consultar usuário no Supabase:", err?.message || err);
    }
    if (throwOnError) {
      throw err;
    }
    const cached = userCache.get(lowerEmail);
    if (cached) return cached.data;
    throw err;
  }
}

// Save/Update user profile strictly on Supabase (throws on failure, never saves locally)
async function saveUser(user: any): Promise<boolean> {
  const lowerEmail = user.email.toLowerCase().trim();
  const supabase = requireSupabase();
  const existingSource = userCache.get(lowerEmail)?.data || {};

  const mergedName = user.name !== undefined && user.name !== '' ? user.name : (existingSource.name || '');
  const mergedAddress = user.address !== undefined && user.address !== '' ? user.address : (existingSource.address || '');
  const mergedCity = user.city !== undefined && user.city !== '' ? user.city : (existingSource.city || '');
  const mergedState = user.state !== undefined && user.state !== '' ? user.state : (existingSource.state || '');
  const mergedPhone = user.phone !== undefined && user.phone !== '' ? user.phone : (existingSource.phone || '');
  const mergedCpf = user.cpf !== undefined && user.cpf !== '' ? user.cpf : (existingSource.cpf || '');
  const mergedPassword = user.password !== undefined && user.password !== '' ? user.password : (existingSource.password || '');

  const messagesMap = await getUserMessagesMap();
  const dbSavedMsg = (messagesMap[lowerEmail] !== undefined && messagesMap[lowerEmail] !== '') ? messagesMap[lowerEmail] : undefined;

  const mergedUserMessage = user.userMessage !== undefined
    ? user.userMessage
    : (user.mensagemUsuario !== undefined
        ? user.mensagemUsuario
        : (dbSavedMsg !== undefined ? dbSavedMsg : (existingSource.userMessage !== undefined ? existingSource.userMessage : (existingSource.mensagemUsuario || ''))));

  const finalUser = {
    ...existingSource,
    ...user,
    email: lowerEmail,
    name: mergedName,
    address: mergedAddress,
    city: mergedCity,
    state: mergedState,
    phone: mergedPhone,
    cpf: mergedCpf,
    password: mergedPassword,
    userMessage: mergedUserMessage,
    mensagemUsuario: mergedUserMessage,
    subscriptionHistory: user.subscriptionHistory !== undefined ? user.subscriptionHistory : (existingSource.subscriptionHistory || [])
  };

  try {
    // 1. Upsert users table
    let { error: userErr } = await supabase
      .from('users')
      .upsert({
        email: lowerEmail,
        password: finalUser.password,
        role: finalUser.role || 'user',
        created_at: finalUser.createdAt || finalUser.created_at || new Date().toISOString(),
        is_blocked: !!finalUser.isBlocked
      });

    if (userErr && (userErr.code === '42703' || userErr.code === 'PGRST204' || userErr.message?.includes('is_blocked'))) {
      const fallbackRes = await supabase
        .from('users')
        .upsert({
          email: lowerEmail,
          password: finalUser.password,
          role: finalUser.role || 'user',
          created_at: finalUser.createdAt || finalUser.created_at || new Date().toISOString()
        });
      userErr = fallbackRes.error;
    }

    if (userErr) {
      if (userErr.message?.includes("Invalid API key") || userErr.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
      }
      throw new Error(`Erro ao salvar usuário no Supabase: ${userErr.message}`);
    }

    // 2. Upsert profiles table
    const profilePayload: any = {
      email: lowerEmail,
      name: finalUser.name || '',
      address: finalUser.address || '',
      city: finalUser.city || '',
      state: finalUser.state || '',
      phone: finalUser.phone || '',
      cpf: finalUser.cpf || '',
      updated_at: new Date().toISOString()
    };
    if (mergedUserMessage !== undefined && mergedUserMessage !== '') {
      profilePayload.user_message = mergedUserMessage;
    }

    let { error: profErr } = await supabase.from('profiles').upsert(profilePayload);
    if (profErr && (profErr.code === '42703' || profErr.code === 'PGRST204' || profErr.message?.includes('user_message'))) {
      delete profilePayload.user_message;
      const retryProf = await supabase.from('profiles').upsert(profilePayload);
      profErr = retryProf.error;
    }
    if (profErr) {
      throw new Error(`Erro ao salvar perfil no Supabase: ${profErr.message}`);
    }

    // 3. Upsert subscriptions table
    if (finalUser.subscription) {
      const subPayload: any = {
        email: lowerEmail,
        plan: finalUser.subscription.plan || 'none',
        valid_until: finalUser.subscription.validUntil || null,
        selected_at: finalUser.subscription.selectedAt || null,
        free_plan_used: !!finalUser.subscription.freePlanUsed,
        approved: !!finalUser.subscription.approved,
        history: finalUser.subscriptionHistory || [],
        updated_at: new Date().toISOString()
      };

      let { error: subErr } = await supabase.from('subscriptions').upsert(subPayload);
      if (subErr && (subErr.code === '42703' || subErr.code === 'PGRST204' || subErr.message?.includes('history'))) {
        delete subPayload.history;
        const retrySub = await supabase.from('subscriptions').upsert(subPayload);
        subErr = retrySub.error;
      }
      if (subErr) {
        throw new Error(`Erro ao salvar assinatura no Supabase: ${subErr.message}`);
      }
    }

    if (mergedUserMessage !== undefined && user.userMessage !== undefined) {
      await saveUserMessageToDatabase(lowerEmail, mergedUserMessage);
    }

    if (finalUser.subscription && (finalUser.subscription.freePlanUsed || finalUser.subscription.plan === 'gratis')) {
      await recordTrialHistory(lowerEmail, finalUser.cpf);
    }

    userCache.set(lowerEmail, { data: { ...finalUser }, timestamp: Date.now() });
    return true;
  } catch (err: any) {
    if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
      markSupabaseKeyAsInvalid("Invalid API key");
    }
    throw err;
  }
}

// ==========================================
// Empty Workspace Data Structure (No Automatic Seeding)
// ==========================================
function getEmptyUserData() {
  return {
    receiptTypes: [],
    paymentTypes: [],
    receiptStatuses: [],
    paymentStatuses: [],
    incomeCategories: [],
    expenseCategories: [],
    investmentTypes: [],
    investmentStatuses: [],
    incomes: [],
    expenses: [],
    investments: [],
    trips: [],
    wishes: [],
    shoppingList: [],
    actionPlans: [],
    deficitActions: [],
    annualPlanning: []
  };
}

function isMissingTableOrColumnError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === '42703' ||
    err.code === 'PGRST205' ||
    err.code === 'PGRST204' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find')
  );
}

function hasSupabaseQueryError(res: any): boolean {
  return Boolean(res && res.error);
}

function pickNonEmptyArray(primary: any[] | null | undefined, ...fallbacks: Array<any[] | null | undefined>): any[] {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  for (const fb of fallbacks) {
    if (Array.isArray(fb) && fb.length > 0) return fb;
  }
  return Array.isArray(primary) ? primary : [];
}

// Paginated Supabase fetch helper (prevents silent 1,000-row cap truncation)
async function fetchAllPaginatedRows(
  buildQuery: (from: number, to: number) => any,
  operationName: string,
  pageSize = 1000
): Promise<{ data: any[]; error: any }> {
  const allRows: any[] = [];
  let offset = 0;
  while (true) {
    const res = await withSupabaseRetry<any>(
      () => buildQuery(offset, offset + pageSize - 1),
      `${operationName}:page:${offset}`
    );
    if (res?.error) {
      return { data: allRows, error: res.error };
    }
    const batch = Array.isArray(res?.data) ? res.data : [];
    allRows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }
  return { data: allRows, error: null };
}

// Get user workspace data exclusively from Supabase (never injects defaults or masks errors when throwOnError=true)
async function getUserDataByEmail(
  email: string,
  options: boolean | { bypassCache?: boolean; throwOnError?: boolean; year?: number } = false
): Promise<any> {
  const bypassCache = typeof options === 'boolean' ? options : Boolean(options?.bypassCache);
  const throwOnError = typeof options === 'boolean' ? false : Boolean(options?.throwOnError);
  const filterYear = (typeof options === 'object' && options?.year && Number.isInteger(options.year) && options.year >= 2000 && options.year <= 2100)
    ? options.year
    : undefined;

  const lowerEmail = email.toLowerCase().trim();
  const supabase = requireSupabase();

  const cached = userDataCache.get(lowerEmail);
  if (!filterYear && !bypassCache && cached && cached.data && (Date.now() - cached.timestamp < 30000)) {
    return cached.data;
  }

  const yearStart = filterYear ? `${filterYear}-01-01` : null;
  const yearEnd = filterYear ? `${filterYear}-12-31` : null;

  try {
    const fetchNameList = (table: string) =>
      fetchAllPaginatedRows(
        (from, to) => supabase.from(table).select('name').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
        `getUserDataByEmail:${table}`
      );

    const fetchIncomes = () =>
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase.from('incomes').select('*').eq('email', lowerEmail);
          if (yearStart && yearEnd) q = q.gte('date', yearStart).lte('date', yearEnd);
          return q.order('date', { ascending: false }).order('id', { ascending: true }).range(from, to);
        },
        'getUserDataByEmail:incomes'
      );

    const fetchExpenses = () =>
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase.from('expenses').select('*').eq('email', lowerEmail);
          if (yearStart && yearEnd) q = q.gte('date', yearStart).lte('date', yearEnd);
          return q.order('date', { ascending: false }).order('id', { ascending: true }).range(from, to);
        },
        'getUserDataByEmail:expenses'
      );

    const fetchAnnual = () =>
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase.from('annual_planning').select('*').eq('email', lowerEmail);
          if (filterYear) q = q.eq('year', filterYear);
          return q.order('year', { ascending: true }).range(from, to);
        },
        'getUserDataByEmail:annual_planning'
      );

    const fetchDeficit = () =>
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase.from('deficit_actions').select('*').eq('email', lowerEmail);
          if (yearStart && yearEnd) q = q.gte('date', yearStart).lte('date', yearEnd);
          return q.order('date', { ascending: false }).order('id', { ascending: true }).range(from, to);
        },
        'getUserDataByEmail:deficit_actions'
      );

    const fetchInvestments = () =>
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase.from('investments').select('*').eq('email', lowerEmail);
          if (yearStart && yearEnd) q = q.gte('date', yearStart).lte('date', yearEnd);
          return q.order('date', { ascending: false }).order('id', { ascending: true }).range(from, to);
        },
        'getUserDataByEmail:investments'
      );

    const [
      rTypesRes,
      rStatusesRes,
      pTypesRes,
      pStatusesRes,
      incCatsRes,
      expCatsRes,
      incomesRes,
      expensesRes,
      annualRes,
      shopRes,
      actPlansRes,
      defActionsRes,
      tripsRes,
      wishesRes,
      investRes,
      invTypesRes,
      invStatusesRes,
      backupUserDataRes
    ] = await withSupabaseRetry(async () => {
      const queryPromise = Promise.all([
        fetchNameList('receipt_types'),
        fetchNameList('receipt_statuses'),
        fetchNameList('payment_types'),
        fetchNameList('payment_statuses'),
        fetchNameList('income_categories'),
        fetchNameList('expense_categories'),
        fetchIncomes(),
        fetchExpenses(),
        fetchAnnual(),
        fetchAllPaginatedRows(
          (from, to) => supabase.from('shopping_list').select('*').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
          'getUserDataByEmail:shopping_list'
        ),
        fetchAllPaginatedRows(
          (from, to) => supabase.from('action_plans').select('*').eq('email', lowerEmail).order('target_date', { ascending: true }).order('id', { ascending: true }).range(from, to),
          'getUserDataByEmail:action_plans'
        ),
        fetchDeficit(),
        fetchAllPaginatedRows(
          (from, to) => supabase.from('trips').select('*').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
          'getUserDataByEmail:trips'
        ),
        fetchAllPaginatedRows(
          (from, to) => supabase.from('wishes').select('*').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
          'getUserDataByEmail:wishes'
        ),
        fetchInvestments(),
        fetchNameList('investment_types'),
        fetchNameList('investment_statuses'),
        supabase.from('user_data').select('data, updated_at').eq('email', lowerEmail).maybeSingle()
      ]);
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_USER_DATA')), 25000));
      return Promise.race([queryPromise, timeoutPromise]);
    }, `getUserDataByEmail:${lowerEmail}`);

    const queryChecks: Array<[string, any]> = [
      ['receipt_types', rTypesRes],
      ['receipt_statuses', rStatusesRes],
      ['payment_types', pTypesRes],
      ['payment_statuses', pStatusesRes],
      ['income_categories', incCatsRes],
      ['expense_categories', expCatsRes],
      ['incomes', incomesRes],
      ['expenses', expensesRes],
      ['annual_planning', annualRes],
      ['shopping_list', shopRes],
      ['action_plans', actPlansRes],
      ['deficit_actions', defActionsRes],
      ['trips', tripsRes],
      ['wishes', wishesRes],
      ['investments', investRes],
      ['investment_types', invTypesRes],
      ['investment_statuses', invStatusesRes]
    ];

    const failedEntries = queryChecks.filter(([, r]) => hasSupabaseQueryError(r));
    const failedTables = failedEntries.map(([name]) => name);
    const backupError = hasSupabaseQueryError(backupUserDataRes);
    const backupData = !backupError ? backupUserDataRes?.data?.data : null;

    if (failedEntries.length > 0 || backupError) {
      const details = failedEntries
        .map(([name, r]) => `${name}: [${r?.error?.code || 'ERR'}] ${r?.error?.message || 'Erro desconhecido'}`)
        .join(' | ');
      if (details) {
        console.warn(`[getUserDataByEmail] Erros ao consultar Supabase para ${lowerEmail}:`, details);
      }
      if (backupError) {
        console.warn(`[getUserDataByEmail] Erro ao consultar user_data para ${lowerEmail}:`, backupUserDataRes?.error?.message);
      }
      if (throwOnError) {
        const allFailed = backupError ? [...failedTables, 'user_data'] : failedTables;
        throw new Error(`Falha ao consultar tabelas no Supabase (${allFailed.join(', ')}).`);
      }
    }

    const resolveNameList = (res: any, backupArr: any, cacheArr: any): string[] => {
      if (!hasSupabaseQueryError(res) && Array.isArray(res?.data)) {
        return res.data.map((r: any) => r.name);
      }
      return pickNonEmptyArray(backupArr, cacheArr);
    };

    const resolveEntityList = <T>(res: any, mapper: (r: any) => T, backupArr: any, cacheArr: any): T[] => {
      if (!hasSupabaseQueryError(res) && Array.isArray(res?.data)) {
        return res.data.map(mapper);
      }
      return pickNonEmptyArray(backupArr, cacheArr);
    };

    const mappedExpenses = resolveEntityList(
      expensesRes,
      (r: any) => {
        const backupExp = backupData?.expenses?.find((b: any) => b.id === r.id);
        const rawClass = (r.classification !== undefined && r.classification !== null && r.classification !== '')
          ? r.classification
          : (r.classificacao !== undefined && r.classificacao !== null && r.classificacao !== '')
          ? r.classificacao
          : (backupExp && backupExp.classification !== undefined && backupExp.classification !== null && backupExp.classification !== '')
          ? backupExp.classification
          : undefined;
        return {
          id: r.id,
          date: r.date,
          description: r.description,
          value: Number(r.value),
          category: r.category,
          status: r.status,
          paymentType: r.payment_type,
          classification: rawClass || undefined
        };
      },
      backupData?.expenses,
      cached?.data?.expenses
    );

    const resolvedAnnual = (!hasSupabaseQueryError(annualRes) && Array.isArray(annualRes?.data))
      ? annualRes.data.map((r: any) => ({ year: r.year, monthlyBudgets: r.monthly_budgets }))
      : pickNonEmptyArray(backupData?.annualPlanning, cached?.data?.annualPlanning);

    const rawResponseData: any = {
      receiptTypes: resolveNameList(rTypesRes, backupData?.receiptTypes, cached?.data?.receiptTypes),
      receiptStatuses: resolveNameList(rStatusesRes, backupData?.receiptStatuses, cached?.data?.receiptStatuses),
      paymentTypes: resolveNameList(pTypesRes, backupData?.paymentTypes, cached?.data?.paymentTypes),
      paymentStatuses: resolveNameList(pStatusesRes, backupData?.paymentStatuses, cached?.data?.paymentStatuses),
      incomeCategories: resolveNameList(incCatsRes, backupData?.incomeCategories, cached?.data?.incomeCategories),
      expenseCategories: resolveNameList(expCatsRes, backupData?.expenseCategories, cached?.data?.expenseCategories),
      incomes: resolveEntityList(
        incomesRes,
        (r: any) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          value: Number(r.value),
          category: r.category,
          status: r.status,
          paymentType: r.payment_type
        }),
        backupData?.incomes,
        cached?.data?.incomes
      ),
      expenses: mappedExpenses,
      annualPlanning: resolvedAnnual,
      shoppingList: resolveEntityList(
        shopRes,
        (r: any) => ({
          id: r.id,
          name: r.name,
          quantity: Number(r.quantity),
          price: Number(r.price),
          category: r.category,
          checked: !!r.checked,
          date: r.date || undefined
        }),
        backupData?.shoppingList,
        cached?.data?.shoppingList
      ),
      actionPlans: resolveEntityList(
        actPlansRes,
        (r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          targetDate: r.target_date,
          value: Number(r.value),
          status: r.status
        }),
        backupData?.actionPlans,
        cached?.data?.actionPlans
      ),
      deficitActions: resolveEntityList(
        defActionsRes,
        (r: any) => ({
          id: r.id,
          costCenter: r.cost_center,
          reason: r.reason,
          correctionAction: r.correction_action,
          responsible: r.responsible,
          date: r.date,
          status: r.status
        }),
        backupData?.deficitActions,
        cached?.data?.deficitActions
      ),
      trips: resolveEntityList(
        tripsRes,
        (r: any) => ({ id: r.id, name: r.name, expenses: r.expenses || [] }),
        backupData?.trips,
        cached?.data?.trips
      ),
      wishes: resolveEntityList(
        wishesRes,
        (r: any) => ({ id: r.id, title: r.title, description: r.description, targetDate: r.target_date, value: Number(r.value), status: r.status }),
        backupData?.wishes,
        cached?.data?.wishes
      ),
      investments: resolveEntityList(
        investRes,
        (r: any) => ({ id: r.id, name: r.name, type: r.type, date: r.date, value: Number(r.value), status: r.status, notes: r.notes }),
        backupData?.investments,
        cached?.data?.investments
      ),
      investmentTypes: resolveNameList(invTypesRes, backupData?.investmentTypes, cached?.data?.investmentTypes),
      investmentStatuses: resolveNameList(invStatusesRes, backupData?.investmentStatuses, cached?.data?.investmentStatuses),
      _version: (!backupError && backupUserDataRes?.data?.updated_at) ? String(backupUserDataRes.data.updated_at) : undefined,
      ...(filterYear ? { _loadedYear: filterYear } : {})
    };

    const responseData = !filterYear
      ? applyThreeYearRetention(rawResponseData).prunedData
      : rawResponseData;

    if (!filterYear && failedTables.length === 0 && !backupError) {
      userDataCache.set(lowerEmail, { data: responseData, timestamp: Date.now() });
    }

    return responseData;
  } catch (err: any) {
    console.warn("Erro ao ler dados relacionais no Supabase:", err?.message || err);

    if (throwOnError) {
      throw err;
    }

    if (!bypassCache && cached && cached.data) {
      return cached.data;
    }

    throw err;
  }
}

const TRASH_ENTITY_LABELS: Record<string, string> = {
  incomes: 'Receita',
  expenses: 'Despesa',
  investments: 'Investimento',
  trips: 'Viagem',
  wishes: 'Desejo',
  actionPlans: 'Meta / Plano de Ação',
  deficitActions: 'Ação de Ajuste',
  shoppingList: 'Lista de Compras'
};

function formatTrashLabel(entity: string, item: any): string {
  if (!item || typeof item !== 'object') return TRASH_ENTITY_LABELS[entity] || 'Registro';
  const baseLabel = String(
    item.description || item.title || item.name || item.costCenter || item.correctionAction || item.id || 'Registro'
  ).trim();
  return baseLabel.slice(0, 140);
}

async function archiveDeletedItemsToTrash(
  supabase: any,
  lowerEmail: string,
  entityKey: string,
  itemsToArchive: any[]
) {
  if (!Array.isArray(itemsToArchive) || itemsToArchive.length === 0) return;

  const now = Date.now();
  const deletedAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + TRASH_RETENTION_MS).toISOString();

  const trashRows = itemsToArchive
    .filter((it) => it && it.id)
    .map((it) => ({
      id: `trash_${crypto.randomUUID()}`,
      email: lowerEmail,
      entity: entityKey,
      record_id: String(it.id),
      label: formatTrashLabel(entityKey, it),
      payload: it,
      deleted_at: deletedAtIso,
      expires_at: expiresAtIso
    }));

  if (trashRows.length === 0) return;

  const { error } = await supabase.from('trash_items').insert(trashRows);
  if (error) {
    if (isMissingTableOrColumnError(error)) {
      console.warn('[trash_items] Tabela ainda não criada no Supabase. Execute o Script Diferencial Seguro no Administrador → Conexão.');
      return;
    }
    console.warn(`[trash_items] Falha não-crítica ao mover exclusão para lixeira (${entityKey}):`, error.message);
  }
}

type BackupTriggerType = 'auto' | 'manual' | 'pre_restore' | 'user_restore';
const AUTO_BACKUP_THROTTLE_MS = 15 * 60 * 1000;
const lastAutoBackupAt = new Map<string, number>();

async function createUserBackupSnapshot(
  supabase: any,
  email: string,
  data: any,
  triggerType: BackupTriggerType = 'auto',
  options?: { respectThrottle?: boolean; allowEmpty?: boolean }
): Promise<{ created: boolean; tableMissing?: boolean; backupId?: string; skippedReason?: string }> {
  const lowerEmail = email.toLowerCase().trim();
  if (!lowerEmail || !data || typeof data !== 'object') {
    return { created: false, skippedReason: 'invalid_input' };
  }

  const now = Date.now();
  if (options?.respectThrottle) {
    const lastTs = lastAutoBackupAt.get(lowerEmail) || 0;
    if (now - lastTs < AUTO_BACKUP_THROTTLE_MS) {
      return { created: false, skippedReason: 'throttled' };
    }
  }

  const { _version, _expectedVersion, _allowClearAll, ...rawSnapshot } = data;
  const retention = applyThreeYearRetention(rawSnapshot);
  const cleanSnapshot = retention.prunedData;
  const summary = summarizeUserDataSnapshot(cleanSnapshot);

  if (!options?.allowEmpty && summary.totalRecords === 0 && summary.categoriesCount === 0) {
    return { created: false, skippedReason: 'empty_workspace' };
  }

  const cutoffIso = new Date(now - BACKUP_RETENTION_MS).toISOString();
  const createdAtIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + BACKUP_RETENTION_MS).toISOString();
  const backupId = `bkp_${now}_${crypto.randomBytes(5).toString('hex')}`;

  try {
    await supabase
      .from('user_backups')
      .delete()
      .eq('email', lowerEmail)
      .lt('created_at', cutoffIso);

    const { error } = await supabase.from('user_backups').insert({
      id: backupId,
      email: lowerEmail,
      trigger_type: triggerType,
      summary,
      snapshot: cleanSnapshot,
      created_at: createdAtIso,
      expires_at: expiresAtIso,
    });

    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return { created: false, tableMissing: true };
      }
      console.warn(`[user_backups] Falha ao gravar snapshot (${triggerType}) para ${lowerEmail}:`, error.message);
      return { created: false, skippedReason: error.message };
    }

    if (triggerType === 'auto') {
      lastAutoBackupAt.set(lowerEmail, now);
    }
    return { created: true, backupId };
  } catch (err: any) {
    console.warn(`[user_backups] Exceção ao gravar snapshot para ${lowerEmail}:`, err?.message || err);
    return { created: false, skippedReason: err?.message || 'error' };
  }
}

// Helper: Diff-based sync for name-list tables (paginated + strictly throws on any error)
async function syncNameListTable(supabase: any, table: string, lowerEmail: string, desiredNames: string[]) {
  const uniqueDesired = Array.from(new Set(desiredNames.map((n: any) => String(n || '').trim()).filter(Boolean)));
  const { data: existingRows, error: fetchErr } = await fetchAllPaginatedRows(
    (from, to) => supabase.from(table).select('id, name').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
    `syncNameListTable:select:${table}`
  );
  if (fetchErr) {
    throw new Error(`[${table}] Erro ao ler registros atuais: ${fetchErr.message}`);
  }

  const existingList = existingRows || [];
  const existingNames = new Set(existingList.map((r: any) => r.name));
  const desiredSet = new Set(uniqueDesired);

  const toInsert = uniqueDesired.filter(name => !existingNames.has(name)).map(name => ({ email: lowerEmail, name }));
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error: insErr } = await withSupabaseRetry<any>(
      () => supabase.from(table).insert(chunk),
      `syncNameListTable:insert:${table}`
    );
    if (insErr) {
      throw new Error(`[${table}] Erro ao inserir novos registros: ${insErr.message}`);
    }
  }

  const idsToDelete = existingList.filter((r: any) => !desiredSet.has(r.name)).map((r: any) => r.id).filter(Boolean);
  for (let i = 0; i < idsToDelete.length; i += 500) {
    const chunk = idsToDelete.slice(i, i + 500);
    const { error: delErr } = await withSupabaseRetry<any>(
      () => supabase.from(table).delete().eq('email', lowerEmail).in('id', chunk),
      `syncNameListTable:delete:${table}`
    );
    if (delErr) {
      throw new Error(`[${table}] Erro ao remover registros antigos: ${delErr.message}`);
    }
  }
}

// Helper: Upsert-first sync for ID-based tables (paginated + chunked + soft-delete archive)
async function syncIdEntityTable(
  supabase: any,
  table: string,
  lowerEmail: string,
  rows: any[],
  mapFallbackRow?: (row: any) => any,
  options?: {
    entityKey?: GranularEntityKey;
    skipTrash?: boolean;
    skipTrashIds?: Set<string>;
    previousItems?: any[];
  }
) {
  const { data: existingRows, error: fetchErr } = await fetchAllPaginatedRows(
    (from, to) => supabase.from(table).select('id').eq('email', lowerEmail).order('id', { ascending: true }).range(from, to),
    `syncIdEntityTable:select:${table}`
  );
  if (fetchErr) {
    throw new Error(`[${table}] Erro ao consultar IDs existentes: ${fetchErr.message}`);
  }

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await assertNoForeignRowOwnership(
      supabase,
      table,
      lowerEmail,
      chunk.map((r: any) => String(r?.id || '').trim()).filter(Boolean),
      withSupabaseRetry
    );
    let { error: upErr } = await withSupabaseRetry<any>(
      () => supabase.from(table).upsert(chunk, { onConflict: 'id' }),
      `syncIdEntityTable:upsert:${table}`
    );
    if (upErr && mapFallbackRow && (upErr.code === '42703' || upErr.code === 'PGRST204' || String(upErr.message || '').includes('classification'))) {
      const safeRows = chunk.map(mapFallbackRow);
      const retry = await withSupabaseRetry<any>(
        () => supabase.from(table).upsert(safeRows, { onConflict: 'id' }),
        `syncIdEntityTable:upsertFallback:${table}`
      );
      upErr = retry.error;
    }
    if (upErr) {
      throw new Error(`[${table}] Erro ao salvar registros (upsert): ${upErr.message}`);
    }
  }

  const desiredIds = new Set(rows.map((r: any) => r.id));
  const idsToDelete = (existingRows || []).map((r: any) => r.id).filter((id: any) => id && !desiredIds.has(id));
  if (idsToDelete.length > 0) {
    if (!options?.skipTrash && options?.entityKey) {
      const idsForTrash = idsToDelete.filter((id: string) => !options?.skipTrashIds?.has(String(id)));
      if (idsForTrash.length > 0) {
        const prevMap = new Map((options.previousItems || []).map((it: any) => [String(it.id), it]));
        const itemsToArchive = idsForTrash
          .map((id: string) => prevMap.get(String(id)))
          .filter(Boolean);
        await archiveDeletedItemsToTrash(supabase, lowerEmail, options.entityKey, itemsToArchive);
      }
    }

    for (let i = 0; i < idsToDelete.length; i += 500) {
      const chunk = idsToDelete.slice(i, i + 500);
      const { error: delErr } = await withSupabaseRetry<any>(
        () => supabase.from(table).delete().eq('email', lowerEmail).in('id', chunk),
        `syncIdEntityTable:delete:${table}`
      );
      if (delErr) {
        throw new Error(`[${table}] Erro ao remover registros excluídos: ${delErr.message}`);
      }
    }
  }
}

// Save/Update user workspace data strictly on Supabase (throws on failure, never saves locally)
function nextMonotonicVersion(prevVersion?: string): string {
  const nowIso = new Date().toISOString();
  if (prevVersion && prevVersion === nowIso) {
    return new Date(Date.now() + 1).toISOString();
  }
  return nowIso;
}

async function saveUserDataByEmail(
  email: string,
  data: any,
  changedKeys?: string[],
  prevVersion?: string,
  options?: { skipTrash?: boolean; skipAutoBackup?: boolean; previousData?: any }
): Promise<string> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = requireSupabase();
  const { _version, _expectedVersion, _allowClearAll, ...rawCleanPayload } = data || {};
  const retentionResult = applyThreeYearRetention(rawCleanPayload);
  const cleanPayload = retentionResult.prunedData;

  const shouldSync = (key: string) => {
    if (!cleanPayload[key]) return false;
    if (!changedKeys) return true;
    if (changedKeys.includes(key)) return true;
    if (key === 'annualPlanning') return retentionResult.removedAnnualYears.length > 0;
    return Array.isArray(retentionResult.removedByEntity[key]) && retentionResult.removedByEntity[key].length > 0;
  };

  try {
    const promises: Promise<any>[] = [];

    // 1. Sync receiptTypes
    if (shouldSync('receiptTypes')) {
      promises.push(syncNameListTable(supabase, 'receipt_types', lowerEmail, cleanPayload.receiptTypes));
    }

    // 2. Sync receiptStatuses
    if (shouldSync('receiptStatuses')) {
      promises.push(syncNameListTable(supabase, 'receipt_statuses', lowerEmail, cleanPayload.receiptStatuses));
    }

    // 3. Sync paymentTypes
    if (shouldSync('paymentTypes')) {
      promises.push(syncNameListTable(supabase, 'payment_types', lowerEmail, cleanPayload.paymentTypes));
    }

    // 4. Sync paymentStatuses
    if (shouldSync('paymentStatuses')) {
      promises.push(syncNameListTable(supabase, 'payment_statuses', lowerEmail, cleanPayload.paymentStatuses));
    }

    // 5. Sync incomeCategories
    if (shouldSync('incomeCategories')) {
      promises.push(syncNameListTable(supabase, 'income_categories', lowerEmail, cleanPayload.incomeCategories));
    }

    // 6. Sync expenseCategories
    if (shouldSync('expenseCategories')) {
      promises.push(syncNameListTable(supabase, 'expense_categories', lowerEmail, cleanPayload.expenseCategories));
    }

    // 7. Sync incomes
    if (shouldSync('incomes')) {
      const rows = cleanPayload.incomes.map((inc: any) => ({
        id: inc.id,
        email: lowerEmail,
        date: inc.date,
        description: inc.description,
        value: Number(inc.value),
        category: inc.category,
        status: inc.status,
        payment_type: inc.paymentType
      }));
      promises.push(syncIdEntityTable(supabase, 'incomes', lowerEmail, rows, undefined, {
        entityKey: 'incomes',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.incomes),
        previousItems: options?.previousData?.incomes
      }));
    }

    // 8. Sync expenses
    if (shouldSync('expenses')) {
      const rows = cleanPayload.expenses.map((exp: any) => ({
        id: exp.id,
        email: lowerEmail,
        date: exp.date,
        description: exp.description,
        value: Number(exp.value),
        category: exp.category,
        status: exp.status,
        payment_type: exp.paymentType,
        classification: exp.classification || null
      }));
      promises.push(
        syncIdEntityTable(supabase, 'expenses', lowerEmail, rows, ({ classification, ...rest }: any) => rest, {
          entityKey: 'expenses',
          skipTrash: options?.skipTrash,
          skipTrashIds: new Set(retentionResult.removedByEntity.expenses),
          previousItems: options?.previousData?.expenses
        })
      );
    }

    // 9. Sync annualPlanning (strictly throws on error, supports deletes & 3-year cleanup cleanly)
    if (shouldSync('annualPlanning')) {
      promises.push((async () => {
        const { data: existingPlans, error: fetchPlanErr } = await fetchAllPaginatedRows(
          (from, to) => supabase.from('annual_planning').select('id, year').eq('email', lowerEmail).order('year', { ascending: true }).range(from, to),
          'saveUserDataByEmail:annual_planning:select'
        );
        if (fetchPlanErr) {
          throw new Error(`[annual_planning] Erro ao consultar planejamento atual: ${fetchPlanErr.message}`);
        }

        const desiredYears = new Set<number>();
        for (const plan of cleanPayload.annualPlanning) {
          const planYear = Number(plan.year);
          desiredYears.add(planYear);
          const { error: planErr } = await withSupabaseRetry<any>(
            () => supabase.from('annual_planning').upsert({
              email: lowerEmail,
              year: planYear,
              monthly_budgets: plan.monthlyBudgets
            }, { onConflict: 'email,year' }),
            'saveUserDataByEmail:annual_planning:upsert'
          );
          if (planErr) {
            throw new Error(`[annual_planning] Erro ao salvar planejamento anual: ${planErr.message}`);
          }
        }

        const yearsToDelete = (existingPlans || [])
          .map((p: any) => Number(p.year))
          .filter((y: number) => !isNaN(y) && !desiredYears.has(y));
        if (yearsToDelete.length > 0) {
          const { error: delPlanErr } = await withSupabaseRetry<any>(
            () => supabase.from('annual_planning').delete().eq('email', lowerEmail).in('year', yearsToDelete),
            'saveUserDataByEmail:annual_planning:delete'
          );
          if (delPlanErr) {
            throw new Error(`[annual_planning] Erro ao remover anos excluídos: ${delPlanErr.message}`);
          }
        }
      })());
    }

    // 10. Sync shoppingList
    if (shouldSync('shoppingList')) {
      const rows = cleanPayload.shoppingList.map((item: any) => ({
        id: item.id,
        email: lowerEmail,
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        category: item.category,
        checked: !!item.checked,
        date: item.date || null
      }));
      promises.push(syncIdEntityTable(supabase, 'shopping_list', lowerEmail, rows, undefined, {
        entityKey: 'shoppingList',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.shoppingList),
        previousItems: options?.previousData?.shoppingList
      }));
    }

    // 11. Sync actionPlans
    if (shouldSync('actionPlans')) {
      const rows = cleanPayload.actionPlans.map((plan: any) => ({
        id: plan.id,
        email: lowerEmail,
        title: plan.title,
        description: plan.description,
        target_date: plan.targetDate,
        value: Number(plan.value),
        status: plan.status
      }));
      promises.push(syncIdEntityTable(supabase, 'action_plans', lowerEmail, rows, undefined, {
        entityKey: 'actionPlans',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.actionPlans),
        previousItems: options?.previousData?.actionPlans
      }));
    }

    // 12. Sync deficitActions
    if (shouldSync('deficitActions')) {
      const rows = cleanPayload.deficitActions.map((action: any) => ({
        id: action.id,
        email: lowerEmail,
        cost_center: action.costCenter,
        reason: action.reason,
        correction_action: action.correctionAction,
        responsible: action.responsible,
        date: action.date,
        status: action.status
      }));
      promises.push(syncIdEntityTable(supabase, 'deficit_actions', lowerEmail, rows, undefined, {
        entityKey: 'deficitActions',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.deficitActions),
        previousItems: options?.previousData?.deficitActions
      }));
    }

    // 13. Sync trips
    if (shouldSync('trips')) {
      const rows = cleanPayload.trips.map((trip: any) => ({
        id: trip.id,
        email: lowerEmail,
        name: trip.name,
        expenses: trip.expenses || []
      }));
      promises.push(syncIdEntityTable(supabase, 'trips', lowerEmail, rows, undefined, {
        entityKey: 'trips',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.trips),
        previousItems: options?.previousData?.trips
      }));
    }

    // 14. Sync wishes
    if (shouldSync('wishes')) {
      const rows = cleanPayload.wishes.map((wish: any) => ({
        id: wish.id,
        email: lowerEmail,
        title: wish.title,
        description: wish.description || '',
        target_date: wish.targetDate || null,
        value: Number(wish.value || 0),
        status: wish.status || 'Pendente'
      }));
      promises.push(syncIdEntityTable(supabase, 'wishes', lowerEmail, rows, undefined, {
        entityKey: 'wishes',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.wishes),
        previousItems: options?.previousData?.wishes
      }));
    }

    // 15. Sync investments
    if (shouldSync('investments')) {
      const rows = cleanPayload.investments.map((inv: any) => ({
        id: inv.id,
        email: lowerEmail,
        name: inv.name,
        type: inv.type,
        date: inv.date,
        value: Number(inv.value || 0),
        status: inv.status,
        notes: inv.notes || null
      }));
      promises.push(syncIdEntityTable(supabase, 'investments', lowerEmail, rows, undefined, {
        entityKey: 'investments',
        skipTrash: options?.skipTrash,
        skipTrashIds: new Set(retentionResult.removedByEntity.investments),
        previousItems: options?.previousData?.investments
      }));
    }

    // 16. Sync investmentTypes
    if (shouldSync('investmentTypes')) {
      promises.push(syncNameListTable(supabase, 'investment_types', lowerEmail, cleanPayload.investmentTypes));
    }

    // 17. Sync investmentStatuses
    if (shouldSync('investmentStatuses')) {
      promises.push(syncNameListTable(supabase, 'investment_statuses', lowerEmail, cleanPayload.investmentStatuses));
    }

    await Promise.all(promises);

    // Update user_data snapshot in Supabase after ALL relational syncs succeed
    const newVersion = nextMonotonicVersion(prevVersion);
    const { error: backupErr } = await withSupabaseRetry<any>(
      () => supabase.from('user_data').upsert({
        email: lowerEmail,
        data: cleanPayload,
        updated_at: newVersion
      }),
      'saveUserDataByEmail:user_data:upsert'
    );
    if (backupErr) {
      throw new Error(`Erro ao atualizar snapshot user_data no Supabase: ${backupErr.message}`);
    }

    if (!options?.skipAutoBackup) {
      await createUserBackupSnapshot(supabase, lowerEmail, cleanPayload, 'auto', { respectThrottle: true });
    }

    const versionedData = { ...cleanPayload, _version: newVersion };
    userDataCache.set(lowerEmail, { data: versionedData, timestamp: Date.now() });
    return newVersion;
  } catch (err: any) {
    if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
      markSupabaseKeyAsInvalid("Invalid API key");
    } else {
      console.error("Erro ao salvar dados relacionais no Supabase:", err);
    }
    throw err;
  }
}

type GranularEntityKey =
  | 'incomes'
  | 'expenses'
  | 'investments'
  | 'trips'
  | 'wishes'
  | 'actionPlans'
  | 'deficitActions'
  | 'shoppingList';

const ENTITY_TABLE_MAP: Record<GranularEntityKey, { table: string; mapRow: (email: string, item: any) => Record<string, any> }> = {
  incomes: {
    table: 'incomes',
    mapRow: (email, inc) => ({
      id: inc.id,
      email,
      date: inc.date,
      description: inc.description,
      value: Number(inc.value),
      category: inc.category,
      status: inc.status,
      payment_type: inc.paymentType
    })
  },
  expenses: {
    table: 'expenses',
    mapRow: (email, exp) => ({
      id: exp.id,
      email,
      date: exp.date,
      description: exp.description,
      value: Number(exp.value),
      category: exp.category,
      status: exp.status,
      payment_type: exp.paymentType,
      classification: exp.classification || null
    })
  },
  investments: {
    table: 'investments',
    mapRow: (email, inv) => ({
      id: inv.id,
      email,
      name: inv.name,
      type: inv.type,
      date: inv.date,
      value: Number(inv.value || 0),
      status: inv.status,
      notes: inv.notes || null
    })
  },
  trips: {
    table: 'trips',
    mapRow: (email, trip) => ({
      id: trip.id,
      email,
      name: trip.name,
      expenses: trip.expenses || []
    })
  },
  wishes: {
    table: 'wishes',
    mapRow: (email, wish) => ({
      id: wish.id,
      email,
      title: wish.title,
      description: wish.description || '',
      target_date: wish.targetDate || null,
      value: Number(wish.value || 0),
      status: wish.status || 'Pendente'
    })
  },
  actionPlans: {
    table: 'action_plans',
    mapRow: (email, plan) => ({
      id: plan.id,
      email,
      title: plan.title,
      description: plan.description,
      target_date: plan.targetDate,
      value: Number(plan.value),
      status: plan.status
    })
  },
  deficitActions: {
    table: 'deficit_actions',
    mapRow: (email, action) => ({
      id: action.id,
      email,
      cost_center: action.costCenter,
      reason: action.reason,
      correction_action: action.correctionAction,
      responsible: action.responsible,
      date: action.date,
      status: action.status
    })
  },
  shoppingList: {
    table: 'shopping_list',
    mapRow: (email, item) => ({
      id: item.id,
      email,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      category: item.category,
      checked: !!item.checked,
      date: item.date || null
    })
  }
};

async function saveGranularEntityMutation(
  email: string,
  entity: GranularEntityKey,
  action: 'upsert' | 'delete',
  currentData: any,
  item?: any,
  id?: string
): Promise<{ nextData: any; newVersion: string }> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = requireSupabase();
  const meta = ENTITY_TABLE_MAP[entity];
  const currentList = Array.isArray(currentData[entity]) ? [...currentData[entity]] : [];

  let updatedList: any[];
  if (action === 'upsert') {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error('Registro inválido para atualização incremental.');
    }
    const cleanId = item.id.trim();
    await assertNoForeignRowOwnership(supabase, meta.table, lowerEmail, [cleanId], withSupabaseRetry);
    const row = meta.mapRow(lowerEmail, { ...item, id: cleanId });
    let { error: upErr } = await withSupabaseRetry<any>(
      () => supabase.from(meta.table).upsert(row, { onConflict: 'id' }),
      `granular:upsert:${meta.table}`
    );
    if (upErr && entity === 'expenses' && (upErr.code === '42703' || upErr.code === 'PGRST204' || String(upErr.message || '').includes('classification'))) {
      const { classification, ...fallbackRow } = row;
      const retry = await withSupabaseRetry<any>(
        () => supabase.from(meta.table).upsert(fallbackRow, { onConflict: 'id' }),
        `granular:upsertFallback:${meta.table}`
      );
      upErr = retry.error;
    }
    if (upErr) {
      throw new Error(`[${meta.table}] Erro ao gravar registro: ${upErr.message}`);
    }
    const idx = currentList.findIndex((x: any) => x.id === item.id);
    if (idx >= 0) {
      currentList[idx] = item;
      updatedList = currentList;
    } else {
      updatedList = [item, ...currentList];
    }
  } else {
    const targetId = id || item?.id;
    if (!targetId) {
      throw new Error('ID do registro é obrigatório para exclusão.');
    }
    const deletedItem = currentList.find((x: any) => String(x.id) === String(targetId));
    const { error: delErr } = await withSupabaseRetry<any>(
      () => supabase.from(meta.table).delete().eq('email', lowerEmail).eq('id', targetId),
      `granular:delete:${meta.table}`
    );
    if (delErr) {
      throw new Error(`[${meta.table}] Erro ao excluir registro: ${delErr.message}`);
    }
    if (deletedItem) {
      await archiveDeletedItemsToTrash(supabase, lowerEmail, entity, [deletedItem]);
    }
    updatedList = currentList.filter((x: any) => String(x.id) !== String(targetId));
  }

  const { _version, ...cleanCurrent } = currentData;
  const retentionResult = applyThreeYearRetention({ ...cleanCurrent, [entity]: updatedList });
  const nextCleanData = retentionResult.prunedData;

  // Clean up any items exceeding 3-year retention directly from relational tables
  for (const [remEntity, remIds] of Object.entries(retentionResult.removedByEntity)) {
    if (remIds.length > 0 && Object.prototype.hasOwnProperty.call(ENTITY_TABLE_MAP, remEntity)) {
      const tbl = ENTITY_TABLE_MAP[remEntity as GranularEntityKey].table;
      await withSupabaseRetry<any>(
        () => supabase.from(tbl).delete().eq('email', lowerEmail).in('id', remIds),
        `granular:retentionCleanup:${tbl}`
      );
    }
  }
  if (retentionResult.removedAnnualYears.length > 0) {
    await withSupabaseRetry<any>(
      () => supabase.from('annual_planning').delete().eq('email', lowerEmail).in('year', retentionResult.removedAnnualYears),
      'granular:retentionCleanup:annual_planning'
    );
  }

  const newVersion = nextMonotonicVersion(currentData._version);
  const { error: backupErr } = await withSupabaseRetry<any>(
    () => supabase.from('user_data').upsert({
      email: lowerEmail,
      data: nextCleanData,
      updated_at: newVersion
    }),
    'granular:user_data:upsert'
  );
  if (backupErr) {
    throw new Error(`Erro ao sincronizar snapshot incremental: ${backupErr.message}`);
  }

  await createUserBackupSnapshot(supabase, lowerEmail, nextCleanData, 'auto', { respectThrottle: true });

  const nextVersioned = { ...nextCleanData, _version: newVersion };
  userDataCache.set(lowerEmail, { data: nextVersioned, timestamp: Date.now() });
  return { nextData: nextVersioned, newVersion };
}

// Get all users (Admin only) strictly from Supabase
async function getAllUsersList(): Promise<any[]> {
  const supabase = requireSupabase();

  const result = await withSupabaseRetry(async () => {
    const fetchPromise = (async () => {
      const { data: usersData, error: userErr } = await supabase.from('users').select('*');
      if (userErr) {
        if (userErr.message?.includes("Invalid API key") || userErr.hint?.includes("API key")) {
          markSupabaseKeyAsInvalid("Invalid API key");
        }
        throw new Error(`Falha ao consultar tabela 'users' no Supabase: ${userErr.message}`);
      }

      const [profilesRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('subscriptions').select('*')
      ]);

      if (profilesRes.error && !isMissingTableOrColumnError(profilesRes.error)) {
        throw new Error(`Falha ao consultar tabela 'profiles': ${profilesRes.error.message}`);
      }
      if (subsRes.error && !isMissingTableOrColumnError(subsRes.error)) {
        throw new Error(`Falha ao consultar tabela 'subscriptions': ${subsRes.error.message}`);
      }

      return { usersData: usersData || [], profilesRes, subsRes };
    })();

    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_ADMIN_USERS')), 10000));
    return Promise.race([fetchPromise, timeoutPromise]);
  }, 'getAllUsersList');

  const { usersData, profilesRes, subsRes } = result;
  const profilesMap = new Map((profilesRes.data || []).map((p: any) => [String(p.email || '').toLowerCase().trim(), p]));
  const subsMap = new Map((subsRes.data || []).map((s: any) => [String(s.email || '').toLowerCase().trim(), s]));
  const messagesMap = await getUserMessagesMap();
  const trialDays = await getFreeTrialDays().catch(() => 60);

  return usersData.map((u: any) => {
    const lowerU = String(u.email || '').toLowerCase().trim();
    const prof: any = profilesMap.get(lowerU);
    const sub: any = subsMap.get(lowerU);

    const userMsg = (messagesMap[lowerU] !== undefined && messagesMap[lowerU] !== '')
      ? messagesMap[lowerU]
      : (prof?.user_message !== undefined && prof.user_message !== ''
          ? String(prof.user_message).trim()
          : '');

    const isBlockedFromDb = (u.is_blocked !== undefined)
      ? !!u.is_blocked
      : (u.isBlocked !== undefined
          ? !!u.isBlocked
          : (prof?.is_blocked !== undefined
              ? !!prof.is_blocked
              : (sub ? sub.plan === 'inativo' : false)));

    const uObj = {
      email: u.email,
      name: prof ? prof.name : (u.name || ''),
      address: prof ? prof.address : (u.address || ''),
      city: prof ? prof.city : (u.city || ''),
      state: prof ? prof.state : (u.state || ''),
      phone: prof ? prof.phone : (u.phone || ''),
      cpf: prof ? prof.cpf : (u.cpf || ''),
      userMessage: userMsg,
      mensagemUsuario: userMsg,
      isBlocked: isBlockedFromDb,
      role: u.role || 'user',
      subscription: sub ? {
        plan: sub.plan || 'none',
        validUntil: sub.valid_until,
        selectedAt: sub.selected_at,
        freePlanUsed: !!sub.free_plan_used,
        approved: !!sub.approved
      } : {
        plan: 'none',
        validUntil: null,
        selectedAt: null,
        freePlanUsed: false,
        approved: false
      },
      subscriptionHistory: Array.isArray(sub?.history) ? sub.history : [],
      lastAccess: prof?.updated_at || u.created_at || null,
      createdAt: u.created_at || u.createdAt || new Date().toISOString()
    };
    normalizeUserSubscription(uObj, trialDays);
    return uObj;
  });
}

// ---------------- API ENDPOINTS ----------------

// Supabase Live Schema Audit Function (Safe & Non-Destructive)
async function auditSupabaseDatabaseSchema() {
  const client = getSupabaseClient();
  const results: Array<{
    name: string;
    category: "auth" | "finances" | "planning" | "system";
    description: string;
    exists: boolean;
    recordCount: number | null;
    error?: string;
  }> = [];

  const existingSet = new Set<string>();
  const missingTables: string[] = [];

  if (!client) {
    for (const t of DATABASE_SCHEMA_CATALOG) {
      results.push({
        name: t.name,
        category: t.category,
        description: t.description,
        exists: false,
        recordCount: null,
        error: "Supabase não conectado"
      });
      missingTables.push(t.name);
    }
  } else {
    await Promise.all(DATABASE_SCHEMA_CATALOG.map(async (t) => {
      try {
        const { count, error } = await client.from(t.name).select("*", { count: "exact", head: true });
        if (error && (error.code === "PGRST205" || error.code === "42P01" || error.message?.includes("schema cache"))) {
          results.push({
            name: t.name,
            category: t.category,
            description: t.description,
            exists: false,
            recordCount: null,
            error: error.message
          });
          missingTables.push(t.name);
        } else {
          existingSet.add(t.name);
          results.push({
            name: t.name,
            category: t.category,
            description: t.description,
            exists: true,
            recordCount: (count !== null && count !== undefined) ? count : 0
          });
        }
      } catch (err: any) {
        results.push({
          name: t.name,
          category: t.category,
          description: t.description,
          exists: false,
          recordCount: null,
          error: err?.message
        });
        missingTables.push(t.name);
      }
    }));
  }

  results.sort((a, b) => {
    const idxA = DATABASE_SCHEMA_CATALOG.findIndex(t => t.name === a.name);
    const idxB = DATABASE_SCHEMA_CATALOG.findIndex(t => t.name === b.name);
    return idxA - idxB;
  });

  const { differentialSql, fullSafeSql, rlsHardeningSql } = generateSafeSchemaScripts(existingSet, missingTables);

  return {
    totalRequired: DATABASE_SCHEMA_CATALOG.length,
    existingCount: existingSet.size,
    missingCount: missingTables.length,
    missingTables,
    tables: results,
    differentialSql,
    fullSafeSql,
    rlsHardeningSql
  };
}

// Health Check Endpoint (Observability without leaking secrets)
app.get("/api/health", async (_req, res) => {
  const startedCheck = Date.now();
  const client = getSupabaseClient();
  let dbConnected = false;
  let dbError: string | undefined;

  if (client) {
    try {
      const { error, status } = await client.from("users").select("email").limit(1);
      if (!error || error.code === "PGRST116" || error.code === "42P01") {
        dbConnected = true;
      } else {
        const rawErrMsg = String(error.message || "").toLowerCase();
        const rawHint = String(error.hint || "").toLowerCase();
        console.error(`[Health] Falha na consulta Supabase (HTTP ${status || "?"}, code=${error.code || "none"}):`, error.message || error.details || "sem mensagem");
        if (rawErrMsg.includes("invalid api key") || rawHint.includes("api key") || error.code === "PGRST301" || status === 401) {
          dbError = usingServiceRoleKey
            ? "Chave SUPABASE_SERVICE_ROLE_KEY inválida"
            : "Chave SUPABASE_ANON_KEY inválida";
        } else if (rawErrMsg.includes("fetch failed") || rawErrMsg.includes("enotfound") || rawErrMsg.includes("econnrefused")) {
          dbError = "URL SUPABASE_URL inacessível ou inválida";
        } else if (rawErrMsg.includes("permission denied") || error.code === "42501" || status === 403) {
          dbError = "Permissão negada pelo banco (verifique SUPABASE_SERVICE_ROLE_KEY ou RLS)";
        } else {
          const detailTag = error.code || (status ? `HTTP ${status}` : "");
          dbError = detailTag ? `Falha ao consultar banco de dados (${detailTag})` : "Falha ao consultar banco de dados";
        }
      }
    } catch (catchErr: any) {
      const catchMsg = String(catchErr?.message || "").toLowerCase();
      if (catchMsg.includes("enotfound") || catchMsg.includes("fetch failed") || catchMsg.includes("invalid url")) {
        dbError = "URL SUPABASE_URL inacessível ou inválida";
      } else {
        dbError = "Timeout ou indisponibilidade de rede";
      }
    }
  } else {
    dbError = "Supabase não configurado";
  }

  const latencyMs = Date.now() - startedCheck;
  if (!dbConnected && dbError) {
    healthMonitor.notifyDbDegraded(dbError);
  }

  const payload = buildHealthPayload({
    dbConnected,
    latencyMs,
    dbError,
    usingServiceRole: isUsingServiceRole(),
    jwtSecretConfigured: hasConfiguredJwtSecret,
    uptimeSeconds: Math.floor((Date.now() - serverStartedAt) / 1000),
    retentionYears: RETENTION_YEARS,
    trashDays: TRASH_RETENTION_DAYS,
    backupDays: BACKUP_RETENTION_DAYS,
    monitorSnapshot: healthMonitor.getSnapshot(),
  });

  res.status(dbConnected ? 200 : 503).json(payload);
});

// Supabase Connection Status and Schema Info (Live Audit & Safe Differential Generator)
app.get("/api/supabase-status", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const client = getSupabaseClient();
  let active = false;
  let message = "";
  const url = cleanSupabaseUrl(
    process.env.SUPABASE_URL ||
    process.env.supabase_url ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  );

  if (client) {
    try {
      const { error } = await client.from("users").select("count", { count: "exact", head: true });
      if (!error || error.code === "PGRST116" || error.code === "42P01") {
        active = true;
      } else if (error.message?.includes("Invalid API key") || error.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
        active = false;
        message = "Chave de API do Supabase inválida.";
      } else {
        active = true;
      }
    } catch (err: any) {
      active = false;
      message = err?.message || "Erro ao comunicar com o Supabase.";
    }
  } else {
    message = "Supabase não configurado ou chave inválida.";
  }

  const audit = await auditSupabaseDatabaseSchema();

  if (active) {
    if (audit.missingCount === 0) {
      message = `Conectado ao Supabase com sucesso! Todas as ${audit.totalRequired} tabelas estão criadas e operacionais.`;
    } else {
      message = `Conectado ao Supabase! Detectadas ${audit.existingCount} tabelas ativas e ${audit.missingCount} tabela(s) pendente(s) de criação.`;
    }
  }

  res.json({
    active,
    url,
    message,
    usingServiceRole: isUsingServiceRole(),
    jwtSecretConfigured: hasConfiguredJwtSecret,
    totalRequired: audit.totalRequired,
    existingCount: audit.existingCount,
    missingCount: audit.missingCount,
    missingTables: audit.missingTables,
    tables: audit.tables,
    schema: audit.missingCount > 0 ? audit.differentialSql : audit.fullSafeSql,
    differentialSql: audit.differentialSql,
    fullSafeSql: audit.fullSafeSql,
    rlsHardeningSql: audit.rlsHardeningSql
  });
});

// ---------------- AUTENTICAÇÃO E SESSÃO SEGURA (JWT) ----------------
const rawJwtSecret = cleanEnvString(process.env.JWT_SECRET);
const hasConfiguredJwtSecret = Boolean(rawJwtSecret && !isPlaceholderValue(rawJwtSecret) && rawJwtSecret.length >= 16);
if (!hasConfiguredJwtSecret) {
  console.warn("[Segurança] Variável JWT_SECRET não configurada (ou muito curta). Usando segredo temporário em memória; configure JWT_SECRET fixa nas variáveis de ambiente de produção.");
}
const JWT_SECRET = hasConfiguredJwtSecret ? rawJwtSecret : crypto.randomBytes(32).toString("hex");

function generateAuthToken(payload: { email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (30 * 24 * 60 * 60); // Válido por 30 dias
  const body = Buffer.from(JSON.stringify({ email: payload.email.toLowerCase().trim(), role: payload.role || "user", iat: now, exp })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifyAuthToken(token: string): { email: string; role: string; exp: number } | null {
  if (!token || typeof token !== "string") return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const parts = cleanToken.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expectedSignature, "utf-8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getAuthEmailFromReq(req: express.Request): string | null {
  const token = (req.headers["x-auth-token"] as string) || (req.headers["authorization"] as string);
  if (!token) return null;
  const decoded = verifyAuthToken(token);
  if (decoded && decoded.email) {
    return String(decoded.email).toLowerCase().trim();
  }
  return null;
}

async function requireAuth(req: express.Request, res: express.Response): Promise<any | null> {
  const email = getAuthEmailFromReq(req);
  if (!email) {
    res.status(401).json({ error: "Sessão ausente ou expirada. Faça login novamente." });
    return null;
  }

  try {
    const user = await getUserByEmail(email, { bypassCache: false, throwOnError: true });
    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado ou sessão inválida." });
      return null;
    }
    if (user.isBlocked) {
      res.status(403).json({ error: "Acesso suspenso pelo administrador." });
      return null;
    }
    return user;
  } catch (err) {
    console.error("Auth verification DB error:", err);
    res.status(503).json({ error: "Banco de dados temporariamente indisponível. Tente novamente em instantes." });
    return null;
  }
}

async function requireAdmin(req: express.Request, res: express.Response): Promise<any | null> {
  const email = getAuthEmailFromReq(req);
  if (!email) {
    res.status(401).json({ error: "Não autorizado. Token de sessão inválido ou expirado." });
    return null;
  }

  try {
    const adminUser = await getUserByEmail(email, { bypassCache: true, throwOnError: true });
    if (!adminUser || adminUser.role !== "admin" || adminUser.isBlocked) {
      res.status(403).json({ error: "Acesso restrito ao administrador." });
      return null;
    }
    return adminUser;
  } catch (err) {
    console.error("Admin verification DB error:", err);
    res.status(503).json({ error: "Banco de dados temporariamente indisponível." });
    return null;
  }
}

// Endpoint de Verificação de Sessão Persistente
app.get("/api/auth/verify-session", async (req, res) => {
  const token = (req.headers["x-auth-token"] as string) || (req.headers["authorization"] as string);
  const decoded = token ? verifyAuthToken(token) : null;
  const verifiedEmail = decoded?.email ? String(decoded.email).toLowerCase().trim() : null;

  if (!verifiedEmail) {
    return res.status(401).json({ valid: false, error: "Token de sessão ausente ou inválido." });
  }

  try {
    const user = await getUserByEmail(verifiedEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(401).json({ valid: false, error: "Sessão expirada ou usuário não encontrado." });
    }

    if (user.isBlocked) {
      const rawReason = String(user.userMessage || user.mensagemUsuario || '').trim();
      return res.status(403).json({
        valid: false,
        isBlocked: true,
        title: "Usuário bloqueado",
        reason: rawReason,
        userMessage: rawReason,
        mensagemUsuario: rawReason,
        error: rawReason ? `Usuário bloqueado\nMotivo: ${rawReason}` : "Acesso suspenso pelo administrador."
      });
    }

    const { password: _, ...userProfile } = user;
    const newToken = generateAuthToken({ email: user.email, role: user.role });

    return res.json({
      valid: true,
      user: userProfile,
      token: newToken
    });
  } catch (err) {
    console.error("Error verifying session:", err);
    return res.status(503).json({ valid: false, error: "Falha temporária de conexão com o banco de dados." });
  }
});

// Login (direto no Supabase sem cache local obsoleto + migração transparente para hash scrypt + brute-force protection)
app.post("/api/auth/login", authLoginLimiter, async (req, res) => {
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;
  if (!rawEmail || !rawPassword || typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  const normalizedEmail = rawEmail.toLowerCase().trim();
  const lockState = loginAttemptTracker.isLocked(normalizedEmail);
  if (lockState.locked) {
    await logAuditEvent({
      actorEmail: normalizedEmail,
      action: "LOGIN_RATE_LIMITED",
      entity: "auth",
      status: "blocked",
      req,
      details: { retryAfterSeconds: lockState.retryAfterSeconds }
    });
    return res.status(429).json({
      error: `Muitas tentativas incorretas para esta conta. Aguarde ${lockState.retryAfterSeconds}s e tente novamente.`
    });
  }

  try {
    const user = await getUserByEmail(normalizedEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      loginAttemptTracker.recordFailure(normalizedEmail);
      await logAuditEvent({
        actorEmail: normalizedEmail,
        action: "LOGIN_FAILED",
        entity: "auth",
        status: "failed",
        req,
        details: { reason: "unknown_user" }
      });
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const { valid, needsUpgrade } = verifyPassword(rawPassword, user.password || "");
    if (!valid) {
      const attempt = loginAttemptTracker.recordFailure(normalizedEmail);
      await logAuditEvent({
        actorEmail: normalizedEmail,
        action: "LOGIN_FAILED",
        entity: "auth",
        status: "failed",
        req,
        details: { reason: "invalid_password", failures: attempt.failures, locked: attempt.locked }
      });
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    loginAttemptTracker.recordSuccess(normalizedEmail);

    if (user.isBlocked) {
      await logAuditEvent({
        actorEmail: normalizedEmail,
        action: "LOGIN_BLOCKED",
        entity: "auth",
        status: "blocked",
        req
      });
      const rawReason = String(user.userMessage || user.mensagemUsuario || '').trim();
      return res.status(403).json({
        isBlocked: true,
        title: "Usuário bloqueado",
        reason: rawReason,
        userMessage: rawReason,
        mensagemUsuario: rawReason,
        error: rawReason ? `Usuário bloqueado\nMotivo: ${rawReason}` : "Acesso suspenso pelo administrador."
      });
    }

    // Migra senha legada em texto plano para hash scrypt no Supabase (sem impedir login se houver restrição pontual)
    if (needsUpgrade) {
      try {
        const upgradedHash = hashPassword(rawPassword);
        const supabase = requireSupabase();
        const { error: upgradeErr } = await supabase
          .from('users')
          .update({ password: upgradedHash })
          .eq('email', user.email || normalizedEmail);
        if (!upgradeErr) {
          user.password = upgradedHash;
        } else {
          console.warn(`[Login] Aviso ao migrar hash de senha para ${normalizedEmail}:`, upgradeErr.message);
        }
      } catch (upgradeCatch: any) {
        console.warn(`[Login] Exceção não fatal ao migrar hash de senha para ${normalizedEmail}:`, upgradeCatch?.message || upgradeCatch);
      }
    }

    user.lastAccess = new Date().toISOString();
    userCache.set(normalizedEmail, { data: user, timestamp: Date.now() });

    const freshUserData = await getUserDataByEmail(normalizedEmail, { bypassCache: true, throwOnError: true });
    const safeUserData = freshUserData || getEmptyUserData();

    await logAuditEvent({
      actorEmail: normalizedEmail,
      action: "LOGIN_SUCCESS",
      entity: "auth",
      status: "success",
      req,
      details: { role: user.role }
    });

    const { password: _, ...userProfile } = user;
    const token = generateAuthToken({ email: user.email, role: user.role });
    res.json({ user: userProfile, token, userData: safeUserData });
  } catch (err: any) {
    const errMsg = String(err?.message || err || "");
    console.error("Login error:", errMsg);
    if (errMsg.includes("não configurado")) {
      return res.status(503).json({
        error: "Banco de dados Supabase não configurado no ambiente deste servidor. Verifique as variáveis SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) e JWT_SECRET nas configurações de publicação/produção."
      });
    }
    res.status(503).json({ error: "Instabilidade temporária ao conectar ao banco de dados. Aguarde alguns instantes e tente novamente." });
  }
});

// Register
app.post("/api/auth/register", authSensitiveLimiter, async (req, res) => {
  const { email, password, name, address, phone, city, state, cpf } = req.body;
  if (!email || !password || !name || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Nome, E-mail e senha são obrigatórios." });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 4 caracteres." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const existingUser = await getUserByEmail(lowerEmail, { bypassCache: true, throwOnError: true });

    if (existingUser) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    const checkHistory = await checkIsBlacklisted(lowerEmail, cpf);
    const trialDays = await getFreeTrialDays();
    let validUntil: string | null = null;
    let initialPlan: 'gratis' | 'none' = 'none';
    let isApproved = false;
    const isFreeUsed = checkHistory.blacklisted;

    if (!checkHistory.blacklisted) {
      const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      trialEndDate.setHours(23, 59, 59, 999);
      validUntil = trialEndDate.toISOString();
      initialPlan = 'gratis';
      isApproved = true;
    }

    const newUser: any = {
      email: lowerEmail,
      name: String(name).trim(),
      address: address || "",
      city: city || "",
      state: state || "",
      phone: phone || "",
      cpf: cpf || "",
      role: "user",
      password: hashPassword(password),
      subscription: {
        plan: initialPlan,
        validUntil,
        selectedAt: new Date().toISOString(),
        freePlanUsed: isFreeUsed || initialPlan === 'gratis',
        freePlanUsedReason: checkHistory.blacklisted ? checkHistory.reason : undefined,
        approved: isApproved,
      },
      createdAt: new Date().toISOString(),
    };

    if (!checkHistory.blacklisted) {
      await recordTrialHistory(lowerEmail, cpf);
    }

    addSubscriptionHistoryEntry(newUser, {
      plan: newUser.subscription.plan,
      validUntil: newUser.subscription.validUntil,
      source: 'cadastro',
      status: 'Ativo',
      description: initialPlan === 'gratis' ? 'Período Grátis de Boas-vindas (Cadastro)' : 'Cadastro de Conta',
      createdAt: newUser.createdAt
    });

    normalizeUserSubscription(newUser, trialDays);
    await saveUser(newUser);
    await logAuditEvent({
      actorEmail: lowerEmail,
      action: "USER_REGISTER",
      entity: "users",
      status: "success",
      req,
      details: { plan: initialPlan }
    });

    const { password: _, ...userProfile } = newUser;
    const token = generateAuthToken({ email: newUser.email, role: newUser.role });
    res.json({ user: userProfile, token, userData: getEmptyUserData() });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(503).json({ error: "Erro ao concluir cadastro no banco de dados. Tente novamente." });
  }
});

function hasRealResendKey(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key.trim() !== "" && !isPlaceholderValue(key));
}

function resolveRequestAppUrl(req: express.Request): string {
  let appUrl = (process.env.APP_URL || "").trim();
  if (!appUrl) {
    const host = req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
    let origin = "";
    try {
      origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer).origin : "");
    } catch {
      origin = "";
    }
    if (origin) {
      appUrl = origin;
    } else if (host) {
      appUrl = `${protocol}://${host}`;
    } else {
      appUrl = "http://localhost:3000";
    }
  }
  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}

// Self-Service Password Recovery (envia link temporário de uso único quando RESEND_API_KEY está configurado)
const handlePasswordRecoveryRequest = async (req: express.Request, res: express.Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "O e-mail é obrigatório para recuperar a senha." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail, { bypassCache: true, throwOnError: true });

    if (!hasRealResendKey()) {
      if (user) {
        await logAuditEvent({
          actorEmail: lowerEmail,
          action: "PASSWORD_RECOVERY_REQUEST",
          entity: "auth",
          status: "warning",
          req
        });
      }
      return res.json({
        success: true,
        emailConfigured: false,
        message: "O envio automático de e-mails (RESEND_API_KEY) ainda não foi ativado neste servidor. Solicite ao administrador uma redefinição temporária de senha.",
        user: {
          name: user?.name || lowerEmail.split("@")[0],
          email: lowerEmail
        }
      });
    }

    const genericSuccessMessage =
      "Se este e-mail estiver cadastrado, você receberá em instantes um link temporário (válido por 30 minutos) para criar uma nova senha.";

    if (!user || user.isBlocked) {
      await logAuditEvent({
        actorEmail: lowerEmail,
        action: "PASSWORD_RECOVERY_IGNORED",
        entity: "auth",
        status: "blocked",
        req
      });
      return res.json({
        success: true,
        emailConfigured: true,
        message: genericSuccessMessage,
        user: { name: lowerEmail.split("@")[0], email: lowerEmail }
      });
    }

    const supabase = requireSupabase();
    const { rawToken, settingKey, expiresAt } = generatePasswordResetToken();
    const nowIso = new Date().toISOString();

    // Limpeza oportunista de tokens expirados na tabela system_settings
    const { data: oldResetRows } = await supabase
      .from("system_settings")
      .select("key, value")
      .like("key", `${PASSWORD_RESET_SETTING_PREFIX}%`)
      .limit(50);

    const staleKeys = (oldResetRows || [])
      .filter((row: any) => !isPasswordResetTokenActive(row?.value))
      .map((row: any) => row.key);
    if (staleKeys.length > 0) {
      await supabase.from("system_settings").delete().in("key", staleKeys);
    }

    const { error: storeErr } = await supabase.from("system_settings").upsert({
      key: settingKey,
      value: {
        email: lowerEmail,
        expiresAt,
        used: false,
        createdAt: nowIso
      },
      updated_at: nowIso
    });

    if (storeErr) {
      console.error("Failed to persist password reset token:", storeErr.message);
      return res.status(503).json({ error: "Não foi possível gerar o token de redefinição no momento." });
    }

    const appUrl = resolveRequestAppUrl(req);
    const resetUrl = `${appUrl}/?resetToken=${encodeURIComponent(rawToken)}`;
    const fromAddress = (process.env.EMAIL_FROM || "").trim() || "FinanFly <onboarding@resend.dev>";
    const mailPayload = buildPasswordResetEmailPayload({
      to: lowerEmail,
      userName: user.name || lowerEmail.split("@")[0],
      resetUrl,
      from: fromAddress
    });

    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${String(process.env.RESEND_API_KEY).trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mailPayload)
    });

    if (!mailRes.ok) {
      const errBody = await mailRes.text().catch(() => "");
      console.error("[Password Reset Email] Resend error:", mailRes.status, errBody.slice(0, 200));
      await supabase.from("system_settings").delete().eq("key", settingKey);
      return res.status(503).json({
        error: "Falha ao disparar o e-mail de redefinição. Verifique a configuração do remetente e tente novamente."
      });
    }

    await logAuditEvent({
      actorEmail: lowerEmail,
      action: "PASSWORD_RESET_EMAIL_SENT",
      entity: "auth",
      status: "success",
      req
    });

    return res.json({
      success: true,
      emailConfigured: true,
      message: genericSuccessMessage,
      user: {
        name: user.name || lowerEmail.split("@")[0],
        email: lowerEmail
      }
    });
  } catch (err) {
    console.error("Remember password error:", err);
    res.status(503).json({ error: "Erro ao processar solicitação de redefinição de senha." });
  }
};

app.post("/api/auth/remember-password", authSensitiveLimiter, handlePasswordRecoveryRequest);
app.post("/api/auth/forgot-password", authSensitiveLimiter, handlePasswordRecoveryRequest);

// Complete Password Reset using single-use token
app.post("/api/auth/reset-password", authSensitiveLimiter, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== "string" || token.trim().length < 16) {
    return res.status(400).json({ error: "Link de redefinição inválido ou expirado." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 4) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres." });
  }

  try {
    const supabase = requireSupabase();
    const settingKey = `${PASSWORD_RESET_SETTING_PREFIX}${hashPasswordResetToken(token)}`;

    const { data: row, error: fetchErr } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    if (fetchErr) {
      return res.status(503).json({ error: "Falha temporária ao validar o token de redefinição." });
    }

    const record = row?.value;
    if (!isPasswordResetTokenActive(record)) {
      await logAuditEvent({
        actorEmail: typeof record?.email === "string" ? record.email : "unknown",
        action: "PASSWORD_RESET_INVALID_TOKEN",
        entity: "auth",
        status: "blocked",
        req
      });
      return res.status(400).json({
        error: "Este link de redefinição é inválido, já foi utilizado ou expirou. Solicite um novo link."
      });
    }

    const targetEmail = String(record.email).toLowerCase().trim();
    const user = await getUserByEmail(targetEmail, { bypassCache: true, throwOnError: true });
    if (!user || user.isBlocked) {
      return res.status(400).json({ error: "Conta não encontrada ou bloqueada para redefinição." });
    }

    // Marca o token como utilizado antes de salvar a senha para impedir reutilização
    const nowIso = new Date().toISOString();
    await supabase.from("system_settings").upsert({
      key: settingKey,
      value: {
        ...record,
        used: true,
        usedAt: nowIso
      },
      updated_at: nowIso
    });

    user.password = hashPassword(newPassword);
    await saveUser(user);
    invalidateUserCache(targetEmail);

    await logAuditEvent({
      actorEmail: targetEmail,
      action: "PASSWORD_RESET_COMPLETED",
      entity: "auth",
      status: "success",
      req
    });

    return res.json({
      success: true,
      message: "Sua senha foi redefinida com sucesso! Agora você já pode entrar com a nova senha."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(503).json({ error: "Erro ao redefinir senha no banco de dados." });
  }
});

// Change Password
app.post("/api/auth/change-password", authSensitiveLimiter, async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || typeof newPassword !== "string" || newPassword.length < 4) {
    return res.status(400).json({ error: "Senha atual e nova senha válida são obrigatórias." });
  }

  try {
    const freshUser = await getUserByEmail(authUser.email, { bypassCache: true, throwOnError: true });
    if (!freshUser) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const { valid } = verifyPassword(String(oldPassword), freshUser.password || "");
    if (!valid) {
      await logAuditEvent({
        actorEmail: authUser.email,
        action: "PASSWORD_CHANGE_FAILED",
        entity: "auth",
        status: "failed",
        req
      });
      return res.status(400).json({ error: "A senha antiga está incorreta." });
    }

    freshUser.password = hashPassword(newPassword);
    await saveUser(freshUser);
    invalidateUserCache(freshUser.email);
    await logAuditEvent({
      actorEmail: freshUser.email,
      action: "PASSWORD_CHANGED",
      entity: "auth",
      status: "success",
      req
    });

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(503).json({ error: "Erro ao salvar nova senha no banco de dados." });
  }
});

// Self Delete Account
app.post("/api/auth/delete-account", authSensitiveLimiter, async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const lowerEmail = authUser.email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (user.cpf) {
      await recordTrialHistory(lowerEmail, user.cpf);
    }

    const supabase = requireSupabase();
    const tablesToClear = [
      'subscriptions', 'profiles', 'users', 'receipt_types', 'receipt_statuses',
      'payment_types', 'payment_statuses', 'income_categories', 'expense_categories',
      'incomes', 'expenses', 'annual_planning', 'shopping_list', 'action_plans',
      'deficit_actions', 'trips', 'wishes', 'investments', 'investment_types',
      'investment_statuses', 'user_data', 'trash_items', 'user_backups'
    ];

    const deleteResults = await Promise.all(
      tablesToClear.map(async (tbl) => ({
        table: tbl,
        res: await supabase.from(tbl).delete().eq('email', lowerEmail)
      }))
    );

    const fatalErr = deleteResults.find(r => r.res.error && !isMissingTableOrColumnError(r.res.error));
    if (fatalErr) {
      throw new Error(`Erro ao excluir registros em ${fatalErr.table}: ${fatalErr.res.error.message}`);
    }

    invalidateUserCache(lowerEmail);
    invalidateUserDataCache(lowerEmail);
    await logAuditEvent({
      actorEmail: lowerEmail,
      targetEmail: lowerEmail,
      action: "ACCOUNT_SELF_DELETED",
      entity: "users",
      status: "success",
      req
    });

    res.json({ success: true, message: "Sua conta foi excluída com sucesso." });
  } catch (err) {
    console.error("Self delete account error:", err);
    res.status(503).json({ error: "Erro ao excluir conta no banco de dados." });
  }
});

// Get User Profile
app.get("/api/user/profile", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const user = await getUserByEmail(authUser.email, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Profile get error:", err);
    res.status(503).json({ error: "Falha temporária ao carregar perfil do banco de dados." });
  }
});

// Update User Profile (Dados Pessoais)
app.post("/api/user/profile", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const { name, address, phone, city, state, cpf } = req.body;
    const user = await getUserByEmail(authUser.email, { bypassCache: true, throwOnError: true });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    user.name = name || user.name;
    user.address = address !== undefined ? address : user.address;
    user.phone = phone !== undefined ? phone : user.phone;
    user.city = city !== undefined ? city : user.city;
    user.state = state !== undefined ? state : user.state;
    user.cpf = cpf !== undefined ? cpf : user.cpf;

    const checkHistory = await checkIsBlacklisted(user.email, user.cpf);
    if (checkHistory.blacklisted) {
      if (!user.subscription) {
        user.subscription = {
          plan: "none",
          validUntil: null,
          selectedAt: null,
          freePlanUsed: true,
          approved: false,
        };
      } else {
        user.subscription.freePlanUsed = true;
      }
    }

    await saveUser(user);

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(503).json({ error: "Erro ao atualizar perfil no banco de dados." });
  }
});

// Get Subscription History
app.get("/api/user/subscription-history", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const user = await getUserByEmail(authUser.email, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const trialDays = await getFreeTrialDays().catch(() => 60);
    normalizeUserSubscription(user, trialDays);
    res.json({
      history: user.subscriptionHistory || [],
      currentSubscription: user.subscription
    });
  } catch (err) {
    console.error("Subscription history get error:", err);
    res.status(503).json({ error: "Erro ao consultar histórico de assinatura." });
  }
});

// Update Subscription (self-service limited strictly to free trial; paid plans require Mercado Pago verification)
app.post("/api/user/subscription", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const { plan } = req.body || {};
  if (!["gratis", "mensal", "anual"].includes(plan)) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  if (plan !== "gratis") {
    return res.status(403).json({
      error: "Planos pagos exigem confirmação de pagamento oficial via Mercado Pago."
    });
  }

  try {
    const user = await getUserByEmail(authUser.email, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (!user.subscription) {
      user.subscription = {
        plan: "none",
        validUntil: null,
        selectedAt: null,
        freePlanUsed: false,
        approved: false,
      };
    }

    const trialDays = await getFreeTrialDays();
    if (user.subscription.freePlanUsed) {
      return res.status(400).json({ error: `Você já utilizou o período grátis de ${trialDays} dias anteriormente.` });
    }

    user.subscription = {
      plan: "gratis",
      validUntil: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      selectedAt: new Date().toISOString(),
      freePlanUsed: true,
      approved: true,
    };

    addSubscriptionHistoryEntry(user, {
      plan: "gratis",
      validUntil: user.subscription.validUntil,
      source: "teste_gratis",
      status: "Ativo",
      price: "Grátis",
      description: "Período Grátis de Experiência Ativado"
    });

    normalizeUserSubscription(user, trialDays);
    await saveUser(user);

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Subscription update error:", err);
    res.status(503).json({ error: "Erro ao atualizar assinatura no banco de dados." });
  }
});

function hasRealMercadoPagoToken(): boolean {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  return Boolean(
    token &&
    token.trim() !== "" &&
    !isPlaceholderValue(token) &&
    token.trim() !== "YOUR_ACCESS_TOKEN" &&
    token.trim() !== "INSIRA_SUA_ANON_KEY_DO_SUPABASE_AQUI"
  );
}

function hasRealMercadoPagoWebhookSecret(): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  return Boolean(secret && secret.trim() !== "" && !isPlaceholderValue(secret));
}

function canSimulateMercadoPago(): boolean {
  return isPaymentSimulationAllowed({
    hasRealToken: hasRealMercadoPagoToken(),
    nodeEnv: process.env.NODE_ENV,
    allowSimulationEnv: process.env.ALLOW_PAYMENT_SIMULATION,
  });
}

async function activatePaidSubscriptionFromPayment(params: {
  targetEmail: string;
  plan: "mensal" | "anual";
  isSimulated: boolean;
  paymentId?: string;
  action?: string;
  req: express.Request;
}) {
  const lowerEmail = params.targetEmail.toLowerCase().trim();
  const user = await getUserByEmail(lowerEmail, { bypassCache: true, throwOnError: true });
  if (!user) return { found: false, alreadyProcessed: false };

  if (
    params.paymentId &&
    Array.isArray(user.subscriptionHistory) &&
    user.subscriptionHistory.some((h: any) => h?.paymentId && String(h.paymentId) === String(params.paymentId))
  ) {
    return { found: true, alreadyProcessed: true, user };
  }

  const currentPrices = await getPlanPrices();
  const priceFormatted = params.plan === "mensal" ? `R$ ${currentPrices.mensal_por}` : `R$ ${currentPrices.anual_por}`;
  const newValidUntil = params.plan === "mensal"
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  user.subscription = {
    plan: params.plan,
    validUntil: newValidUntil,
    selectedAt: new Date().toISOString(),
    freePlanUsed: user.subscription?.freePlanUsed || false,
    approved: true,
  };

  addSubscriptionHistoryEntry(user, {
    plan: params.plan,
    validUntil: newValidUntil,
    source: params.isSimulated ? "Mercado Pago (Simulado)" : "Mercado Pago",
    status: "Ativo",
    price: priceFormatted,
    paymentId: params.paymentId,
    description: `Pagamento Aprovado - Plano ${params.plan === "mensal" ? "Mensal" : "Anual"}`
  });

  normalizeUserSubscription(user);
  await saveUser(user);
  invalidateUserCache(lowerEmail);
  await logAuditEvent({
    actorEmail: lowerEmail,
    action: params.action || "PAYMENT_APPROVED",
    entity: "subscriptions",
    status: "success",
    req: params.req,
    details: { plan: params.plan, simulated: params.isSimulated, paymentId: params.paymentId || null }
  });

  return { found: true, alreadyProcessed: false, user };
}

async function verifyMercadoPagoPaymentById(paymentId: string): Promise<{
  verified: boolean;
  status: string;
  email?: string;
  plan?: "mensal" | "anual";
}> {
  const token = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
  if (!token || !paymentId) {
    return { verified: false, status: "unverified" };
  }
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!resp.ok) {
    return { verified: false, status: `http_${resp.status}` };
  }
  const mpPayment: any = await resp.json();
  const status = String(mpPayment?.status || "").toLowerCase();
  const extRef = typeof mpPayment?.external_reference === "string" ? mpPayment.external_reference : "";
  const lastColonIdx = extRef.lastIndexOf(":");
  let parsedEmail: string | undefined;
  let parsedPlan: "mensal" | "anual" | undefined;
  if (lastColonIdx > 0) {
    parsedEmail = extRef.slice(0, lastColonIdx).toLowerCase().trim();
    const rawPlan = extRef.slice(lastColonIdx + 1).trim();
    if (rawPlan === "mensal" || rawPlan === "anual") {
      parsedPlan = rawPlan;
    }
  }
  return {
    verified: status === "approved",
    status,
    email: parsedEmail,
    plan: parsedPlan
  };
}

// Create Mercado Pago Payment Preference
app.post("/api/payment/create-preference", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const email = authUser.email;

  const { planName, price } = req.body;
  if (!["mensal", "anual"].includes(planName)) {
    return res.status(400).json({ error: "Plano inválido para checkout." });
  }

  // Retrieve current official price configured exclusively by admin
  const currentPrices = await getPlanPrices();
  const configuredPriceStr = planName === "mensal" ? currentPrices.mensal_por : currentPrices.anual_por;
  const configuredPrice = parseFloat(configuredPriceStr.replace(",", "."));
  const unitPrice = (!isNaN(configuredPrice) && configuredPrice > 0) ? configuredPrice : (planName === "mensal" ? 19.90 : 149.00);

  const hasToken = hasRealMercadoPagoToken();
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // Detect real appUrl from request headers to prevent redirect issues if APP_URL env variable is not set or misconfigured
  const host = req.headers.host || "";
  const protocol = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : "");

  let appUrl = process.env.APP_URL;
  if (!appUrl || appUrl.trim() === "") {
    if (origin) {
      appUrl = origin;
    } else if (host) {
      appUrl = `${protocol}://${host}`;
    } else {
      appUrl = `http://localhost:3000`;
    }
  }

  if (appUrl.endsWith("/")) {
    appUrl = appUrl.substring(0, appUrl.length - 1);
  }

  if (hasToken && accessToken) {
    try {
      console.log(`[Mercado Pago] Solicitando preferência de pagamento para ${email}. Plano: ${planName}, Preço: ${price}, Callback URL base: ${appUrl}`);

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              id: planName,
              title: `FinanFly - Assinatura ${planName === "mensal" ? "Mensal" : "Anual"}`,
              quantity: 1,
              unit_price: unitPrice,
              currency_id: "BRL",
              category_id: "services"
            }
          ],
          payer: {
            email: email
          },
          back_urls: {
            success: `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&plan=${planName}&status=approved&sig=${crypto.createHmac("sha256", JWT_SECRET).update(`${email}:${planName}`).digest("hex")}`,
            failure: `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&status=failed`,
            pending: `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&status=pending`
          },
          notification_url: `${appUrl}/api/payment/webhook`,
          auto_return: "approved",
          external_reference: `${email}:${planName}`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("[Mercado Pago] Erro retornado pela API do Mercado Pago:", data);
        const detail = data.message || (data.cause && data.cause[0] && data.cause[0].description) || JSON.stringify(data);
        return res.status(400).json({
          error: `Erro ao gerar checkout do Mercado Pago: ${detail}. Verifique se as suas chaves do Mercado Pago em .env estão corretas.`
        });
      }

      console.log("[Mercado Pago] Preferência gerada com sucesso. Link de redirecionamento:", data.init_point);
      return res.json({ init_point: data.init_point });
    } catch (err: any) {
      console.error("Mercado Pago Preference Error:", err);
      return res.status(500).json({
        error: `Erro ao conectar com a API do Mercado Pago: ${err.message || err}`
      });
    }
  }

  if (!canSimulateMercadoPago()) {
    await logAuditEvent({
      actorEmail: email,
      action: "PAYMENT_CHECKOUT_BLOCKED_NO_KEY",
      entity: "subscriptions",
      status: "blocked",
      req,
      details: { plan: planName }
    });
    return res.status(503).json({
      error: "Pagamento online via Mercado Pago aguardando configuração da chave de produção. Solicite ao administrador ou tente novamente em breve."
    });
  }

  // Simulation mode (Only outside production or when ALLOW_PAYMENT_SIMULATION=true without a real token)
  console.log(`[PAYMENT SIMULATION] Criando checkout simulado de Mercado Pago para ${email} (Plano: ${planName})`);
  const simSig = crypto.createHmac("sha256", JWT_SECRET).update(`${email}:${planName}`).digest("hex");
  const simulationUrl = `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&plan=${planName}&status=approved&simulated=true&sig=${simSig}`;
  res.json({ init_point: simulationUrl });
});

// Mercado Pago Webhook Endpoint (Server-to-Server authoritative payment confirmation)
app.post("/api/payment/webhook", async (req, res) => {
  try {
    const topic = String(req.body?.type || req.body?.topic || req.query?.topic || req.query?.type || "").toLowerCase();
    const rawPaymentId =
      req.body?.data?.id ||
      req.query?.["data.id"] ||
      (topic === "payment" ? (req.body?.id || req.query?.id) : undefined);

    if (!rawPaymentId || (topic && topic !== "payment")) {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (!hasRealMercadoPagoToken()) {
      return res.status(200).json({ received: true, skipped: "no_token" });
    }

    if (hasRealMercadoPagoWebhookSecret()) {
      const sigCheck = verifyMercadoPagoWebhookSignature({
        xSignature: req.headers["x-signature"],
        xRequestId: req.headers["x-request-id"],
        dataId: String(rawPaymentId),
        secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
      });
      if (!sigCheck.valid) {
        await logAuditEvent({
          actorEmail: "webhook:mercadopago",
          action: "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
          entity: "subscriptions",
          status: "blocked",
          req,
          details: { reason: sigCheck.reason, paymentId: String(rawPaymentId) }
        });
        return res.status(401).json({ received: false, error: "Assinatura de webhook inválida." });
      }
    }

    const verification = await verifyMercadoPagoPaymentById(String(rawPaymentId));
    if (verification.verified && verification.email && verification.plan) {
      await activatePaidSubscriptionFromPayment({
        targetEmail: verification.email,
        plan: verification.plan,
        isSimulated: false,
        paymentId: String(rawPaymentId),
        action: "PAYMENT_WEBHOOK_APPROVED",
        req
      });
    }

    return res.status(200).json({ received: true, verified: verification.verified });
  } catch (err) {
    console.error("Mercado Pago webhook error:", err);
    return res.status(200).json({ received: true });
  }
});

// Mercado Pago Payment Callback Handler
app.get("/api/payment/callback", async (req, res) => {
  const { email, plan, status, simulated, sig, payment_id, collection_id } = req.query;

  if (!email || !status || typeof email !== "string" || typeof status !== "string") {
    return res.status(400).send(`
      <html>
        <head>
          <title>Pagamento FinanFly</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; border: 1px solid #334155; }
            h1 { color: #ef4444; margin-top: 0; }
            button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; margin-top: 1rem; }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Erro de Pagamento</h1>
            <p>Parâmetros de confirmação inválidos ou faltando.</p>
            <button onclick="window.location.href='/'">Voltar ao Sistema</button>
          </div>
        </body>
      </html>
    `);
  }

  const targetEmail = email.toLowerCase().trim();
  const safePlan = plan === "mensal" || plan === "anual" ? plan : null;
  const isSimulated = simulated === "true";
  const hasRealToken = hasRealMercadoPagoToken();

  let isValidSignature = false;
  if (safePlan && typeof sig === "string") {
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${targetEmail}:${safePlan}`).digest("hex");
    try {
      const a = Buffer.from(sig, "utf-8");
      const b = Buffer.from(expectedSig, "utf-8");
      isValidSignature = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      isValidSignature = false;
    }
  }

  let confirmedApproved = false;
  let verifiedPlan: "mensal" | "anual" | null = safePlan;
  let verifiedEmail = targetEmail;
  let mpPaymentId: string | undefined;

  if (hasRealToken) {
    mpPaymentId =
      (typeof payment_id === "string" && payment_id.trim()) ||
      (typeof collection_id === "string" && collection_id.trim()) ||
      undefined;

    if (!isSimulated && mpPaymentId && mpPaymentId !== "null") {
      try {
        const verification = await verifyMercadoPagoPaymentById(mpPaymentId);
        if (verification.verified && verification.plan && verification.email === targetEmail) {
          confirmedApproved = true;
          verifiedPlan = verification.plan;
          verifiedEmail = verification.email;
        }
      } catch (err) {
        console.error("Callback Mercado Pago verification error:", err);
      }
    }
  } else if (canSimulateMercadoPago()) {
    confirmedApproved = status === "approved" && Boolean(safePlan) && isValidSignature;
  }

  if (confirmedApproved && verifiedPlan) {
    try {
      await activatePaidSubscriptionFromPayment({
        targetEmail: verifiedEmail,
        plan: verifiedPlan,
        isSimulated: !hasRealToken && isSimulated,
        paymentId: mpPaymentId,
        action: "PAYMENT_APPROVED",
        req
      });
    } catch (err) {
      console.error("Callback subscription activation error:", err);
    }

    const planLabel = verifiedPlan === "mensal" ? "MENSAL" : "ANUAL";
    return res.send(`
      <html>
        <head>
          <title>Pagamento Aprovado - FinanFly</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 450px; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
            h1 { color: #10b981; margin-top: 0; font-size: 1.75rem; }
            p { font-size: 0.95rem; color: #94a3b8; line-height: 1.5; }
            .badge { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; display: inline-block; margin-bottom: 1.5rem; font-size: 0.8rem; text-transform: uppercase; }
            button { background: #2563eb; color: white; border: none; padding: 0.85rem 2rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; margin-top: 1.5rem; width: 100%; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2); }
            button:hover { background: #1d4ed8; transform: translateY(-1px); }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">${!hasRealToken && isSimulated ? "Simulação Concluída" : "Transação Concluída"}</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Sua assinatura do plano <strong>${planLabel}</strong> foi ativada com sucesso e sua conta do <strong>FinanFly</strong> já está liberada!</p>
            <p style="font-size:0.8rem; margin-top: 1rem;">Clique abaixo para retornar e explorar o painel.</p>
            <button onclick="window.location.href='/'">Entrar no FinanFly</button>
          </div>
        </body>
      </html>
    `);
  }

  // Pending confirmation page (when Mercado Pago redirected without confirmed approved status yet)
  if (status === "pending" || (hasRealToken && status === "approved" && !confirmedApproved)) {
    return res.send(`
      <html>
        <head>
          <title>Pagamento em Análise - FinanFly</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 450px; border: 1px solid #334155; }
            h1 { color: #f59e0b; margin-top: 0; }
            p { color: #94a3b8; line-height: 1.5; }
            button { background: #2563eb; color: white; border: none; padding: 0.85rem 2rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; margin-top: 1.5rem; width: 100%; }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Aguardando Confirmação</h1>
            <p>Seu pagamento está sendo validado pelo Mercado Pago. Assim que a compensação for confirmada, seu plano será liberado automaticamente.</p>
            <button onclick="window.location.href='/'">Voltar ao Sistema</button>
          </div>
        </body>
      </html>
    `);
  }

  // Payment failed page
  return res.send(`
    <html>
      <head>
        <title>Pagamento Cancelado - FinanFly</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 450px; border: 1px solid #334155; }
          h1 { color: #f43f5e; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.5; }
          button { background: #475569; color: white; border: none; padding: 0.85rem 2rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; margin-top: 1.5rem; width: 100%; }
          button:hover { background: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Pagamento Cancelado</h1>
          <p>Não foi possível concluir o pagamento ou o processo foi cancelado. Se desejar, você pode tentar escolher outra forma de pagamento.</p>
          <button onclick="window.location.href='/'">Voltar aos Planos</button>
        </div>
      </body>
    </html>
  `);
});

// Get User Data (supports optional ?year=YYYY query filter for scalable loading)
app.get("/api/user/data", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const rawYear = req.query.year ? Number(req.query.year) : undefined;
    const year = rawYear && Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : undefined;
    const userData = await getUserDataByEmail(authUser.email, { bypassCache: true, throwOnError: true, year });
    const payload = userData || getEmptyUserData();
    if (payload._version) {
      res.setHeader("X-Data-Version", String(payload._version));
    }
    res.json(payload);
  } catch (err) {
    console.error("User data get error:", err);
    res.status(503).json({ error: "Falha temporária ao carregar dados do banco. Tente atualizar novamente." });
  }
});

// Update User Data (serializado por usuário + controle de concorrência otimista por versão + retenção de 3 anos)
app.post("/api/user/data", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const newData = req.body;
  if (!newData || typeof newData !== "object" || Array.isArray(newData)) {
    return res.status(400).json({ error: "Payload de dados inválido." });
  }

  try {
    const result = await withUserWriteLock(authUser.email, async () => {
      const currentData = await getUserDataByEmail(authUser.email, { bypassCache: true, throwOnError: true });
      if (!currentData || typeof currentData !== "object") {
        return { status: 503, body: { error: "Houve uma falha na gravação por instabilidade de conexão. Por favor, tente gravar novamente." } };
      }

      if (
        typeof newData._expectedVersion === "string" &&
        newData._expectedVersion.trim() !== "" &&
        typeof currentData._version === "string" &&
        currentData._version.trim() !== "" &&
        newData._expectedVersion !== currentData._version
      ) {
        await logAuditEvent({
          actorEmail: authUser.email,
          action: "DATA_VERSION_CONFLICT",
          entity: "user_data",
          status: "conflict",
          req,
          details: { expected: newData._expectedVersion, current: currentData._version }
        });
        return {
          status: 409,
          body: {
            conflict: true,
            error: "Outro dispositivo ou aba atualizou seus dados recentemente. Os dados foram recarregados para evitar sobrescrita."
          }
        };
      }

      const activeCurrent = applyThreeYearRetention(currentData).prunedData;
      const sanitizedNewData = pickAllowedUserDataFields(newData);
      const changedKeys = Object.keys(sanitizedNewData);
      if (changedKeys.length === 0) {
        return { status: 400, body: { error: "Nenhum campo financeiro válido informado para atualização." } };
      }

      const rawScopedYear = newData._scopedYear !== undefined ? Number(newData._scopedYear) : undefined;
      const scopedYear =
        rawScopedYear && Number.isInteger(rawScopedYear) && rawScopedYear >= 2000 && rawScopedYear <= 2100
          ? rawScopedYear
          : undefined;
      const effectiveNewData = scopedYear
        ? mergeScopedYearUserData(currentData, sanitizedNewData, scopedYear)
        : sanitizedNewData;

      const protectedEntityKeys: Array<[string, string]> = [
        ['expenses', 'despesas'],
        ['incomes', 'receitas'],
        ['investments', 'investimentos'],
        ['trips', 'viagens'],
        ['wishes', 'desejos'],
        ['actionPlans', 'objetivos e metas'],
        ['deficitActions', 'planos de ajuste'],
        ['shoppingList', 'itens da lista de compras']
      ];

      for (const [key, label] of protectedEntityKeys) {
        const isYearFilteredEntity =
          scopedYear && (key === 'expenses' || key === 'incomes' || key === 'investments' || key === 'deficitActions');
        const prevCountForScope = isYearFilteredEntity && Array.isArray(activeCurrent[key])
          ? activeCurrent[key].filter((it: any) => Number(String(it?.date || '').slice(0, 4)) === scopedYear).length
          : Array.isArray(activeCurrent[key]) ? activeCurrent[key].length : 0;
        const incomingArr = isYearFilteredEntity ? sanitizedNewData[key] : effectiveNewData[key];

        if (
          Array.isArray(incomingArr) &&
          incomingArr.length === 0 &&
          prevCountForScope > 1 &&
          !newData._allowClearAll
        ) {
          await logAuditEvent({
            actorEmail: authUser.email,
            action: "MASS_DELETE_BLOCKED",
            entity: key,
            status: "warning",
            req,
            details: { previousCount: prevCountForScope, scopedYear: scopedYear || null }
          });
          return {
            status: 409,
            body: { error: `Operação bloqueada por segurança para evitar perda em massa de ${label}. Atualize a página e tente novamente.` }
          };
        }
      }

      const protectedConfigKeys: Array<[string, string, number]> = [
        ['paymentStatuses', 'situações de pagamento', 1],
        ['paymentTypes', 'formas de pagamento', 1],
        ['receiptStatuses', 'situações de recebimento', 1],
        ['receiptTypes', 'tipos de recebimento', 1],
        ['incomeCategories', 'categorias de receitas', 1],
        ['expenseCategories', 'categorias de despesas', 1],
        ['investmentTypes', 'tipos de investimentos', 1],
        ['investmentStatuses', 'situações de investimentos', 1],
        ['annualPlanning', 'planejamento anual', 0]
      ];

      for (const [key, label, minProtectedLen] of protectedConfigKeys) {
        if (
          Array.isArray(effectiveNewData[key]) &&
          effectiveNewData[key].length === 0 &&
          Array.isArray(activeCurrent[key]) &&
          activeCurrent[key].length > minProtectedLen &&
          !newData._allowClearAll
        ) {
          await logAuditEvent({
            actorEmail: authUser.email,
            action: "MASS_CONFIG_DELETE_BLOCKED",
            entity: key,
            status: "warning",
            req,
            details: { previousCount: activeCurrent[key].length }
          });
          return {
            status: 409,
            body: { error: `Operação bloqueada por segurança para evitar perda em massa de ${label}.` }
          };
        }
      }

      const { _version: currentVersion, ...cleanCurrentData } = currentData;
      const mergedUpdatedData = {
        ...cleanCurrentData,
        ...effectiveNewData,
      };
      const retentionResult = applyThreeYearRetention(mergedUpdatedData);
      const prunedUpdatedData = retentionResult.prunedData;

      const newVersion = await saveUserDataByEmail(
        authUser.email,
        prunedUpdatedData,
        changedKeys,
        currentVersion,
        { previousData: currentData }
      );
      return {
        status: 200,
        version: newVersion,
        body: {
          success: true,
          _version: newVersion,
          retentionCleanedCount: retentionResult.totalRemoved,
          data: { ...prunedUpdatedData, _version: newVersion }
        }
      };
    });

    if ((result as any).version) {
      res.setHeader("X-Data-Version", String((result as any).version));
    }
    res.status(result.status).json(result.body);
  } catch (err: any) {
    if (err instanceof ForeignRowOwnershipError) {
      await logAuditEvent({
        actorEmail: authUser.email,
        action: "CROSS_USER_ID_BLOCKED",
        entity: err.table,
        status: "blocked",
        req,
        details: { conflictingIds: err.conflictingIds }
      });
      return res.status(403).json({ error: "Operação negada: identificador pertence a outra conta." });
    }
    console.error("User data post error:", err);
    res.status(503).json({ error: "Houve uma falha na gravação por instabilidade de conexão. Por favor, tente gravar novamente." });
  }
});

// Granular Single-Item Save/Delete Endpoint (prevents unnecessary bulk diffs on single mutations)
app.post("/api/user/entity/:entity", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const entity = req.params.entity as GranularEntityKey;
  if (!Object.prototype.hasOwnProperty.call(ENTITY_TABLE_MAP, entity)) {
    return res.status(400).json({ error: "Entidade financeira inválida." });
  }

  const { action, item, id, _expectedVersion } = req.body || {};
  if (action !== "upsert" && action !== "delete") {
    return res.status(400).json({ error: "Ação incremental inválida. Use 'upsert' ou 'delete'." });
  }
  if (action === "upsert" && (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || !item.id.trim())) {
    return res.status(400).json({ error: "Registro inválido para gravação." });
  }
  if (action === "delete" && typeof (id || item?.id) !== "string") {
    return res.status(400).json({ error: "ID do registro inválido para exclusão." });
  }

  try {
    const result = await withUserWriteLock(authUser.email, async () => {
      const currentData = await getUserDataByEmail(authUser.email, { bypassCache: true, throwOnError: true });
      if (!currentData || typeof currentData !== "object") {
        return { status: 503, body: { error: "Houve uma falha na gravação por instabilidade de conexão. Por favor, tente gravar novamente." } };
      }

      if (
        typeof _expectedVersion === "string" &&
        _expectedVersion.trim() !== "" &&
        typeof currentData._version === "string" &&
        currentData._version.trim() !== "" &&
        _expectedVersion !== currentData._version
      ) {
        return {
          status: 409,
          body: {
            conflict: true,
            error: "Outro dispositivo ou aba atualizou seus dados recentemente. Os dados foram recarregados para evitar sobrescrita."
          }
        };
      }

      const { nextData, newVersion } = await saveGranularEntityMutation(authUser.email, entity, action, currentData, item, id);
      return { status: 200, version: newVersion, body: { success: true, _version: newVersion, data: nextData } };
    });

    if ((result as any).version) {
      res.setHeader("X-Data-Version", String((result as any).version));
    }
    res.status(result.status).json(result.body);
  } catch (err: any) {
    if (err instanceof ForeignRowOwnershipError) {
      await logAuditEvent({
        actorEmail: authUser.email,
        action: "CROSS_USER_ID_BLOCKED",
        entity: err.table,
        status: "blocked",
        req,
        details: { conflictingIds: err.conflictingIds }
      });
      return res.status(403).json({ error: "Operação negada: identificador pertence a outra conta." });
    }
    console.error("Granular entity post error:", err);
    res.status(503).json({ error: "Houve uma falha na gravação por instabilidade de conexão. Por favor, tente gravar novamente." });
  }
});

// Soft Delete Trash: list deleted items within strictly the last 3 days
app.get("/api/user/trash", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const supabase = requireSupabase();
    const lowerEmail = authUser.email.toLowerCase().trim();
    const cutoffIso = new Date(Date.now() - TRASH_RETENTION_MS).toISOString();

    // Auto-purge expired items older than 3 days
    const { error: purgeErr } = await supabase
      .from('trash_items')
      .delete()
      .eq('email', lowerEmail)
      .lt('deleted_at', cutoffIso);

    if (purgeErr) {
      if (isMissingTableOrColumnError(purgeErr)) {
        return res.json({ items: [], tableMissing: true, retentionDays: TRASH_RETENTION_DAYS });
      }
      throw new Error(purgeErr.message);
    }

    const { data, error } = await fetchAllPaginatedRows(
      (from, to) =>
        supabase
          .from('trash_items')
          .select('*')
          .eq('email', lowerEmail)
          .gte('deleted_at', cutoffIso)
          .order('deleted_at', { ascending: false })
          .range(from, to),
      'getUserTrash'
    );

    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return res.json({ items: [], tableMissing: true, retentionDays: TRASH_RETENTION_DAYS });
      }
      throw new Error(error.message);
    }

    const items = (data || [])
      .filter((row: any) => isWithinTrashRestoreWindow(row.deleted_at))
      .map((row: any) => ({
        id: row.id,
        entity: row.entity,
        entityLabel: TRASH_ENTITY_LABELS[row.entity] || row.entity,
        recordId: row.record_id,
        label: row.label || formatTrashLabel(row.entity, row.payload),
        payload: row.payload,
        deletedAt: row.deleted_at,
        expiresAt: row.expires_at
      }));

    res.json({ items, tableMissing: false, retentionDays: TRASH_RETENTION_DAYS });
  } catch (err) {
    console.error("Get user trash error:", err);
    res.status(503).json({ error: "Erro ao consultar lixeira de exclusões recentes." });
  }
});

// Soft Delete Trash: restore an item deleted in the last 3 days
app.post("/api/user/trash/restore", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const { trashId } = req.body || {};
  if (!trashId || typeof trashId !== "string") {
    return res.status(400).json({ error: "Identificador do item da lixeira inválido." });
  }

  try {
    const result = await withUserWriteLock(authUser.email, async () => {
      const supabase = requireSupabase();
      const lowerEmail = authUser.email.toLowerCase().trim();

      const { data: trashRow, error: fetchErr } = await supabase
        .from('trash_items')
        .select('*')
        .eq('id', trashId)
        .eq('email', lowerEmail)
        .maybeSingle();

      if (fetchErr) {
        if (isMissingTableOrColumnError(fetchErr)) {
          return { status: 400, body: { error: "Tabela de lixeira ainda não configurada no banco." } };
        }
        throw new Error(fetchErr.message);
      }

      if (!trashRow) {
        return { status: 404, body: { error: "Item não encontrado na lixeira." } };
      }

      if (!isWithinTrashRestoreWindow(trashRow.deleted_at)) {
        await supabase.from('trash_items').delete().eq('id', trashId).eq('email', lowerEmail);
        return {
          status: 410,
          body: { error: `O prazo de ${TRASH_RETENTION_DAYS} dias para restaurar este item expirou.` }
        };
      }

      const entity = trashRow.entity as GranularEntityKey;
      if (!Object.prototype.hasOwnProperty.call(ENTITY_TABLE_MAP, entity) || !trashRow.payload) {
        return { status: 400, body: { error: "Registro da lixeira inválido para restauração." } };
      }

      const currentData = await getUserDataByEmail(lowerEmail, { bypassCache: true, throwOnError: true });
      const { nextData, newVersion } = await saveGranularEntityMutation(
        lowerEmail,
        entity,
        'upsert',
        currentData,
        trashRow.payload
      );

      await supabase.from('trash_items').delete().eq('id', trashId).eq('email', lowerEmail);

      await logAuditEvent({
        actorEmail: lowerEmail,
        action: "TRASH_ITEM_RESTORED",
        entity,
        status: "success",
        req,
        details: { trashId, recordId: trashRow.record_id, label: trashRow.label }
      });

      return {
        status: 200,
        version: newVersion,
        body: {
          success: true,
          _version: newVersion,
          data: nextData,
          restoredLabel: trashRow.label || formatTrashLabel(entity, trashRow.payload)
        }
      };
    });

    if ((result as any).version) {
      res.setHeader("X-Data-Version", String((result as any).version));
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Restore trash error:", err);
    res.status(503).json({ error: "Erro ao restaurar registro da lixeira." });
  }
});

// Soft Delete Trash: permanently delete a trash item
app.delete("/api/user/trash/:id", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const trashId = String(req.params.id || "").trim();
  if (!trashId) {
    return res.status(400).json({ error: "Identificador inválido." });
  }

  try {
    const supabase = requireSupabase();
    const lowerEmail = authUser.email.toLowerCase().trim();
    const { error } = await supabase.from('trash_items').delete().eq('id', trashId).eq('email', lowerEmail);
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete trash item error:", err);
    res.status(503).json({ error: "Erro ao remover item da lixeira." });
  }
});

// JSON Full Backup Export (authenticated user)
app.get("/api/user/backup/export", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const userData = await getUserDataByEmail(authUser.email, { bypassCache: true, throwOnError: true });
    const { _version, ...cleanData } = userData || getEmptyUserData();
    const exportedAt = new Date().toISOString();
    const dateStamp = exportedAt.slice(0, 10);

    await logAuditEvent({
      actorEmail: authUser.email,
      action: "BACKUP_EXPORTED",
      entity: "user_data",
      status: "success",
      req
    });

    res.setHeader("Content-Disposition", `attachment; filename="finanfly-backup-${dateStamp}.json"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({
      app: "FinanFly",
      formatVersion: 1,
      exportedAt,
      retentionYears: RETENTION_YEARS,
      email: authUser.email,
      userData: cleanData
    });
  } catch (err) {
    console.error("Export backup error:", err);
    res.status(503).json({ error: "Erro ao exportar backup dos seus dados." });
  }
});

// JSON Backup Restore (authenticated user, enforces 3-year retention policy)
app.post("/api/user/backup/restore", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const rawPayload = req.body?.userData || req.body;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return res.status(400).json({ error: "Arquivo de backup inválido." });
  }

  const baseEmpty = getEmptyUserData();
  const allowedKeys = Object.keys(baseEmpty);
  const hasAnyRecognizedArray = allowedKeys.some((k) => Array.isArray(rawPayload[k]));
  if (!hasAnyRecognizedArray) {
    return res.status(400).json({ error: "O arquivo JSON não contém estruturas válidas do FinanFly." });
  }

  const normalizedCandidate: Record<string, any> = { ...baseEmpty };
  for (const key of allowedKeys) {
    if (Array.isArray(rawPayload[key])) {
      normalizedCandidate[key] = rawPayload[key];
    }
  }

  const retentionResult = applyThreeYearRetention(normalizedCandidate);

  try {
    const result = await withUserWriteLock(authUser.email, async () => {
      const currentData = await getUserDataByEmail(authUser.email, { bypassCache: true, throwOnError: true });
      const supabase = requireSupabase();
      const remapResult = await remapCollidingImportIds(
        supabase,
        authUser.email,
        retentionResult.prunedData,
        [
          { key: 'incomes', table: 'incomes', prefix: 'inc' },
          { key: 'expenses', table: 'expenses', prefix: 'exp' },
          { key: 'investments', table: 'investments', prefix: 'inv' },
          { key: 'trips', table: 'trips', prefix: 'trip' },
          { key: 'wishes', table: 'wishes', prefix: 'wish' },
          { key: 'actionPlans', table: 'action_plans', prefix: 'plan' },
          { key: 'deficitActions', table: 'deficit_actions', prefix: 'deficit' },
          { key: 'shoppingList', table: 'shopping_list', prefix: 'shop' }
        ],
        withSupabaseRetry
      );
      const safeRestoredData = remapResult.userData;
      await createUserBackupSnapshot(supabase, authUser.email, currentData, 'pre_restore');

      const newVersion = await saveUserDataByEmail(
        authUser.email,
        safeRestoredData,
        undefined,
        currentData?._version,
        { skipTrash: true, skipAutoBackup: true, previousData: currentData }
      );

      await createUserBackupSnapshot(supabase, authUser.email, safeRestoredData, 'user_restore', { allowEmpty: true });

      await logAuditEvent({
        actorEmail: authUser.email,
        action: "BACKUP_RESTORED",
        entity: "user_data",
        status: "success",
        req,
        details: {
          removedOlderThanThreeYears: retentionResult.totalRemoved,
          remappedCollidingIds: remapResult.remappedCount
        }
      });

      return {
        status: 200,
        version: newVersion,
        body: {
          success: true,
          _version: newVersion,
          removedOlderThanThreeYears: retentionResult.totalRemoved,
          data: { ...safeRestoredData, _version: newVersion }
        }
      };
    });

    if ((result as any).version) {
      res.setHeader("X-Data-Version", String((result as any).version));
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Restore backup error:", err);
    res.status(503).json({ error: "Falha ao restaurar backup no banco de dados. Tente novamente." });
  }
});

// Get Plan Prices (Public)
app.get("/api/plan-prices", async (req, res) => {
  try {
    const prices = await getPlanPrices();
    res.json(prices);
  } catch (err) {
    console.error("Error fetching plan prices:", err);
    res.status(503).json({ error: "Erro ao obter valores dos planos no banco de dados." });
  }
});

// Update Plan Prices (Admin only)
app.post("/api/admin/plan-prices", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { mensal_de, mensal_por, anual_de, anual_por } = req.body;
    const currentPrices = await getPlanPrices();
    const updatedPrices = {
      mensal_de: String(mensal_de !== undefined ? mensal_de : currentPrices.mensal_de).trim(),
      mensal_por: String(mensal_por !== undefined ? mensal_por : currentPrices.mensal_por).trim(),
      anual_de: String(anual_de !== undefined ? anual_de : currentPrices.anual_de).trim(),
      anual_por: String(anual_por !== undefined ? anual_por : currentPrices.anual_por).trim()
    };

    await savePlanPrices(updatedPrices);

    res.json({ message: "Valores salvos e atualizados com sucesso!", prices: updatedPrices });
  } catch (err) {
    console.error("Error updating plan prices:", err);
    res.status(503).json({ error: "Erro ao atualizar valores no Supabase." });
  }
});

// Get Free Trial Days (Public)
app.get("/api/free-trial-days", async (req, res) => {
  try {
    const days = await getFreeTrialDays();
    res.json({ days });
  } catch (err) {
    console.error("Error fetching free trial days:", err);
    res.status(503).json({ error: "Erro ao consultar período gratuito no banco de dados." });
  }
});

// Update Free Trial Days (Admin only)
app.post("/api/admin/free-trial-days", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { days } = req.body;
    if (days === undefined || isNaN(Number(days)) || Number(days) < 0) {
      return res.status(400).json({ error: "Quantidade de dias inválida." });
    }

    const numericDays = Number(days);
    await saveFreeTrialDays(numericDays);

    res.json({ message: "Limite de uso gratuito atualizado com sucesso no Supabase!", days: numericDays });
  } catch (err) {
    console.error("Error updating free trial days:", err);
    res.status(503).json({ error: "Erro ao atualizar limite gratuito no Supabase." });
  }
});

// Get Home Notices (Public)
app.get("/api/notices", async (req, res) => {
  try {
    const notices = await getHomeNotices();
    res.json(notices);
  } catch (err) {
    console.error("Error fetching notices:", err);
    res.status(503).json({ error: "Erro ao buscar avisos da página inicial." });
  }
});

// Update Home Notices (Admin only)
app.post("/api/admin/notices", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { fluxoCaixa, resumosInteligentes, planejamentoObjetivos, rule50_30_20, weeklyCheck } = req.body;
    const currentNotices = await getHomeNotices();

    const updatedNotices = {
      fluxoCaixa: {
        title: String(fluxoCaixa?.title !== undefined ? fluxoCaixa.title : currentNotices.fluxoCaixa?.title || '').trim(),
        message: String(fluxoCaixa?.message !== undefined ? fluxoCaixa.message : currentNotices.fluxoCaixa?.message || '').trim()
      },
      resumosInteligentes: {
        title: String(resumosInteligentes?.title !== undefined ? resumosInteligentes.title : currentNotices.resumosInteligentes?.title || '').trim(),
        message: String(resumosInteligentes?.message !== undefined ? resumosInteligentes.message : currentNotices.resumosInteligentes?.message || '').trim()
      },
      planejamentoObjetivos: {
        title: String(planejamentoObjetivos?.title !== undefined ? planejamentoObjetivos.title : currentNotices.planejamentoObjetivos?.title || '').trim(),
        message: String(planejamentoObjetivos?.message !== undefined ? planejamentoObjetivos.message : currentNotices.planejamentoObjetivos?.message || '').trim()
      },
      rule50_30_20: {
        title: String(rule50_30_20?.title !== undefined ? rule50_30_20.title : currentNotices.rule50_30_20?.title || '').trim(),
        message: String(rule50_30_20?.message !== undefined ? rule50_30_20.message : currentNotices.rule50_30_20?.message || '').trim()
      },
      weeklyCheck: {
        title: String(weeklyCheck?.title !== undefined ? weeklyCheck.title : currentNotices.weeklyCheck?.title || '').trim(),
        message: String(weeklyCheck?.message !== undefined ? weeklyCheck.message : currentNotices.weeklyCheck?.message || '').trim()
      }
    };

    await saveHomeNotices(updatedNotices);

    res.json({ message: "Avisos e cards atualizados e sincronizados com sucesso no Supabase!", notices: updatedNotices });
  } catch (err) {
    console.error("Error updating notices:", err);
    res.status(503).json({ error: "Erro ao atualizar avisos no Supabase." });
  }
});

// ---------------- ADMIN ENDPOINTS ----------------

// Get All Users (Admin only)
app.get("/api/admin/users", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const list = await getAllUsersList();
    const sanitized = list.map(u => {
      const { password: _, ...rest } = u;
      return rest;
    });
    res.json({ users: sanitized });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(503).json({ error: "Erro ao consultar usuários no Supabase." });
  }
});

// Approve user manually (Admin only)
app.post("/api/admin/approve-user", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail, approve } = req.body;
    const targetUser = await getUserByEmail(targetEmail, { bypassCache: true, throwOnError: true });
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário alvo não encontrado." });
    }

    if (!targetUser.subscription) {
      targetUser.subscription = {
        plan: "none",
        validUntil: null,
        selectedAt: null,
        freePlanUsed: false,
        approved: false,
      };
    }

    targetUser.subscription.approved = approve;
    if (approve) {
      targetUser.isBlocked = false;
      if (targetUser.subscription.plan === "none" || targetUser.subscription.plan === "inativo") {
        targetUser.subscription.plan = "mensal";
      }
      if (!targetUser.subscription.validUntil || new Date(targetUser.subscription.validUntil).getTime() < Date.now()) {
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        nextMonth.setHours(23, 59, 59, 999);
        targetUser.subscription.validUntil = nextMonth.toISOString();
      }
    }

    normalizeUserSubscription(targetUser);
    await saveUser(targetUser);
    invalidateUserCache(targetEmail);
    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail,
      action: approve ? "ADMIN_APPROVE_USER" : "ADMIN_REVOKE_APPROVAL",
      entity: "subscriptions",
      status: "success",
      req
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin approve-user error:", err);
    res.status(503).json({ error: "Erro ao aprovar usuário no Supabase." });
  }
});

// Admin registers new user (Admin only)
app.post("/api/admin/create-user", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail, password, name, role, plan } = req.body;
    if (!targetEmail || !name) {
      return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    }

    const lowerTargetEmail = String(targetEmail).toLowerCase().trim();
    const existing = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });

    if (existing) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    const trialDays = await getFreeTrialDays();
    let validUntil = null;
    let isBlocked = false;
    if (plan === "inativo") {
      isBlocked = true;
    } else if (plan === "gratis") {
      validUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (plan === "mensal") {
      validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (plan === "anual") {
      validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const rawPass = (password && typeof password === "string" && password.trim() !== "") ? password : crypto.randomBytes(8).toString("hex");
    const newUser = {
      email: lowerTargetEmail,
      name: String(name).trim(),
      address: "",
      city: "",
      state: "",
      phone: "",
      role: role || "user",
      password: hashPassword(rawPass),
      isBlocked,
      subscription: {
        plan: plan || "none",
        validUntil,
        selectedAt: new Date().toISOString(),
        freePlanUsed: plan === "gratis",
        approved: true,
      },
      createdAt: new Date().toISOString(),
    };

    addSubscriptionHistoryEntry(newUser, {
      plan: newUser.subscription.plan,
      validUntil: newUser.subscription.validUntil,
      source: 'administrador',
      status: isBlocked ? 'Inativo' : 'Ativo',
      description: `Usuário cadastrado com plano "${newUser.subscription.plan}" pelo administrador`
    });

    normalizeUserSubscription(newUser, trialDays);
    await saveUser(newUser);
    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: "ADMIN_CREATE_USER",
      entity: "users",
      status: "success",
      req,
      details: { role: newUser.role, plan: newUser.subscription.plan }
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin create-user error:", err);
    res.status(503).json({ error: "Erro ao criar usuário no Supabase." });
  }
});

// Admin edits user profile and subscription (Admin only)
app.post("/api/admin/edit-user", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail, name, role, plan, password, address, phone, city, state, userMessage, mensagemUsuario, isBlocked } = req.body;
    const lowerTargetEmail = String(targetEmail || '').toLowerCase().trim();
    if (!lowerTargetEmail) {
      return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
    }

    const user = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (!user.subscription) {
      user.subscription = {
        plan: "none",
        validUntil: null,
        selectedAt: new Date().toISOString(),
        freePlanUsed: false,
        approved: true,
      };
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (password !== undefined && typeof password === "string" && password.trim() !== "") {
      user.password = hashPassword(password);
    }
    if (address !== undefined) user.address = address;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (userMessage !== undefined) {
      user.userMessage = userMessage;
      user.mensagemUsuario = userMessage;
      await saveUserMessageToDatabase(lowerTargetEmail, userMessage);
    } else if (mensagemUsuario !== undefined) {
      user.userMessage = mensagemUsuario;
      user.mensagemUsuario = mensagemUsuario;
      await saveUserMessageToDatabase(lowerTargetEmail, mensagemUsuario);
    }

    if (isBlocked !== undefined) {
      if (isBlocked) {
        if (user.subscription.plan !== "inativo") {
          user.previousPlan = user.subscription.plan || "none";
          user.previousValidUntil = user.subscription.validUntil || null;
          user.previousApproved = user.subscription.approved !== undefined ? user.subscription.approved : true;
          user.previousSubscription = { ...user.subscription };
        }
        user.isBlocked = true;
        user.subscription.plan = "inativo";
      } else {
        user.isBlocked = false;
        if (user.subscription.plan === "inativo") {
          const prevPlan = user.previousPlan || (user.previousSubscription ? user.previousSubscription.plan : null);
          if (prevPlan && prevPlan !== "inativo" && prevPlan !== "none") {
            user.subscription.plan = prevPlan;
            user.subscription.validUntil = user.previousValidUntil !== undefined ? user.previousValidUntil : (user.previousSubscription ? user.previousSubscription.validUntil : null);
            user.subscription.approved = user.previousApproved !== undefined ? user.previousApproved : true;
            if (user.previousSubscription?.freePlanUsed !== undefined) {
              user.subscription.freePlanUsed = user.previousSubscription.freePlanUsed;
            }
          } else {
            user.subscription.plan = "none";
            user.subscription.validUntil = null;
          }
        }
      }
    }

    const trialDays = await getFreeTrialDays();
    if (plan !== undefined) {
      if (plan === "inativo") {
        if (user.subscription.plan !== "inativo") {
          user.previousPlan = user.subscription.plan || "none";
          user.previousValidUntil = user.subscription.validUntil || null;
          user.previousApproved = user.subscription.approved !== undefined ? user.subscription.approved : true;
          user.previousSubscription = { ...user.subscription };
        }
        user.isBlocked = true;
        user.subscription.plan = "inativo";
      } else {
        user.isBlocked = false;
        user.subscription.plan = plan;
        let validUntil = null;
        if (plan === "gratis") {
          validUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
          user.subscription.freePlanUsed = true;
        } else if (plan === "mensal") {
          validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan === "anual") {
          validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan === "livre" || plan === "none") {
          validUntil = null;
        }
        user.subscription.validUntil = validUntil;
        user.subscription.selectedAt = new Date().toISOString();
        user.subscription.approved = true;
      }

      addSubscriptionHistoryEntry(user, {
        plan: user.subscription.plan,
        validUntil: user.subscription.validUntil,
        source: 'administrador',
        status: user.isBlocked ? 'Inativo' : 'Ativo',
        description: `Plano ajustado para "${user.subscription.plan}" pelo administrador`
      });
    }

    normalizeUserSubscription(user, trialDays);
    await saveUser(user);
    invalidateUserCache(lowerTargetEmail);
    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: isBlocked === true ? "ADMIN_BLOCK_USER" : isBlocked === false ? "ADMIN_UNBLOCK_USER" : "ADMIN_EDIT_USER",
      entity: "users",
      status: "success",
      req,
      details: { plan: user.subscription?.plan, role: user.role, isBlocked: !!user.isBlocked }
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin edit-user error:", err);
    res.status(503).json({ error: "Erro ao atualizar usuário no Supabase." });
  }
});

// Admin extends user subscription expiration date (Estender Prazo)
app.post("/api/admin/extend-subscription", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail, newValidUntil, plan } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail do usuário obrigatório." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    const user = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (!user.subscription) {
      user.subscription = {
        plan: (plan && plan !== "unchanged" && plan !== "none" && plan !== "inativo") ? plan : "mensal",
        validUntil: newValidUntil ? new Date(newValidUntil).toISOString() : null,
        selectedAt: new Date().toISOString(),
        freePlanUsed: false,
        approved: true
      };
    } else {
      if (plan && plan !== "unchanged" && plan !== "none") {
        user.subscription.plan = plan;
      } else if (user.subscription.plan === "none" || user.subscription.plan === "inativo") {
        user.subscription.plan = "mensal";
      }
      user.subscription.validUntil = newValidUntil ? new Date(newValidUntil).toISOString() : null;
      user.subscription.approved = true;
    }

    if (user.subscription.plan !== "inativo") {
      user.isBlocked = false;
    }

    addSubscriptionHistoryEntry(user, {
      plan: user.subscription.plan,
      validUntil: user.subscription.validUntil,
      source: 'administrador',
      status: 'Ativo',
      description: newValidUntil
        ? `Prazo estendido pelo administrador até ${new Date(newValidUntil).toLocaleDateString('pt-BR')}`
        : 'Prazo estendido pelo administrador'
    });

    normalizeUserSubscription(user);
    await saveUser(user);
    invalidateUserCache(lowerTargetEmail);
    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: "ADMIN_EXTEND_SUBSCRIPTION",
      entity: "subscriptions",
      status: "success",
      req,
      details: { plan: user.subscription?.plan, validUntil: user.subscription?.validUntil }
    });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error("Admin extend-subscription error:", err);
    res.status(503).json({ error: err.message || "Erro interno ao estender prazo da assinatura." });
  }
});

// Admin saves user custom message directly and persistently
app.post("/api/admin/save-user-message", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail, userMessage, mensagemUsuario } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail de destino obrigatório." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    const messageToSave = userMessage !== undefined ? userMessage : (mensagemUsuario !== undefined ? mensagemUsuario : '');
    await saveUserMessageToDatabase(lowerTargetEmail, messageToSave);

    res.json({ success: true, message: "Mensagem do usuário gravada no banco de dados com sucesso!" });
  } catch (err) {
    console.error("Admin save-user-message error:", err);
    res.status(503).json({ error: "Erro ao salvar mensagem no Supabase." });
  }
});

// Admin retrieves target user's password status (Admin only)
app.get("/api/admin/retrieve-password/:targetEmail", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const targetEmail = req.params.targetEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(targetEmail, { bypassCache: true, throwOnError: true });
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    return res.json({
      protected: true,
      message: "Por segurança, nenhuma senha é retornada pela API. Utilize 'Editar Usuário' para definir uma nova senha."
    });
  } catch (err) {
    console.error("Admin retrieve-password error:", err);
    res.status(503).json({ error: "Erro ao consultar banco de dados." });
  }
});

// Admin views target user's direct financial records / lists (for administrative audit)
app.get("/api/admin/user-details/:userEmail", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const targetEmail = req.params.userEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(targetEmail, { bypassCache: true, throwOnError: true });
    const targetUserData = await getUserDataByEmail(targetEmail, { bypassCache: true, throwOnError: true });
    const { password: _, ...safeUserProfile } = targetUser || {};

    res.json({
      userData: targetUserData || {},
      userProfile: targetUser ? safeUserProfile : null,
      lastAccess: targetUser?.lastAccess || targetUserData?.lastUpdated || targetUser?.createdAt || null,
      createdAt: targetUser?.createdAt || null
    });
  } catch (err) {
    console.error("Admin user-details error:", err);
    res.status(503).json({ error: "Erro ao consultar detalhes do usuário no Supabase." });
  }
});

// Admin deletes user and all of their data (Admin only)
app.post("/api/admin/delete-user", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail do usuário não informado." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    if (lowerTargetEmail === adminUser.email.toLowerCase().trim()) {
      return res.status(400).json({ error: "Você não pode excluir o seu próprio usuário." });
    }

    const targetUser = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (targetUser?.cpf) {
      await recordTrialHistory(lowerTargetEmail, targetUser.cpf);
    }

    const supabase = requireSupabase();
    const tablesToClear = [
      'subscriptions', 'profiles', 'users', 'receipt_types', 'receipt_statuses',
      'payment_types', 'payment_statuses', 'income_categories', 'expense_categories',
      'incomes', 'expenses', 'annual_planning', 'shopping_list', 'action_plans',
      'deficit_actions', 'trips', 'wishes', 'investments', 'investment_types',
      'investment_statuses', 'user_data', 'trash_items', 'user_backups'
    ];

    const deleteResults = await Promise.all(
      tablesToClear.map(async (tbl) => ({
        table: tbl,
        res: await supabase.from(tbl).delete().eq('email', lowerTargetEmail)
      }))
    );

    const fatalErr = deleteResults.find(r => r.res.error && !isMissingTableOrColumnError(r.res.error));
    if (fatalErr) {
      throw new Error(`Erro ao excluir registros em ${fatalErr.table}: ${fatalErr.res.error.message}`);
    }

    invalidateUserCache(lowerTargetEmail);
    invalidateUserDataCache(lowerTargetEmail);
    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: "ADMIN_DELETE_USER",
      entity: "users",
      status: "success",
      req
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete-user error:", err);
    res.status(503).json({ error: "Erro ao excluir usuário no Supabase." });
  }
});

// Admin Audit Logs viewer (reads audit_logs gracefully even if table not yet created in Supabase)
app.get("/api/admin/audit-logs", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const supabase = requireSupabase();
    const actionFilter = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const emailFilter = sanitizePostgrestEmailFilter(req.query.email);
    const rawLimit = Number(req.query.limit || 150);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 10), 500) : 150;

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }
    if (emailFilter) {
      query = query.or(`actor_email.ilike.%${emailFilter}%,target_email.ilike.%${emailFilter}%`);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return res.json({ logs: [], tableMissing: true });
      }
      throw error;
    }

    res.json({ logs: data || [], tableMissing: false });
  } catch (err) {
    console.error("Admin audit-logs error:", err);
    res.status(503).json({ error: "Erro ao consultar logs de auditoria no Supabase." });
  }
});

// ---------------- ADMIN USER BACKUPS (LAST 3 DAYS) ----------------

// List all user backups within strictly the last 3 days (without heavy snapshot payloads)
app.get("/api/admin/user-backups", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const supabase = requireSupabase();
    const emailFilter = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    const triggerFilter = typeof req.query.triggerType === "string" ? req.query.triggerType.trim() : "";
    const searchFilter = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const cutoffIso = new Date(Date.now() - BACKUP_RETENTION_MS).toISOString();

    // Auto-purge expired backups older than 3 days
    const { error: purgeErr } = await supabase
      .from("user_backups")
      .delete()
      .lt("created_at", cutoffIso);

    if (purgeErr) {
      if (isMissingTableOrColumnError(purgeErr)) {
        return res.json({ backups: [], tableMissing: true, retentionDays: BACKUP_RETENTION_DAYS });
      }
      throw new Error(purgeErr.message);
    }

    const [backupsRes, usersList] = await Promise.all([
      fetchAllPaginatedRows(
        (from, to) => {
          let q = supabase
            .from("user_backups")
            .select("id, email, trigger_type, summary, created_at, expires_at")
            .gte("created_at", cutoffIso);
          if (emailFilter) {
            q = q.eq("email", emailFilter);
          }
          if (triggerFilter) {
            q = q.eq("trigger_type", triggerFilter);
          }
          return q.order("created_at", { ascending: false }).range(from, to);
        },
        "adminUserBackups:list"
      ),
      getAllUsersList().catch(() => [])
    ]);

    if (backupsRes.error) {
      if (isMissingTableOrColumnError(backupsRes.error)) {
        return res.json({ backups: [], tableMissing: true, retentionDays: BACKUP_RETENTION_DAYS });
      }
      throw new Error(backupsRes.error.message);
    }

    const userNameMap = new Map<string, string>();
    for (const u of usersList || []) {
      const e = String(u?.email || "").toLowerCase().trim();
      if (e) userNameMap.set(e, String(u?.name || "").trim());
    }

    let backups = (backupsRes.data || [])
      .filter((row: any) => isWithinBackupRestoreWindow(row.created_at))
      .map((row: any) => {
        const email = String(row.email || "").toLowerCase().trim();
        return {
          id: row.id,
          email,
          userName: userNameMap.get(email) || email.split("@")[0] || "Usuário",
          triggerType: row.trigger_type || "auto",
          summary: row.summary || summarizeUserDataSnapshot(null),
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        };
      });

    if (searchFilter) {
      backups = backups.filter(
        (b: any) =>
          b.email.toLowerCase().includes(searchFilter) ||
          b.userName.toLowerCase().includes(searchFilter)
      );
    }

    res.json({
      backups,
      tableMissing: false,
      retentionDays: BACKUP_RETENTION_DAYS,
    });
  } catch (err) {
    console.error("Admin list user backups error:", err);
    res.status(503).json({ error: "Erro ao consultar backups dos usuários no Supabase." });
  }
});

// Get full details & snapshot payload of a specific backup (for inspect/preview or JSON download)
app.get("/api/admin/user-backups/:backupId", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const backupId = String(req.params.backupId || "").trim();
  if (!backupId) {
    return res.status(400).json({ error: "Identificador do backup inválido." });
  }

  try {
    const supabase = requireSupabase();
    const { data: row, error } = await supabase
      .from("user_backups")
      .select("*")
      .eq("id", backupId)
      .maybeSingle();

    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return res.status(400).json({ error: "Tabela user_backups ainda não criada no Supabase." });
      }
      throw new Error(error.message);
    }

    if (!row) {
      return res.status(404).json({ error: "Backup não encontrado." });
    }

    if (!isWithinBackupRestoreWindow(row.created_at)) {
      await supabase.from("user_backups").delete().eq("id", backupId);
      return res.status(410).json({ error: `O prazo de ${BACKUP_RETENTION_DAYS} dias deste backup expirou.` });
    }

    const targetEmail = String(row.email || "").toLowerCase().trim();
    const targetUser = await getUserByEmail(targetEmail, { bypassCache: false }).catch(() => null);

    res.json({
      backup: {
        id: row.id,
        email: targetEmail,
        userName: targetUser?.name || targetEmail.split("@")[0] || "Usuário",
        triggerType: row.trigger_type || "auto",
        summary: row.summary || summarizeUserDataSnapshot(row.snapshot),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        snapshot: row.snapshot || getEmptyUserData(),
      }
    });
  } catch (err) {
    console.error("Admin get user backup detail error:", err);
    res.status(503).json({ error: "Erro ao carregar conteúdo do backup." });
  }
});

// Create manual backup snapshot now (for a specific user or all users with data)
app.post("/api/admin/user-backups/create", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const { targetEmail, allUsers } = req.body || {};

  try {
    const supabase = requireSupabase();

    if (allUsers) {
      const usersList = await getAllUsersList();
      let createdCount = 0;
      let skippedEmptyCount = 0;
      let tableMissing = false;

      for (const u of usersList) {
        const lowerEmail = String(u?.email || "").toLowerCase().trim();
        if (!lowerEmail) continue;
        const data = await getUserDataByEmail(lowerEmail, { bypassCache: true, throwOnError: true });
        const result = await createUserBackupSnapshot(supabase, lowerEmail, data, "manual", {
          respectThrottle: false,
          allowEmpty: false
        });
        if (result.tableMissing) {
          tableMissing = true;
          break;
        }
        if (result.created) {
          createdCount++;
        } else {
          skippedEmptyCount++;
        }
      }

      if (tableMissing) {
        return res.status(400).json({
          error: "Tabela user_backups ainda não criada no Supabase. Execute o Script Diferencial Seguro na aba Conexão."
        });
      }

      await logAuditEvent({
        actorEmail: adminUser.email,
        action: "ADMIN_BACKUP_CREATED_ALL",
        entity: "user_backups",
        status: "success",
        req,
        details: { createdCount, skippedEmptyCount }
      });

      return res.json({
        success: true,
        createdCount,
        skippedEmptyCount,
        message: createdCount > 0
          ? `Backup gerado para ${createdCount} usuário(s) com registros${skippedEmptyCount > 0 ? ` (${skippedEmptyCount} conta(s) vazia(s) ignorada(s))` : ""}.`
          : "Nenhum usuário com registros financeiros encontrado para backup."
      });
    }

    const lowerTargetEmail = String(targetEmail || "").toLowerCase().trim();
    if (!lowerTargetEmail) {
      return res.status(400).json({ error: "Selecione um usuário ou escolha gerar para todos." });
    }

    const targetUser = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const currentData = await getUserDataByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    const result = await createUserBackupSnapshot(supabase, lowerTargetEmail, currentData, "manual", {
      respectThrottle: false,
      allowEmpty: true
    });

    if (result.tableMissing) {
      return res.status(400).json({
        error: "Tabela user_backups ainda não criada no Supabase. Execute o Script Diferencial Seguro na aba Conexão."
      });
    }

    if (!result.created) {
      return res.status(503).json({ error: "Não foi possível gravar o backup do usuário." });
    }

    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: "ADMIN_BACKUP_CREATED",
      entity: "user_backups",
      status: "success",
      req,
      details: { backupId: result.backupId }
    });

    res.json({
      success: true,
      backupId: result.backupId,
      message: `Backup manual de ${targetUser.name || lowerTargetEmail} gerado com sucesso!`
    });
  } catch (err) {
    console.error("Admin create user backup error:", err);
    res.status(503).json({ error: "Erro ao gerar backup dos dados no Supabase." });
  }
});

// Restore a specific user backup from the last 3 days
app.post("/api/admin/user-backups/restore", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const { backupId } = req.body || {};
  if (!backupId || typeof backupId !== "string") {
    return res.status(400).json({ error: "Identificador do backup inválido." });
  }

  try {
    const supabase = requireSupabase();
    const { data: backupRow, error: fetchErr } = await supabase
      .from("user_backups")
      .select("*")
      .eq("id", backupId.trim())
      .maybeSingle();

    if (fetchErr) {
      if (isMissingTableOrColumnError(fetchErr)) {
        return res.status(400).json({ error: "Tabela user_backups ainda não criada no Supabase." });
      }
      throw new Error(fetchErr.message);
    }

    if (!backupRow) {
      return res.status(404).json({ error: "Backup selecionado não encontrado." });
    }

    if (!isWithinBackupRestoreWindow(backupRow.created_at)) {
      await supabase.from("user_backups").delete().eq("id", backupId.trim());
      return res.status(410).json({
        error: `O prazo de ${BACKUP_RETENTION_DAYS} dias para restaurar este backup expirou.`
      });
    }

    const lowerTargetEmail = String(backupRow.email || "").toLowerCase().trim();
    const targetUser = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (!targetUser) {
      return res.status(404).json({ error: "A conta de usuário associada a este backup não existe mais." });
    }

    const baseEmpty = getEmptyUserData();
    const rawSnapshot = backupRow.snapshot && typeof backupRow.snapshot === "object" ? backupRow.snapshot : {};
    const normalizedCandidate: Record<string, any> = { ...baseEmpty };
    for (const key of Object.keys(baseEmpty)) {
      if (Array.isArray(rawSnapshot[key])) {
        normalizedCandidate[key] = rawSnapshot[key];
      }
    }

    const retentionResult = applyThreeYearRetention(normalizedCandidate);
    const restoredSummary = summarizeUserDataSnapshot(retentionResult.prunedData);

    await withUserWriteLock(lowerTargetEmail, async () => {
      const currentData = await getUserDataByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
      await createUserBackupSnapshot(supabase, lowerTargetEmail, currentData, "pre_restore", {
        respectThrottle: false,
        allowEmpty: true
      });

      await saveUserDataByEmail(
        lowerTargetEmail,
        retentionResult.prunedData,
        undefined,
        currentData?._version,
        { skipTrash: true, skipAutoBackup: true, previousData: currentData }
      );
      invalidateUserDataCache(lowerTargetEmail);
    });

    await logAuditEvent({
      actorEmail: adminUser.email,
      targetEmail: lowerTargetEmail,
      action: "ADMIN_BACKUP_RESTORED",
      entity: "user_backups",
      status: "success",
      req,
      details: {
        backupId: backupRow.id,
        backupCreatedAt: backupRow.created_at,
        triggerType: backupRow.trigger_type,
        restoredSummary,
        removedOlderThanThreeYears: retentionResult.totalRemoved,
      }
    });

    res.json({
      success: true,
      restoredEmail: lowerTargetEmail,
      userName: targetUser.name || lowerTargetEmail,
      backupCreatedAt: backupRow.created_at,
      removedOlderThanThreeYears: retentionResult.totalRemoved,
      summary: restoredSummary,
      message: `Backup de ${targetUser.name || lowerTargetEmail} (${new Date(backupRow.created_at).toLocaleString("pt-BR")}) restaurado com sucesso!`
    });
  } catch (err) {
    console.error("Admin restore user backup error:", err);
    res.status(503).json({ error: "Erro ao restaurar backup do usuário no Supabase." });
  }
});

// Delete a specific backup snapshot manually (Admin only)
app.delete("/api/admin/user-backups/:backupId", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const backupId = String(req.params.backupId || "").trim();
  if (!backupId) {
    return res.status(400).json({ error: "Identificador inválido." });
  }

  try {
    const supabase = requireSupabase();
    const { error } = await supabase.from("user_backups").delete().eq("id", backupId);
    if (error && !isMissingTableOrColumnError(error)) {
      throw new Error(error.message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete user backup error:", err);
    res.status(503).json({ error: "Erro ao remover registro de backup." });
  }
});

// Admin triggers password reminder / reset guidance (Admin only, without leaking secrets in logs)
app.post("/api/admin/send-password-email", async (req, res) => {
  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail do usuário não informado." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(lowerTargetEmail, { bypassCache: true, throwOnError: true });
    if (!targetUser) {
      return res.status(404).json({ error: "O e-mail digitado é diferente do e-mail cadastrado na conta ou não existe no banco de dados." });
    }

    if (typeof targetUser.password === "string" && targetUser.password.startsWith("scrypt$")) {
      return res.status(400).json({
        error: "A senha deste usuário está protegida com criptografia irreversível. Utilize 'Editar Usuário' para definir uma nova senha temporária."
      });
    }

    res.json({
      success: true,
      message: `Não há servidor SMTP configurado nesta instância. Como esta conta ainda possui senha legada, recomenda-se redefinir a senha em 'Editar Usuário' para ativar a criptografia.`
    });
  } catch (err) {
    console.error("Admin send-password-email error:", err);
    res.status(503).json({ error: "Erro ao consultar dados no Supabase." });
  }
});

// Serve static assets in production, hook Vite dev middleware in development
async function startServer() {
  // Pré-carregamento leve apenas de configurações globais no Supabase (sem db.json local)
  Promise.all([
    getHomeNotices(),
    getPlanPrices(),
    getFreeTrialDays()
  ]).catch(e => console.warn("[Supabase] Falha inicial ao consultar configurações globais:", e?.message || e));

  // Explicit static serving for public folder icons and PWA assets
  const publicDir = path.join(process.cwd(), "public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Explicit route handlers for favicon and app icons
  app.get(["/favicon.ico", "/favo.ico"], (req, res) => {
    const fileName = req.path.includes("favo.ico") ? "favo.ico" : "favicon.ico";
    const icoPath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(icoPath)) {
      res.setHeader("Content-Type", "image/x-icon");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(icoPath);
    }
    const pngPath = path.join(process.cwd(), "public", "favicon.png");
    if (fs.existsSync(pngPath)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(pngPath);
    }
    res.status(404).end();
  });

  app.get(["/favicon.png", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/logo.png", "/logo_oficial_finanfly.png"], (req, res) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(filePath);
    }
    const fallbackPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(fallbackPath)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(fallbackPath);
    }
    res.status(404).end();
  });

  app.get(["/favicon.svg", "/logo_master.svg"], (req, res) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/svg+xml");
      return res.sendFile(filePath);
    }
    res.status(404).end();
  });

  // Global Express Error Handler for /api routes (evita vazamento de stack trace e registra 5xx)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = Number(err?.status || err?.statusCode || 500);
    if (status >= 500) {
      console.error(`[API Error] ${req.method} ${req.path}:`, err?.message || err);
    }
    if (req.path.startsWith("/api")) {
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: status === 413
          ? "Tamanho da requisição excede o limite permitido."
          : "Erro interno temporário no servidor. Tente novamente em instantes.",
      });
    }
    return next(err);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const cwdDist = path.join(process.cwd(), "dist");
    const distPath = fs.existsSync(path.join(cwdDist, "index.html")) ? cwdDist : _dirname;
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const runExpiredMaintenanceCleanup = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const nowIso = new Date().toISOString();
    let cleaned = 0;
    try {
      const { data: trashDel } = await client
        .from("trash_items")
        .delete()
        .lt("expires_at", nowIso)
        .select("id");
      if (Array.isArray(trashDel)) cleaned += trashDel.length;
    } catch {
      // ignora silenciosamente se tabela ainda não existir
    }
    try {
      const { data: bkpDel } = await client
        .from("user_backups")
        .delete()
        .lt("expires_at", nowIso)
        .select("id");
      if (Array.isArray(bkpDel)) cleaned += bkpDel.length;
    } catch {
      // ignora silenciosamente se tabela ainda não existir
    }
    try {
      const { data: resetRows } = await client
        .from("system_settings")
        .select("key, value")
        .like("key", `${PASSWORD_RESET_SETTING_PREFIX}%`)
        .limit(100);
      const expiredResetKeys = (resetRows || [])
        .filter((r: any) => !isPasswordResetTokenActive(r?.value))
        .map((r: any) => r.key);
      if (expiredResetKeys.length > 0) {
        await client.from("system_settings").delete().in("key", expiredResetKeys);
        cleaned += expiredResetKeys.length;
      }
    } catch {
      // ignora silenciosamente
    }
    healthMonitor.recordMaintenanceRun(cleaned);
  };

  setTimeout(() => {
    void runExpiredMaintenanceCleanup();
  }, 45_000).unref();
  setInterval(() => {
    void runExpiredMaintenanceCleanup();
  }, 6 * 60 * 60 * 1000).unref();

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  const handleGracefulShutdown = (signal: string) => {
    console.log(`[Shutdown] Sinal ${signal} recebido. Encerrando servidor HTTP com segurança...`);
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8000).unref();
  };

  process.once("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => handleGracefulShutdown("SIGINT"));
}

startServer();
