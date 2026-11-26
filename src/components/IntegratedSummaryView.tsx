import { useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  ImageDown,
  Loader2,
  MessageCircle,
  Plus,
  Receipt,
} from 'lucide-react';
import {
  formatCurrency,
  getCategoryMeta,
  getTodayDateString,
  type CategoryMeta,
  type Transaction,
} from '../types/ledger';
import {
  captureElementAsPngBlob,
  exportElementToImage,
  exportElementToPdf,
} from '../utils/exportLedger';
import { CategoryIcon } from './CategoryIcon';

interface IntegratedSummaryViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onShowToast: (message: string, variant?: 'success' | 'error') => void;
}

type PeriodMode = 'month' | 'all';

interface CategorySummaryRow {
  categoryId: string;
  meta: CategoryMeta;
  amount: number;
  count: number;
  percent: number;
}

function getInitialMonthKey(transactions: Transaction[]): string {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (transactions.some((t) => t.date.startsWith(currentMonth))) {
    return currentMonth;
  }
  if (transactions.length > 0) {
    return transactions[0].date.slice(0, 7);
  }
  return currentMonth;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number.parseInt(yStr, 10);
  const month = Number.parseInt(mStr, 10) - 1;
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  return `${yStr}년 ${Number.parseInt(mStr, 10)}월`;
}

