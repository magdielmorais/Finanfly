// Catalog of all 21 application tables in Supabase for Finanfly
// All schemas are 100% non-destructive: NO DROP TABLE, NO DATA LOSS!

export interface SchemaTableDefinition {
  name: string;
  category: 'auth' | 'finances' | 'planning' | 'system';
  description: string;
  createSql: string;
  indexesSql?: string[];
  columnsAlterSql?: string[];
  rlsPolicySql?: string;
}

export const DATABASE_SCHEMA_CATALOG: SchemaTableDefinition[] = [
  {
    name: 'users',
    category: 'auth',
    description: 'Usuários, credenciais de login e status de bloqueio',
    createSql: `CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    columnsAlterSql: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';`
    ],
    rlsPolicySql: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - users" ON users;
CREATE POLICY "Acesso total - users" ON users FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'profiles',
    category: 'auth',
    description: 'Perfis de usuários, dados pessoais, CPF e mensagem personalizada',
    createSql: `CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  cpf TEXT,
  user_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    columnsAlterSql: [
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_message TEXT;`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;`
    ],
    rlsPolicySql: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - profiles" ON profiles;
CREATE POLICY "Acesso total - profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'trial_history',
    category: 'auth',
    description: 'Histórico de períodos de teste gratuitos (persistente)',
    createSql: `CREATE TABLE IF NOT EXISTS trial_history (
  email TEXT PRIMARY KEY,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    rlsPolicySql: `ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - trial_history" ON trial_history;
CREATE POLICY "Acesso total - trial_history" ON trial_history FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'subscriptions',
    category: 'auth',
    description: 'Planos de assinatura, datas de validade e aprovações',
    createSql: `CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  plan TEXT DEFAULT 'none',
  valid_until TIMESTAMPTZ,
  selected_at TIMESTAMPTZ,
  free_plan_used BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    columnsAlterSql: [
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS free_plan_used BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;`
    ],
    rlsPolicySql: `ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - subscriptions" ON subscriptions;
CREATE POLICY "Acesso total - subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'payment_types',
    category: 'finances',
    description: 'Tipos de pagamento customizados (ex: Dinheiro, Pix, Cartão)',
    createSql: `CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_payment_types_email ON payment_types(email);`
    ],
    rlsPolicySql: `ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - payment_types" ON payment_types;
CREATE POLICY "Acesso total - payment_types" ON payment_types FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'payment_statuses',
    category: 'finances',
    description: 'Situações de pagamento customizadas (ex: Pago, Pendente, Atrasado)',
    createSql: `CREATE TABLE IF NOT EXISTS payment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_payment_statuses_email ON payment_statuses(email);`
    ],
    rlsPolicySql: `ALTER TABLE payment_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - payment_statuses" ON payment_statuses;
CREATE POLICY "Acesso total - payment_statuses" ON payment_statuses FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'income_categories',
    category: 'finances',
    description: 'Categorias de receitas cadastradas pelo usuário',
    createSql: `CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_income_categories_email ON income_categories(email);`
    ],
    rlsPolicySql: `ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - income_categories" ON income_categories;
CREATE POLICY "Acesso total - income_categories" ON income_categories FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'expense_categories',
    category: 'finances',
    description: 'Categorias de despesas cadastradas pelo usuário',
    createSql: `CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_expense_categories_email ON expense_categories(email);`
    ],
    rlsPolicySql: `ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - expense_categories" ON expense_categories;
CREATE POLICY "Acesso total - expense_categories" ON expense_categories FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'incomes',
    category: 'finances',
    description: 'Lançamentos individuais de receitas financeiras',
    createSql: `CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_incomes_email ON incomes(email);`,
      `CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);`
    ],
    rlsPolicySql: `ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - incomes" ON incomes;
CREATE POLICY "Acesso total - incomes" ON incomes FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'expenses',
    category: 'finances',
    description: 'Lançamentos individuais de despesas financeiras',
    createSql: `CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_expenses_email ON expenses(email);`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`
    ],
    rlsPolicySql: `ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - expenses" ON expenses;
CREATE POLICY "Acesso total - expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'annual_planning',
    category: 'planning',
    description: 'Planejamento financeiro anual e orçamentos mensais',
    createSql: `CREATE TABLE IF NOT EXISTS annual_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  monthly_budgets JSONB NOT NULL,
  UNIQUE (email, year)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_annual_planning_email ON annual_planning(email);`
    ],
    rlsPolicySql: `ALTER TABLE annual_planning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - annual_planning" ON annual_planning;
