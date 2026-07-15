export type UserRole = 'user' | 'admin';

export interface UserSubscription {
  plan: 'none' | 'gratis' | 'mensal' | 'anual' | 'livre';
  validUntil: string | null; // ISO Date String
  selectedAt: string | null; // ISO Date String
  freePlanUsed: boolean; // Cannot select 60-day free plan again
  approved: boolean; // Approved manually by admin
}

export interface UserProfile {
  email: string;
  name: string;
  address: string;
  phone: string;
  role: UserRole;
  subscription: UserSubscription;
  createdAt: string;
  city?: string;
  state?: string;
}

export interface Income {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  value: number;
  category: string;
  status: string;
  paymentType: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  value: number;
  category: string; // Centro Despesa
  status: string;
  paymentType: string;
}

export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  value: number;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: string;
  checked: boolean;
  date?: string; // YYYY-MM-DD
}

export interface AnnualPlanning {
  year: number;
  monthlyBudgets: {
    month: number; // 0 to 11
    incomeBudget: number;
    expenseBudget: number;
    categoryBudgets?: {
      category: string;
      budgetedValue: number;
    }[];
  }[];
}

export interface DeficitAction {
  id: string;
  costCenter: string; // Centro de custo ocorrido (category where budget was exceeded)
  reason: string; // Motivo
  correctionAction: string; // Ação de correção
  responsible: string; // Responsável
  date: string; // Data (YYYY-MM-DD)
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
}

export interface TripExpense {
  id: string;
  description: string;
  value: number;
  date?: string; // date of expense
}

export interface Trip {
  id: string;
  name: string;
  expenses: TripExpense[];
}

export interface UserData {
  incomes: Income[];
  expenses: Expense[];
  actionPlans: ActionPlan[];
  shoppingList: ShoppingItem[];
  annualPlanning: AnnualPlanning[];
  paymentTypes: string[];
  paymentStatuses: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  deficitActions?: DeficitAction[];
  trips?: Trip[];
}

