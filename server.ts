import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), "db.json");

// Default initial state
interface Database {
  users: { [email: string]: any };
  userData: { [email: string]: any };
}

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb: Database = {
      users: {
        "admin@finanfly.com": {
          email: "admin@finanfly.com",
          name: "Administrador Geral",
          address: "Sede Finanfly, 100",
          city: "São Paulo",
          state: "SP",
          phone: "11999999999",
          role: "admin",
          password: "admin",
          subscription: {
            plan: "anual",
            validUntil: "2030-12-31T23:59:59.000Z",
            selectedAt: new Date().toISOString(),
            freePlanUsed: true,
            approved: true,
          },
          createdAt: new Date().toISOString(),
        },
        "user@finanfly.com": {
          email: "user@finanfly.com",
          name: "João da Silva",
          address: "Rua das Flores, 123",
          city: "São Paulo",
          state: "SP",
          phone: "11988888888",
          role: "user",
          password: "user",
          subscription: {
            plan: "mensal",
            validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
            selectedAt: new Date().toISOString(),
            freePlanUsed: false,
            approved: true,
          },
          createdAt: new Date().toISOString(),
        },
        "expired@finanfly.com": {
          email: "expired@finanfly.com",
          name: "Maria Souza",
          address: "Av. Paulista, 456",
          city: "São Paulo",
          state: "SP",
          phone: "11977777777",
          role: "user",
          password: "user",
          subscription: {
            plan: "gratis",
            validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2 days ago
            selectedAt: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000).toISOString(),
            freePlanUsed: true,
            approved: true,
          },
          createdAt: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000).toISOString(),
        }
      },
      userData: {
        "user@finanfly.com": {
          paymentTypes: ["Pix", "Cartão de Crédito", "Dinheiro", "Boleto", "Cartão de Débito"],
          paymentStatuses: ["Pago", "Pendente", "Atrasado"],
          incomeCategories: ["Salário", "Freelance", "Investimentos", "Bônus", "Outros"],
          expenseCategories: ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Outros"],
          incomes: [
            { id: "inc-1", date: "2026-06-05", description: "Salário Mensal", value: 5500.00, category: "Salário", status: "Pago", paymentType: "Pix" },
            { id: "inc-2", date: "2026-06-15", description: "Projeto Freelance", value: 1200.00, category: "Freelance", status: "Pago", paymentType: "Pix" },
            { id: "inc-3", date: "2026-06-25", description: "Rendimentos FIIs", value: 350.00, category: "Investimentos", status: "Pago", paymentType: "Pix" },
            { id: "inc-4", date: "2025-06-05", description: "Salário Antigo 2025", value: 5000.00, category: "Salário", status: "Pago", paymentType: "Pix" },
            { id: "inc-5", date: "2024-06-05", description: "Salário Antigo 2024", value: 4500.00, category: "Salário", status: "Pago", paymentType: "Pix" },
            { id: "inc-6", date: "2023-06-05", description: "Salário Antigo 2023", value: 4200.00, category: "Salário", status: "Pago", paymentType: "Pix" },
            { id: "inc-7", date: "2022-06-05", description: "Salário Antigo 2022", value: 3800.00, category: "Salário", status: "Pago", paymentType: "Pix" }
          ],
          expenses: [
            { id: "exp-1", date: "2026-06-02", description: "Aluguel Apartamento", value: 1800.00, category: "Moradia", status: "Pago", paymentType: "Boleto" },
            { id: "exp-2", date: "2026-06-04", description: "Supermercado Semanal", value: 450.00, category: "Alimentação", status: "Pago", paymentType: "Cartão de Crédito" },
            { id: "exp-3", date: "2026-06-10", description: "Combustível Carro", value: 200.00, category: "Transporte", status: "Pago", paymentType: "Pix" },
            { id: "exp-4", date: "2026-06-12", description: "Jantar Especial", value: 250.00, category: "Lazer", status: "Pago", paymentType: "Cartão de Crédito" },
            { id: "exp-5", date: "2026-06-18", description: "Consulta Médica", value: 150.00, category: "Saúde", status: "Pago", paymentType: "Pix" },
            { id: "exp-6", date: "2026-06-20", description: "Plano de Internet", value: 120.00, category: "Moradia", status: "Pendente", paymentType: "Boleto" },
            { id: "exp-7", date: "2026-06-22", description: "Curso Online TypeScript", value: 299.00, category: "Educação", status: "Pago", paymentType: "Cartão de Crédito" },
            { id: "exp-8", date: "2025-06-10", description: "Despesa Histórica 2025", value: 2500.00, category: "Moradia", status: "Pago", paymentType: "Boleto" },
            { id: "exp-9", date: "2024-06-10", description: "Despesa Histórica 2024", value: 2100.00, category: "Moradia", status: "Pago", paymentType: "Boleto" },
            { id: "exp-10", date: "2023-06-10", description: "Despesa Histórica 2023", value: 1900.00, category: "Moradia", status: "Pago", paymentType: "Boleto" },
            { id: "exp-11", date: "2022-06-10", description: "Despesa Histórica 2022", value: 1800.00, category: "Moradia", status: "Pago", paymentType: "Boleto" }
          ],
          actionPlans: [
            { id: "plan-1", title: "Reserva de Emergência", description: "Acumular 6 meses de despesas essenciais", targetDate: "2026-12-31", value: 15000.00, status: "Em Andamento" },
            { id: "plan-2", title: "Quitar Cartão de Crédito", description: "Pagar todo o saldo rotativo para evitar juros", targetDate: "2026-07-10", value: 1200.00, status: "Pendente" },
            { id: "plan-3", title: "Investimento Anual", description: "Atingir R$ 5.000 em investimentos de renda fixa", targetDate: "2026-12-15", value: 5000.00, status: "Em Andamento" }
          ],
          shoppingList: [
            { id: "shop-1", name: "Arroz 5kg", quantity: 2, price: 25.90, category: "Alimentação", checked: false },
            { id: "shop-2", name: "Feijão Preto 1kg", quantity: 3, price: 8.50, category: "Alimentação", checked: true },
            { id: "shop-3", name: "Detergente Líquido", quantity: 5, price: 2.20, category: "Outros", checked: false },
            { id: "shop-4", name: "Lâmpadas LED", quantity: 4, price: 12.00, category: "Moradia", checked: false }
          ],
          annualPlanning: [
            {
              year: 2026,
              monthlyBudgets: Array.from({ length: 12 }, (_, i) => ({
                month: i,
                incomeBudget: 6000.00,
                expenseBudget: 4000.00
              }))
            }
          ]
        },
        "expired@finanfly.com": {
          paymentTypes: ["Pix", "Cartão de Crédito", "Dinheiro", "Boleto"],
          paymentStatuses: ["Pago", "Pendente", "Atrasado"],
          incomeCategories: ["Salário", "Outros"],
          expenseCategories: ["Moradia", "Alimentação", "Outros"],
          incomes: [],
          expenses: [],
          actionPlans: [],
          shoppingList: [],
          annualPlanning: []
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
  } else {
    // If the DB exists, migrate old references from finanfy to finanfly
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      if (content.includes("finanfy.com") || content.includes("Finanfy")) {
        console.log("Migrating database keys and domains to Finanfly...");
        const migrated = content
          .replace(/@finanfy\.com/g, "@finanfly.com")
          .replace(/finanfy\.com/g, "finanfly.com")
          .replace(/Finanfy/g, "Finanfly");
        fs.writeFileSync(DB_FILE, migrated);
      }
    } catch (err) {
      console.error("Failed to run database migration:", err);
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
  } catch (error) {
    console.error("Error writing to database file", error);
  }
}

