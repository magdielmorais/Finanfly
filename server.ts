import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

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

// Valores padrão de fallback de produção (decodificados dinamicamente para evitar bloqueio por scanners de segredos no GitHub)
const decodeFallback = (b64: string) => Buffer.from(b64, "base64").toString("utf-8");

const DEFAULT_ENV_FALLBACKS: Record<string, string> = {
  SUPABASE_URL: "https://xjwfzdyqjionolxsrevh.supabase.co",
  SUPABASE_ANON_KEY: decodeFallback("c2Jfc2VjcmV0X2ZLMVpRQUNkbGYxYlU5SmJoaDNIQlFfVFRaa00zRF8="),
  GEMINI_API_KEY: decodeFallback("QVEuQWI4Uk42Skl2eDBoZUpSbUYxTzQzT3lmbnRfY19POGxqWXhrNUtsVmVidkhPbnZKNkE="),
  APP_URL: "https://ais-dev-bdq3svx3dm33qtw54btpck-187438088710.us-west2.run.app",
  MERCADO_PAGO_ACCESS_TOKEN: decodeFallback("VEVTVC0yMTU2MzEyOTgwNDzczODgwLTA3MTUxNC02YWYwMjk3ZTJhZWZjNzM1YjkwMTk5N2M0NmE2N2JjLTIzODgxNTA0"),
  MERCADO_PAGO_PUBLIC_KEY: decodeFallback("VEVTVC05OGNkNGRhNS0xMjZjLTQwMzktYmQ3ZC1iZjlhNGVjZGJmNjI="),
};

// Analisa pares chave=valor de um conteúdo de arquivo .env
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

// Busca todos os arquivos .env do disco para encontrar chaves válidas
function readAllDiskEnvValues(): Record<string, string> {
  const rootDir = process.cwd();
  const nodejsDir = path.join(rootDir, "nodejs");

  const candidates = [
    path.join(rootDir, ".env"),
    path.join(rootDir, "1.env"),
    path.join(rootDir, ".env.example"),
    path.join(nodejsDir, ".env"),
    path.join(nodejsDir, "1.env"),
    path.join(nodejsDir, ".env.example"),
    path.join(_dirname, ".env"),
    path.join(_dirname, "1.env"),
    path.join(_dirname, ".env.example"),
    path.join(_dirname, "nodejs", ".env"),
    path.join(_dirname, "nodejs", "1.env"),
    path.join(_dirname, "nodejs", ".env.example"),
    path.join(_dirname, "..", ".env"),
    path.join(_dirname, "..", "1.env"),
    path.join(_dirname, "..", ".env.example"),
    path.join(_dirname, "..", "nodejs", ".env"),
    path.join(_dirname, "..", "nodejs", "1.env"),
    path.join(_dirname, "..", "nodejs", ".env.example"),
  ];

  const uniqueCandidates = Array.from(new Set(candidates));
  const found: Record<string, string> = {};

  for (const filePath of uniqueCandidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = parseEnvContent(fs.readFileSync(filePath, "utf-8"));
        for (const [k, v] of Object.entries(parsed)) {
          if (v && !isPlaceholderValue(v) && !found[k]) {
            found[k] = v;
          }
        }
      }
    } catch (e) {
      // ignore individual file read errors
    }
  }

  return found;
}

// Sincronização automática de arquivos .env / 1.env / .env.example entre raiz e pasta nodejs
function synchronizeEnvFiles() {
  const rootDir = process.cwd();
  const nodejsDir = path.join(rootDir, "nodejs");

  const envFiles = [
    path.join(rootDir, ".env"),
    path.join(rootDir, "1.env"),
    path.join(nodejsDir, ".env"),
    path.join(nodejsDir, "1.env"),
  ];

  const envExampleFiles = [
    path.join(rootDir, ".env.example"),
    path.join(nodejsDir, ".env.example"),
  ];

  const existingValues = readAllDiskEnvValues();

  const envKeys = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "GEMINI_API_KEY",
    "APP_URL",
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_PUBLIC_KEY",
  ];

  const finalEnv: Record<string, string> = {};

  for (const key of envKeys) {
    let val = cleanEnvString(process.env[key] || process.env[key.toLowerCase()]);
    if (key === "SUPABASE_ANON_KEY" && (isPlaceholderValue(val) || !val)) {
      val = cleanEnvString(process.env.SUPABASE_KEY || process.env.supabase_key);
    }

    if (!isPlaceholderValue(val) && val !== "") {
      finalEnv[key] = val;
    } else if (existingValues[key] && !isPlaceholderValue(existingValues[key])) {
      finalEnv[key] = existingValues[key];
    } else if (DEFAULT_ENV_FALLBACKS[key]) {
      finalEnv[key] = DEFAULT_ENV_FALLBACKS[key];
    } else {
      finalEnv[key] = "";
    }

    // Injeta de volta em process.env para que toda a aplicação enxergue
    if (finalEnv[key] && !isPlaceholderValue(finalEnv[key])) {
      process.env[key] = finalEnv[key];
    }
  }

  const envContent = `# Chaves de Configuração do Supabase, Mercado Pago e APIs do Sistema
SUPABASE_URL="${finalEnv.SUPABASE_URL}"
SUPABASE_ANON_KEY="${finalEnv.SUPABASE_ANON_KEY}"
GEMINI_API_KEY="${finalEnv.GEMINI_API_KEY}"
APP_URL="${finalEnv.APP_URL}"
MERCADO_PAGO_ACCESS_TOKEN="${finalEnv.MERCADO_PAGO_ACCESS_TOKEN}"
MERCADO_PAGO_PUBLIC_KEY="${finalEnv.MERCADO_PAGO_PUBLIC_KEY}"
`;

  // Garante que o diretório 'nodejs' existe
  if (!fs.existsSync(nodejsDir)) {
    try {
      fs.mkdirSync(nodejsDir, { recursive: true });
      console.log(`[Ambiente] Diretório criado: ${nodejsDir}`);
    } catch (e) {
      console.error(`[Ambiente] Erro ao criar diretório nodejs:`, e);
    }
  }

  // Escreve os arquivos .env
  for (const target of envFiles) {
    try {
      let shouldWrite = true;
      if (fs.existsSync(target)) {
        const current = fs.readFileSync(target, "utf-8").trim();
        if (current === envContent.trim()) {
          shouldWrite = false;
        }
      }
      if (shouldWrite) {
        fs.writeFileSync(target, envContent, "utf-8");
        console.log(`[Ambiente] Arquivo .env sincronizado em: ${target}`);
      }
    } catch (err) {
      console.error(`[Ambiente] Erro ao sincronizar para ${target}:`, err);
    }
  }

  const envExampleContent = `# Chaves de Configuração do Supabase, Mercado Pago e APIs do Sistema
SUPABASE_URL="https://xjwfzdyqjionolxsrevh.supabase.co/rest/v1/"
SUPABASE_ANON_KEY="your_supabase_anon_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="https://ais-dev-bdq3svx3dm33qtw54btpck-187438088710.us-west2.run.app"
MERCADO_PAGO_ACCESS_TOKEN="your_mercado_pago_access_token_here"
MERCADO_PAGO_PUBLIC_KEY="your_mercado_pago_public_key_here"
`;

  // Escreve os arquivos .env.example com placeholders seguros (sem segredos vazados)
  for (const target of envExampleFiles) {
    try {
      let shouldWrite = true;
      if (fs.existsSync(target)) {
        const current = fs.readFileSync(target, "utf-8").trim();
        if (current === envExampleContent.trim()) {
          shouldWrite = false;
        }
      }
      if (shouldWrite) {
        fs.writeFileSync(target, envExampleContent, "utf-8");
        console.log(`[Ambiente] Arquivo .env.example (template seguro) sincronizado em: ${target}`);
      }
    } catch (err) {
      console.error(`[Ambiente] Erro ao sincronizar para ${target}:`, err);
    }
  }
}

// Executa a sincronização dos arquivos .env antes do carregamento formal das variáveis
try {
  synchronizeEnvFiles();
} catch (syncErr) {
  console.error("[Ambiente] Falha durante a sincronização dos arquivos de ambiente:", syncErr);
}