export function IntegratedSummaryView({
  transactions,
  onOpenAddModal,
  onShowToast,
}: IntegratedSummaryViewProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getInitialMonthKey(transactions)
  );
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const reportRef = useRef<HTMLDivElement | null>(null);

  const scopedTransactions = useMemo(() => {
    if (periodMode === 'all') return transactions;
    return transactions.filter((item) => item.date.startsWith(selectedMonth));
  }, [transactions, periodMode, selectedMonth]);

  const periodLabel = periodMode === 'all' ? '전체 기간' : formatMonthLabel(selectedMonth);
  const fileSuffix = periodMode === 'all' ? '전체기간' : selectedMonth;

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let fixedIncome = 0;
    let fixedExpense = 0;
    let variableExpense = 0;

    const incomeMap = new Map<string, { amount: number; count: number }>();
    const expenseMap = new Map<string, { amount: number; count: number }>();
    const bankMap = new Map<string, { income: number; expense: number; count: number }>();

    for (const item of scopedTransactions) {
      if (item.type === 'income') {
        totalIncome += item.amount;
        if (item.isFixed) fixedIncome += item.amount;
        const curr = incomeMap.get(item.category) ?? { amount: 0, count: 0 };
        curr.amount += item.amount;
        curr.count += 1;
        incomeMap.set(item.category, curr);
      } else {
        totalExpense += item.amount;
        if (item.isFixed) fixedExpense += item.amount;
        else variableExpense += item.amount;
        const curr = expenseMap.get(item.category) ?? { amount: 0, count: 0 };
        curr.amount += item.amount;
        curr.count += 1;
        expenseMap.set(item.category, curr);
      }

      const bank = item.bankName?.trim();
      if (bank) {
        const bCurr = bankMap.get(bank) ?? { income: 0, expense: 0, count: 0 };
        if (item.type === 'income') bCurr.income += item.amount;
        else bCurr.expense += item.amount;
        bCurr.count += 1;
        bankMap.set(bank, bCurr);
      }
    }

    const incomeRows: CategorySummaryRow[] = Array.from(incomeMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        meta: getCategoryMeta('income', categoryId),
        amount: data.amount,
        count: data.count,
        percent: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expenseRows: CategorySummaryRow[] = Array.from(expenseMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        meta: getCategoryMeta('expense', categoryId),
        amount: data.amount,
        count: data.count,
        percent: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const bankRows = Array.from(bankMap.entries())
      .map(([bankName, data]) => ({
        bankName,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
      }))
      .sort((a, b) => b.expense - a.expense || b.income - a.income);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      fixedIncome,
      fixedExpense,
      variableExpense,
      incomeRows,
      expenseRows,
      bankRows,
    };
  }, [scopedTransactions]);

  const shareText = useMemo(() => {
    const lines: string[] = [
      `[스마트 가계부 통합 수입·지출]`,
      `기간: ${periodLabel} (총 ${scopedTransactions.length}건)`,
      ``,
      `■ 전체 요약`,
      `· 총 수입: +${formatCurrency(summary.totalIncome)}`,
      `· 총 지출: -${formatCurrency(summary.totalExpense)}`,
      `· 잔액: ${summary.netBalance > 0 ? '+' : ''}${formatCurrency(summary.netBalance)}`,
    ];

    if (summary.incomeRows.length > 0) {
      lines.push(``, `■ 수입 항목별 내역`);
      for (const row of summary.incomeRows) {
        lines.push(`· ${row.meta.name}: ${formatCurrency(row.amount)} (${row.count}건)`);
      }
    }

    if (summary.expenseRows.length > 0) {
      lines.push(``, `■ 지출 항목별 내역`);
      for (const row of summary.expenseRows) {
        lines.push(`· ${row.meta.name}: ${formatCurrency(row.amount)} (${row.count}건)`);
      }
    }

    if (summary.bankRows.length > 0) {
      lines.push(``, `■ 통장별 요약`);
      for (const bank of summary.bankRows) {
        lines.push(
          `· ${bank.bankName}: 수입 +${formatCurrency(bank.income)} / 지출 -${formatCurrency(bank.expense)}`
        );
      }
    }

    return lines.join('\n');
  }, [periodLabel, scopedTransactions.length, summary]);

  const handleSaveImage = async () => {
    if (!reportRef.current || scopedTransactions.length === 0 || isExportingImage) return;
    setIsExportingImage(true);
    try {
      await exportElementToImage(reportRef.current, `스마트가계부_통합수입지출_${fileSuffix}`);
      onShowToast('통합 수입·지출 이미지(.png)가 저장되었습니다.');
    } catch (error) {
      console.error('Image export failed:', error);
      onShowToast('이미지 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleSavePdf = async () => {
    if (!reportRef.current || scopedTransactions.length === 0 || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(reportRef.current, `스마트가계부_통합수입지출_${fileSuffix}`);
      onShowToast('통합 수입·지출 PDF 파일이 저장되었습니다.');
    } catch (error) {
      console.error('PDF export failed:', error);
      onShowToast('PDF 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const copySummaryText = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(shareText);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyText = async () => {
    if (scopedTransactions.length === 0) return;
    const copied = await copySummaryText();
    if (copied) {
      onShowToast('통합 요약 텍스트가 클립보드에 복사되었습니다.');
    } else {
      onShowToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const handleShareKakao = async () => {
    if (scopedTransactions.length === 0 || isSharing) return;
    setIsSharing(true);

    try {
      await copySummaryText();

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        let sharedWithImage = false;
        if (reportRef.current) {
          const blob = await captureElementAsPngBlob(reportRef.current);
          if (blob) {
            const file = new File([blob], `통합수입지출_${fileSuffix}.png`, {
              type: 'image/png',
            });
            const shareData: ShareData = {
              title: `스마트 가계부 (${periodLabel})`,
              text: shareText,
              files: [file],
            };
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              try {
                await navigator.share(shareData);
                sharedWithImage = true;
                onShowToast('공유가 완료되었습니다.');
              } catch (shareErr) {
                if ((shareErr as Error)?.name === 'AbortError') {
                  setIsSharing(false);
                  return;
                }
              }
            }
          }
        }

        if (!sharedWithImage) {
          try {
            await navigator.share({
              title: `스마트 가계부 (${periodLabel})`,
              text: shareText,
            });
            onShowToast('공유가 완료되었습니다.');
          } catch (shareErr) {
            if ((shareErr as Error)?.name !== 'AbortError') {
              onShowToast('요약 내용이 복사되었습니다. 카카오톡에 붙여넣기(Ctrl+V) 하세요.');
            }
          }
        }
      } else {
        onShowToast('요약 내용이 복사되었습니다! 카카오톡 대화창에 붙여넣기(Ctrl+V) 하세요.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Period Selector & Export/Share Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="집계 기간 선택"
            className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodMode === 'month'}
              onClick={() => setPeriodMode('month')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                periodMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              월별 보기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodMode === 'all'}
              onClick={() => setPeriodMode('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                periodMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              전체 기간
            </button>
          </div>

          {periodMode === 'month' && (
            <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, -1))}
                aria-label="이전 달"
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, 1))}
                aria-label="다음 달"
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Save & Share Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveImage}
            disabled={scopedTransactions.length === 0 || isExportingImage}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExportingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            ) : (
              <ImageDown className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{isExportingImage ? '이미지 생성 중...' : '이미지로 저장'}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePdf}
            disabled={scopedTransactions.length === 0 || isExportingPdf}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{isExportingPdf ? 'PDF 생성 중...' : 'PDF로 저장'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            disabled={scopedTransactions.length === 0}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 text-slate-500 shrink-0" />
            <span>텍스트 복사</span>
          </button>

          <button
            type="button"
            onClick={handleShareKakao}
            disabled={scopedTransactions.length === 0 || isSharing}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <MessageCircle className="w-4 h-4 shrink-0" />
            )}
            <span>카톡으로 보내기</span>
          </button>
        </div>
      </div>

      {scopedTransactions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl py-16 px-6 text-center">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {periodLabel}에 등록된 수입·지출 내역이 없습니다.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            내역을 추가하거나 다른 기간을 선택하면 한눈에 보는 통합 리포트가 생성됩니다.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>내역 추가하기</span>
          </button>
        </div>
      ) : (
        /* Clean Light Report Paper Surface for Crisp On-Screen & Image/PDF Capture */
        <div
          ref={reportRef}
          className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-7"
        >
          {/* Report Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs font-semibold text-indigo-600 mb-1">스마트 가계부</p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                통합 수입·지출 요약표
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span className="font-semibold text-slate-700">{periodLabel}</span>
              <span aria-hidden="true">·</span>
              <span>총 {scopedTransactions.length}건</span>
              <span aria-hidden="true">·</span>
              <span>기준일 {getTodayDateString()}</span>
            </div>
          </div>

          {/* 3-Column Executive Financial Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-4">
              <p className="text-xs font-semibold text-emerald-700 mb-1">총 수입</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums">
                +{formatCurrency(summary.totalIncome)}
              </p>
            </div>

            <div className="rounded-2xl bg-rose-50/70 border border-rose-200/70 p-4">
              <p className="text-xs font-semibold text-rose-700 mb-1">총 지출</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-700 tabular-nums">
                -{formatCurrency(summary.totalExpense)}
              </p>
            </div>

            <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/70 p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-1">순 잔액</p>
              <p
                className={`text-xl sm:text-2xl font-bold tabular-nums ${
                  summary.netBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'
                }`}
              >
                {summary.netBalance > 0 ? '+' : ''}
                {formatCurrency(summary.netBalance)}
              </p>
            </div>
          </div>

          {/* Two-Column Breakdown: Income Categories & Expense Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-1">
            {/* Income Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">수입 항목별 합계</h3>
                <span className="text-xs font-semibold text-emerald-600 tabular-nums">
                  {summary.incomeRows.length}개 항목
                </span>
              </div>

              {summary.incomeRows.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  이 기간에 기록된 수입 내역이 없습니다.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {summary.incomeRows.map((row) => (
                    <div key={row.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${row.meta.colorClass} flex items-center justify-center shrink-0`}
                          >
                            <CategoryIcon categoryId={row.meta.id} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 block truncate">
                              {row.meta.name}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {row.count}건 · {row.percent}%
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 tabular-nums shrink-0">
                          +{formatCurrency(row.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.meta.barColorClass}`}
                          style={{ width: `${Math.max(row.percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">총 수입 합계</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  +{formatCurrency(summary.totalIncome)}
                </span>
              </div>
            </section>

            {/* Expense Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">지출 항목별 합계</h3>
                <span className="text-xs font-semibold text-rose-600 tabular-nums">
                  {summary.expenseRows.length}개 항목
                </span>
              </div>

              {summary.expenseRows.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  이 기간에 기록된 지출 내역이 없습니다.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {summary.expenseRows.map((row) => (
                    <div key={row.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${row.meta.colorClass} flex items-center justify-center shrink-0`}
                          >
                            <CategoryIcon categoryId={row.meta.id} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 block truncate">
                              {row.meta.name}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {row.count}건 · {row.percent}%
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.meta.barColorClass}`}
                          style={{ width: `${Math.max(row.percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">총 지출 합계</span>
                <span className="font-bold text-rose-700 tabular-nums">
                  -{formatCurrency(summary.totalExpense)}
                </span>
              </div>
            </section>
          </div>

          {/* Fixed vs Variable & Bank Summary Footer Grid */}
          <div className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3">고정 · 변동 내역 구분</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-slate-500 block mb-1">고정 수입</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    +{formatCurrency(summary.fixedIncome)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-slate-500 block mb-1">고정 지출</span>
                  <span className="font-bold text-rose-700 tabular-nums">
                    -{formatCurrency(summary.fixedExpense)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="text-slate-500 block mb-1">변동 지출</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    -{formatCurrency(summary.variableExpense)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3">통장별 합계</h4>
              {summary.bankRows.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">지정된 통장 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {summary.bankRows.map((bank) => (
                    <div
                      key={bank.bankName}
                      className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3.5 py-2.5 gap-2"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        {bank.bankName} ({bank.count}건)
                      </span>
                      <div className="flex items-center gap-3 tabular-nums shrink-0">
                        <span className="text-emerald-700 font-medium">
                          +{formatCurrency(bank.income)}
                        </span>
                        <span className="text-rose-700 font-medium">
                          -{formatCurrency(bank.expense)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
