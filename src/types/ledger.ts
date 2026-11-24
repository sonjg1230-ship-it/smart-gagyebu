export type TransactionType = 'income' | 'expense';
export type FilterType = 'all' | TransactionType;

export const VALIDATION_LIMITS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 100,
  AMOUNT_MIN: 1,
  AMOUNT_MAX: 1_000_000_000_000,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
} as const;

export type ExpenseCategoryId =
  | 'food'
  | 'maintenance'
  | 'telecom'
  | 'insurance'
  | 'loan'
  | 'academy'
  | 'medical'
  | 'fuel'
  | 'transport'
  | 'family'
  | 'shopping'
  | 'leisure'
  | 'etc_exp';

export type IncomeCategoryId = 'salary' | 'allowance' | 'invest' | 'etc_inc';

export type CategoryId = ExpenseCategoryId | IncomeCategoryId;

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  colorClass: string;
  barColorClass: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { id: 'food', name: '식비/카페', colorClass: 'bg-orange-50 text-orange-600', barColorClass: 'bg-orange-500' },
  { id: 'maintenance', name: '관리비/공과금', colorClass: 'bg-purple-50 text-purple-600', barColorClass: 'bg-purple-500' },
  { id: 'telecom', name: '통신비', colorClass: 'bg-sky-50 text-sky-600', barColorClass: 'bg-sky-500' },
  { id: 'insurance', name: '보험료', colorClass: 'bg-teal-50 text-teal-600', barColorClass: 'bg-teal-500' },
  { id: 'loan', name: '대출금', colorClass: 'bg-slate-100 text-slate-600', barColorClass: 'bg-slate-500' },
  { id: 'academy', name: '학원비/교육', colorClass: 'bg-amber-50 text-amber-600', barColorClass: 'bg-amber-500' },
  { id: 'medical', name: '병원비/약국', colorClass: 'bg-rose-50 text-rose-600', barColorClass: 'bg-rose-500' },
  { id: 'fuel', name: '주유비', colorClass: 'bg-cyan-50 text-cyan-600', barColorClass: 'bg-cyan-500' },
  { id: 'transport', name: '대중교통/차량', colorClass: 'bg-blue-50 text-blue-600', barColorClass: 'bg-blue-500' },
  { id: 'family', name: '가족모임/경조사', colorClass: 'bg-emerald-50 text-emerald-600', barColorClass: 'bg-emerald-500' },
  { id: 'shopping', name: '쇼핑/생활', colorClass: 'bg-pink-50 text-pink-600', barColorClass: 'bg-pink-500' },
  { id: 'leisure', name: '문화/여가', colorClass: 'bg-indigo-50 text-indigo-600', barColorClass: 'bg-indigo-500' },
  { id: 'etc_exp', name: '기타 지출', colorClass: 'bg-slate-100 text-slate-600', barColorClass: 'bg-slate-400' },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { id: 'salary', name: '급여/월급', colorClass: 'bg-emerald-50 text-emerald-600', barColorClass: 'bg-emerald-500' },
  { id: 'allowance', name: '용돈/부수입', colorClass: 'bg-teal-50 text-teal-600', barColorClass: 'bg-teal-500' },
  { id: 'invest', name: '금융/투자', colorClass: 'bg-cyan-50 text-cyan-600', barColorClass: 'bg-cyan-500' },
  { id: 'etc_inc', name: '기타 수입', colorClass: 'bg-slate-100 text-slate-600', barColorClass: 'bg-slate-400' },
];

export function getCategoriesForType(type: TransactionType): CategoryMeta[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryMeta(type: TransactionType, categoryId: string): CategoryMeta {
  const list = getCategoriesForType(type);
  return list.find((item) => item.id === categoryId) ?? list[list.length - 1];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  title: string;
  date: string;
  createdAt: number;
}

export interface TransactionDraft {
  type: TransactionType;
  amount: number;
  category: CategoryId;
  title: string;
  date: string;
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
