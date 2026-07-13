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

// ---------------- API ENDPOINTS ----------------

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();
  const user = db.users[lowerEmail];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }

  // Omit password before sending
  const { password: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

// Register
app.post("/api/auth/register", (req, res) => {
  const { email, password, name, address, phone, city, state } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Nome, E-mail e senha são obrigatórios." });
  }

  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();

  if (db.users[lowerEmail]) {
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
      approved: false, // Wait for admin approval or direct payment
    },
    createdAt: new Date().toISOString(),
  };

  db.users[lowerEmail] = newUser;

  // Initialize their workspace data
  db.userData[lowerEmail] = {
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

  saveDb(db);

  const { password: _, ...userProfile } = newUser;
  res.json({ user: userProfile });
});

// Get User Profile
app.get("/api/user/profile", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const user = db.users[email.toLowerCase().trim()];
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const { password: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

// Update User Profile (Dados Pessoais)
app.post("/api/user/profile", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const { name, address, phone, city, state } = req.body;
  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();
  const user = db.users[lowerEmail];

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  user.name = name || user.name;
  user.address = address !== undefined ? address : user.address;
  user.phone = phone !== undefined ? phone : user.phone;
  user.city = city !== undefined ? city : user.city;
  user.state = state !== undefined ? state : user.state;

  db.users[lowerEmail] = user;
  saveDb(db);

  const { password: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

// Update Subscription
app.post("/api/user/subscription", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const { plan } = req.body; // 'gratis' | 'mensal' | 'anual'
  if (!["gratis", "mensal", "anual"].includes(plan)) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();
  const user = db.users[lowerEmail];

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  if (plan === "gratis") {
    if (user.subscription.freePlanUsed) {
      return res.status(400).json({ error: "Você já utilizou o período grátis de 45 dias anteriormente." });
    }
    user.subscription = {
      plan: "gratis",
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days
      selectedAt: new Date().toISOString(),
      freePlanUsed: true,
      approved: true,
    };
  } else if (plan === "mensal") {
    user.subscription = {
      plan: "mensal",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      selectedAt: new Date().toISOString(),
      freePlanUsed: user.subscription.freePlanUsed || false,
      approved: true, // Auto-approved for simulation
    };
  } else if (plan === "anual") {
    user.subscription = {
      plan: "anual",
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 365 days
      selectedAt: new Date().toISOString(),
      freePlanUsed: user.subscription.freePlanUsed || false,
      approved: true, // Auto-approved for simulation
    };
  }

  db.users[lowerEmail] = user;
  saveDb(db);

  const { password: _, ...userProfile } = user;
  res.json({ user: userProfile });
});

// Get User Data
app.get("/api/user/data", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();
  const userData = db.userData[lowerEmail];

  if (!userData) {
    // Return empty templates if somehow missing
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
});

// Update User Data
app.post("/api/user/data", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const newData = req.body;
  const db = getDb();
  const lowerEmail = email.toLowerCase().trim();

  db.userData[lowerEmail] = {
    ...db.userData[lowerEmail],
    ...newData,
  };

  saveDb(db);
  res.json({ success: true, data: db.userData[lowerEmail] });
});

// ---------------- ADMIN ENDPOINTS ----------------

// Get All Users (Admin only)
app.get("/api/admin/users", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  // Return all users (excluding passwords)
  const usersList = Object.values(db.users).map(user => {
    const { password: _, ...rest } = user;
    return rest;
  });

  res.json({ users: usersList });
});

// Approve user manually (Admin only)
app.post("/api/admin/approve-user", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  const { targetEmail, approve } = req.body;
  const targetUser = db.users[targetEmail.toLowerCase().trim()];
  if (!targetUser) {
    return res.status(404).json({ error: "Usuário alvo não encontrado." });
  }

  targetUser.subscription.approved = approve;
  if (approve && targetUser.subscription.plan === "none") {
    // If approved and no plan, give them a monthly trial or manual admin plan
    targetUser.subscription.plan = "mensal";
    targetUser.subscription.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  db.users[targetEmail.toLowerCase().trim()] = targetUser;
  saveDb(db);

  res.json({ success: true });
});

// Admin registers new user (Admin only)
app.post("/api/admin/create-user", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  const { targetEmail, password, name, role, plan } = req.body;
  const lowerTargetEmail = targetEmail.toLowerCase().trim();

  if (db.users[lowerTargetEmail]) {
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

  db.users[lowerTargetEmail] = newUser;

  db.userData[lowerTargetEmail] = {
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

  saveDb(db);
  res.json({ success: true });
});

// Admin edits user profile and subscription (Admin only)
app.post("/api/admin/edit-user", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  const { targetEmail, name, role, plan, password, address, phone, city, state } = req.body;
  const lowerTargetEmail = targetEmail.toLowerCase().trim();

  const user = db.users[lowerTargetEmail];
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
      user.subscription.approved = true; // Auto approve admin changes
    }
  }

  db.users[lowerTargetEmail] = user;
  saveDb(db);

  res.json({ success: true });
});

// Admin retrieves target user's password (Admin only)
app.get("/api/admin/retrieve-password/:targetEmail", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  const targetEmail = req.params.targetEmail.toLowerCase().trim();
  const targetUser = db.users[targetEmail];
  if (!targetUser) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  res.json({ password: targetUser.password });
});

// Admin views target user's direct financial records / lists (for administrative audit)
app.get("/api/admin/user-details/:userEmail", (req, res) => {
  const email = req.headers["x-user-email"] as string;
  if (!email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const db = getDb();
  const adminUser = db.users[email.toLowerCase().trim()];
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }

  const targetEmail = req.params.userEmail.toLowerCase().trim();
  const targetUserData = db.userData[targetEmail] || {};
  res.json(targetUserData);
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
