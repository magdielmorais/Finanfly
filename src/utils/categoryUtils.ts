import { UserData, AnnualPlanning } from '../types';

/**
 * Renomeia com segurança uma categoria de despesas em todo o estado do usuário,
 * garantindo que APENAS o nome seja alterado e que TODOS os valores orçados
 * dentro da matriz orçamentária (annualPlanning) para todos os anos e meses sejam
 * rigorosamente preservados intactos, sem nenhuma alteração nos valores.
 *
 * Também atualiza de forma consistente:
 * - expenseCategories
 * - expenses (lançamentos de despesas)
 * - actionPlans (planos de ação / centro de custo)
 * - shoppingList (lista de compras)
 */
export function renameExpenseCategoryInUserData(
  userData: UserData,
  oldCategory: string,
  newCategory: string
): Partial<UserData> {
  const trimmedOld = oldCategory.trim();
  const trimmedNew = newCategory.trim();

  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
    return {};
  }

  // 1. Atualizar lista de categorias de despesas
  const currentCategories = userData.expenseCategories || [];
  const updatedCategories = currentCategories.map(cat => 
    cat === trimmedOld ? trimmedNew : cat
  );
  if (!updatedCategories.includes(trimmedNew)) {
    updatedCategories.push(trimmedNew);
  }

  // 2. Atualizar despesas realizadas vinculadas a essa categoria
  const updatedExpenses = (userData.expenses || []).map(exp => 
    exp.category === trimmedOld ? { ...exp, category: trimmedNew } : exp
  );

  // 3. Atualizar matriz orçamentária (annualPlanning)
  // Preserva rigorosamente os valores (budgetedValue) de cada mês e ano!
  const updatedAnnualPlanning: AnnualPlanning[] = (userData.annualPlanning || []).map(plan => {
    const updatedMonthlyBudgets = (plan.monthlyBudgets || []).map(mb => {
      if (!mb.categoryBudgets || mb.categoryBudgets.length === 0) {
        return mb;
      }

      const updatedCategoryBudgets = mb.categoryBudgets.map(cb => {
        if (cb.category === trimmedOld) {
          return {
            ...cb,
            category: trimmedNew
            // budgetedValue permanece estritamente inalterado!
          };
        }
        return cb;
      });

      return {
        ...mb,
        categoryBudgets: updatedCategoryBudgets
      };
    });

    return {
      ...plan,
      monthlyBudgets: updatedMonthlyBudgets
    };
  });

  // 4. Atualizar centros de custo em ações para déficits (se houver)
  const updatedDeficitActions = (userData.deficitActions || []).map(action => 
    action.costCenter === trimmedOld ? { ...action, costCenter: trimmedNew } : action
  );

  // 5. Atualizar categorias em itens da lista de compras
  const updatedShoppingList = (userData.shoppingList || []).map(item => 
    item.category === trimmedOld ? { ...item, category: trimmedNew } : item
  );

  return {
    expenseCategories: updatedCategories,
    expenses: updatedExpenses,
    annualPlanning: updatedAnnualPlanning,
    deficitActions: updatedDeficitActions,
    shoppingList: updatedShoppingList
  };
}

/**
 * Migra os valores no estado local de orçamentos (localBudgets) da categoria antiga para a nova.
 * Chaves no formato `${categoria}__${mês}` (0 a 11).
 */
export function migrateLocalBudgetsCategory(
  currentBudgets: Record<string, string>,
  oldCategory: string,
  newCategory: string
): Record<string, string> {
  const next = { ...currentBudgets };
  for (let m = 0; m < 12; m++) {
    const oldKey = `${oldCategory}__${m}`;
    const newKey = `${newCategory}__${m}`;
    if (oldKey in next) {
      next[newKey] = next[oldKey];
      delete next[oldKey];
    }
  }
  return next;
}
