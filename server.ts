import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { DATABASE_SCHEMA_CATALOG, generateSafeSchemaScripts } from "./src/lib/databaseCatalog";

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
    clean.includes("insira") ||
    clean.includes("your_") ||
    clean.includes("placeholder") ||
    clean.includes("aqui") ||
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

app.use(express.json({ limit: "5mb" }));

import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let lastTestedKey: string = "";
let isSupabaseKeyInvalid: boolean = false;
let invalidKeyMarkedAt: number = 0;

function markSupabaseKeyAsInvalid(reason?: string) {
  const now = Date.now();
  if (!isSupabaseKeyInvalid || (now - invalidKeyMarkedAt > 15000)) {
    isSupabaseKeyInvalid = true;
    invalidKeyMarkedAt = now;
    supabaseClient = null;
    console.error(`[Supabase Erro] A chave do Supabase é inválida ou expirou${reason ? ` (${reason})` : ""}. Configure SUPABASE_URL e SUPABASE_ANON_KEY válidas nas variáveis de ambiente.`);
  }
}

function getSupabaseClient() {
  const rawUrl = process.env.SUPABASE_URL || process.env.supabase_url || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.supabase_anon_key || process.env.supabase_key || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Banco de dados Supabase não configurado ou indisponível no momento.");
  }
  return client;
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
  }
) {
  if (!user) return;
  if (!user.subscriptionHistory || !Array.isArray(user.subscriptionHistory)) {
    user.subscriptionHistory = [];
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

  const item = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    plan: entry.plan,
    createdAt: nowIso,
    validUntil: entry.validUntil,
    source: entry.source || 'sistema',
    status: entry.status || 'Ativo',
    description: entry.description || '',
    price: entry.price || ''
  };

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
// Default Configuration Items per New User
// ==========================================
const DEFAULT_RECEIPT_TYPES = [
  'Pix',
  'Transferência Bancária',
  'Dinheiro',
  'Boleto',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Outros'
];

const DEFAULT_PAYMENT_TYPES = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Dinheiro',
  'Transferência Bancária',
  'Débito Automático',
  'Outros'
];

const DEFAULT_RECEIPT_STATUSES = [
  'Recebido',
  'Pendente',
  'Cancelado',
  'Atrasado'
];

const DEFAULT_PAYMENT_STATUSES = [
  'Pago',
  'Pendente',
  'Atrasado',
  'Cancelado'
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salário',
  'Investimentos',
  'Freelance / Extra',
  'Aluguel Recebido',
  'Bônus / Comissões',
  'Outros'
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Alimentação',
  'Limpeza',
  'Frutas/Verduras',
  'Açougue',
  'Aluguel',
  'Combustível',
  'Educação',
  'Lazer',
  'Impostos',
  'Manutenção casa',
  'Ajuda pessoas',
  'Reserva de emergência',
  'Investimentos'
];

const DEFAULT_INVESTMENT_TYPES = [
  'Ações',
  'Fundos Imobiliários (FIIs)',
  'Renda Fixa',
  'CDB / LCI / LCA',
  'Tesouro Direto',
  'Criptomoedas',
  'Previdência Privada',
  'Outros'
];

const DEFAULT_INVESTMENT_STATUSES = [
  'Ativo',
  'Resgatado',
  'Em Andamento',
  'Pendente',
  'Cancelado'
];

function getDefaultUserData() {
  return {
    receiptTypes: [...DEFAULT_RECEIPT_TYPES],
    paymentTypes: [...DEFAULT_PAYMENT_TYPES],
    receiptStatuses: [...DEFAULT_RECEIPT_STATUSES],
    paymentStatuses: [...DEFAULT_PAYMENT_STATUSES],
    incomeCategories: [...DEFAULT_INCOME_CATEGORIES],
    expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    investmentTypes: [...DEFAULT_INVESTMENT_TYPES],
    investmentStatuses: [...DEFAULT_INVESTMENT_STATUSES],
    incomes: [],
    expenses: [],
    investments: [],
    trips: [],
    wishes: [],
    shoppingList: [],
    actionPlans: [],
    deficitActions: [],
    annualPlanning: [
      {
        year: 2026,
        monthlyBudgets: Array.from({ length: 12 }, (_, i) => ({
          month: i,
          incomeBudget: 0,
          expenseBudget: 0
        }))
      }
    ]
  };
}