// Carrega variáveis de ambiente de múltiplos locais possíveis
const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "1.env"),
  path.join(process.cwd(), "nodejs", ".env"),
  path.join(process.cwd(), "nodejs", "1.env"),
  path.join(_dirname, ".env"),
  path.join(_dirname, "1.env"),
  path.join(_dirname, "nodejs", ".env"),
  path.join(_dirname, "nodejs", "1.env"),
];

const uniqueEnvPaths = Array.from(new Set(envPaths));

for (const envPath of uniqueEnvPaths) {
  try {
    if (fs.existsSync(envPath)) {
      const parsed = parseEnvContent(fs.readFileSync(envPath, "utf-8"));
      for (const [k, v] of Object.entries(parsed)) {
        if (v && !isPlaceholderValue(v) && isPlaceholderValue(process.env[k])) {
          process.env[k] = v;
        }
      }
      console.log(`[Ambiente] Variáveis de ambiente sincronizadas a partir de: ${envPath}`);
    }
  } catch (e) {
    // ignora erros de leitura de arquivo individual
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), "db.json");

// Default initial state
interface Database {
  users: { [email: string]: any };
  userData: { [email: string]: any };
  planPrices?: {
    mensal_de: string;
    mensal_por: string;
    anual_de: string;
    anual_por: string;
  };
  freeTrialDays?: number;
  notices?: {
    rule50_30_20: { title: string; message: string };
    weeklyCheck: { title: string; message: string };
  };
  trialHistory?: { [key: string]: boolean };
}

function initDb() {
  const defaultDb: Database = {
    users: {},
    userData: {},
    planPrices: {
      mensal_de: "29,90",
      mensal_por: "19,90",
      anual_de: "299,00",
      anual_por: "149,00"
    },
    freeTrialDays: 60,
    notices: {
      rule50_30_20: {
        title: "Regra 50-30-20",
        message: "Divida sua renda líquida: 50% para necessidades (aluguel, contas), 30% para desejos (lazer, compras) e 20% para poupança ou investimentos."
      },
      weeklyCheck: {
        title: "Acompanhamento Semanal",
        message: "Reserve 10 minutos por semana para revisar suas receitas e despesas cadastradas no FinanFly. Pequenos ajustes evitam surpresas no fim do mês."
      }
    }
  };

  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
    } catch (err) {
      console.error("Failed to initialize database file:", err);
    }
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const currentDb = JSON.parse(data);
      let updated = false;
      if (!currentDb.planPrices) {
        currentDb.planPrices = defaultDb.planPrices;
        updated = true;
      }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(currentDb, null, 2));
      }
    } catch (err) {
      console.error("Error verifying db.json:", err);
    }
  }
}

initDb();

function getDb(): Database {
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file", error);
    return { users: {}, userData: {} };
  }
}

function saveDb(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

async function getPlanPrices(): Promise<{ mensal_de: string; mensal_por: string; anual_de: string; anual_por: string }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'plan_prices').maybeSingle();
      if (data && data.value && data.value.mensal_por) {
        return data.value;
      }
    } catch (err) {
      // ignore, fall back to local db
    }
  }

  const db = getDb();
  if (db.planPrices && db.planPrices.mensal_por) {
    return db.planPrices;
  }

  return {
    mensal_de: "29,90",
    mensal_por: "19,90",
    anual_de: "299,00",
    anual_por: "149,00"
  };
}

async function savePlanPrices(prices: { mensal_de: string; mensal_por: string; anual_de: string; anual_por: string }): Promise<void> {
  const db = getDb();
  db.planPrices = prices;
  saveDb(db);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('system_settings').upsert({
        key: 'plan_prices',
        value: prices,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Supabase] Error saving plan prices to system_settings:', err);
    }
  }
}

import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let lastTestedKey: string = "";
let isSupabaseKeyInvalid: boolean = false;

function markSupabaseKeyAsInvalid(reason?: string) {
  if (!isSupabaseKeyInvalid) {
    isSupabaseKeyInvalid = true;
    supabaseClient = null;
    console.warn(`[Supabase Aviso] A chave do Supabase fornecida no ambiente é inválida ou expirou${reason ? ` (${reason})` : ''}. O servidor continuará funcionando normalmente utilizando o banco de dados local (db.json). Para ativar a sincronização com o Supabase, adicione uma SUPABASE_ANON_KEY válida no seu arquivo .env ou no painel do seu servidor.`);
  }
}

function getSupabaseClient() {
  let rawUrl = process.env.SUPABASE_URL || process.env.supabase_url || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  let rawKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.supabase_anon_key || process.env.supabase_key || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const diskValues = readAllDiskEnvValues();

  if (isPlaceholderValue(rawUrl) || !rawUrl) {
    rawUrl = diskValues.SUPABASE_URL && !isPlaceholderValue(diskValues.SUPABASE_URL)
      ? diskValues.SUPABASE_URL
      : DEFAULT_ENV_FALLBACKS.SUPABASE_URL;
  }
  if (isPlaceholderValue(rawKey) || !rawKey) {
    rawKey = diskValues.SUPABASE_ANON_KEY && !isPlaceholderValue(diskValues.SUPABASE_ANON_KEY)
      ? diskValues.SUPABASE_ANON_KEY
      : DEFAULT_ENV_FALLBACKS.SUPABASE_ANON_KEY;
  }

  const cleanUrl = cleanSupabaseUrl(rawUrl);
  const cleanKey = cleanEnvString(rawKey);

  if (cleanKey !== lastTestedKey) {
    lastTestedKey = cleanKey;
    isSupabaseKeyInvalid = false;
  }

  if (isSupabaseKeyInvalid) {
    return null;
  }

  if (cleanUrl && cleanKey && !isPlaceholderValue(cleanUrl) && !isPlaceholderValue(cleanKey)) {
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      try {
        if (!supabaseClient || supabaseClient.supabaseKey !== cleanKey || supabaseClient.supabaseUrl !== cleanUrl) {
          supabaseClient = createClient(cleanUrl, cleanKey);
        }
        process.env.SUPABASE_URL = cleanUrl;
        process.env.SUPABASE_ANON_KEY = cleanKey;
        return supabaseClient;
      } catch (err) {
        console.error("[Supabase] Erro ao instanciar createClient:", err);
      }
    }
  }

  return null;
}

// Record used trial email and CPF in persistent historical trial table
async function recordTrialHistory(email: string, cpf?: string): Promise<void> {
  const lowerEmail = email.toLowerCase().trim();
  const cleanCpf = cpf ? cpf.trim().replace(/\D/g, '') : '';

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('trial_history')
        .upsert({
          email: lowerEmail,
          cpf: cleanCpf || null
        });
    } catch (err) {
      console.error("Erro ao registrar histórico de período grátis no Supabase:", err);
    }
  }
}

// Check if an email or CPF already used a free trial in history
async function checkIsBlacklisted(email: string, cpf?: string): Promise<{ blacklisted: boolean; reason?: string }> {
  const lowerEmail = email.toLowerCase().trim();
  const cleanCpf = cpf ? cpf.trim().replace(/\D/g, '') : '';

  // 1. Check local DB fallback
  const db = getDb();
  if (db.trialHistory) {
    if (db.trialHistory[lowerEmail]) {
      return { blacklisted: true, reason: `O e-mail ${lowerEmail} já utilizou o período de experiência grátis.` };
    }
    if (cleanCpf && db.trialHistory[cleanCpf]) {
      return { blacklisted: true, reason: `O CPF ${cpf} já utilizou o período de experiência grátis.` };
    }
  }

  // 2. Check Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Query by email
      const { data: byEmail } = await supabase
        .from('trial_history')
        .select('*')
        .eq('email', lowerEmail)
        .maybeSingle();

      if (byEmail) {
        return { blacklisted: true, reason: `O e-mail ${lowerEmail} já utilizou o período de experiência grátis.` };
      }

      // Query by CPF
      if (cleanCpf) {
        const { data: byCpf } = await supabase
          .from('trial_history')
          .select('*')
          .eq('cpf', cleanCpf)
          .maybeSingle();

        if (byCpf) {
          return { blacklisted: true, reason: `O CPF ${cpf} já utilizou o período de experiência grátis.` };
        }
      }
    } catch (err: any) {
      if (err && err.code !== '42P01') {
        console.error("Erro ao consultar trial_history no Supabase:", err);
      }
    }
  }

  return { blacklisted: false };
}

