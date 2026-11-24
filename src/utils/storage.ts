import {
  VALIDATION_LIMITS,
  type CategoryId,
  type Transaction,
} from '../types/ledger';

const STORAGE_KEY = 'smart_ledger_transactions_v1';

export function sortTransactions(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt - a.createdAt;
  });
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: Transaction[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const type = record.type === 'income' ? 'income' : record.type === 'expense' ? 'expense' : null;
      const amount = Number(record.amount);
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const date = typeof record.date === 'string' ? record.date : '';
      const category = typeof record.category === 'string' ? (record.category as CategoryId) : null;

      if (
        !type ||
        !category ||
        !Number.isInteger(amount) ||
        amount < VALIDATION_LIMITS.AMOUNT_MIN ||
        title.length < VALIDATION_LIMITS.TITLE_MIN_LENGTH ||
        !VALIDATION_LIMITS.DATE_PATTERN.test(date)
      ) {
        continue;
      }

      valid.push({
        id: typeof record.id === 'string' && record.id ? record.id : generateTransactionId(),
        type,
        amount,
        category,
        title: title.slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH),
        date,
        createdAt: typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
      });
    }

    return sortTransactions(valid);
  } catch (error) {
    console.error('Failed to read transactions from localStorage:', error);
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('Failed to write transactions to localStorage:', error);
    return false;
  }
}

export function generateTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
