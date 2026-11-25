import type { CategoryId, TransactionType } from './ledger';

export interface RecurringRule {
  id: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  title: string;
  dayOfMonth: number; // 1 to 31
  bankName?: string;
  lastGeneratedMonth?: string; // YYYY-MM
  isActive: boolean;
}
