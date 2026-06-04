export type ExpenseCategory =
  | 'accommodation'
  | 'transport'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'health'
  | 'communication'
  | 'other';

export type ExpenseSplitType = 'equal' | 'percentage' | 'exact';

export interface Budget {
  id: string;
  tripId: string;
  totalAmount: number;
  currency: string;
  categories: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  category: ExpenseCategory;
  allocatedAmount: number;
  spentAmount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  amountInBaseCurrency?: number;
  category: ExpenseCategory;
  paidById: string;
  date: string;
  notes?: string;
  receiptDocumentId?: string;
  linkedEventId?: string;
  splits: ExpenseSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  isPaid: boolean;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  currency: string;
  byCategory: BudgetCategory[];
  perPersonOwed: Record<string, number>;
}
