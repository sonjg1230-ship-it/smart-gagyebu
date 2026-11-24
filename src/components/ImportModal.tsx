import { useEffect, useState } from 'react';
import { Check, FileSpreadsheet, Image as ImageIcon, Loader2, X } from 'lucide-react';
import {
  formatCurrency,
  getCategoriesForType,
  VALIDATION_LIMITS,
  type CategoryId,
  type TransactionDraft,
  type TransactionType,
} from '../types/ledger';
import type { ImportCandidate } from '../utils/importLedger';

interface ImportModalProps {
  isOpen: boolean;
  sourceType: 'image' | 'excel';
  initialCandidates: ImportCandidate[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (items: TransactionDraft[]) => void;
}

export function ImportModal({
  isOpen,
  sourceType,
  initialCandidates,
  isSubmitting,
  onClose,
  onConfirm,
}: ImportModalProps) {
  const [candidates, setCandidates] = useState<ImportCandidate[]>(initialCandidates);

  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  if (!isOpen) return null;

  const selectedItems = candidates.filter(
    (c) =>
      c.selected &&
      c.title.trim().length >= VALIDATION_LIMITS.TITLE_MIN_LENGTH &&
      Number.isInteger(c.amount) &&
      c.amount >= VALIDATION_LIMITS.AMOUNT_MIN &&
      VALIDATION_LIMITS.DATE_PATTERN.test(c.date)
  );

  const updateCandidate = (tempId: string, patch: Partial<ImportCandidate>) => {
    setCandidates((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...patch };
        if (patch.type && patch.type !== item.type) {
          const validCategories = getCategoriesForType(patch.type);
          if (!validCategories.some((c) => c.id === updated.category)) {
            updated.category = validCategories[0].id;
          }
        }
        return updated;
      })
    );
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;
    onConfirm(
      selectedItems.map(({ type, amount, category, title, date }) => ({
        type,
        amount,
        category,
        title: title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH),
        date,
      }))
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                sourceType === 'image'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {sourceType === 'image' ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 id="import-modal-title" className="text-base font-bold text-slate-900 truncate">
                {sourceType === 'image' ? '이미지에서 추출한 내역' : '엑셀에서 불러온 내역'}
              </h3>
              <p className="text-xs text-slate-500 tabular-nums">
                총 {candidates.length}건 중 {selectedItems.length}건 선택됨 · 내용을 확인 후 등록하세요
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-10 h-10 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editable List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
          {candidates.map((item) => {
            const categories = getCategoriesForType(item.type);
            return (
              <div
                key={item.tempId}
                className={`bg-white border rounded-2xl p-3.5 transition-colors ${
                  item.selected ? 'border-indigo-200' : 'border-slate-200/80 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.selected}
                    aria-label={`${item.title} 선택`}
                    onClick={() => updateCandidate(item.tempId, { selected: !item.selected })}
                    className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      item.selected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      value={item.title}
                      maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
                      onChange={(e) => updateCandidate(item.tempId, { title: e.target.value })}
                      placeholder="내용"
                      className="sm:col-span-5 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />

                    <div className="sm:col-span-3 relative">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.amount || ''}
                        onChange={(e) =>
                          updateCandidate(item.tempId, {
                            amount: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0),
                          })
                        }
                        className="w-full min-h-[38px] pl-3 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        원
                      </span>
                    </div>

                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateCandidate(item.tempId, { type: e.target.value as TransactionType })
                      }
                      className="sm:col-span-2 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="expense">지출</option>
                      <option value="income">수입</option>
                    </select>

                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateCandidate(item.tempId, { category: e.target.value as CategoryId })
                      }
                      className="sm:col-span-2 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>

                    <div className="sm:col-span-12 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateCandidate(item.tempId, { date: e.target.value })}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs tabular-nums text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="tabular-nums font-medium">
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || selectedItems.length === 0}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>추가 중...</span>
              </>
            ) : (
              <span>{selectedItems.length}건 가계부에 추가하기</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
