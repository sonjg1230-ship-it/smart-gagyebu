import type { RecurringRule } from '../types/recurring';

const RECURRING_STORAGE_KEY = 'smart_ledger_recurring_rules_v1';

export function loadRecurringRules(): RecurringRule[] {
  try {
    const raw = window.localStorage.getItem(RECURRING_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is RecurringRule => {
      return (
        r !== null &&
        typeof r === 'object' &&
        typeof (r as RecurringRule).id === 'string' &&
        ((r as RecurringRule).type === 'income' || (r as RecurringRule).type === 'expense') &&
        typeof (r as RecurringRule).amount === 'number' &&
        typeof (r as RecurringRule).title === 'string' &&
        typeof (r as RecurringRule).dayOfMonth === 'number'
      );
    });
  } catch (error) {
    console.error('Failed to load recurring rules:', error);
    return [];
  }
}

export function saveRecurringRules(rules: RecurringRule[]): boolean {
  try {
    window.localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(rules));
    return true;
  } catch (error) {
    console.error('Failed to save recurring rules:', error);
    return false;
  }
}

export function generateRecurringRuleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