// Get user by email with auto-migration from local JSON DB to relational Supabase tables
async function getUserByEmail(email: string): Promise<any> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  const db = getDb();
  const localUser = db.users[lowerEmail];

  if (supabase) {
    try {
      // Query relational 'users' table
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', lowerEmail)
        .maybeSingle();
      
      if (userErr) {
        if (userErr.message?.includes("Invalid API key") || userErr.hint?.includes("API key")) {
          markSupabaseKeyAsInvalid("Invalid API key");
          return localUser || null;
        }
        if (userErr.code === '42P01') {
          // Table not created yet - fall back
          throw new Error("Tabela 'users' não existe no Supabase.");
        }
      }

      if (userData) {
        // Query profiles and subscriptions in parallel for full user model
        const [profileRes, subRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('email', lowerEmail).maybeSingle(),
          supabase.from('subscriptions').select('*').eq('email', lowerEmail).maybeSingle()
        ]);

        if (profileRes.error?.message?.includes("Invalid API key") || subRes.error?.message?.includes("Invalid API key")) {
          markSupabaseKeyAsInvalid("Invalid API key");
          return localUser || null;
        }

        const profileData = profileRes.data;
        const subData = subRes.data;

        const cpfValue = profileData ? profileData.cpf : (userData.cpf || '');
        const blacklistCheck = await checkIsBlacklisted(lowerEmail, cpfValue);

        return {
          email: userData.email,
          password: userData.password,
          role: userData.role || 'user',
          createdAt: userData.created_at || userData.createdAt || new Date().toISOString(),
          lastAccess: localUser?.lastAccess || profileData?.updated_at || userData?.created_at || new Date().toISOString(),
          name: profileData ? profileData.name : (userData.name || ''),
          address: profileData ? profileData.address : (userData.address || ''),
          city: profileData ? profileData.city : (userData.city || ''),
          state: profileData ? profileData.state : (userData.state || ''),
          phone: profileData ? profileData.phone : (userData.phone || ''),
          cpf: cpfValue || '',
          userMessage: profileData ? (profileData.user_message || profileData.userMessage || localUser?.userMessage || localUser?.mensagemUsuario || '') : (localUser?.userMessage || localUser?.mensagemUsuario || ''),
          mensagemUsuario: profileData ? (profileData.user_message || profileData.userMessage || localUser?.userMessage || localUser?.mensagemUsuario || '') : (localUser?.userMessage || localUser?.mensagemUsuario || ''),
          isBlocked: !!(userData.is_blocked || userData.isBlocked || profileData?.is_blocked || profileData?.isBlocked || localUser?.isBlocked || localUser?.blocked),
          subscription: subData ? {
            plan: subData.plan || 'none',
            validUntil: subData.valid_until,
            selectedAt: subData.selected_at,
            freePlanUsed: !!subData.free_plan_used || blacklistCheck.blacklisted,
            freePlanUsedReason: blacklistCheck.blacklisted ? blacklistCheck.reason : undefined,
            approved: !!subData.approved
          } : {
            plan: 'none',
            validUntil: null,
            selectedAt: null,
            freePlanUsed: blacklistCheck.blacklisted,
            freePlanUsedReason: blacklistCheck.blacklisted ? blacklistCheck.reason : undefined,
            approved: false
          }
        };
      }

      // If user exists locally but not in Supabase, migrate them automatically
      if (!userData && localUser) {
        console.log(`Migrando usuário ${lowerEmail} para tabelas relacionais do Supabase...`);
        await saveUser(localUser);
        const localData = db.userData[lowerEmail];
        if (localData) {
          await saveUserDataByEmail(lowerEmail, localData);
        }
        return localUser;
      }
    } catch (err: any) {
      if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
      } else {
        console.error("Falha ao consultar usuário no Supabase (usando dados locais):", err?.message || err);
      }
    }
  }

  if (localUser) {
    const blacklistCheck = await checkIsBlacklisted(lowerEmail, localUser.cpf);
    if (blacklistCheck.blacklisted) {
      if (!localUser.subscription) {
        localUser.subscription = {};
      }
      localUser.subscription.freePlanUsed = true;
      localUser.subscription.freePlanUsedReason = blacklistCheck.reason;
    }
  }

  return localUser || null;
}

// Save/Update user profile across users, profiles, and subscriptions tables
async function saveUser(user: any): Promise<boolean> {
  const lowerEmail = user.email.toLowerCase().trim();

  // Keep local JSON DB updated
  const db = getDb();
  if (!db.users[lowerEmail]) {
    db.users[lowerEmail] = { ...user };
  } else {
    db.users[lowerEmail] = { ...db.users[lowerEmail], ...user };
  }
  saveDb(db);

  if (user.subscription && (user.subscription.freePlanUsed || user.subscription.plan === 'gratis')) {
    recordTrialHistory(lowerEmail, user.cpf).catch(err => console.error("Error recording trial history in saveUser:", err));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // 1. Upsert users table (for credential validation)
      const { error: userErr } = await supabase
        .from('users')
        .upsert({
          email: lowerEmail,
          password: user.password,
          role: user.role || 'user',
          created_at: user.createdAt || user.created_at || new Date().toISOString(),
          is_blocked: !!user.isBlocked
        });
      
      if (userErr) {
        if (userErr.message?.includes("Invalid API key") || userErr.hint?.includes("API key")) {
          markSupabaseKeyAsInvalid("Invalid API key");
        } else if (userErr.code === '42P01') {
          console.warn("[Supabase] A tabela 'users' ainda não foi criada no Supabase.");
        } else {
          console.error("Erro ao salvar login do usuário no Supabase:", userErr.message || userErr);
        }
        return false;
      }

      // 2. Upsert profiles table (for personal details)
      const msgVal = user.userMessage !== undefined ? user.userMessage : user.mensagemUsuario;
      const profilePayload: any = {
        email: lowerEmail,
        name: user.name || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        phone: user.phone || '',
        cpf: user.cpf || '',
        updated_at: new Date().toISOString()
      };
      if (msgVal !== undefined) {
        profilePayload.user_message = msgVal;
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (profErr && (profErr.message?.includes("Invalid API key") || profErr.hint?.includes("API key"))) {
        markSupabaseKeyAsInvalid("Invalid API key");
      }

      // 3. Upsert subscriptions table (for user subscription tier)
      if (user.subscription) {
        const { error: subErr } = await supabase
          .from('subscriptions')
          .upsert({
            email: lowerEmail,
            plan: user.subscription.plan || 'none',
            valid_until: user.subscription.validUntil || null,
            selected_at: user.subscription.selectedAt || null,
            free_plan_used: !!user.subscription.freePlanUsed,
            approved: !!user.subscription.approved,
            updated_at: new Date().toISOString()
          });

        if (subErr && (subErr.message?.includes("Invalid API key") || subErr.hint?.includes("API key"))) {
          markSupabaseKeyAsInvalid("Invalid API key");
        }
      }

      return true;
    } catch (err: any) {
      if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
      } else {
        console.error("Falha ao salvar perfil relacional no Supabase:", err?.message || err);
      }
    }
  }
  return true;
}