import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (url && key && url.trim() !== "" && key.trim() !== "") {
    try {
      supabaseClient = createClient(url, key);
      return supabaseClient;
    } catch (err) {
      console.error("Erro ao inicializar cliente do Supabase:", err);
    }
  }
  return null;
}

// Get user by email with auto-migration from local JSON DB to Supabase
async function getUserByEmail(email: string): Promise<any> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  const db = getDb();
  const localUser = db.users[lowerEmail];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', lowerEmail)
        .maybeSingle();
      
      if (!error && data) {
        return data;
      }

      // If user exists locally but not in Supabase, migrate them automatically
      if (!data && localUser) {
        console.log(`Migrando usuário ${lowerEmail} para o Supabase...`);
        await saveUser(localUser);
        const localData = db.userData[lowerEmail];
        if (localData) {
          await saveUserDataByEmail(lowerEmail, localData);
        }
        return localUser;
      }
    } catch (err) {
      console.error("Falha ao consultar usuário no Supabase:", err);
    }
  }

  return localUser || null;
}

// Save/Update user profile
async function saveUser(user: any): Promise<boolean> {
  const lowerEmail = user.email.toLowerCase().trim();
  
  // Always update local database as backup/fallback
  const db = getDb();
  db.users[lowerEmail] = user;
  saveDb(db);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          email: lowerEmail,
          name: user.name,
          address: user.address,
          city: user.city,
          state: user.state,
          phone: user.phone,
          role: user.role,
          password: user.password,
          subscription: user.subscription,
          created_at: user.createdAt || new Date().toISOString()
        });
      
      if (error) {
        console.error("Erro ao salvar usuário no Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Falha ao salvar usuário no Supabase:", err);
    }
  }
  return true;
}

