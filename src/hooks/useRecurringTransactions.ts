import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFinance } from './useFinance';
import type { RecurringTransaction, Category, Transaction } from '@/types/finance';
import { addDays, addWeeks, addMonths, parseISO, format, isBefore, isAfter, setDay, setDate, startOfDay } from 'date-fns';

export function useRecurringTransactions() {
  const { user } = useAuth();
  const { currentCycle, categories } = useFinance();
  const queryClient = useQueryClient();

  // Fetch recurring transactions
  const recurringQuery = useQuery({
    queryKey: ['recurring_transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .order('name');
      
      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!user?.id
  });

  // Create recurring transaction
  const createRecurring = useMutation({
    mutationFn: async (recurring: Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category'>) => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({ ...recurring, user_id: user!.id })
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
    }
  });

  // Update recurring transaction
  const updateRecurring = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
    }
  });

  // Delete recurring transaction
  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
    }
  });

  // Generate planned transactions for current cycle
  const generatePlannedTransactions = async () => {
    if (!currentCycle || !recurringQuery.data) return [];

    const cycleStart = parseISO(currentCycle.start_date);
    const cycleEnd = parseISO(currentCycle.end_date);
    const plannedTransactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [];

    for (const recurring of recurringQuery.data.filter(r => r.is_active)) {
      const dates = getOccurrencesInRange(recurring, cycleStart, cycleEnd);
      
      for (const date of dates) {
        plannedTransactions.push({
          cycle_id: currentCycle.id,
          date: format(date, 'yyyy-MM-dd'),
          description: recurring.name,
          merchant: recurring.name,
          amount: -Math.abs(recurring.amount), // Expenses are negative
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

    return plannedTransactions;
  };

  // Bulk create planned transactions
  const createPlannedTransactions = useMutation({
    mutationFn: async (transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => {
      if (transactions.length === 0) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions.map(t => ({ ...t, user_id: user!.id })))
        .select('*, category:categories(*)');
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  return {
    recurringTransactions: recurringQuery.data ?? [],
    isLoading: recurringQuery.isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    generatePlannedTransactions,
    createPlannedTransactions,
  };
}

// Helper to get all occurrences of a recurring transaction within a date range
function getOccurrencesInRange(
  recurring: RecurringTransaction,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(rangeStart);

  if (recurring.frequency === 'monthly' && recurring.day_of_month !== null) {
    // Monthly: specific day of month
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      const targetDate = setDate(current, recurring.day_of_month);
      if (
        (isAfter(targetDate, rangeStart) || format(targetDate, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')) &&
        (isBefore(targetDate, rangeEnd) || format(targetDate, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd'))
      ) {
        dates.push(targetDate);
      }
      current = addMonths(current, 1);
      // Safety limit
      if (dates.length > 10) break;
    }
  } else if (recurring.frequency === 'weekly' && recurring.day_of_week !== null) {
    // Weekly: specific day of week
    current = setDay(current, recurring.day_of_week, { weekStartsOn: 0 });
    if (isBefore(current, rangeStart)) {
      current = addWeeks(current, 1);
    }
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      if (
        (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd'))
      ) {
        dates.push(new Date(current));
      }
      current = addWeeks(current, 1);
      // Safety limit
      if (dates.length > 10) break;
    }
  } else if (recurring.frequency === 'fortnightly' && recurring.day_of_week !== null) {
    // Fortnightly: every 2 weeks on specific day
    current = setDay(current, recurring.day_of_week, { weekStartsOn: 0 });
    if (isBefore(current, rangeStart)) {
      current = addWeeks(current, 2);
    }
    while (isBefore(current, rangeEnd) || format(current, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd')) {
      if (
        (isAfter(current, rangeStart) || format(current, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd'))
      ) {
        dates.push(new Date(current));
      }
      current = addWeeks(current, 2);
      // Safety limit
      if (dates.length > 10) break;
    }
  }

  return dates;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
