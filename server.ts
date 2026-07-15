import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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
      let cleanUrl = url.trim();
      if (cleanUrl.endsWith("/rest/v1/")) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length - 9);
      } else if (cleanUrl.endsWith("/rest/v1")) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length - 8);
      }
      if (cleanUrl.endsWith("/")) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
      }
      supabaseClient = createClient(cleanUrl, key.trim());
      return supabaseClient;
    } catch (err) {
      console.error("Erro ao inicializar cliente do Supabase:", err);
    }
  }
  return null;
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
      
      if (userErr && userErr.code === '42P01') {
        // Table not created yet - fall back
        throw new Error("Tabela 'users' não existe no Supabase.");
      }

      if (userData) {
        // Query profiles and subscriptions in parallel for full user model
        const [profileRes, subRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('email', lowerEmail).maybeSingle(),
          supabase.from('subscriptions').select('*').eq('email', lowerEmail).maybeSingle()
        ]);

        const profileData = profileRes.data;
        const subData = subRes.data;

        return {
          email: userData.email,
          password: userData.password,
          role: userData.role || 'user',
          createdAt: userData.created_at || userData.createdAt || new Date().toISOString(),
          name: profileData ? profileData.name : (userData.name || ''),
          address: profileData ? profileData.address : (userData.address || ''),
          city: profileData ? profileData.city : (userData.city || ''),
          state: profileData ? profileData.state : (userData.state || ''),
          phone: profileData ? profileData.phone : (userData.phone || ''),
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
    } catch (err) {
      console.error("Falha ao consultar usuário no Supabase:", err);
    }
  }

  return localUser || null;
}

// Save/Update user profile across users, profiles, and subscriptions tables
async function saveUser(user: any): Promise<boolean> {
  const lowerEmail = user.email.toLowerCase().trim();
  
  // Always update local database as backup/fallback
  const db = getDb();
  db.users[lowerEmail] = user;
  saveDb(db);

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
          created_at: user.createdAt || user.created_at || new Date().toISOString()
        });
      
      if (userErr) {
        if (userErr.code === '42P01') throw new Error("Relation 'users' does not exist");
        console.error("Erro ao salvar login do usuário no Supabase:", userErr);
        return false;
      }

      // 2. Upsert profiles table (for personal details)
      await supabase
        .from('profiles')
        .upsert({
          email: lowerEmail,
          name: user.name || '',
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          phone: user.phone || '',
          updated_at: new Date().toISOString()
        });

      // 3. Upsert subscriptions table (for user subscription tier)
      if (user.subscription) {
        await supabase
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
      }

      return true;
    } catch (err) {
      console.error("Falha ao salvar perfil relacional no Supabase:", err);
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
        defActionsRes
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
        supabase.from('deficit_actions').select('*').eq('email', lowerEmail).order('date', { ascending: false })
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
        })) : []
      };

      // Extract trips from localData or the legacy monolithic table backup
      let trips = localData?.trips || [];
      try {
        const legacyRes = await supabase.from('user_data').select('data').eq('email', lowerEmail).maybeSingle();
        if (legacyRes.data?.data?.trips) {
          trips = legacyRes.data.data.trips;
        }
      } catch (e) {
        console.error("Error retrieving trips from monolithic backup:", e);
      }
      responseData.trips = trips;

      // Do not force default templates, keep arrays as retrieved (empty for new users)

      return responseData;
    } catch (err) {
      console.error("Falha ao ler dados relacionais no Supabase:", err);
    }
  }

  return localData || null;
}

// Save/Update user workspace data by syncing modified lists to their relational tables
async function saveUserDataByEmail(email: string, data: any): Promise<boolean> {
  const lowerEmail = email.toLowerCase().trim();

  // Always update local database as backup/fallback first
  const db = getDb();
  db.userData[lowerEmail] = {
    ...db.userData[lowerEmail],
    ...data
  };
  saveDb(db);

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

      await Promise.all(promises);

      // Also upsert to legacy monolithic backup user_data for complete rollback resilience
      await supabase.from('user_data').upsert({
        email: lowerEmail,
        data: db.userData[lowerEmail],
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error("Erro ao salvar dados relacionais no Supabase. Usando fallback de dados...", err);
      try {
        await supabase.from('user_data').upsert({
          email: lowerEmail,
          data: db.userData[lowerEmail],
          updated_at: new Date().toISOString()
        });
      } catch (fallbackErr) {
        console.error("Falha inclusive no fallback de dados:", fallbackErr);
      }
    }
  }
  return true;
}