// Get user workspace data
async function getUserDataByEmail(email: string): Promise<any> {
  const lowerEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  const db = getDb();
  const localData = db.userData[lowerEmail];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('email', lowerEmail)
        .maybeSingle();
      
      if (!error && data && data.data) {
        return data.data;
      }

      // If user has local data but not in Supabase, migrate it
      if ((!data || !data.data) && localData) {
        console.log(`Migrando dados do workspace de ${lowerEmail} para o Supabase...`);
        await saveUserDataByEmail(lowerEmail, localData);
        return localData;
      }
    } catch (err) {
      console.error("Falha ao buscar dados do usuário no Supabase:", err);
    }
  }

  return localData || null;
}

// Save/Update user workspace data
async function saveUserDataByEmail(email: string, data: any): Promise<boolean> {
  const lowerEmail = email.toLowerCase().trim();

  // Always update local database as backup/fallback
  const db = getDb();
  db.userData[lowerEmail] = {
    ...db.userData[lowerEmail],
    ...data
  };
  saveDb(db);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({
          email: lowerEmail,
          data: db.userData[lowerEmail],
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Erro ao salvar dados no Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Falha ao salvar dados no Supabase:", err);
    }
  }
  return true;
}

// Get all users (Admin only)
async function getAllUsersList(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (!error && data) {
        return data.map((u: any) => ({
          email: u.email,
          name: u.name,
          address: u.address,
          city: u.city,
          state: u.state,
          phone: u.phone,
          role: u.role,
          subscription: u.subscription,
          createdAt: u.created_at || u.createdAt || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error("Falha ao buscar todos os usuários no Supabase:", err);
    }
  }

  // Fallback to local
  const db = getDb();
  return Object.values(db.users).map((user: any) => {
    const { password: _, ...rest } = user;
    return rest;
  });
}

// ---------------- API ENDPOINTS ----------------

// Supabase Connection Status and Schema Info
app.get("/api/supabase-status", (req, res) => {
  const active = !!getSupabaseClient();
  res.json({
    active,
    url: process.env.SUPABASE_URL || "",
    schema: `
-- EXECUTE ESTE SCRIPT SQL NO SQL EDITOR DO SEU CONSOLE SUPABASE:

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  password TEXT,
  subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_data (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`
  });
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

    const { password: _, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, address, phone, city, state } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Nome, E-mail e senha são obrigatórios." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const existingUser = await getUserByEmail(lowerEmail);

    if (existingUser) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    const newUser = {
      email: lowerEmail,
      name,
      address: address || "",
      city: city || "",
      state: state || "",
      phone: phone || "",
      role: "user",
      password,
      subscription: {
        plan: "none",
        validUntil: null,
        selectedAt: null,
        freePlanUsed: false,
        approved: false,
      },
      createdAt: new Date().toISOString(),
    };

    await saveUser(newUser);

    const defaultData = {
      paymentTypes: ["Pix", "Cartão de Crédito", "Dinheiro", "Boleto"],
      paymentStatuses: ["Pago", "Pendente", "Atrasado"],
      incomeCategories: ["Salário", "Investimentos", "Freelance", "Outros"],
      expenseCategories: ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Outros"],
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
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Get User Profile
app.get("/api/user/profile", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
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
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const { name, address, phone, city, state } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    user.name = name || user.name;
    user.address = address !== undefined ? address : user.address;
    user.phone = phone !== undefined ? phone : user.phone;
    user.city = city !== undefined ? city : user.city;
    user.state = state !== undefined ? state : user.state;

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
      if (user.subscription.freePlanUsed) {
        return res.status(400).json({ error: "Você já utilizou o período grátis de 45 dias anteriormente." });
      }
      user.subscription = {
        plan: "gratis",
        validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
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

// Get User Data
app.get("/api/user/data", async (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const userData = await getUserDataByEmail(email);
    if (!userData) {
      return res.json({
        paymentTypes: ["Pix", "Cartão de Crédito", "Dinheiro", "Boleto"],
        paymentStatuses: ["Pago", "Pendente", "Atrasado"],
        incomeCategories: ["Salário", "Investimentos", "Freelance", "Outros"],
        expenseCategories: ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Outros"],
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
  const email = req.headers["x-user-email"] as string;
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
      validUntil = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
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
      paymentTypes: ["Pix", "Cartão de Crédito", "Dinheiro", "Boleto"],
      paymentStatuses: ["Pago", "Pendente", "Atrasado"],
      incomeCategories: ["Salário", "Investimentos", "Freelance", "Outros"],
      expenseCategories: ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Outros"],
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

    const { targetEmail, name, role, plan, password, address, phone, city, state } = req.body;
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
          validUntil = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
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
    const targetUserData = await getUserDataByEmail(targetEmail) || {};
    res.json(targetUserData);
  } catch (err) {
    console.error("Admin user-details error:", err);
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