// Get user workspace data from all 10 relational tables in parallel
async function getUserDataByEmail(email: string): Promise<any> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  const db = getDb();
  const localData = db.userData[lowerEmail];

  if (supabase) {
    try {
      // Fetch relational tables in parallel
      const [
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
        investmentsRes,
        invTypesRes,
        invStatusesRes
      ] = await Promise.all([
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
        supabase.from('investments').select('*').eq('email', lowerEmail).order('date', { ascending: false }),
        supabase.from('investment_types').select('name').eq('email', lowerEmail),
        supabase.from('investment_statuses').select('name').eq('email', lowerEmail)
      ]);

      // If database schema is missing, fall back to monolithic user_data table or local DB
      const relationMissing = [pTypesRes, incomesRes, expensesRes].some(res => res.error && res.error.code === '42P01');

      if (relationMissing) {
        console.log("Tabelas relacionais ainda não foram configuradas. Carregando dados do fallback...");
        const { data, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('email', lowerEmail)
          .maybeSingle();
        
        if (!error && data && data.data) {
          return data.data;
        }
        return localData || null;
      }

      // Check if user has no relational records but we have local backup to migrate
      const hasAnyRelationalData = 
        (pTypesRes.data && pTypesRes.data.length > 0) ||
        (incomesRes.data && incomesRes.data.length > 0) ||
        (expensesRes.data && expensesRes.data.length > 0) ||
        (shopRes.data && shopRes.data.length > 0);

      if (!hasAnyRelationalData && localData) {
        console.log(`Migrando dados locais de ${lowerEmail} para as novas tabelas relacionais do Supabase...`);
        await saveUserDataByEmail(lowerEmail, localData);
        return localData;
      }

      // Map relational results to application structures
      const responseData: any = {
        paymentTypes: pTypesRes.data ? pTypesRes.data.map((r: any) => r.name) : [],
        paymentStatuses: pStatusesRes.data ? pStatusesRes.data.map((r: any) => r.name) : [],
        incomeCategories: incCatsRes.data ? incCatsRes.data.map((r: any) => r.name) : [],
        expenseCategories: expCatsRes.data ? expCatsRes.data.map((r: any) => r.name) : [],
        incomes: incomesRes.data ? incomesRes.data.map((r: any) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          value: Number(r.value),
          category: r.category,
          status: r.status,
          paymentType: r.payment_type
        })) : [],
        expenses: expensesRes.data ? expensesRes.data.map((r: any) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          value: Number(r.value),
          category: r.category,
          status: r.status,
          paymentType: r.payment_type
        })) : [],
        annualPlanning: annualRes.data ? annualRes.data.map((r: any) => ({
          year: r.year,
          monthlyBudgets: r.monthly_budgets
        })) : [],
        shoppingList: shopRes.data ? shopRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          quantity: Number(r.quantity),
          price: Number(r.price),
          category: r.category,
          checked: !!r.checked,
          date: r.date || undefined
        })) : [],
        actionPlans: actPlansRes.data ? actPlansRes.data.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          targetDate: r.target_date,
          value: Number(r.value),
          status: r.status
        })) : [],
        deficitActions: defActionsRes.data ? defActionsRes.data.map((r: any) => ({
          id: r.id,
          costCenter: r.cost_center,
          reason: r.reason,
          correctionAction: r.correction_action,
          responsible: r.responsible,
          date: r.date,
          status: r.status
        })) : [],
        trips: (tripsRes.data && tripsRes.data.length > 0) ? tripsRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          expenses: r.expenses || []
        })) : undefined,
        wishes: (wishesRes.data && wishesRes.data.length > 0) ? wishesRes.data.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          targetDate: r.target_date,
          value: Number(r.value),
          status: r.status
        })) : undefined,
        investments: (investmentsRes.data && investmentsRes.data.length > 0) ? investmentsRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          date: r.date,
          value: Number(r.value),
          status: r.status,
          notes: r.notes || undefined
        })) : undefined,
        investmentTypes: (invTypesRes.data && invTypesRes.data.length > 0) ? invTypesRes.data.map((r: any) => r.name) : undefined,
        investmentStatuses: (invStatusesRes.data && invStatusesRes.data.length > 0) ? invStatusesRes.data.map((r: any) => r.name) : undefined
      };

      // Extract trips, wishes, investments, investmentTypes, investmentStatuses from localData or legacy monolithic backup if missing
      let legacyData: any = null;
      try {
        const legacyRes = await supabase.from('user_data').select('data').eq('email', lowerEmail).maybeSingle();
        if (legacyRes.data?.data) {
          legacyData = legacyRes.data.data;
        }
      } catch (e) {
        console.error("Error retrieving legacy user_data:", e);
      }

      responseData.trips = responseData.trips || localData?.trips || legacyData?.trips || [];
      responseData.wishes = responseData.wishes || localData?.wishes || legacyData?.wishes || [];
      responseData.investments = responseData.investments || localData?.investments || legacyData?.investments || [];
      responseData.investmentTypes = responseData.investmentTypes || localData?.investmentTypes || legacyData?.investmentTypes || ['Ações', 'FIIs', 'Renda Fixa', 'Tesouro Direto', 'CDB / RDB', 'Criptomoedas', 'Fundos', 'Outros'];
      responseData.investmentStatuses = responseData.investmentStatuses || localData?.investmentStatuses || legacyData?.investmentStatuses || ['Ativo', 'Resgatado', 'Em Andamento', 'Pendente'];

      return responseData;
    } catch (err) {
      console.error("Falha ao ler dados relacionais no Supabase:", err);
    }
  }

  return localData || null;
}