CREATE POLICY "Acesso total - annual_planning" ON annual_planning FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'shopping_list',
    category: 'planning',
    description: 'Itens da lista de compras e status de conferência',
    createSql: `CREATE TABLE IF NOT EXISTS shopping_list (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    columnsAlterSql: [
      `ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS date DATE;`
    ],
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_shopping_list_email ON shopping_list(email);`
    ],
    rlsPolicySql: `ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - shopping_list" ON shopping_list;
CREATE POLICY "Acesso total - shopping_list" ON shopping_list FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'action_plans',
    category: 'planning',
    description: 'Metas e planos de ação com datas alvo e valores',
    createSql: `CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_action_plans_email ON action_plans(email);`
    ],
    rlsPolicySql: `ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - action_plans" ON action_plans;
CREATE POLICY "Acesso total - action_plans" ON action_plans FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'deficit_actions',
    category: 'planning',
    description: 'Ações corretivas de déficit financeiro',
    createSql: `CREATE TABLE IF NOT EXISTS deficit_actions (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  cost_center TEXT NOT NULL,
  reason TEXT NOT NULL,
  correction_action TEXT NOT NULL,
  responsible TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_deficit_actions_email ON deficit_actions(email);`
    ],
    rlsPolicySql: `ALTER TABLE deficit_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - deficit_actions" ON deficit_actions;
CREATE POLICY "Acesso total - deficit_actions" ON deficit_actions FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'trips',
    category: 'planning',
    description: 'Controle de viagens, despesas e orçamentos de viagem',
    createSql: `CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_trips_email ON trips(email);`
    ],
    rlsPolicySql: `ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - trips" ON trips;
CREATE POLICY "Acesso total - trips" ON trips FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'wishes',
    category: 'planning',
    description: 'Lista de desejos e sonhos de consumo planejados',
    createSql: `CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  value NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_wishes_email ON wishes(email);`
    ],
    rlsPolicySql: `ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - wishes" ON wishes;
CREATE POLICY "Acesso total - wishes" ON wishes FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'investments',
    category: 'finances',
    description: 'Registros de aplicações e investimentos financeiros',
    createSql: `CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_investments_email ON investments(email);`
    ],
    rlsPolicySql: `ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - investments" ON investments;
CREATE POLICY "Acesso total - investments" ON investments FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'investment_types',
    category: 'finances',
    description: 'Tipos de investimentos personalizados (ex: CDB, Ações, FIIs)',
    createSql: `CREATE TABLE IF NOT EXISTS investment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_inv_types_email ON investment_types(email);`
    ],
    rlsPolicySql: `ALTER TABLE investment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - investment_types" ON investment_types;
CREATE POLICY "Acesso total - investment_types" ON investment_types FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'investment_statuses',
    category: 'finances',
    description: 'Status de investimentos personalizados (ex: Ativo, Resgatado)',
    createSql: `CREATE TABLE IF NOT EXISTS investment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (email, name)
);`,
    indexesSql: [
      `CREATE INDEX IF NOT EXISTS idx_inv_statuses_email ON investment_statuses(email);`
    ],
    rlsPolicySql: `ALTER TABLE investment_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - investment_statuses" ON investment_statuses;
CREATE POLICY "Acesso total - investment_statuses" ON investment_statuses FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'user_data',
    category: 'system',
    description: 'Tabela de suporte e backup monolítico de dados do usuário',
    createSql: `CREATE TABLE IF NOT EXISTS user_data (
  email TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    rlsPolicySql: `ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - user_data" ON user_data;
CREATE POLICY "Acesso total - user_data" ON user_data FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    name: 'system_settings',
    category: 'system',
    description: 'Configurações globais, preços, avisos e mensagens de usuários',
    createSql: `CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    rlsPolicySql: `ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total - system_settings" ON system_settings;
CREATE POLICY "Acesso total - system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);`
  }
];