function ensureUserHasDefaults(data: any) {
  if (!data) return getDefaultUserData();

  return {
    ...data,
    receiptTypes: (data.receiptTypes && data.receiptTypes.length > 0) ? data.receiptTypes : [...DEFAULT_RECEIPT_TYPES],
    paymentTypes: (data.paymentTypes && data.paymentTypes.length > 0) ? data.paymentTypes : [...DEFAULT_PAYMENT_TYPES],
    receiptStatuses: (data.receiptStatuses && data.receiptStatuses.length > 0) ? data.receiptStatuses : [...DEFAULT_RECEIPT_STATUSES],
    paymentStatuses: (data.paymentStatuses && data.paymentStatuses.length > 0) ? data.paymentStatuses : [...DEFAULT_PAYMENT_STATUSES],
    incomeCategories: (data.incomeCategories && data.incomeCategories.length > 0) ? data.incomeCategories : [...DEFAULT_INCOME_CATEGORIES],
    expenseCategories: (data.expenseCategories && data.expenseCategories.length > 0) ? data.expenseCategories : [...DEFAULT_EXPENSE_CATEGORIES],
    investmentTypes: (data.investmentTypes && data.investmentTypes.length > 0) ? data.investmentTypes : [...DEFAULT_INVESTMENT_TYPES],
    investmentStatuses: (data.investmentStatuses && data.investmentStatuses.length > 0) ? data.investmentStatuses : [...DEFAULT_INVESTMENT_STATUSES],
    incomes: data.incomes || [],
    expenses: data.expenses || [],
    investments: data.investments || [],
    trips: data.trips || [],
    wishes: data.wishes || [],
    shoppingList: data.shoppingList || [],
    actionPlans: data.actionPlans || [],
    deficitActions: data.deficitActions || [],
    annualPlanning: (data.annualPlanning && data.annualPlanning.length > 0) ? data.annualPlanning : [
      {
        year: 2026,
        monthlyBudgets: Array.from({ length: 12 }, (_, i) => ({
          month: i,
          incomeBudget: 0,
          expenseBudget: 0
        }))
      }
    ]
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
  return Boolean(res && res.error && !isMissingTableOrColumnError(res.error));
}

function pickNonEmptyArray(primary: any[] | null | undefined, ...fallbacks: Array<any[] | null | undefined>): any[] {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  for (const fb of fallbacks) {
    if (Array.isArray(fb) && fb.length > 0) return fb;
  }
  return Array.isArray(primary) ? primary : [];
}

// Get user workspace data exclusively from Supabase with error-safe fallback to user_data backup
async function getUserDataByEmail(
  email: string,
  options: boolean | { bypassCache?: boolean; throwOnError?: boolean } = false
): Promise<any> {
  const bypassCache = typeof options === 'boolean' ? options : Boolean(options?.bypassCache);
  const throwOnError = typeof options === 'boolean' ? false : Boolean(options?.throwOnError);

  const lowerEmail = email.toLowerCase().trim();
  const supabase = requireSupabase();

  const cached = userDataCache.get(lowerEmail);
  if (!bypassCache && cached && cached.data && (Date.now() - cached.timestamp < 30000)) {
    return cached.data;
  }

  try {
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
        supabase.from('receipt_types').select('name').eq('email', lowerEmail),
        supabase.from('receipt_statuses').select('name').eq('email', lowerEmail),
        supabase.from('payment_types').select('name').eq('email', lowerEmail),
        supabase.from('payment_statuses').select('name').eq('email', lowerEmail),
        supabase.from('income_categories').select('name').eq('email', lowerEmail),
        supabase.from('expense_categories').select('name').eq('email', lowerEmail),
        supabase.from('incomes').select('*').eq('email', lowerEmail).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('email', lowerEmail).order('date', { ascending: false }),
        supabase.from('annual_planning').select('*').eq('email', lowerEmail),
        supabase.from('shopping_list').select('*').eq('email', lowerEmail),
        supabase.from('action_plans').select('*').eq('email', lowerEmail).order('target_date', { ascending: true }),
        supabase.from('deficit_actions').select('*').eq('email', lowerEmail).order('date', { ascending: false }),
        supabase.from('trips').select('*').eq('email', lowerEmail),
        supabase.from('wishes').select('*').eq('email', lowerEmail),
        supabase.from('investments').select('*').eq('email', lowerEmail),
        supabase.from('investment_types').select('name').eq('email', lowerEmail),
        supabase.from('investment_statuses').select('name').eq('email', lowerEmail),
        supabase.from('user_data').select('data').eq('email', lowerEmail).maybeSingle()
      ]);
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_USER_DATA')), 25000));
      return Promise.race([queryPromise, timeoutPromise]);
    }, `getUserDataByEmail:${lowerEmail}`);

    const relationMissing = [pTypesRes, incomesRes, expensesRes].some(res => res.error && isMissingTableOrColumnError(res.error));

    if (relationMissing) {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('email', lowerEmail)
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao ler fallback user_data no Supabase: ${error.message || error.code}`);
      }
      if (data && data.data) {
        const completedData = ensureUserHasDefaults(data.data);
        userDataCache.set(lowerEmail, { data: completedData, timestamp: Date.now() });
        return completedData;
      }

      const freshDefault = getDefaultUserData();
      userDataCache.set(lowerEmail, { data: freshDefault, timestamp: Date.now() });
      return freshDefault;
    }

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

    const coreTables = new Set([
      'payment_types',
      'payment_statuses',
      'income_categories',
      'expense_categories',
      'incomes',
      'expenses'
    ]);

    const failedEntries = queryChecks.filter(([, r]) => hasSupabaseQueryError(r));
    const failedTables = failedEntries.map(([name]) => name);
    const coreFailedTables = failedEntries.filter(([name]) => coreTables.has(name)).map(([name]) => name);
    const backupError = hasSupabaseQueryError(backupUserDataRes);
    const backupData = !backupError ? backupUserDataRes?.data?.data : null;

    if (failedEntries.length > 0) {
      const details = failedEntries
        .map(([name, r]) => `${name}: [${r?.error?.code || 'ERR'}] ${r?.error?.message || 'Erro desconhecido'}`)
        .join(' | ');
      console.warn(`[getUserDataByEmail] Erros parciais ao consultar Supabase para ${lowerEmail}:`, details);
      if (throwOnError && (coreFailedTables.length > 0 || failedEntries.length === queryChecks.length) && !backupData && !cached?.data) {
        throw new Error(`Falha ao consultar tabelas principais no Supabase (${(coreFailedTables.length > 0 ? coreFailedTables : failedTables).join(', ')}).`);
      }
    }

    const resolveNameList = (res: any, backupArr: any, cacheArr: any, defaultArr: string[]): string[] => {
      if (!hasSupabaseQueryError(res) && Array.isArray(res?.data) && res.data.length > 0) {
        return res.data.map((r: any) => r.name);
      }
      const recovered = pickNonEmptyArray(backupArr, hasSupabaseQueryError(res) ? cacheArr : undefined);
      if (recovered.length > 0) {
        return recovered;
      }
      return [...defaultArr];
    };

    const resolveEntityList = <T>(res: any, mapper: (r: any) => T, backupArr: any, cacheArr: any): T[] => {
      if (!hasSupabaseQueryError(res) && Array.isArray(res?.data)) {
        if (res.data.length > 0) {
          return res.data.map(mapper);
        }
        if (Array.isArray(backupArr) && backupArr.length > 0) {
          return backupArr;
        }
        return [];
      }
      return pickNonEmptyArray(backupArr, cacheArr);
    };

    const mappedExpenses = resolveEntityList(
      expensesRes,
      (r: any) => {
        const backupExp = backupData?.expenses?.find((b: any) => b.id === r.id);
        const rawClass = (backupExp && backupExp.classification !== undefined && backupExp.classification !== null && backupExp.classification !== '')
          ? backupExp.classification
          : (r.classification !== undefined && r.classification !== null && r.classification !== '')
          ? r.classification
          : (r.classificacao !== undefined && r.classificacao !== null && r.classificacao !== '')
          ? r.classificacao
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

    const resolvedAnnual = (!hasSupabaseQueryError(annualRes) && Array.isArray(annualRes?.data) && annualRes.data.length > 0)
      ? annualRes.data.map((r: any) => ({ year: r.year, monthlyBudgets: r.monthly_budgets }))
      : pickNonEmptyArray(
          backupData?.annualPlanning,
          hasSupabaseQueryError(annualRes) ? cached?.data?.annualPlanning : undefined
        );

    const responseData: any = {
      receiptTypes: resolveNameList(rTypesRes, backupData?.receiptTypes, cached?.data?.receiptTypes, DEFAULT_RECEIPT_TYPES),
      receiptStatuses: resolveNameList(rStatusesRes, backupData?.receiptStatuses, cached?.data?.receiptStatuses, DEFAULT_RECEIPT_STATUSES),
      paymentTypes: resolveNameList(pTypesRes, backupData?.paymentTypes, cached?.data?.paymentTypes, DEFAULT_PAYMENT_TYPES),
      paymentStatuses: resolveNameList(pStatusesRes, backupData?.paymentStatuses, cached?.data?.paymentStatuses, DEFAULT_PAYMENT_STATUSES),
      incomeCategories: resolveNameList(incCatsRes, backupData?.incomeCategories, cached?.data?.incomeCategories, DEFAULT_INCOME_CATEGORIES),
      expenseCategories: resolveNameList(expCatsRes, backupData?.expenseCategories, cached?.data?.expenseCategories, DEFAULT_EXPENSE_CATEGORIES),
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
      annualPlanning: resolvedAnnual.length > 0
        ? resolvedAnnual
        : [
            {
              year: 2026,
              monthlyBudgets: Array.from({ length: 12 }, (_, i) => ({
                month: i,
                incomeBudget: 0,
                expenseBudget: 0
              }))
            }
          ],
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
      investmentTypes: resolveNameList(invTypesRes, backupData?.investmentTypes, cached?.data?.investmentTypes, DEFAULT_INVESTMENT_TYPES),
      investmentStatuses: resolveNameList(invStatusesRes, backupData?.investmentStatuses, cached?.data?.investmentStatuses, DEFAULT_INVESTMENT_STATUSES)
    };

    const finalResponse = ensureUserHasDefaults(responseData);

    if (failedTables.length === 0 || backupData) {
      userDataCache.set(lowerEmail, { data: finalResponse, timestamp: Date.now() });
    }

    return finalResponse;
  } catch (err: any) {
    console.warn("Erro ao ler dados relacionais no Supabase:", err?.message || err);

    if (!bypassCache && cached && cached.data) {
      return cached.data;
    }

    try {
      const backupRowPromise = supabase.from('user_data').select('data').eq('email', lowerEmail).maybeSingle();
      const backupTimeout = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_BACKUP')), 5000));
      const { data: backupRow, error: backupErr } = await Promise.race([backupRowPromise, backupTimeout]);
      if (!backupErr && backupRow && backupRow.data) {
        const completedData = ensureUserHasDefaults(backupRow.data);
        userDataCache.set(lowerEmail, { data: completedData, timestamp: Date.now() });
        return completedData;
      }
    } catch {
      // ignora erro secundário para repassar erro original se throwOnError estiver ativo
    }

    if (throwOnError) {
      throw err;
    }

    if (cached && cached.data) {
      return cached.data;
    }

    throw err;
  }
}

// Helper: Diff-based sync for name-list tables (avoids wiping custom statuses/categories if insert fails)
async function syncNameListTable(supabase: any, table: string, lowerEmail: string, desiredNames: string[]) {
  const uniqueDesired = Array.from(new Set(desiredNames.map((n: any) => String(n || '').trim()).filter(Boolean)));
  const { data: existingRows, error: fetchErr } = await supabase.from(table).select('id, name').eq('email', lowerEmail);
  if (fetchErr) {
    if (isMissingTableOrColumnError(fetchErr)) return;
    throw new Error(`[${table}] Erro ao ler registros atuais: ${fetchErr.message}`);
  }

  const existingList = existingRows || [];
  const existingNames = new Set(existingList.map((r: any) => r.name));
  const desiredSet = new Set(uniqueDesired);

  const toInsert = uniqueDesired.filter(name => !existingNames.has(name)).map(name => ({ email: lowerEmail, name }));
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from(table).insert(toInsert);
    if (insErr) {
      throw new Error(`[${table}] Erro ao inserir novos registros: ${insErr.message}`);
    }
  }

  const idsToDelete = existingList.filter((r: any) => !desiredSet.has(r.name)).map((r: any) => r.id).filter(Boolean);
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().eq('email', lowerEmail).in('id', idsToDelete);
    if (delErr) {
      throw new Error(`[${table}] Erro ao remover registros antigos: ${delErr.message}`);
    }
  }
}

// Helper: Upsert-first sync for ID-based tables (never deletes existing rows if upsert fails)
async function syncIdEntityTable(
  supabase: any,
  table: string,
  lowerEmail: string,
  rows: any[],
  mapFallbackRow?: (row: any) => any
) {
  const { data: existingRows, error: fetchErr } = await supabase.from(table).select('id').eq('email', lowerEmail);
  if (fetchErr) {
    if (isMissingTableOrColumnError(fetchErr)) return;
    throw new Error(`[${table}] Erro ao consultar IDs existentes: ${fetchErr.message}`);
  }

  if (rows.length > 0) {
    let { error: upErr } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (upErr && mapFallbackRow && (upErr.code === '42703' || upErr.code === 'PGRST204' || String(upErr.message || '').includes('classification'))) {
      const safeRows = rows.map(mapFallbackRow);
      const retry = await supabase.from(table).upsert(safeRows, { onConflict: 'id' });
      upErr = retry.error;
    }
    if (upErr) {
      throw new Error(`[${table}] Erro ao salvar registros (upsert): ${upErr.message}`);
    }
  }

  const desiredIds = new Set(rows.map((r: any) => r.id));
  const idsToDelete = (existingRows || []).map((r: any) => r.id).filter((id: any) => id && !desiredIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().eq('email', lowerEmail).in('id', idsToDelete);
    if (delErr) {
      throw new Error(`[${table}] Erro ao remover registros excluídos: ${delErr.message}`);
    }
  }
}

// Save/Update user workspace data strictly on Supabase (throws on failure, never saves locally)
async function saveUserDataByEmail(email: string, data: any, changedKeys?: string[]): Promise<boolean> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = requireSupabase();
  const shouldSync = (key: string) => Boolean(data[key]) && (!changedKeys || changedKeys.includes(key));

  try {
    const promises: Promise<any>[] = [];

    // 1. Sync receiptTypes
    if (shouldSync('receiptTypes')) {
      promises.push(syncNameListTable(supabase, 'receipt_types', lowerEmail, data.receiptTypes));
    }

    // 2. Sync receiptStatuses
    if (shouldSync('receiptStatuses')) {
      promises.push(syncNameListTable(supabase, 'receipt_statuses', lowerEmail, data.receiptStatuses));
    }

    // 3. Sync paymentTypes
    if (shouldSync('paymentTypes')) {
      promises.push(syncNameListTable(supabase, 'payment_types', lowerEmail, data.paymentTypes));
    }

    // 4. Sync paymentStatuses
    if (shouldSync('paymentStatuses')) {
      promises.push(syncNameListTable(supabase, 'payment_statuses', lowerEmail, data.paymentStatuses));
    }

    // 5. Sync incomeCategories
    if (shouldSync('incomeCategories')) {
      promises.push(syncNameListTable(supabase, 'income_categories', lowerEmail, data.incomeCategories));
    }

    // 6. Sync expenseCategories
    if (shouldSync('expenseCategories')) {
      promises.push(syncNameListTable(supabase, 'expense_categories', lowerEmail, data.expenseCategories));
    }

    // 7. Sync incomes
    if (shouldSync('incomes')) {
      const rows = data.incomes.map((inc: any) => ({
        id: inc.id,
        email: lowerEmail,
        date: inc.date,
        description: inc.description,
        value: Number(inc.value),
        category: inc.category,
        status: inc.status,
        payment_type: inc.paymentType
      }));
      promises.push(syncIdEntityTable(supabase, 'incomes', lowerEmail, rows));
    }

    // 8. Sync expenses
    if (shouldSync('expenses')) {
      const rows = data.expenses.map((exp: any) => ({
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
        syncIdEntityTable(supabase, 'expenses', lowerEmail, rows, ({ classification, ...rest }: any) => rest)
      );
    }

    // 9. Sync annualPlanning
    if (shouldSync('annualPlanning')) {
      promises.push((async () => {
        for (const plan of data.annualPlanning) {
          const { error: planErr } = await supabase.from('annual_planning').upsert({
            email: lowerEmail,
            year: Number(plan.year),
            monthly_budgets: plan.monthlyBudgets
          }, { onConflict: 'email,year' });
          if (planErr && !isMissingTableOrColumnError(planErr)) {
            throw new Error(`[annual_planning] Erro ao salvar planejamento anual: ${planErr.message}`);
          }
        }
      })());
    }

    // 10. Sync shoppingList
    if (shouldSync('shoppingList')) {
      const rows = data.shoppingList.map((item: any) => ({
        id: item.id,
        email: lowerEmail,
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        category: item.category,
        checked: !!item.checked,
        date: item.date || null
      }));
      promises.push(syncIdEntityTable(supabase, 'shopping_list', lowerEmail, rows));
    }

    // 11. Sync actionPlans
    if (shouldSync('actionPlans')) {
      const rows = data.actionPlans.map((plan: any) => ({
        id: plan.id,
        email: lowerEmail,
        title: plan.title,
        description: plan.description,
        target_date: plan.targetDate,
        value: Number(plan.value),
        status: plan.status
      }));
      promises.push(syncIdEntityTable(supabase, 'action_plans', lowerEmail, rows));
    }

    // 12. Sync deficitActions
    if (shouldSync('deficitActions')) {
      const rows = data.deficitActions.map((action: any) => ({
        id: action.id,
        email: lowerEmail,
        cost_center: action.costCenter,
        reason: action.reason,
        correction_action: action.correctionAction,
        responsible: action.responsible,
        date: action.date,
        status: action.status
      }));
      promises.push(syncIdEntityTable(supabase, 'deficit_actions', lowerEmail, rows));
    }

    // 13. Sync trips
    if (shouldSync('trips')) {
      const rows = data.trips.map((trip: any) => ({
        id: trip.id,
        email: lowerEmail,
        name: trip.name,
        expenses: trip.expenses || []
      }));
      promises.push(syncIdEntityTable(supabase, 'trips', lowerEmail, rows));
    }

    // 14. Sync wishes
    if (shouldSync('wishes')) {
      const rows = data.wishes.map((wish: any) => ({
        id: wish.id,
        email: lowerEmail,
        title: wish.title,
        description: wish.description || '',
        target_date: wish.targetDate || null,
        value: Number(wish.value || 0),
        status: wish.status || 'Pendente'
      }));
      promises.push(syncIdEntityTable(supabase, 'wishes', lowerEmail, rows));
    }

    // 15. Sync investments
    if (shouldSync('investments')) {
      const rows = data.investments.map((inv: any) => ({
        id: inv.id,
        email: lowerEmail,
        name: inv.name,
        type: inv.type,
        date: inv.date,
        value: Number(inv.value || 0),
        status: inv.status,
        notes: inv.notes || null
      }));
      promises.push(syncIdEntityTable(supabase, 'investments', lowerEmail, rows));
    }

    // 16. Sync investmentTypes
    if (shouldSync('investmentTypes')) {
      promises.push(syncNameListTable(supabase, 'investment_types', lowerEmail, data.investmentTypes));
    }

    // 17. Sync investmentStatuses
    if (shouldSync('investmentStatuses')) {
      promises.push(syncNameListTable(supabase, 'investment_statuses', lowerEmail, data.investmentStatuses));
    }

    await Promise.all(promises);

    // Update user_data snapshot in Supabase after relational syncs succeed
    const { error: backupErr } = await supabase.from('user_data').upsert({
      email: lowerEmail,
      data: data,
      updated_at: new Date().toISOString()
    });
    if (backupErr) {
      throw new Error(`Erro ao atualizar snapshot user_data no Supabase: ${backupErr.message}`);
    }
  } catch (err: any) {
    if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
      markSupabaseKeyAsInvalid("Invalid API key");
    } else {
      console.error("Erro ao salvar dados relacionais no Supabase:", err);
    }
    throw err;
  }

  userDataCache.set(lowerEmail, { data: { ...data }, timestamp: Date.now() });
  return true;
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

  const { differentialSql, fullSafeSql } = generateSafeSchemaScripts(existingSet, missingTables);

  return {
    totalRequired: DATABASE_SCHEMA_CATALOG.length,
    existingCount: existingSet.size,
    missingCount: missingTables.length,
    missingTables,
    tables: results,
    differentialSql,
    fullSafeSql
  };
}

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
    totalRequired: audit.totalRequired,
    existingCount: audit.existingCount,
    missingCount: audit.missingCount,
    missingTables: audit.missingTables,
    tables: audit.tables,
    schema: audit.missingCount > 0 ? audit.differentialSql : audit.fullSafeSql,
    differentialSql: audit.differentialSql,
    fullSafeSql: audit.fullSafeSql
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
  const token = (req.headers["x-auth-token"] as string) || (req.headers["authorization"] as string) || (req.query.token as string);
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

// Login (direto no Supabase sem cache local obsoleto + migração transparente para hash scrypt)
app.post("/api/auth/login", async (req, res) => {
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;
  if (!rawEmail || !rawPassword || typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  const normalizedEmail = rawEmail.toLowerCase().trim();

  try {
    const user = await getUserByEmail(normalizedEmail, { bypassCache: true, throwOnError: true });
    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const { valid, needsUpgrade } = verifyPassword(rawPassword, user.password || "");
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    if (user.isBlocked) {
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
    const safeUserData = ensureUserHasDefaults(freshUserData);

    const { password: _, ...userProfile } = user;
    const token = generateAuthToken({ email: user.email, role: user.role });
    res.json({ user: userProfile, token, userData: safeUserData });
  } catch (err: any) {
    const errMsg = String(err?.message || err || "");
    console.error("Login error:", errMsg);
    if (errMsg.includes("não configurado")) {
      return res.status(503).json({
        error: "Banco de dados Supabase não configurado no ambiente do servidor. Verifique as variáveis SUPABASE_URL e SUPABASE_ANON_KEY."
      });
    }
    res.status(503).json({ error: "Instabilidade temporária ao conectar ao banco de dados. Aguarde alguns instantes e tente novamente." });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, address, phone, city, state, cpf } = req.body;
  if (!email || !password || !name || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Nome, E-mail e senha são obrigatórios." });
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

    const defaultData = getDefaultUserData();
    await saveUserDataByEmail(lowerEmail, defaultData);

    const { password: _, ...userProfile } = newUser;
    const token = generateAuthToken({ email: newUser.email, role: newUser.role });
    res.json({ user: userProfile, token, userData: defaultData });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(503).json({ error: "Erro ao concluir cadastro no banco de dados. Tente novamente." });
  }
});

// Remember Password (sem expor senhas em logs)
app.post("/api/auth/remember-password", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "O e-mail é obrigatório para recuperar a senha." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail, { bypassCache: true, throwOnError: true });

    if (!user) {
      return res.status(404).json({ error: "O e-mail digitado é diferente do e-mail cadastrado na conta ou não existe no banco de dados." });
    }

    const userName = user.name || lowerEmail.split('@')[0];
    const isEncrypted = typeof user.password === "string" && user.password.startsWith("scrypt$");

    if (isEncrypted) {
      return res.json({
        success: true,
        message: "Sua conta utiliza proteção criptográfica irreversível de senha. Para definir uma nova senha, entre em contato com o administrador do sistema.",
        emailSubject: "FinanFly - Solicitação de Redefinição de Senha",
        user: {
          name: userName,
          email: user.email
        }
      });
    }

    res.json({
      success: true,
      message: `Solicitação registrada para ${lowerEmail}. Como não há servidor de e-mail SMTP configurado nesta instância, contate o administrador para redefinir sua senha com segurança.`,
      emailSubject: "FinanFly - Recuperação de Acesso",
      user: {
        name: userName,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Remember password error:", err);
    res.status(503).json({ error: "Erro ao consultar banco de dados para recuperação de senha." });
  }
});

// Change Password
app.post("/api/auth/change-password", async (req, res) => {
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
      return res.status(400).json({ error: "A senha antiga está incorreta." });
    }

    freshUser.password = hashPassword(newPassword);
    await saveUser(freshUser);
    invalidateUserCache(freshUser.email);

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(503).json({ error: "Erro ao salvar nova senha no banco de dados." });
  }
});

// Self Delete Account
app.post("/api/auth/delete-account", async (req, res) => {
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
      'investment_statuses', 'user_data'
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

// Update Subscription
app.post("/api/user/subscription", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const { plan } = req.body;
  if (!["gratis", "mensal", "anual"].includes(plan)) {
    return res.status(400).json({ error: "Plano inválido." });
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
    if (plan === "gratis") {
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
    } else if (plan === "mensal") {
      user.subscription = {
        plan: "mensal",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        selectedAt: new Date().toISOString(),
        freePlanUsed: user.subscription.freePlanUsed || false,
        approved: true,
      };
    } else if (plan === "anual") {
      user.subscription = {
        plan: "anual",
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        selectedAt: new Date().toISOString(),
        freePlanUsed: user.subscription.freePlanUsed || false,
        approved: true,
      };
    }

    const currentPrices = await getPlanPrices();
    const priceFormatted = plan === "gratis"
      ? "Grátis"
      : plan === "mensal"
      ? `R$ ${currentPrices.mensal_por}/mês`
      : `R$ ${currentPrices.anual_por}/ano`;

    addSubscriptionHistoryEntry(user, {
      plan,
      validUntil: user.subscription.validUntil,
      source: plan === "gratis" ? "teste_gratis" : "assinatura",
      status: "Ativo",
      price: priceFormatted,
      description: plan === "gratis"
        ? "Período Grátis de Experiência Ativado"
        : `Assinatura Plano ${plan === "mensal" ? "Mensal" : "Anual"}`
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

  // Remove trailing slash if present for consistent URLs
  if (appUrl.endsWith("/")) {
    appUrl = appUrl.substring(0, appUrl.length - 1);
  }

  if (accessToken && accessToken.trim() !== "" && accessToken.trim() !== "YOUR_ACCESS_TOKEN" && accessToken.trim() !== "INSIRA_SUA_ANON_KEY_DO_SUPABASE_AQUI") {
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

  // Simulation mode (Fallback when ACCESS_TOKEN is missing)
  console.log(`[PAYMENT SIMULATION] Criando checkout simulado de Mercado Pago para ${email} (Plano: ${planName})`);
  const simSig = crypto.createHmac("sha256", JWT_SECRET).update(`${email}:${planName}`).digest("hex");
  const simulationUrl = `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&plan=${planName}&status=approved&simulated=true&sig=${simSig}`;
  res.json({ init_point: simulationUrl });
});

// Mercado Pago Payment Callback Handler
app.get("/api/payment/callback", async (req, res) => {
  const { email, plan, status, simulated, sig } = req.query;

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
  const hasRealToken = Boolean(
    process.env.MERCADO_PAGO_ACCESS_TOKEN &&
    process.env.MERCADO_PAGO_ACCESS_TOKEN.trim() !== "" &&
    process.env.MERCADO_PAGO_ACCESS_TOKEN.trim() !== "YOUR_ACCESS_TOKEN"
  );

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

  if (status === "approved" && safePlan && isValidSignature && !(isSimulated && hasRealToken)) {
    try {
      const user = await getUserByEmail(targetEmail, { bypassCache: true, throwOnError: true });
      if (user) {
        const currentPrices = await getPlanPrices();
        const priceFormatted = safePlan === "mensal" ? `R$ ${currentPrices.mensal_por}` : `R$ ${currentPrices.anual_por}`;
        const newValidUntil = safePlan === "mensal"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        user.subscription = {
          plan: safePlan,
          validUntil: newValidUntil,
          selectedAt: new Date().toISOString(),
          freePlanUsed: user.subscription?.freePlanUsed || false,
          approved: true,
        };

        addSubscriptionHistoryEntry(user, {
          plan: safePlan,
          validUntil: newValidUntil,
          source: isSimulated ? 'Mercado Pago (Simulado)' : 'Mercado Pago',
          status: 'Ativo',
          price: priceFormatted,
          description: `Pagamento Aprovado - Plano ${safePlan === 'mensal' ? 'Mensal' : 'Anual'}`
        });

        normalizeUserSubscription(user);
        await saveUser(user);
        invalidateUserCache(targetEmail);
      }
    } catch (err) {
      console.error("Callback subscription activation error:", err);
    }

    const planLabel = safePlan === "mensal" ? "MENSAL" : "ANUAL";
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
            <div class="badge">${isSimulated ? "Simulação Concluída" : "Transação Concluída"}</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Sua assinatura do plano <strong>${planLabel}</strong> foi ativada com sucesso e sua conta do <strong>FinanFly</strong> já está liberada!</p>
            <p style="font-size:0.8rem; margin-top: 1rem;">Clique abaixo para retornar e explorar o painel.</p>
            <button onclick="window.location.href='/'">Entrar no FinanFly</button>
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

// Get User Data
app.get("/api/user/data", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    const userData = await getUserDataByEmail(authUser.email, { throwOnError: true });
    if (!userData) {
      const defaultUserObj = getDefaultUserData();
      return res.json(defaultUserObj);
    }

    res.json(ensureUserHasDefaults(userData));
  } catch (err) {
    console.error("User data get error:", err);
    res.status(503).json({ error: "Falha temporária ao carregar dados do banco. Tente atualizar novamente." });
  }
});

// Update User Data (serializado por usuário para evitar sobrescrita concorrente)
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
        return { status: 503, body: { error: "Não foi possível validar os dados atuais antes de salvar." } };
      }

      if (
        Array.isArray(newData.expenses) &&
        newData.expenses.length === 0 &&
        Array.isArray(currentData.expenses) &&
        currentData.expenses.length > 1 &&
        !newData._allowClearAll
      ) {
        return {
          status: 409,
          body: { error: "Operação bloqueada por segurança para evitar perda em massa de despesas. Atualize a página e tente novamente." }
        };
      }

      if (
        Array.isArray(newData.incomes) &&
        newData.incomes.length === 0 &&
        Array.isArray(currentData.incomes) &&
        currentData.incomes.length > 1 &&
        !newData._allowClearAll
      ) {
        return {
          status: 409,
          body: { error: "Operação bloqueada por segurança para evitar perda em massa de receitas. Atualize a página e tente novamente." }
        };
      }

      const protectedConfigKeys: Array<[string, string]> = [
        ['paymentStatuses', 'situações de pagamento'],
        ['paymentTypes', 'formas de pagamento'],
        ['receiptStatuses', 'situações de recebimento'],
        ['receiptTypes', 'tipos de recebimento'],
        ['incomeCategories', 'categorias de receitas'],
        ['expenseCategories', 'categorias de despesas'],
        ['investmentTypes', 'tipos de investimentos'],
        ['investmentStatuses', 'situações de investimentos'],
        ['annualPlanning', 'planejamento anual']
      ];

      for (const [key, label] of protectedConfigKeys) {
        if (
          Array.isArray(newData[key]) &&
          newData[key].length === 0 &&
          Array.isArray(currentData[key]) &&
          currentData[key].length > 0
        ) {
          return {
            status: 409,
            body: { error: `A lista de ${label} não pode ficar vazia.` }
          };
        }
      }

      const { _allowClearAll, ...sanitizedNewData } = newData;
      const changedKeys = Object.keys(sanitizedNewData);

      const updatedData = {
        ...currentData,
        ...sanitizedNewData,
      };

      await saveUserDataByEmail(authUser.email, updatedData, changedKeys);
      return { status: 200, body: { success: true, data: updatedData } };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("User data post error:", err);
    res.status(503).json({ error: "Erro ao salvar dados no banco. Seus registros anteriores foram preservados." });
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

    const defaultData = getDefaultUserData();
    await saveUserDataByEmail(lowerTargetEmail, defaultData);
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

    if (typeof targetUser.password === "string" && targetUser.password.startsWith("scrypt$")) {
      return res.json({
        protected: true,
        message: "Senha protegida com criptografia irreversível (scrypt). Utilize 'Editar Usuário' para definir uma nova senha."
      });
    }

    res.json({ password: targetUser.password });
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
      'investment_statuses', 'user_data'
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

    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete-user error:", err);
    res.status(503).json({ error: "Erro ao excluir usuário no Supabase." });
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