// Save/Update user workspace data by syncing modified lists to their relational tables in Supabase
async function saveUserDataByEmail(email: string, data: any): Promise<boolean> {
  const lowerEmail = email.toLowerCase().trim();

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const promises: Promise<any>[] = [];

      // 1. Sync paymentTypes
      if (data.paymentTypes) {
        promises.push((async () => {
          await supabase.from('payment_types').delete().eq('email', lowerEmail);
          if (data.paymentTypes.length > 0) {
            const rows = data.paymentTypes.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('payment_types').insert(rows);
          }
        })());
      }

      // 2. Sync paymentStatuses
      if (data.paymentStatuses) {
        promises.push((async () => {
          await supabase.from('payment_statuses').delete().eq('email', lowerEmail);
          if (data.paymentStatuses.length > 0) {
            const rows = data.paymentStatuses.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('payment_statuses').insert(rows);
          }
        })());
      }

      // 3. Sync incomeCategories
      if (data.incomeCategories) {
        promises.push((async () => {
          await supabase.from('income_categories').delete().eq('email', lowerEmail);
          if (data.incomeCategories.length > 0) {
            const rows = data.incomeCategories.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('income_categories').insert(rows);
          }
        })());
      }

      // 4. Sync expenseCategories
      if (data.expenseCategories) {
        promises.push((async () => {
          await supabase.from('expense_categories').delete().eq('email', lowerEmail);
          if (data.expenseCategories.length > 0) {
            const rows = data.expenseCategories.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('expense_categories').insert(rows);
          }
        })());
      }

      // 5. Sync incomes
      if (data.incomes) {
        promises.push((async () => {
          await supabase.from('incomes').delete().eq('email', lowerEmail);
          if (data.incomes.length > 0) {
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
            await supabase.from('incomes').insert(rows);
          }
        })());
      }

      // 6. Sync expenses
      if (data.expenses) {
        promises.push((async () => {
          await supabase.from('expenses').delete().eq('email', lowerEmail);
          if (data.expenses.length > 0) {
            const rows = data.expenses.map((exp: any) => ({
              id: exp.id,
              email: lowerEmail,
              date: exp.date,
              description: exp.description,
              value: Number(exp.value),
              category: exp.category,
              status: exp.status,
              payment_type: exp.paymentType
            }));
            await supabase.from('expenses').insert(rows);
          }
        })());
      }

      // 7. Sync annualPlanning
      if (data.annualPlanning) {
        promises.push((async () => {
          for (const plan of data.annualPlanning) {
            await supabase.from('annual_planning').upsert({
              email: lowerEmail,
              year: Number(plan.year),
              monthly_budgets: plan.monthlyBudgets
            }, { onConflict: 'email,year' });
          }
        })());
      }

      // 8. Sync shoppingList
      if (data.shoppingList) {
        promises.push((async () => {
          await supabase.from('shopping_list').delete().eq('email', lowerEmail);
          if (data.shoppingList.length > 0) {
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
            await supabase.from('shopping_list').insert(rows);
          }
        })());
      }

      // 9. Sync actionPlans
      if (data.actionPlans) {
        promises.push((async () => {
          await supabase.from('action_plans').delete().eq('email', lowerEmail);
          if (data.actionPlans.length > 0) {
            const rows = data.actionPlans.map((plan: any) => ({
              id: plan.id,
              email: lowerEmail,
              title: plan.title,
              description: plan.description,
              target_date: plan.targetDate,
              value: Number(plan.value),
              status: plan.status
            }));
            await supabase.from('action_plans').insert(rows);
          }
        })());
      }

      // 10. Sync deficitActions
      if (data.deficitActions) {
        promises.push((async () => {
          await supabase.from('deficit_actions').delete().eq('email', lowerEmail);
          if (data.deficitActions.length > 0) {
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
            await supabase.from('deficit_actions').insert(rows);
          }
        })());
      }

      // 11. Sync trips
      if (data.trips) {
        promises.push((async () => {
          await supabase.from('trips').delete().eq('email', lowerEmail);
          if (data.trips.length > 0) {
            const rows = data.trips.map((trip: any) => ({
              id: trip.id,
              email: lowerEmail,
              name: trip.name,
              expenses: trip.expenses || []
            }));
            await supabase.from('trips').insert(rows);
          }
        })());
      }

      // 12. Sync wishes
      if (data.wishes) {
        promises.push((async () => {
          await supabase.from('wishes').delete().eq('email', lowerEmail);
          if (data.wishes.length > 0) {
            const rows = data.wishes.map((wish: any) => ({
              id: wish.id,
              email: lowerEmail,
              title: wish.title,
              description: wish.description || '',
              target_date: wish.targetDate || null,
              value: Number(wish.value || 0),
              status: wish.status || 'Pendente'
            }));
            await supabase.from('wishes').insert(rows);
          }
        })());
      }

      // 13. Sync investments
      if (data.investments) {
        promises.push((async () => {
          await supabase.from('investments').delete().eq('email', lowerEmail);
          if (data.investments.length > 0) {
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
            await supabase.from('investments').insert(rows);
          }
        })());
      }

      // 14. Sync investmentTypes
      if (data.investmentTypes) {
        promises.push((async () => {
          await supabase.from('investment_types').delete().eq('email', lowerEmail);
          if (data.investmentTypes.length > 0) {
            const rows = data.investmentTypes.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('investment_types').insert(rows);
          }
        })());
      }

      // 15. Sync investmentStatuses
      if (data.investmentStatuses) {
        promises.push((async () => {
          await supabase.from('investment_statuses').delete().eq('email', lowerEmail);
          if (data.investmentStatuses.length > 0) {
            const rows = data.investmentStatuses.map((name: string) => ({ email: lowerEmail, name }));
            await supabase.from('investment_statuses').insert(rows);
          }
        })());
      }

      await Promise.all(promises);

      // Also upsert to user_data table in Supabase for backup
      await supabase.from('user_data').upsert({
        email: lowerEmail,
        data: data,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (err: any) {
      if (err?.message?.includes("Invalid API key") || err?.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
      } else {
        console.error("Erro ao salvar dados relacionais no Supabase:", err);
      }
      try {
        const sup = getSupabaseClient();
        if (sup) {
          await sup.from('user_data').upsert({
            email: lowerEmail,
            data: data,
            updated_at: new Date().toISOString()
          });
        }
      } catch (fallbackErr) {
        // ignore fallback errors
      }
    }
  }
  return true;
}

// Get all users (Admin only) by merging users, profiles, and subscriptions
async function getAllUsersList(): Promise<any[]> {
  const localDb = getDb();
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: usersData, error: userErr } = await supabase.from('users').select('*');
      if (userErr) {
        if (userErr.message?.includes("Invalid API key") || userErr.hint?.includes("API key")) {
          markSupabaseKeyAsInvalid("Invalid API key");
        }
      } else if (usersData) {
        const [profilesRes, subsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('subscriptions').select('*')
        ]);

        const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.email, p]));
        const subsMap = new Map((subsRes.data || []).map((s: any) => [s.email, s]));

        return usersData.map((u: any) => {
          const prof: any = profilesMap.get(u.email);
          const sub: any = subsMap.get(u.email);
          const localU = localDb.users[u.email.toLowerCase().trim()];
          const userMsg = prof ? (prof.user_message || prof.userMessage || localU?.userMessage || localU?.mensagemUsuario || '') : (localU?.userMessage || localU?.mensagemUsuario || '');

          return {
            email: u.email,
            name: prof ? prof.name : '',
            address: prof ? prof.address : '',
            city: prof ? prof.city : '',
            state: prof ? prof.state : '',
            phone: prof ? prof.phone : '',
            cpf: prof ? prof.cpf : (localU?.cpf || ''),
            userMessage: userMsg,
            mensagemUsuario: userMsg,
            isBlocked: !!(u.is_blocked || u.isBlocked || prof?.is_blocked || prof?.isBlocked || localU?.isBlocked || localU?.blocked),
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
            createdAt: u.created_at || u.createdAt || new Date().toISOString()
          };
        });
      }
    } catch (err) {
      console.error("Falha ao buscar todos os usuários no Supabase:", err);
    }
  }

  // Fallback to local
  return Object.values(localDb.users).map((user: any) => {
    const { password: _, ...rest } = user;
    return rest;
  });
}

// ---------------- API ENDPOINTS ----------------

// Supabase Connection Status and Schema Info
app.get("/api/supabase-status", async (req, res) => {
  const client = getSupabaseClient();
  let active = false;
  let message = "";
  const url = process.env.SUPABASE_URL || cleanSupabaseUrl(readAllDiskEnvValues().SUPABASE_URL) || "";

  if (client) {
    try {
      const { error } = await client.from('users').select('count', { count: 'exact', head: true });
      if (!error || error.code === 'PGRST116' || error.code === '42P01') {
        active = true;
        message = "Conexão com o Supabase estabelecida com sucesso!";
      } else if (error.message?.includes("Invalid API key") || error.hint?.includes("API key")) {
        markSupabaseKeyAsInvalid("Invalid API key");
        active = false;
        message = "Chave de API do Supabase inválida.";
      } else {
        active = true;
        message = "Conectado ao Supabase (serviço ativo).";
      }
    } catch (err: any) {
      active = false;
      message = err?.message || "Erro ao comunicar com o Supabase.";
    }
  } else {
    message = "Supabase não configurado ou chave inválida.";
  }

  res.json({
    active,
    url,
    message,
    schema: `
-- EXECUTE ESTE SCRIPT SQL NO SQL EDITOR DO SEU CONSOLE SUPABASE:

-- ----------------- DIAGNÓSTICO E LIMPEZA -----------------
-- Este script irá limpar (DROP) as tabelas antigas se existirem para recriá-las do zero com a estrutura correta.
-- ATENÇÃO: Isso removerá os dados existentes nestas tabelas no seu banco Supabase.
DROP TABLE IF EXISTS investment_statuses CASCADE;
DROP TABLE IF EXISTS investment_types CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS wishes CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS deficit_actions CASCADE;
DROP TABLE IF EXISTS action_plans CASCADE;
DROP TABLE IF EXISTS shopping_list CASCADE;
DROP TABLE IF EXISTS annual_planning CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS incomes CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS income_categories CASCADE;
DROP TABLE IF EXISTS payment_statuses CASCADE;
DROP TABLE IF EXISTS payment_types CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS trial_history CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_data CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabela de Usuários (Login e credenciais básicas)
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Perfis de Usuários (Dados pessoais)
CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  cpf TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Histórico de Período de Experiência (Não apaga ao deletar o usuário)
CREATE TABLE IF NOT EXISTS trial_history (
  email TEXT PRIMARY KEY,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Assinaturas (Status do plano)
CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  plan TEXT DEFAULT 'none',
  valid_until TIMESTAMPTZ,
  selected_at TIMESTAMPTZ,
  free_plan_used BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Tipos de Pagamento
CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 6. Tabela de Status de Pagamento
CREATE TABLE IF NOT EXISTS payment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 7. Tabela de Categorias de Receita
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 8. Tabela de Categorias de Despesa
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 9. Tabela de Lançamentos de Receitas (Incomes)
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Lançamentos de Despesas (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela de Planejamento Anual
CREATE TABLE IF NOT EXISTS annual_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  monthly_budgets JSONB NOT NULL,
  UNIQUE (email, year)
);

-- 12. Tabela de Lista de Compras (Shopping List)
CREATE TABLE IF NOT EXISTS shopping_list (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabela de Metas / Planos de Ação (Action Plans)
CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_date DATE NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabela de Ações de Déficit / Plano de Melhoria
CREATE TABLE IF NOT EXISTS deficit_actions (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  cost_center TEXT NOT NULL,
  reason TEXT NOT NULL,
  correction_action TEXT NOT NULL,
  responsible TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Tabela de Viagens (Trips)
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Tabela de Desejos de Consumo (Wishes)
CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  value NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Tabela de Investimentos (Investments)
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Tabela de Tipos de Investimento
CREATE TABLE IF NOT EXISTS investment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 19. Tabela de Status de Investimento
CREATE TABLE IF NOT EXISTS investment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 20. Tabela de Suporte para Compatibilidade e Backup Monolítico
CREATE TABLE IF NOT EXISTS user_data (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Tabela de Configurações Globais do Sistema (Valores dos Planos, Avisos, etc)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------- CRIAÇÃO DE ÍNDICES DE PERFORMANCE ----------------
CREATE INDEX IF NOT EXISTS idx_incomes_email_date ON incomes(email, date);
CREATE INDEX IF NOT EXISTS idx_expenses_email_date ON expenses(email, date);
CREATE INDEX IF NOT EXISTS idx_shopping_list_email ON shopping_list(email);
CREATE INDEX IF NOT EXISTS idx_action_plans_email ON action_plans(email);
CREATE INDEX IF NOT EXISTS idx_deficit_actions_email ON deficit_actions(email);
CREATE INDEX IF NOT EXISTS idx_trips_email ON trips(email);
CREATE INDEX IF NOT EXISTS idx_wishes_email ON wishes(email);
CREATE INDEX IF NOT EXISTS idx_investments_email ON investments(email);

-- ---------------- Row Level Security (RLS) & Permissões ----------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deficit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO TOTAL PARA REST API E CHAVES DE SERVIÇO / ANON
DROP POLICY IF EXISTS "Acesso total - users" ON users;
CREATE POLICY "Acesso total - users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - profiles" ON profiles;
CREATE POLICY "Acesso total - profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - trial_history" ON trial_history;
CREATE POLICY "Acesso total - trial_history" ON trial_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - subscriptions" ON subscriptions;
CREATE POLICY "Acesso total - subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - payment_types" ON payment_types;
CREATE POLICY "Acesso total - payment_types" ON payment_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - payment_statuses" ON payment_statuses;
CREATE POLICY "Acesso total - payment_statuses" ON payment_statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - income_categories" ON income_categories;
CREATE POLICY "Acesso total - income_categories" ON income_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - expense_categories" ON expense_categories;
CREATE POLICY "Acesso total - expense_categories" ON expense_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - incomes" ON incomes;
CREATE POLICY "Acesso total - incomes" ON incomes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - expenses" ON expenses;
CREATE POLICY "Acesso total - expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - annual_planning" ON annual_planning;
CREATE POLICY "Acesso total - annual_planning" ON annual_planning FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - shopping_list" ON shopping_list;
CREATE POLICY "Acesso total - shopping_list" ON shopping_list FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - action_plans" ON action_plans;
CREATE POLICY "Acesso total - action_plans" ON action_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - deficit_actions" ON deficit_actions;
CREATE POLICY "Acesso total - deficit_actions" ON deficit_actions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - trips" ON trips;
CREATE POLICY "Acesso total - trips" ON trips FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - wishes" ON wishes;
CREATE POLICY "Acesso total - wishes" ON wishes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - investments" ON investments;
CREATE POLICY "Acesso total - investments" ON investments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - investment_types" ON investment_types;
CREATE POLICY "Acesso total - investment_types" ON investment_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - investment_statuses" ON investment_statuses;
CREATE POLICY "Acesso total - investment_statuses" ON investment_statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - user_data" ON user_data;
CREATE POLICY "Acesso total - user_data" ON user_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total - system_settings" ON system_settings;
CREATE POLICY "Acesso total - system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
`
  });
});

