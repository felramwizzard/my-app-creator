import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Cycle, Category, Transaction, Budget, MerchantRule, CycleMetrics, BudgetCategoryMetric, RecurrenceFrequency } from '@/types/finance';
import { differenceInDays, parseISO, format, addMonths, addWeeks, setDate, setDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Australia/Sydney';

// Helper to get all occurrences of a recurring transaction within a date range
function getOccurrencesInCycleRange(
  recurring: { frequency: RecurrenceFrequency; day_of_week: number | null; day_of_month: number | null },
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(rangeStart);

  if (recurring.frequency === 'monthly' && recurring.day_of_month !== null) {
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      const targetDate = setDate(current, recurring.day_of_month);
      if (
        (isAfter(targetDate, rangeStart) || format(targetDate, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) &&
        (isBefore(targetDate, rangeEnd) || format(targetDate, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd'))
      ) {
        dates.push(targetDate);
      }
      current = addMonths(current, 1);
      if (dates.length > 10) break;
    }
  } else if (recurring.frequency === 'weekly' && recurring.day_of_week !== null) {
    current = setDay(current, recurring.day_of_week, { weekStartsOn: 0 });
    if (isBefore(current, rangeStart)) {
      current = addWeeks(current, 1);
    }
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      if (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) {
        dates.push(new Date(current));
      }
      current = addWeeks(current, 1);
      if (dates.length > 10) break;
    }
  } else if (recurring.frequency === 'fortnightly' && recurring.day_of_week !== null) {
    current = setDay(current, recurring.day_of_week, { weekStartsOn: 0 });
    if (isBefore(current, rangeStart)) {
      current = addWeeks(current, 2);
    }
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      if (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) {
        dates.push(new Date(current));
      }
      current = addWeeks(current, 2);
      if (dates.length > 10) break;
    }
  }

  return dates;
}

// Cycle date helpers
export function getCurrentCycleDates() {
  const now = toZonedTime(new Date(), TIMEZONE);
  const currentDay = now.getDate();
  
  let startDate: Date;
  let endDate: Date;
  
  if (currentDay >= 15) {
    // Cycle started this month on the 15th
    startDate = setDate(now, 15);
    endDate = setDate(addMonths(now, 1), 14);
  } else {
    // Cycle started last month on the 15th
    startDate = setDate(addMonths(now, -1), 15);
    endDate = setDate(now, 14);
  }
  
  return {
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd')
  };
}

export function useFinance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current cycle
  const cyclesQuery = useQuery({
    queryKey: ['cycles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user!.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Cycle[];
    },
    enabled: !!user?.id
  });

  const currentCycle = cyclesQuery.data?.find(c => c.status === 'open') ?? null;

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('sort_order');
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user?.id
  });

  // Fetch transactions for current cycle
  const transactionsQuery = useQuery({
    queryKey: ['transactions', currentCycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('cycle_id', currentCycle!.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!currentCycle?.id
  });

  // Fetch budgets for current cycle
  const budgetsQuery = useQuery({
    queryKey: ['budgets', currentCycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('cycle_id', currentCycle!.id);
      
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!currentCycle?.id
  });

  // Fetch merchant rules
  const merchantRulesQuery = useQuery({
    queryKey: ['merchant_rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_rules')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data as MerchantRule[];
    },
    enabled: !!user?.id
  });

  // Compute metrics
  const metrics: CycleMetrics | null = currentCycle && transactionsQuery.data && budgetsQuery.data ? (() => {
    const transactions = transactionsQuery.data;
    const budgets = budgetsQuery.data;
    const categories = categoriesQuery.data ?? [];

    // Only count actual (non-planned) expenses for totalSpend
    const actualTransactions = transactions.filter(t => !t.is_planned);
    const plannedTransactions = transactions.filter(t => t.is_planned);

    const totalSpend = actualTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncome = actualTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate how much is committed (planned) but not yet paid
    const plannedExpenses = plannedTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const incomeActual = currentCycle.income_actual ?? currentCycle.income_planned;
    
    // Total discretionary budget = starting balance + income - target savings - ALL planned recurring expenses
    const totalDiscretionary = currentCycle.starting_balance + incomeActual - currentCycle.target_end_balance - plannedExpenses;
    
    // Actual discretionary spending (non-planned transactions that are expenses)
    const actualDiscretionarySpend = actualTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // What's left for remaining weekends = total discretionary - what we've already spent on discretionary items
    const remainingDiscretionary = totalDiscretionary - actualDiscretionarySpend;
    
    // Safe to spend per weekend (always divide by 4 weekends in the cycle)
    // This gives a consistent view: if you overspend, the number goes down for remaining weekends
    const weekendsInCycle = 4;
    const safeToSpendPerWeekend = remainingDiscretionary / weekendsInCycle;

    // Expected end balance considers ONLY actual transactions (for tracking purposes)
    const expectedEndBalance = currentCycle.starting_balance + incomeActual + 
      actualTransactions.reduce((sum, t) => sum + t.amount, 0);

    const targetVariance = expectedEndBalance - currentCycle.target_end_balance;

    const endDate = parseISO(currentCycle.end_date);
    const now = toZonedTime(new Date(), TIMEZONE);
    const daysRemaining = Math.max(0, differenceInDays(endDate, now) + 1);

    // Remaining to spend = what's left after considering target AND planned expenses
    const remainingAfterPlanned = expectedEndBalance - currentCycle.target_end_balance - plannedExpenses;
    
    // Keep daily budget for other uses
    const safeToSpend = daysRemaining > 0 ? remainingAfterPlanned / daysRemaining : 0;
    const dailyBudget = safeToSpend;

    // Budget by category - only count actual transactions
    const budgetByCategory: BudgetCategoryMetric[] = budgets.map(b => {
      const category = categories.find(c => c.id === b.category_id);
      const categoryTransactions = actualTransactions.filter(t => t.category_id === b.category_id && t.amount < 0);
      const actual = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const variance = b.planned_amount - actual;
      const percentUsed = b.planned_amount > 0 ? (actual / b.planned_amount) * 100 : 0;

      return {
        category: category!,
        planned: b.planned_amount,
        actual,
        variance,
        percentUsed
      };
    }).filter(b => b.category);

    return {
      totalSpend,
      totalIncome,
      expectedEndBalance,
      targetVariance,
      remainingToSpend: remainingAfterPlanned,
      safeToSpend,
      safeToSpendPerWeekend,
      daysRemaining,
      dailyBudget,
      budgetByCategory,
      plannedExpenses,
      totalDiscretionary,
      actualDiscretionarySpend,
      remainingDiscretionary
    };
  })() : null;

  // Mutations
  const createCycle = useMutation({
    mutationFn: async (cycle: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cycles')
        .insert({ ...cycle, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Cycle;
    },
    onSuccess: async (newCycle) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      
      // Auto-generate planned transactions from recurring templates
      try {
        const { data: recurringTransactions } = await supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_active', true);
        
        if (recurringTransactions && recurringTransactions.length > 0) {
          const cycleStart = parseISO(newCycle.start_date);
          const cycleEnd = parseISO(newCycle.end_date);
          const plannedTransactions: any[] = [];

          for (const recurring of recurringTransactions) {
            const dates = getOccurrencesInCycleRange(recurring, cycleStart, cycleEnd);
            
            for (const date of dates) {
              plannedTransactions.push({
                user_id: user!.id,
                cycle_id: newCycle.id,
                date: format(date, 'yyyy-MM-dd'),
                description: recurring.name,
                merchant: recurring.name,
                amount: -Math.abs(recurring.amount),
                category_id: recurring.category_id,
                method: 'manual',
                notes: recurring.notes,
                split_group_id: null,
                import_hash: null,
                is_planned: true,
                recurring_transaction_id: recurring.id,
              });
            }
          }

          if (plannedTransactions.length > 0) {
            await supabase.from('transactions').insert(plannedTransactions);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }
        }
      } catch (error) {
        console.error('Failed to auto-generate planned transactions:', error);
      }
    }
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cycle> & { id: string }) => {
      const { data, error } = await supabase
        .from('cycles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    }
  });

  const createCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user!.id })
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const bulkUpdateTransactions = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Transaction> }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const createBudget = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert(budget)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Budget> & { id: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const createMerchantRule = useMutation({
    mutationFn: async (rule: Omit<MerchantRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('merchant_rules')
        .insert({ ...rule, user_id: user!.id })
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
    }
  });

  const deleteMerchantRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('merchant_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
    }
  });

  // Find category for merchant
  const findCategoryForMerchant = (merchant: string): Category | null => {
    const rules = merchantRulesQuery.data ?? [];
    const categories = categoriesQuery.data ?? [];
    
    const matchingRule = rules.find(r => 
      merchant.toLowerCase().includes(r.merchant_match.toLowerCase())
    );
    
    if (matchingRule) {
      return categories.find(c => c.id === matchingRule.default_category_id) ?? null;
    }
    
    return null;
  };

  return {
    // Data
    cycles: cyclesQuery.data ?? [],
    currentCycle,
    categories: categoriesQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    budgets: budgetsQuery.data ?? [],
    merchantRules: merchantRulesQuery.data ?? [],
    metrics,
    
    // Loading states
    isLoading: cyclesQuery.isLoading || categoriesQuery.isLoading,
    hasFetchedCycles: cyclesQuery.isFetched,
    
    // Mutations
    createCycle,
    updateCycle,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkUpdateTransactions,
    createBudget,
    updateBudget,
    createMerchantRule,
    deleteMerchantRule,
    
    // Helpers
    findCategoryForMerchant,
    getCurrentCycleDates
  };
}