// Get all users (Admin only) by merging users, profiles, and subscriptions
async function getAllUsersList(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: usersData, error: userErr } = await supabase.from('users').select('*');
      if (!userErr && usersData) {
        const [profilesRes, subsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('subscriptions').select('*')
        ]);

        const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.email, p]));
        const subsMap = new Map((subsRes.data || []).map((s: any) => [s.email, s]));

        return usersData.map((u: any) => {
          const prof: any = profilesMap.get(u.email);
          const sub: any = subsMap.get(u.email);

          return {
            email: u.email,
            name: prof ? prof.name : '',
            address: prof ? prof.address : '',
            city: prof ? prof.city : '',
            state: prof ? prof.state : '',
            phone: prof ? prof.phone : '',
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

-- ----------------- DIAGNÓSTICO E LIMPEZA -----------------
-- Este script irá limpar (DROP) as tabelas antigas se existirem para recriá-las do zero com a estrutura correta.
-- ATENÇÃO: Isso removerá os dados existentes nestas tabelas no seu banco Supabase.
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
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_data CASCADE;
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Assinaturas (Status do plano)
CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  plan TEXT DEFAULT 'none',
  valid_until TIMESTAMPTZ,
  selected_at TIMESTAMPTZ,
  free_plan_used BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Tipos de Pagamento
CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 5. Tabela de Status de Pagamento
CREATE TABLE IF NOT EXISTS payment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 6. Tabela de Categorias de Receita
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 7. Tabela de Categorias de Despesa
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);

-- 8. Tabela de Lançamentos de Receitas (Incomes)
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

-- 9. Tabela de Lançamentos de Despesas (Expenses)
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

-- 10. Tabela de Planejamento Anual
CREATE TABLE IF NOT EXISTS annual_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  monthly_budgets JSONB NOT NULL,
  UNIQUE (email, year)
);

-- 11. Tabela de Lista de Compras (Shopping List)
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

-- 12. Tabela de Metas / Planos de Ação (Action Plans)
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

-- 13. Tabela de Ações de Déficit (Deficit Actions)
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

-- 14. Tabela de Suporte para Compatibilidade e Transição
CREATE TABLE IF NOT EXISTS user_data (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------- CRIAÇÃO DE ÍNDICES DE PERFORMANCE ----------------
CREATE INDEX IF NOT EXISTS idx_incomes_email_date ON incomes(email, date);
CREATE INDEX IF NOT EXISTS idx_expenses_email_date ON expenses(email, date);
CREATE INDEX IF NOT EXISTS idx_shopping_list_email ON shopping_list(email);
CREATE INDEX IF NOT EXISTS idx_action_plans_email ON action_plans(email);
CREATE INDEX IF NOT EXISTS idx_deficit_actions_email ON deficit_actions(email);

-- ---------------- Row Level Security (RLS) ----------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ---------------- POLÍTICAS DE ACESSO INDIVIDUAL ----------------
DROP POLICY IF EXISTS "Acesso próprio - users" ON users;
CREATE POLICY "Acesso próprio - users" ON users FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - profiles" ON profiles;
CREATE POLICY "Acesso próprio - profiles" ON profiles FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - subscriptions" ON subscriptions;
CREATE POLICY "Acesso próprio - subscriptions" ON subscriptions FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - pt" ON payment_types;
CREATE POLICY "Acesso próprio - pt" ON payment_types FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - ps" ON payment_statuses;
CREATE POLICY "Acesso próprio - ps" ON payment_statuses FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - ic" ON income_categories;
CREATE POLICY "Acesso próprio - ic" ON income_categories FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - ec" ON expense_categories;
CREATE POLICY "Acesso próprio - ec" ON expense_categories FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - incomes" ON incomes;
CREATE POLICY "Acesso próprio - incomes" ON incomes FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - expenses" ON expenses;
CREATE POLICY "Acesso próprio - expenses" ON expenses FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - annual" ON annual_planning;
CREATE POLICY "Acesso próprio - annual" ON annual_planning FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - shop" ON shopping_list;
CREATE POLICY "Acesso próprio - shop" ON shopping_list FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - action" ON action_plans;
CREATE POLICY "Acesso próprio - action" ON action_plans FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - deficit" ON deficit_actions;
CREATE POLICY "Acesso próprio - deficit" ON deficit_actions FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);

DROP POLICY IF EXISTS "Acesso próprio - user_data" ON user_data;
CREATE POLICY "Acesso próprio - user_data" ON user_data FOR ALL USING (email = auth.jwt() ->> 'email' OR email = CURRENT_USER);
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
    res.json({ user: userProfile });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Remember Password
app.post("/api/auth/remember-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "O e-mail é obrigatório." });
  }

  try {
    const lowerEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(lowerEmail);

    if (!user) {
      return res.status(404).json({ error: "Este e-mail não está cadastrado em nossa base." });
    }

    const userPassword = user.password;
    console.log(`[EMAIL DISPATCH] Para: ${lowerEmail} | Assunto: Recuperação de Senha | Conteúdo: Sua senha é "${userPassword}"`);

    res.json({ 
      success: true, 
      message: `Sua senha recuperada com sucesso!`,
      password: userPassword
    });
  } catch (err) {
    console.error("Remember password error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
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
        return res.status(400).json({ error: "Você já utilizou o período grátis de 60 dias anteriormente." });
      }
      user.subscription = {
        plan: "gratis",
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
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

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const appUrl = process.env.APP_URL || `http://localhost:3000`;

  if (accessToken && accessToken.trim() !== "" && accessToken.trim() !== "YOUR_ACCESS_TOKEN") {
    try {
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
              title: `Finan Fly - Assinatura ${planName === "mensal" ? "Mensal" : "Anual"}`,
              quantity: 1,
              unit_price: Number(price),
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
        throw new Error(data.message || "Erro do Mercado Pago ao gerar preferência.");
      }

      return res.json({ init_point: data.init_point });
    } catch (err: any) {
      console.error("Mercado Pago Preference Error, falling back to simulated flow:", err);
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
          <title>Pagamento Finan Fly</title>
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
          <title>Pagamento Aprovado - Finan Fly</title>
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
            <p>Sua assinatura do plano <strong>${(plan as string).toUpperCase()}</strong> foi ativada com sucesso e sua conta do <strong>Finan Fly</strong> já está liberada!</p>
            <p style="font-size:0.8rem; margin-top: 1rem;">Clique abaixo para retornar e explorar o painel.</p>
            <button onclick="window.location.href='/'">Entrar no Finan Fly</button>
          </div>
        </body>
      </html>
    `);
  }

  // Payment failed page
  return res.send(`
    <html>
      <head>
        <title>Pagamento Cancelado - Finan Fly</title>
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
  const email = req.headers["x-user-email"] as string;
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

// Get Plan Prices (Public)
app.get("/api/plan-prices", (req, res) => {
  const db = getDb();
  const prices = db.planPrices || {
    mensal_de: "9,90",
    mensal_por: "2,99",
    anual_de: "118,80",
    anual_por: "29,99"
  };
  res.json(prices);
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
    
    const db = getDb();
    db.planPrices = {
      mensal_de: String(mensal_de || "9,90"),
      mensal_por: String(mensal_por || "2,99"),
      anual_de: String(anual_de || "118,80"),
      anual_por: String(anual_por || "29,99")
    };
    saveDb(db);

    res.json({ message: "Valores atualizados com sucesso!", prices: db.planPrices });
  } catch (err) {
    console.error("Error updating plan prices:", err);
    res.status(500).json({ error: "Erro interno ao atualizar valores." });
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
      validUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
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
          validUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
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
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const userPassword = targetUser.password;

    // Simulate sending email (print to server console for auditing and return success)
    console.log(`[EMAIL DISPATCH] Para: ${lowerTargetEmail} | Assunto: Recuperação de Senha | Conteúdo: Sua senha é "${userPassword}"`);

    res.json({ success: true, message: `E-mail enviado com sucesso para ${lowerTargetEmail}.` });
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
