import { useState } from 'react';
import { Check, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency, type TransactionDraft } from '../types/ledger';
import { parsePaymentSms, type SmsParseCandidate } from '../utils/parseSms';

interface SmsParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (items: TransactionDraft[]) => void;
}

export function SmsParserModal({ isOpen, onClose, onConfirmImport }: SmsParserModalProps) {
  const [smsInput, setSmsInput] = useState('');
  const [candidates, setCandidates] = useState<SmsParseCandidate[]>([]);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = () => {
    if (!smsInput.trim()) return;
    const results = parsePaymentSms(smsInput);
    setCandidates(results);
    setIsAnalyzed(true);
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateCandidate = (
    index: number,
    field: keyof TransactionDraft,
    value: string | number | boolean
  ) => {
    setCandidates((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleConfirm = () => {
    if (candidates.length === 0) return;
    const drafts: TransactionDraft[] = candidates.map(
      ({ type, amount, category, title, date, isFixed, bankName }) => ({
        type,
        amount,
        category,
        title,
        date,
        isFixed,
        bankName,
      })
    );
    onConfirmImport(drafts);
    setSmsInput('');
    setCandidates([]);
    setIsAnalyzed(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                결제 문자/알림 자동 입력
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                카드 결제 문자나 알림 내용을 복사해서 붙여넣으세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!isAnalyzed ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  결제 문자 내용 붙여넣기
                </label>
                <textarea
                  rows={6}
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  placeholder={`[Web발신]\n신한체크승인 김*수 12,500원 11/26 06:50 스타벅스\n\n[Web발신]\n국민카드 15,000원 지출 11/26 쿠팡`}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-colors"
                />
              </div>

              <div className="bg-indigo-50/70 dark:bg-slate-800/60 rounded-2xl p-4 border border-indigo-100 dark:border-slate-700 text-xs text-indigo-900 dark:text-slate-300 space-y-1.5">
                <p className="font-bold">안내</p>
                <p>· 여러 건의 문자를 동시에 붙여넣어도 각각 자동으로 분리되어 추출됩니다.</p>
                <p>· 금액, 가맹점명, 날짜, 은행/카드사가 자동 인식되며 추출 후 수정할 수 있습니다.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!smsInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>내역 자동 분석하기</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  추출된 내역 <span className="text-indigo-600 font-bold">{candidates.length}건</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnalyzed(false)}
                  className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  다시 입력하기
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm font-semibold">인식된 결제 내역이 없습니다.</p>
                  <p className="text-xs mt-1">올바른 금액(원)이 포함된 문자인지 확인해 주세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((item, idx) => {
                    const categories = item.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={item.type}
                              onChange={(e) =>
                                handleUpdateCandidate(
                                  idx,
                                  'type',
                                  e.target.value as TransactionDraft['type']
                                )
                              }
                              aria-label="거래 유형"
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
                            >
                              <option value="expense">지출</option>
                              <option value="income">수입</option>
                            </select>
                            <input
                              type="text"
                              value={item.bankName || ''}
                              onChange={(e) => handleUpdateCandidate(idx, 'bankName', e.target.value)}
                              placeholder="은행/카드"
                              aria-label="은행 또는 카드사"
                              className="w-28 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(idx)}
                            aria-label="항목 삭제"
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              내용 (가맹점)
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateCandidate(idx, 'title', e.target.value)}
                              aria-label="가맹점 또는 거래 제목"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              금액 (원)
                            </label>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateCandidate(idx, 'amount', parseInt(e.target.value) || 0)
                              }
                              aria-label="거래 금액"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-bold tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              카테고리
                            </label>
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateCandidate(idx, 'category', e.target.value)}
                              aria-label="카테고리 선택"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-medium"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
                          <span>날짜: {item.date}</span>
                          <span className="truncate opacity-70">원문: {item.rawText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={candidates.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{candidates.length}건 가계부에 추가하기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