export function generateSafeSchemaScripts(existingSet: Set<string>, missingTables: string[]) {
  // 1. Script Diferencial Seguro (Apenas o que está faltando, SEM DROP TABLE)
  let diffSql = `-- ============================================================================
-- SCRIPT DE ATUALIZAÇÃO DIFERENCIAL SEGURA DO SUPABASE (SQL EDITOR)
-- Finanfly - Sistema Financeiro Inteligente
-- ============================================================================
-- GARANTIAS ABSOLUTAS DE SEGURANÇA:
-- 1. NUNCA EXECUTA 'DROP TABLE'. NENHUM DADO DE USUÁRIO É APAGADO OU REINICIADO.
-- 2. Este script cria APENAS as tabelas que ainda não existem no seu banco.
-- 3. As tabelas já existentes permanecem 100% intactas com todos os seus dados.
-- ============================================================================
`;

  if (missingTables.length === 0) {
    diffSql += `\n-- PARABÉNS! TODAS AS ${DATABASE_SCHEMA_CATALOG.length} TABELAS JÁ ESTÃO CRIADAS NO SUPABASE.
-- Nenhuma tabela precisa ser criada no momento.
-- O comando abaixo é 100% inofensivo e apenas confirma o status de sincronização:

DO $$ BEGIN
  RAISE NOTICE 'Todas as 21 tabelas do Finanfly já estão criadas e operacionais no Supabase!';
END $$;
`;
  } else {
    diffSql += `\n-- TABELAS IDENTIFICADAS PARA CRIAÇÃO (${missingTables.length} tabela(s)):
-- ${missingTables.join(', ')}

`;
    for (const tableName of missingTables) {
      const def = DATABASE_SCHEMA_CATALOG.find(t => t.name === tableName);
      if (!def) continue;
      diffSql += `-- ----------------------------------------------------------------------------\n`;
      diffSql += `-- TABELA: ${def.name.toUpperCase()} (${def.description})\n`;
      diffSql += `-- ----------------------------------------------------------------------------\n`;
      diffSql += `${def.createSql}\n\n`;

      if (def.indexesSql && def.indexesSql.length > 0) {
        diffSql += `${def.indexesSql.join('\n')}\n\n`;
      }

      if (def.rlsPolicySql) {
        diffSql += `${def.rlsPolicySql}\n\n`;
      }
    }
  }

  // Safe column enhancements on existing tables (with ADD COLUMN IF NOT EXISTS)
  diffSql += `\n-- ----------------------------------------------------------------------------\n`;
  diffSql += `-- VERIFICAÇÃO DE COLUNAS ADICIONAIS (100% NÃO DESTRUTIVO - PRESERVA DADOS)\n`;
  diffSql += `-- ----------------------------------------------------------------------------\n`;
  const allAlterStmts = DATABASE_SCHEMA_CATALOG.flatMap(t => t.columnsAlterSql || []);
  for (const alterStmt of allAlterStmts) {
    diffSql += `${alterStmt}\n`;
  }

  // 2. Script Completo Seguro (Todas as 21 tabelas com CREATE TABLE IF NOT EXISTS - SEM NENHUM DROP)
  let fullSql = `-- ============================================================================
-- SCRIPT COMPLETO SEGURO DE TABELAS DO SUPABASE (SQL EDITOR)
-- Finanfly - Sistema Financeiro Inteligente
-- ============================================================================
-- GARANTIAS ABSOLUTAS DE SEGURANÇA:
-- 1. NENHUMA TABELA É APAGADA (NÃO UTILIZA 'DROP TABLE').
-- 2. Utiliza exclusivamente 'CREATE TABLE IF NOT EXISTS' e 'ADD COLUMN IF NOT EXISTS'.
-- 3. Pode ser executado em bancos novos ou já em produção sem risco de perda de dados.
-- ============================================================================

`;
  for (const def of DATABASE_SCHEMA_CATALOG) {
    fullSql += `-- ----------------------------------------------------------------------------\n`;
    fullSql += `-- TABELA: ${def.name.toUpperCase()} (${def.description})\n`;
    fullSql += `-- ----------------------------------------------------------------------------\n`;
    fullSql += `${def.createSql}\n\n`;

    if (def.columnsAlterSql && def.columnsAlterSql.length > 0) {
      fullSql += `${def.columnsAlterSql.join('\n')}\n\n`;
    }

    if (def.indexesSql && def.indexesSql.length > 0) {
      fullSql += `${def.indexesSql.join('\n')}\n\n`;
    }

    if (def.rlsPolicySql) {
      fullSql += `${def.rlsPolicySql}\n\n`;
    }
  }

  return { differentialSql: diffSql.trim(), fullSafeSql: fullSql.trim() };
}
