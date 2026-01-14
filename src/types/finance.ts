export type CategoryType = 'need' | 'want' | 'bucket';
export type CycleStatus = 'open' | 'closed';
export type TransactionMethod = 'manual' | 'csv' | 'bank';

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Cycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  starting_balance: number;
  income_planned: number;
  income_actual: number | null;
  target_end_balance: number;
  status: CycleStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  parent_category_id: string | null;
  sort_order: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  cycle_id: string;
  category_id: string;
  planned_amount: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Transaction {
  id: string;
  user_id: string;
  cycle_id: string;
  date: string;
  description: string;
  merchant: string | null;
  amount: number;
  category_id: string | null;
  method: TransactionMethod;
  notes: string | null;
  split_group_id: string | null;
  import_hash: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface MerchantRule {
  id: string;
  user_id: string;
  merchant_match: string;
  default_category_id: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

// Computed metrics
export interface CycleMetrics {
  totalSpend: number;
  totalIncome: number;
  expectedEndBalance: number;
  targetVariance: number;
  remainingToSpend: number;
  safeToSpend: number;
  daysRemaining: number;
  dailyBudget: number;
  budgetByCategory: BudgetCategoryMetric[];
}

export interface BudgetCategoryMetric {
  category: Category;
  planned: number;
  actual: number;
  variance: number;
  percentUsed: number;
}

// CSV Import
export interface CSVColumnMapping {
  date: string;
  description: string;
  amount: string;
  debit?: string;
  credit?: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  isDuplicate?: boolean;
}