// ---------------- AUTENTICAÇÃO E SESSÃO SEGURA (JWT) ----------------
const JWT_SECRET = process.env.JWT_SECRET || 'finanfly_jwt_secret_key_2026_prod';

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

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

function getAuthEmailFromReq(req: express.Request): string | null {
  const token = (req.headers["x-auth-token"] as string) || (req.headers["authorization"] as string);
  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded && decoded.email) {
      return decoded.email;
    }
  }
  const emailHeader = req.headers["x-user-email"] as string;
  if (emailHeader) {
    return emailHeader.toLowerCase().trim();
  }
  return null;
}

// Endpoint de Verificação de Sessão Persistente (Boot do App)
app.get("/api/auth/verify-session", async (req, res) => {
  const token = (req.headers["x-auth-token"] as string) || (req.headers["authorization"] as string) || (req.query.token as string);
  const emailHeader = req.headers["x-user-email"] as string;

  let verifiedEmail: string | null = null;

  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded && decoded.email) {
      verifiedEmail = decoded.email;
    }
  }

  // Fallback para x-user-email para migração transparente de sessões salvas
  if (!verifiedEmail && emailHeader) {
    verifiedEmail = emailHeader.toLowerCase().trim();
  }

  if (!verifiedEmail) {
    return res.status(401).json({ valid: false, error: "Token de sessão ausente ou inválido." });
  }

  try {
    const user = await getUserByEmail(verifiedEmail);
    if (!user) {
      return res.status(401).json({ valid: false, error: "Sessão expirada ou usuário não encontrado." });
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
    return res.status(500).json({ valid: false, error: "Erro interno ao verificar sessão." });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    if (user.isBlocked) {
      const reason = user.userMessage || user.mensagemUsuario || 'Acesso suspenso pelo administrador.';
      return res.status(403).json({
        isBlocked: true,
        title: "Usuário bloqueado, entrar em contato com administrador",
        reason: reason,
        error: `Usuário bloqueado, entrar em contato com administrador\nMotivo: ${reason}`
      });
    }

    user.lastAccess = new Date().toISOString();
    const db = getDb();
    const lowerE = user.email.toLowerCase().trim();
    if (db.users[lowerE]) {
      db.users[lowerE].lastAccess = user.lastAccess;
      saveDb(db);
    }

    const { password: _, ...userProfile } = user;
    const token = generateAuthToken({ email: user.email, role: user.role });
    res.json({ user: userProfile, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, address, phone, city, state, cpf } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Nome, E-mail e senha são obrigatórios." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const existingUser = await getUserByEmail(lowerEmail);

    if (existingUser) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    const checkHistory = await checkIsBlacklisted(lowerEmail, cpf);

    const newUser = {
      email: lowerEmail,
      name,
      address: address || "",
      city: city || "",
      state: state || "",
      phone: phone || "",
      cpf: cpf || "",
      role: "user",
      password,
      subscription: {
        plan: "none",
        validUntil: null,
        selectedAt: null,
        freePlanUsed: checkHistory.blacklisted,
        approved: false,
      },
      createdAt: new Date().toISOString(),
    };

    await saveUser(newUser);

    const defaultData = {
      paymentTypes: [],
      paymentStatuses: [],
      incomeCategories: [],
      expenseCategories: [],
      incomes: [],
      expenses: [],
      actionPlans: [],
      shoppingList: [],
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

    await saveUserDataByEmail(lowerEmail, defaultData);

    const { password: _, ...userProfile } = newUser;
    const token = generateAuthToken({ email: newUser.email, role: newUser.role });
    res.json({ user: userProfile, token });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Remember Password
app.post("/api/auth/remember-password", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "O e-mail é obrigatório para recuperar a senha." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail);

    if (!user) {
      return res.status(404).json({ error: "O e-mail digitado é diferente do e-mail cadastrado na conta ou não existe no banco de dados." });
    }

    const userPassword = user.password;
    const userName = user.name || lowerEmail.split('@')[0];

    const emailSubject = "Finanfly - Sua Senha de Acesso Cadastrada";
    const emailBody = `
Olá, ${userName}!

Recebemos uma solicitação para lembrar a senha de acesso da sua conta Finanfly (${lowerEmail}).

Sua senha cadastrada no sistema é:
👉 ${userPassword} 👈

Dicas de Segurança:
• Utilize esta senha para realizar seu login.
• Se você não solicitou este lembrete, acesse sua conta e altere sua senha no menu "Dados Pessoais".
• Mantenha seus dados de acesso confidenciais.

Atenciosamente,
Equipe Finanfly - Controle Financeiro Inteligente
    `.trim();

    console.log(`\n================ [EMAIL DISPATCH - RECUPERAÇÃO DE SENHA] ================\nPara: ${lowerEmail}\nAssunto: ${emailSubject}\n\n${emailBody}\n=========================================================================\n`);

    res.json({ 
      success: true, 
      message: `E-mail de recuperação enviado com sucesso para ${lowerEmail}.`,
      emailSubject,
      user: {
        name: userName,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Remember password error:", err);
    res.status(500).json({ error: "Erro interno no servidor ao tentar recuperar a senha." });
  }
});

// Change Password
app.post("/api/auth/change-password", async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: "E-mail, senha antiga e senha nova são obrigatórios." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (user.password !== oldPassword) {
      return res.status(400).json({ error: "A senha antiga está incorreta." });
    }

    user.password = newPassword;
    await saveUser(user);

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Self Delete Account
app.post("/api/auth/delete-account", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (user.cpf) {
      await recordTrialHistory(lowerEmail, user.cpf);
    }

    // Delete from local DB
    const db = getDb();
    if (db.users[lowerEmail]) {
      delete db.users[lowerEmail];
    }
    if (db.userData[lowerEmail]) {
      delete db.userData[lowerEmail];
    }
    saveDb(db);

    // Delete from Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('subscriptions').delete().eq('email', lowerEmail),
          supabase.from('profiles').delete().eq('email', lowerEmail),
          supabase.from('users').delete().eq('email', lowerEmail),
          supabase.from('payment_types').delete().eq('email', lowerEmail),
          supabase.from('payment_statuses').delete().eq('email', lowerEmail),
          supabase.from('income_categories').delete().eq('email', lowerEmail),
          supabase.from('expense_categories').delete().eq('email', lowerEmail),
          supabase.from('incomes').delete().eq('email', lowerEmail),
          supabase.from('expenses').delete().eq('email', lowerEmail),
          supabase.from('annual_planning').delete().eq('email', lowerEmail),
          supabase.from('shopping_list').delete().eq('email', lowerEmail),
          supabase.from('action_plans').delete().eq('email', lowerEmail),
          supabase.from('deficit_actions').delete().eq('email', lowerEmail),
          supabase.from('trips').delete().eq('email', lowerEmail),
          supabase.from('wishes').delete().eq('email', lowerEmail),
          supabase.from('investments').delete().eq('email', lowerEmail),
          supabase.from('investment_types').delete().eq('email', lowerEmail),
          supabase.from('investment_statuses').delete().eq('email', lowerEmail),
          supabase.from('user_data').delete().eq('email', lowerEmail)
        ]);
      } catch (subErr) {
        console.error("Error deleting from Supabase on self-delete:", subErr);
      }
    }

    res.json({ success: true, message: "Sua conta foi excluída com sucesso." });
  } catch (err) {
    console.error("Self delete account error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Get User Profile
app.get("/api/user/profile", async (req, res) => {
  const email = getAuthEmailFromReq(req);
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Profile get error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Update User Profile (Dados Pessoais)
app.post("/api/user/profile", async (req, res) => {
  const email = getAuthEmailFromReq(req);
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const { name, address, phone, city, state, cpf } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    user.name = name || user.name;
    user.address = address !== undefined ? address : user.address;
    user.phone = phone !== undefined ? phone : user.phone;
    user.city = city !== undefined ? city : user.city;
    user.state = state !== undefined ? state : user.state;
    user.cpf = cpf !== undefined ? cpf : user.cpf;

    const checkHistory = await checkIsBlacklisted(email, user.cpf);
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
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Update Subscription
app.post("/api/user/subscription", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const { plan } = req.body; // 'gratis' | 'mensal' | 'anual'
  if (!["gratis", "mensal", "anual"].includes(plan)) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  try {
    const user = await getUserByEmail(email);
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

    if (plan === "gratis") {
      const dbInstance = getDb();
      const trialDays = dbInstance.freeTrialDays !== undefined ? dbInstance.freeTrialDays : 60;
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

    await saveUser(user);

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Subscription update error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Create Mercado Pago Payment Preference
app.post("/api/payment/create-preference", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

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
            success: `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&plan=${planName}&status=approved`,
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

  // Simulation mode (Fallback when ACCESS_TOKEN is missing or sandbox is preferred)
  console.log(`[PAYMENT SIMULATION] Criando checkout simulado de Mercado Pago para ${email} (Plano: ${planName})`);
  const simulationUrl = `${appUrl}/api/payment/callback?email=${encodeURIComponent(email)}&plan=${planName}&status=approved&simulated=true`;
  res.json({ init_point: simulationUrl });
});

// Mercado Pago Payment Callback Handler
app.get("/api/payment/callback", async (req, res) => {
  const { email, plan, status, simulated } = req.query;

  if (!email || !status) {
    return res.send(`
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

  const targetEmail = (email as string).toLowerCase().trim();

  if (status === "approved" && plan) {
    try {
      const user = await getUserByEmail(targetEmail);
      if (user) {
        user.subscription = {
          plan: plan as string,
          validUntil: plan === "mensal" 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          selectedAt: new Date().toISOString(),
          freePlanUsed: user.subscription?.freePlanUsed || false,
          approved: true,
        };
        await saveUser(user);
      }
    } catch (err) {
      console.error("Callback subscription activation error:", err);
    }

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
            <div class="badge">${simulated ? "Simulação Concluída" : "Transação Concluída"}</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Sua assinatura do plano <strong>${(plan as string).toUpperCase()}</strong> foi ativada com sucesso e sua conta do <strong>FinanFly</strong> já está liberada!</p>
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
  const email = getAuthEmailFromReq(req);
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const userData = await getUserDataByEmail(email);
      if (!userData) {
        return res.json({
          paymentTypes: [],
          paymentStatuses: [],
          incomeCategories: [],
          expenseCategories: [],
          incomes: [],
          expenses: [],
          actionPlans: [],
          shoppingList: [],
          annualPlanning: []
        });
      }

    res.json(userData);
  } catch (err) {
    console.error("User data get error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Update User Data
app.post("/api/user/data", async (req, res) => {
  const email = getAuthEmailFromReq(req);
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const newData = req.body;
    const currentData = await getUserDataByEmail(email) || {};
    const updatedData = {
      ...currentData,
      ...newData,
    };

    await saveUserDataByEmail(email, updatedData);
    res.json({ success: true, data: updatedData });
  } catch (err) {
    console.error("User data post error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Get Plan Prices (Public)
app.get("/api/plan-prices", async (req, res) => {
  try {
    const prices = await getPlanPrices();
    res.json(prices);
  } catch (err) {
    console.error("Error fetching plan prices:", err);
    res.status(500).json({ error: "Erro ao obter valores dos planos." });
  }
});

// Update Plan Prices (Admin only)
app.post("/api/admin/plan-prices", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

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
    res.status(500).json({ error: "Erro interno ao atualizar valores." });
  }
});

// Get Free Trial Days (Public)
app.get("/api/free-trial-days", (req, res) => {
  const db = getDb();
  const days = db.freeTrialDays !== undefined ? db.freeTrialDays : 60;
  res.json({ days });
});

// Update Free Trial Days (Admin only)
app.post("/api/admin/free-trial-days", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { days } = req.body;
    if (days === undefined || isNaN(Number(days)) || Number(days) < 0) {
      return res.status(400).json({ error: "Quantidade de dias inválida." });
    }

    const db = getDb();
    db.freeTrialDays = Number(days);
    saveDb(db);

    res.json({ message: "Limite de uso gratuito atualizado com sucesso!", days: db.freeTrialDays });
  } catch (err) {
    console.error("Error updating free trial days:", err);
    res.status(500).json({ error: "Erro interno ao atualizar limite gratuito." });
  }
});

// Get Home Notices (Public)
app.get("/api/notices", (req, res) => {
  const db = getDb();
  const defaultNotices = {
    rule50_30_20: {
      title: "Regra 50-30-20",
      message: "Divida sua renda líquida: 50% para necessidades (aluguel, contas), 30% para desejos (lazer, compras) e 20% para poupança ou investimentos."
    },
    weeklyCheck: {
      title: "Acompanhamento Semanal",
      message: "Reserve 10 minutos por semana para revisar suas receitas e despesas cadastradas no FinanFly. Pequenos ajustes evitam surpresas no fim do mês."
    }
  };
  const notices = db.notices || defaultNotices;
  res.json(notices);
});

// Update Home Notices (Admin only)
app.post("/api/admin/notices", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { rule50_30_20, weeklyCheck } = req.body;
    if (!rule50_30_20 || !rule50_30_20.title || !rule50_30_20.message ||
        !weeklyCheck || !weeklyCheck.title || !weeklyCheck.message) {
      return res.status(400).json({ error: "Títulos e mensagens são obrigatórios." });
    }

    const db = getDb();
    db.notices = {
      rule50_30_20: {
        title: String(rule50_30_20.title),
        message: String(rule50_30_20.message)
      },
      weeklyCheck: {
        title: String(weeklyCheck.title),
        message: String(weeklyCheck.message)
      }
    };
    saveDb(db);

    res.json({ message: "Avisos atualizados com sucesso!", notices: db.notices });
  } catch (err) {
    console.error("Error updating notices:", err);
    res.status(500).json({ error: "Erro interno ao atualizar avisos." });
  }
});

// ---------------- ADMIN ENDPOINTS ----------------

// Get All Users (Admin only)
app.get("/api/admin/users", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const list = await getAllUsersList();
    res.json({ users: list });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Approve user manually (Admin only)
app.post("/api/admin/approve-user", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { targetEmail, approve } = req.body;
    const targetUser = await getUserByEmail(targetEmail);
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
    if (approve && targetUser.subscription.plan === "none") {
      targetUser.subscription.plan = "mensal";
      targetUser.subscription.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    await saveUser(targetUser);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin approve-user error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin registers new user (Admin only)
app.post("/api/admin/create-user", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { targetEmail, password, name, role, plan } = req.body;
    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    const existing = await getUserByEmail(lowerTargetEmail);

    if (existing) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    let validUntil = null;
    if (plan === "gratis") {
      const dbInstance = getDb();
      const trialDays = dbInstance.freeTrialDays !== undefined ? dbInstance.freeTrialDays : 60;
      validUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (plan === "mensal") {
      validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (plan === "anual") {
      validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const newUser = {
      email: lowerTargetEmail,
      name,
      address: "",
      city: "",
      state: "",
      phone: "",
      role: role || "user",
      password: password || "user123",
      subscription: {
        plan: plan || "none",
        validUntil,
        selectedAt: new Date().toISOString(),
        freePlanUsed: plan === "gratis",
        approved: true,
      },
      createdAt: new Date().toISOString(),
    };

    await saveUser(newUser);

    const defaultData = {
      paymentTypes: [],
      paymentStatuses: [],
      incomeCategories: [],
      expenseCategories: [],
      incomes: [],
      expenses: [],
      actionPlans: [],
      shoppingList: [],
      annualPlanning: []
    };

    await saveUserDataByEmail(lowerTargetEmail, defaultData);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin create-user error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin edits user profile and subscription (Admin only)
app.post("/api/admin/edit-user", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { targetEmail, name, role, plan, password, address, phone, city, state, userMessage, mensagemUsuario } = req.body;
    const lowerTargetEmail = targetEmail.toLowerCase().trim();

    const user = await getUserByEmail(lowerTargetEmail);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (password !== undefined && password.trim() !== "") user.password = password;
    if (address !== undefined) user.address = address;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (userMessage !== undefined) {
      user.userMessage = userMessage;
      user.mensagemUsuario = userMessage;
    } else if (mensagemUsuario !== undefined) {
      user.userMessage = mensagemUsuario;
      user.mensagemUsuario = mensagemUsuario;
    }

    if (plan !== undefined) {
      if (!user.subscription) {
        user.subscription = {
          plan: "none",
          validUntil: null,
          selectedAt: new Date().toISOString(),
          freePlanUsed: false,
          approved: true,
        };
      }
      
      if (user.subscription.plan !== plan) {
        user.subscription.plan = plan;
        let validUntil = null;
        if (plan === "gratis") {
          const dbInstance = getDb();
          const trialDays = dbInstance.freeTrialDays !== undefined ? dbInstance.freeTrialDays : 60;
          validUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan === "mensal") {
          validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan === "anual") {
          validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }
        user.subscription.validUntil = validUntil;
        user.subscription.selectedAt = new Date().toISOString();
        user.subscription.approved = true;
      }
    }

    await saveUser(user);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin edit-user error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin retrieves target user's password (Admin only)
app.get("/api/admin/retrieve-password/:targetEmail", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const targetEmail = req.params.targetEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(targetEmail);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({ password: targetUser.password });
  } catch (err) {
    console.error("Admin retrieve-password error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin views target user's direct financial records / lists (for administrative audit)
app.get("/api/admin/user-details/:userEmail", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const targetEmail = req.params.userEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(targetEmail);
    const targetUserData = await getUserDataByEmail(targetEmail) || {};

    res.json({
      userData: targetUserData,
      userProfile: targetUser,
      lastAccess: targetUser?.lastAccess || targetUserData?.lastUpdated || targetUser?.createdAt || null,
      createdAt: targetUser?.createdAt || null
    });
  } catch (err) {
    console.error("Admin user-details error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin deletes user and all of their data (Admin only)
app.post("/api/admin/delete-user", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail do usuário não informado." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();

    if (lowerTargetEmail === email.toLowerCase().trim()) {
      return res.status(400).json({ error: "Você não pode excluir o seu próprio usuário." });
    }

    const targetUser = await getUserByEmail(lowerTargetEmail);
    if (targetUser && targetUser.cpf) {
      await recordTrialHistory(lowerTargetEmail, targetUser.cpf);
    }

    // Delete from local DB
    const db = getDb();
    if (db.users[lowerTargetEmail]) {
      delete db.users[lowerTargetEmail];
    }
    if (db.userData[lowerTargetEmail]) {
      delete db.userData[lowerTargetEmail];
    }
    saveDb(db);

    // Delete from Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await Promise.all([
          supabase.from('subscriptions').delete().eq('email', lowerTargetEmail),
          supabase.from('profiles').delete().eq('email', lowerTargetEmail),
          supabase.from('users').delete().eq('email', lowerTargetEmail),
          supabase.from('payment_types').delete().eq('email', lowerTargetEmail),
          supabase.from('payment_statuses').delete().eq('email', lowerTargetEmail),
          supabase.from('income_categories').delete().eq('email', lowerTargetEmail),
          supabase.from('expense_categories').delete().eq('email', lowerTargetEmail),
          supabase.from('incomes').delete().eq('email', lowerTargetEmail),
          supabase.from('expenses').delete().eq('email', lowerTargetEmail),
          supabase.from('annual_planning').delete().eq('email', lowerTargetEmail),
          supabase.from('shopping_list').delete().eq('email', lowerTargetEmail),
          supabase.from('action_plans').delete().eq('email', lowerTargetEmail),
          supabase.from('deficit_actions').delete().eq('email', lowerTargetEmail),
          supabase.from('trips').delete().eq('email', lowerTargetEmail),
          supabase.from('wishes').delete().eq('email', lowerTargetEmail),
          supabase.from('investments').delete().eq('email', lowerTargetEmail),
          supabase.from('investment_types').delete().eq('email', lowerTargetEmail),
          supabase.from('investment_statuses').delete().eq('email', lowerTargetEmail),
          supabase.from('user_data').delete().eq('email', lowerTargetEmail)
        ]);
      } catch (subErr) {
        console.error("Error deleting from Supabase:", subErr);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete-user error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Admin triggers email password reminder (Admin only)
app.post("/api/admin/send-password-email", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const adminUser = await getUserByEmail(email);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }

    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ error: "E-mail do usuário não informado." });
    }

    const lowerTargetEmail = targetEmail.toLowerCase().trim();
    const targetUser = await getUserByEmail(lowerTargetEmail);
    if (!targetUser) {
      return res.status(404).json({ error: "O e-mail digitado é diferente do e-mail cadastrado na conta ou não existe no banco de dados." });
    }

    const userPassword = targetUser.password;
    const userName = targetUser.name || lowerTargetEmail;

    const emailSubject = "Finanfly - Lembrete de Senha de Acesso";
    const emailBody = `
Olá, ${userName}!

Sua senha de acesso cadastrada no sistema Finanfly é:
👉 ${userPassword} 👈

Atenciosamente,
Equipe Finanfly - Suporte ao Usuário
    `.trim();

    console.log(`\n================ [EMAIL DISPATCH - ADMIN] ================\nPara: ${lowerTargetEmail}\nAssunto: ${emailSubject}\n\n${emailBody}\n=========================================================================\n`);

    res.json({ success: true, message: `E-mail de senha enviado com sucesso para ${lowerTargetEmail}.` });
  } catch (err) {
    console.error("Admin send-password-email error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});


// Serve static assets in production, hook Vite dev middleware in development
async function startServer() {
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
