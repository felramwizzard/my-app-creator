import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Cycle, Category, Transaction, Budget, MerchantRule, CycleMetrics, BudgetCategoryMetric, RecurrenceFrequency, RecurringTransaction } from '@/types/finance';
import { differenceInDays, parseISO, format, addMonths, addWeeks, setDate, setDay, isAfter, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Australia/Sydney';

// Helper to parse YYYY-MM-DD as a local date (avoiding UTC timezone shifts)
export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Use noon to avoid DST edge cases
}

// Helper to format a date to YYYY-MM-DD without timezone issues
export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper to get all occurrences of a recurring transaction within a date range
// If paydayDate is provided, excludes occurrences that fall on that specific date
export function getOccurrencesInCycleRange(
  recurring: { frequency: RecurrenceFrequency; day_of_week: number | null; day_of_month: number | null },
  rangeStart: Date,
  rangeEnd: Date,
  paydayDate?: string | null
): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(rangeStart);

  // Helper to check if a date should be excluded (it matches the payday date)
  const shouldExclude = (date: Date): boolean => {
    if (!paydayDate) return false;
    return format(date, 'yyyy-MM-dd') === paydayDate;
  };

  if (recurring.frequency === 'monthly' && recurring.day_of_month !== null) {
    // Iterate month-by-month so cycles that start mid-month still include early-month occurrences
    let monthCursor = startOfMonth(rangeStart);
    const endMonth = startOfMonth(rangeEnd);

    while (isBefore(monthCursor, endMonth) || format(monthCursor, 'yyyy-MM') === format(endMonth, 'yyyy-MM')) {
      const targetDate = setDate(monthCursor, recurring.day_of_month);

      // Guard: if the day doesn't exist in this month (e.g. 31st in Feb), setDate rolls into next month.
      // In that case, skip this month.
      if (format(targetDate, 'yyyy-MM') === format(monthCursor, 'yyyy-MM')) {
        if (
          (isAfter(targetDate, rangeStart) || format(targetDate, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) &&
          (isBefore(targetDate, rangeEnd) || format(targetDate, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) &&
          !shouldExclude(targetDate)
        ) {
          dates.push(targetDate);
        }
      }

      monthCursor = addMonths(monthCursor, 1);
      if (dates.length > 24) break;
    }
  } else if (recurring.frequency === 'weekly' && recurring.day_of_week !== null) {
    current = setDay(current, recurring.day_of_week, { weekStartsOn: 0 });
    if (isBefore(current, rangeStart)) {
      current = addWeeks(current, 1);
    }
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      if (
        (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) &&
        !shouldExclude(current)
      ) {
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
      if (
        (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) &&
        !shouldExclude(current)
      ) {
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

  // Fetch user profile (for payday setting)
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const paydayDate = profileQuery.data?.payday_date ?? null;

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

  // Fetch recurring templates (used to reserve recurring expenses even if planned rows haven't been generated yet)
  const recurringTransactionsQuery = useQuery({
    queryKey: ['recurring_transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!user?.id
  });

  // Compute metrics
  const metrics: CycleMetrics | null =
    currentCycle &&
    transactionsQuery.data &&
    budgetsQuery.data &&
    recurringTransactionsQuery.data !== undefined
      ? (() => {
          const transactions = transactionsQuery.data;
          const budgets = budgetsQuery.data;
          const categories = categoriesQuery.data ?? [];
          const recurringTemplates = recurringTransactionsQuery.data ?? [];

          // Only count actual (non-planned) expenses for totalSpend
          const actualTransactions = transactions.filter(t => !t.is_planned);
          const plannedTransactions = transactions.filter(t => t.is_planned);

          const totalSpend = actualTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          const totalIncome = actualTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

          // Planned recurring expenses:
          // - Prefer explicit planned rows (is_planned=true) if they exist for this cycle
          // - Otherwise compute from recurring templates (so "Safe to spend" works immediately after adding recurrings)
          const plannedExpensesFromTransactions = plannedTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

          const cycleStart = parseISO(currentCycle.start_date);
          const cycleEnd = parseISO(currentCycle.end_date);
          const plannedExpensesFromTemplates = recurringTemplates.reduce((sum, r) => {
            const occurrences = getOccurrencesInCycleRange(r, cycleStart, cycleEnd, paydayDate);
            return sum + occurrences.length * Math.abs(Number(r.amount));
          }, 0);

          const plannedExpenses =
            plannedTransactions.length > 0 ? plannedExpensesFromTransactions : plannedExpensesFromTemplates;

          const incomeActual = currentCycle.income_actual ?? currentCycle.income_planned;

    // Base budget for the cycle (what you have to work with)
    const baseBudget = currentCycle.starting_balance + incomeActual;

    // Net of actual transactions posted so far (includes unexpected expenses + any recorded income)
    const actualNet = actualTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Current balance = base budget + actual transactions (planned recurring items should NOT reduce this yet)
    const currentBalance = baseBudget + actualNet;

    // Keep these metrics for UI breakdowns
    const totalDiscretionary = baseBudget;

    // Actual discretionary spending (non-planned expenses)
    const actualDiscretionarySpend = actualTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Money left after reserving all planned recurring expenses
    const remainingDiscretionary = currentBalance - plannedExpenses;

    // Count remaining weekends in the cycle (Saturdays that haven't passed yet)
    const countRemainingWeekends = () => {
      const today = toZonedTime(new Date(), TIMEZONE);
      let count = 0;
      let checkDate = startOfDay(today);
      
      // If today is Saturday or Sunday, include this weekend
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0) {
        // Sunday - the weekend started yesterday, count it as remaining
        count++;
        checkDate = addWeeks(checkDate, 1);
        checkDate = setDay(checkDate, 6, { weekStartsOn: 0 }); // Next Saturday
      } else if (dayOfWeek === 6) {
        // Saturday - count this weekend
        count++;
        checkDate = addWeeks(checkDate, 1);
      } else {
        // Weekday - find next Saturday
        checkDate = setDay(checkDate, 6, { weekStartsOn: 0 });
        if (isBefore(checkDate, today)) {
          checkDate = addWeeks(checkDate, 1);
        }
      }
      
      // Count remaining Saturdays until cycle end
      while (isBefore(checkDate, cycleEnd) || format(checkDate, 'yyyy-MM-dd') === format(cycleEnd, 'yyyy-MM-dd')) {
        count++;
        checkDate = addWeeks(checkDate, 1);
        if (count > 10) break; // Safety limit
      }
      
      return Math.max(1, count); // At least 1 to avoid division by zero
    };
    
    const weekendsRemaining = countRemainingWeekends();
    const safeToSpendPerWeekend = remainingDiscretionary / weekendsRemaining;

    // Expected end balance (excluding future planned items) in this model matches the current balance
    const expectedEndBalance = currentBalance;

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
      currentBalance,
      targetVariance,
      remainingToSpend: remainingAfterPlanned,
      safeToSpend,
      safeToSpendPerWeekend,
      weekendsRemaining,
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
            const dates = getOccurrencesInCycleRange(recurring, cycleStart, cycleEnd, paydayDate);
            
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
    paydayDate,
    
    // Loading states
    isLoading: cyclesQuery.isLoading || categoriesQuery.isLoading || profileQuery.isLoading,
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
