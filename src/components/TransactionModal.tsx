import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Loader2, Pin, X } from 'lucide-react';
import {
  formatCurrency,
  getCategoriesForType,
  getTodayDateString,
  VALIDATION_LIMITS,
  type CategoryId,
  type Transaction,
  type TransactionDraft,
  type TransactionType,
} from '../types/ledger';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: Transaction | null;
  defaultDate?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft, editingId?: string) => Promise<void>;
}

export function TransactionModal({
  isOpen,
  editingTransaction,
  defaultDate,
  isSubmitting,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<CategoryId>('food');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [isFixed, setIsFixed] = useState(false);
  const [bankName, setBankName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountInput(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setTitle(editingTransaction.title);
      setDate(editingTransaction.date);
      setIsFixed(Boolean(editingTransaction.isFixed));
      setBankName(editingTransaction.bankName || '');
    } else {
      setType('expense');
      setAmountInput('');
      setCategory('food');
      setTitle('');
      setDate(defaultDate || getTodayDateString());
      setIsFixed(false);
      setBankName('');
    }
    setFormError(null);
  }, [isOpen, editingTransaction, defaultDate]);

  if (!isOpen) return null;

  const categories = getCategoriesForType(type);
  const parsedAmount = Number.parseInt(amountInput, 10);
  const isAmountValid =
    !Number.isNaN(parsedAmount) &&
    parsedAmount >= VALIDATION_LIMITS.AMOUNT_MIN &&
    parsedAmount <= VALIDATION_LIMITS.AMOUNT_MAX;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCategories = getCategoriesForType(nextType);
    if (!nextCategories.some((item) => item.id === category)) {
      setCategory(nextCategories[0].id);
    }
    setFormError(null);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const sanitizedTitle = title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);

    if (!isAmountValid) {
      setFormError('금액은 1원 이상의 정수로 입력해 주세요.');
      return;
    }

    if (sanitizedTitle.length < VALIDATION_LIMITS.TITLE_MIN_LENGTH) {
      setFormError('내용을 입력해 주세요.');
      return;
    }

    if (!VALIDATION_LIMITS.DATE_PATTERN.test(date)) {
      setFormError('올바른 날짜 형식을 선택해 주세요.');
      return;
    }

    await onSubmit(
      {
        type,
        amount: parsedAmount,
        category,
        title: sanitizedTitle,
        date,
        isFixed,
        bankName: bankName.trim() ? bankName.trim().slice(0, 50) : undefined,
      },
      editingTransaction?.id
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex justify-between items-center mb-5">
          <h3 id="transaction-modal-title" className="text-lg font-bold text-slate-900">
            {editingTransaction ? '내역 수정하기' : '새로운 내역 추가'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-11 h-11 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Type Toggle: Expense / Income */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`min-h-[44px] py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`min-h-[44px] py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              수입
            </button>
          </div>

          {/* Fixed vs Variable Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <button
              type="button"
              onClick={() => setIsFixed(false)}
              className={`min-h-[40px] py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                !isFixed
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <span>변동</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFixed(true)}
              className={`min-h-[40px] py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                isFixed
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <Pin className="w-3.5 h-3.5 shrink-0" />
              <span>고정 (월세/월급 등)</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="entry-amount" className="block text-xs font-semibold text-slate-600 mb-1.5">
              금액 (원)
            </label>
            <div className="relative">
              <input
                id="entry-amount"
                type="number"
                required
                min={VALIDATION_LIMITS.AMOUNT_MIN}
                max={VALIDATION_LIMITS.AMOUNT_MAX}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                autoFocus
                className="w-full text-2xl font-bold tabular-nums pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                원
              </span>
            </div>
            {isAmountValid && (
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {formatCurrency(parsedAmount)}
              </p>
            )}
          </div>

          {/* Bank / Account Name (Especially for fixed income/expense) */}
          <div>
            <label htmlFor="entry-bank" className="block text-xs font-semibold text-slate-600 mb-1.5">
              통장 / 은행명 {isFixed ? <span className="text-indigo-600">(고정 필수)</span> : <span className="text-slate-400">(선택)</span>}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="entry-bank"
                type="text"
                maxLength={50}
                placeholder="예: 국민은행 생활통장, 신한은행 월급통장"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="entry-category" className="block text-xs font-semibold text-slate-600 mb-1.5">
              카테고리
            </label>
            <select
              id="entry-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            >
              {categories.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title / Memo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="entry-title" className="block text-xs font-semibold text-slate-600">
                내용
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {title.length}/{VALIDATION_LIMITS.TITLE_MAX_LENGTH}
              </span>
            </div>
            <input
              id="entry-title"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
              placeholder="예: 점심 식사, 1월 급여, 관리비 자동이체 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="entry-date" className="block text-xs font-semibold text-slate-600 mb-1.5">
              날짜
            </label>
            <input
              id="entry-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition-all mt-2 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <span>{editingTransaction ? '수정 완료' : '저장하기'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
