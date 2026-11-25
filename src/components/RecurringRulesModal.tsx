import { useState, type FormEvent } from 'react';
import { Building2, Check, Loader2, Pin, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  formatCurrency,
  getCategoriesForType,
  VALIDATION_LIMITS,
  type CategoryId,
  type TransactionType,
} from '../types/ledger';
import type { RecurringRule } from '../types/recurring';

interface RecurringRulesModalProps {
  isOpen: boolean;
  rules: RecurringRule[];
  isSubmitting: boolean;
  onClose: () => void;
  onSaveRule: (rule: Omit<RecurringRule, 'id' | 'lastGeneratedMonth'>) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onRunScheduler: () => void;
}

export function RecurringRulesModal({
  isOpen,
  rules,
  isSubmitting,
  onClose,
  onSaveRule,
  onDeleteRule,
  onToggleRule,
  onRunScheduler,
}: RecurringRulesModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<CategoryId>('maintenance');
  const [title, setTitle] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(25);
  const [bankName, setBankName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const sanitizedTitle = title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);

    if (!isAmountValid) {
      setFormError('금액은 1원 이상의 정수로 입력해 주세요.');
      return;
    }

    if (sanitizedTitle.length < VALIDATION_LIMITS.TITLE_MIN_LENGTH) {
      setFormError('반복 내역 내용을 입력해 주세요.');
      return;
    }

    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setFormError('반복 일자는 1일에서 31일 사이여야 합니다.');
      return;
    }

    onSaveRule({
      type,
      amount: parsedAmount,
      category,
      title: sanitizedTitle,
      dayOfMonth,
      bankName: bankName.trim() ? bankName.trim().slice(0, 50) : undefined,
      isActive: true,
    });

    setAmountInput('');
    setTitle('');
    setBankName('');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-modal-title"
    >
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="recurring-modal-title" className="text-base font-bold text-slate-900 truncate">
                고정 반복 내역 스케줄러
              </h3>
              <p className="text-xs text-slate-500">
                매월 지정한 날짜에 자동으로 수입·지출 내역을 생성합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRunScheduler}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>이번 달 자동생성 실행</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="w-10 h-10 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {/* Add Form */}
          <form onSubmit={handleAddSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>새로운 반복 규칙 추가</span>
            </h4>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`min-h-[40px] py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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
                className={`min-h-[40px] py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                수입
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">매월 반복 일자</label>
                <div className="relative">
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        매월 {d}일
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">금액 (원)</label>
                <input
                  type="number"
                  required
                  min={VALIDATION_LIMITS.AMOUNT_MIN}
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  step={1}
                  placeholder="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryId)}
                  className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">통장 / 은행명</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="예: 국민은행 월급통장"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full min-h-[40px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">내용 (메모)</label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
                  placeholder="예: 월세 납부, 정기 월급, 인터넷 요금 등"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors cursor-pointer"
            >
              반복 규칙 추가하기
            </button>
          </form>

          {/* Rules List */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">
              등록된 반복 규칙 ({rules.length}개)
            </h4>

            {rules.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                <p className="text-sm font-medium">등록된 반복 규칙이 없습니다.</p>
                <p className="text-xs mt-1">위에서 매월 반복될 고정 수입·지출을 추가해 보세요.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {rules.map((rule) => {
                  const isIncome = rule.type === 'income';
                  return (
                    <div
                      key={rule.id}
                      className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors ${
                        rule.isActive ? 'border-slate-200' : 'border-slate-200/60 opacity-50 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {rule.dayOfMonth}일
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-sm truncate">{rule.title}</p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              <Pin className="w-3 h-3" />
                              <span>고정</span>
                            </span>
                            {rule.bankName && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span>{rule.bankName}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            {isIncome ? '수입' : '지출'} · {formatCurrency(rule.amount)}
                            {rule.lastGeneratedMonth && ` (최근 생성: ${rule.lastGeneratedMonth})`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {rule.isActive ? '사용중' : '중지됨'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRule(rule.id)}
                          aria-label="규칙 삭제"
                          className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
