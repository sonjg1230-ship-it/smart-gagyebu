import { generateTransactionId } from './storage';
import type { Transaction } from '../types/ledger';
import type { RecurringRule } from '../types/recurring';

export function checkAndApplyRecurringRules(
  rules: RecurringRule[],
  transactions: Transaction[],
  onNewTransactions: (newItems: Transaction[], updatedRules: RecurringRule[]) => void
): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;
  const todayDateNum = now.getDate();

  let generatedCount = 0;
  const nextRules = [...rules];
  const newTransactions: Transaction[] = [];

  for (let i = 0; i < nextRules.length; i++) {
    const rule = nextRules[i];
    if (!rule.isActive) continue;
    if (rule.lastGeneratedMonth === currentMonthKey) continue;

    if (todayDateNum >= rule.dayOfMonth) {
      const maxDays = new Date(year, month, 0).getDate();
      const targetDay = Math.min(rule.dayOfMonth, maxDays);
      const targetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

      const exists = transactions.some(
        (t) =>
          t.date === targetDateStr &&
          t.title === rule.title &&
          t.amount === rule.amount &&
          t.type === rule.type &&
          Boolean(t.isFixed) === true
      );

      if (!exists) {
        newTransactions.push({
          id: generateTransactionId(),
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          title: rule.title,
          date: targetDateStr,
          isFixed: true,
          bankName: rule.bankName,
          createdAt: Date.now() + generatedCount,
        });
        generatedCount += 1;
      }

      nextRules[i] = {
        ...rule,
        lastGeneratedMonth: currentMonthKey,
      };
    }
  }

  onNewTransactions(newTransactions, nextRules);
  return generatedCount;
}

export function forceApplyRecurringRulesForCurrentMonth(
  rules: RecurringRule[],
  transactions: Transaction[],
  onNewTransactions: (newItems: Transaction[], updatedRules: RecurringRule[]) => void
): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;

  let generatedCount = 0;
  const nextRules = [...rules];
  const newTransactions: Transaction[] = [];

  for (let i = 0; i < nextRules.length; i++) {
    const rule = nextRules[i];
    if (!rule.isActive) continue;

    const maxDays = new Date(year, month, 0).getDate();
    const targetDay = Math.min(rule.dayOfMonth, maxDays);
    const targetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

    const exists = transactions.some(
      (t) =>
        t.date === targetDateStr &&
        t.title === rule.title &&
        t.amount === rule.amount &&
        t.type === rule.type &&
        Boolean(t.isFixed) === true
    );

    if (!exists) {
      newTransactions.push({
        id: generateTransactionId(),
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        title: rule.title,
        date: targetDateStr,
        isFixed: true,
        bankName: rule.bankName,
        createdAt: Date.now() + generatedCount,
      });
      generatedCount += 1;
    }

    nextRules[i] = {
      ...rule,
      lastGeneratedMonth: currentMonthKey,
    };
  }

  onNewTransactions(newTransactions, nextRules);
  return generatedCount;
}
