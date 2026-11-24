import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import {
  formatCurrency,
  getCategoryMeta,
  type Transaction,
} from '../types/ledger';

interface MonthlyStatsViewProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
}

interface MonthAggregate {
  monthIndex: number; // 1..12
  monthKey: string; // YYYY-MM
  label: string; // 1월..12월
  income: number;
  expense: number;
  net: number;
  count: number;
  items: Transaction[];
}

function formatCompactAxisValue(value: number): string {
  if (value === 0) return '0';
  if (value >= 100_000_000) {
    const eok = value / 100_000_000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`;
  }
  if (value >= 10_000) {
    const man = value / 10_000;
    return `${Number.isInteger(man) ? man.toLocaleString('ko-KR') : man.toFixed(1)}만`;
  }
  return value.toLocaleString('ko-KR');
}

function computeNiceMax(rawMax: number): number {
  if (rawMax <= 0) return 100_000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  let step = 1;
  if (normalized <= 1.2) step = 1.2;
  else if (normalized <= 1.5) step = 1.5;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 2.5) step = 2.5;
  else if (normalized <= 4) step = 4;
  else if (normalized <= 5) step = 5;
  else if (normalized <= 6) step = 6;
  else if (normalized <= 8) step = 8;
  else step = 10;
  return Math.ceil(step * magnitude);
}

export function MonthlyStatsView({ transactions, onOpenAddModal }: MonthlyStatsViewProps) {
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    for (const item of transactions) {
      const yr = Number.parseInt(item.date.slice(0, 4), 10);
      if (!Number.isNaN(yr)) years.add(yr);
    }
    if (years.size === 0) {
      years.add(currentYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const monthlyData = useMemo<MonthAggregate[]>(() => {
    const buckets: MonthAggregate[] = Array.from({ length: 12 }, (_, idx) => {
      const monthIndex = idx + 1;
      const monthStr = String(monthIndex).padStart(2, '0');
      return {
        monthIndex,
        monthKey: `${selectedYear}-${monthStr}`,
        label: `${monthIndex}월`,
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
        items: [],
      };
    });

    for (const item of transactions) {
      const itemYear = Number.parseInt(item.date.slice(0, 4), 10);
      if (itemYear !== selectedYear) continue;
      const itemMonth = Number.parseInt(item.date.slice(5, 7), 10);
      if (Number.isNaN(itemMonth) || itemMonth < 1 || itemMonth > 12) continue;

      const bucket = buckets[itemMonth - 1];
      if (item.type === 'income') {
        bucket.income += item.amount;
      } else {
        bucket.expense += item.amount;
      }
      bucket.net = bucket.income - bucket.expense;
      bucket.count += 1;
      bucket.items.push(item);
    }

    return buckets;
  }, [transactions, selectedYear]);

  const defaultSelectedMonth = useMemo(() => {
    const withActivity = [...monthlyData].reverse().find((m) => m.count > 0);
    if (withActivity) return withActivity.monthIndex;
    const now = new Date();
    return now.getFullYear() === selectedYear ? now.getMonth() + 1 : 1;
  }, [monthlyData, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultSelectedMonth);

  useEffect(() => {
    setSelectedMonth(defaultSelectedMonth);
  }, [defaultSelectedMonth]);

  const yearSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let expenseMonths = 0;
    for (const m of monthlyData) {
      totalIncome += m.income;
      totalExpense += m.expense;
      if (m.expense > 0) expenseMonths += 1;
    }
    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      avgMonthlyExpense: expenseMonths > 0 ? Math.round(totalExpense / expenseMonths) : 0,
    };
  }, [monthlyData]);

  const chartMax = useMemo(() => {
    let maxVal = 0;
    for (const m of monthlyData) {
      if (m.income > maxVal) maxVal = m.income;
      if (m.expense > maxVal) maxVal = m.expense;
    }
    return computeNiceMax(maxVal);
  }, [monthlyData]);

  const selectedMonthData = monthlyData[selectedMonth - 1] ?? monthlyData[0];

  const selectedMonthTopCategories = useMemo(() => {
    if (!selectedMonthData || selectedMonthData.expense <= 0) return [];
    const totals = new Map<string, number>();
    for (const item of selectedMonthData.items) {
      if (item.type === 'expense') {
        totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
      }
    }
    return Array.from(totals.entries())
      .map(([categoryId, amount]) => ({
        categoryId,
        meta: getCategoryMeta('expense', categoryId),
        amount,
        percent: Math.round((amount / selectedMonthData.expense) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [selectedMonthData]);

  const activeMonthsList = useMemo(
    () => [...monthlyData].filter((m) => m.count > 0).reverse(),
    [monthlyData]
  );

  if (transactions.length === 0) {
    return (
      <section className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">월별 통계 데이터가 없습니다</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          수입과 지출 내역을 추가하면 월별 막대 그래프와 지출 추이를 한눈에 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>첫 내역 추가하기</span>
        </button>
      </section>
    );
  }

  const yearIndex = availableYears.indexOf(selectedYear);
  const canGoNewer = yearIndex > 0;
  const canGoOlder = yearIndex < availableYears.length - 1;
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="space-y-6">
      {/* Header + Year Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            월별 수입 · 지출 통계
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedYear}년 월별 흐름과 카테고리별 지출 비중을 확인하세요.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1">
          <button
            type="button"
            onClick={() => canGoOlder && setSelectedYear(availableYears[yearIndex + 1])}
            disabled={!canGoOlder}
            aria-label="이전 연도"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
            {selectedYear}년
          </span>
          <button
            type="button"
            onClick={() => canGoNewer && setSelectedYear(availableYears[yearIndex - 1])}
            disabled={!canGoNewer}
            aria-label="다음 연도"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4-Column Annual KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{selectedYear}년 총 수입</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums truncate">
            +{formatCurrency(yearSummary.totalIncome)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{selectedYear}년 총 지출</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-600 tabular-nums truncate">
            -{formatCurrency(yearSummary.totalExpense)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>연간 순 합계</span>
          </div>
          <p
            className={`text-lg sm:text-xl font-bold tabular-nums truncate ${
              yearSummary.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}
          >
            {yearSummary.netBalance > 0 ? '+' : ''}
            {formatCurrency(yearSummary.netBalance)}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>월 평균 지출</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums truncate">
            {formatCurrency(yearSummary.avgMonthlyExpense)}
          </p>
        </div>
      </section>

      {/* Main Chart + Selected Month Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Grouped Bar Chart Card */}
        <section className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">월별 수입 vs 지출</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                막대를 선택하면 해당 월의 상세 내역을 볼 수 있습니다.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                <span>수입</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                <span>지출</span>
              </div>
            </div>
          </div>

          {/* Scrollable chart wrapper for narrow mobile screens */}
          <div className="overflow-x-auto no-scrollbar pb-1">
            <div className="min-w-[540px]">
              <div className="relative h-64 flex">
                {/* Y-Axis Labels */}
                <div className="w-12 pr-2 flex flex-col justify-between text-right text-[11px] font-medium text-slate-400 tabular-nums pb-7 select-none shrink-0">
                  {gridSteps.map((ratio) => (
                    <span key={ratio} className="leading-none">
                      {formatCompactAxisValue(Math.round(chartMax * ratio))}
                    </span>
                  ))}
                </div>

                {/* Plot Area */}
                <div className="flex-1 relative flex flex-col">
                  {/* Gridlines */}
                  <div className="absolute inset-0 bottom-7 flex flex-col justify-between pointer-events-none">
                    {gridSteps.map((ratio) => (
                      <div
                        key={ratio}
                        className={`w-full border-t ${
                          ratio === 0 ? 'border-slate-200' : 'border-slate-100'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 12 Month Bar Groups */}
                  <div className="relative flex-1 grid grid-cols-12 gap-1.5 items-end pb-7 z-10">
                    {monthlyData.map((month) => {
                      const incomeHeightPct =
                        month.income > 0 ? Math.max((month.income / chartMax) * 100, 2) : 0;
                      const expenseHeightPct =
                        month.expense > 0 ? Math.max((month.expense / chartMax) * 100, 2) : 0;
                      const isSelected = selectedMonth === month.monthIndex;

                      return (
                        <button
                          key={month.monthKey}
                          type="button"
                          onClick={() => setSelectedMonth(month.monthIndex)}
                          aria-pressed={isSelected}
                          aria-label={`${selectedYear}년 ${month.label} 수입 ${formatCurrency(
                            month.income
                          )}, 지출 ${formatCurrency(month.expense)}`}
                          className={`group relative h-full flex flex-col justify-end items-center rounded-xl px-1 pt-2 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-full h-full flex items-end justify-center gap-1">
                            <div
                              className="w-3 sm:w-3.5 rounded-t-md bg-emerald-500 transition-opacity group-hover:opacity-90"
                              style={{ height: `${incomeHeightPct}%` }}
                              title={`수입: ${formatCurrency(month.income)}`}
                            />
                            <div
                              className="w-3 sm:w-3.5 rounded-t-md bg-rose-500 transition-opacity group-hover:opacity-90"
                              style={{ height: `${expenseHeightPct}%` }}
                              title={`지출: ${formatCurrency(month.expense)}`}
                            />
                          </div>

                          <span
                            className={`absolute -bottom-6 text-[11px] tabular-nums whitespace-nowrap ${
                              isSelected
                                ? 'font-bold text-indigo-600'
                                : 'font-medium text-slate-500'
                            }`}
                          >
                            {month.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Selected Month Detail Inspector */}
        <aside className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedYear}년 {selectedMonthData.label} 요약
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                총 {selectedMonthData.count}건의 거래
              </p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">수입</dt>
              <dd className="font-bold text-emerald-600 tabular-nums">
                +{formatCurrency(selectedMonthData.income)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">지출</dt>
              <dd className="font-bold text-rose-600 tabular-nums">
                -{formatCurrency(selectedMonthData.expense)}
              </dd>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <dt className="font-semibold text-slate-900">월 순 합계</dt>
              <dd
                className={`font-bold tabular-nums ${
                  selectedMonthData.net >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {selectedMonthData.net > 0 ? '+' : ''}
                {formatCurrency(selectedMonthData.net)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-3">
              {selectedMonthData.label} 주요 지출 카테고리
            </h3>

            {selectedMonthTopCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {selectedMonthData.label}에 기록된 지출 내역이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedMonthTopCategories.map(({ categoryId, meta, amount, percent }) => (
                  <div key={categoryId}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="font-medium text-slate-700 truncate">{meta.name}</span>
                      <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatCurrency(amount)} · {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.barColorClass}`}
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Monthly Data Table */}
      <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">월별 집계 내역</h2>
          <span className="text-xs text-slate-500 tabular-nums">
            기록된 {activeMonthsList.length}개월
          </span>
        </div>

        {activeMonthsList.length === 0 ? (
          <p className="text-xs text-slate-500 py-10 text-center">
            {selectedYear}년에 기록된 거래 내역이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-5">월</th>
                  <th className="py-3 px-4 text-right">건수</th>
                  <th className="py-3 px-4 text-right">수입</th>
                  <th className="py-3 px-4 text-right">지출</th>
                  <th className="py-3 px-5 text-right">순 합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMonthsList.map((month) => {
                  const isSelected = selectedMonth === month.monthIndex;
                  return (
                    <tr
                      key={month.monthKey}
                      onClick={() => setSelectedMonth(month.monthIndex)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {selectedYear}년 {month.label}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 tabular-nums whitespace-nowrap">
                        {month.count}건
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                        +{formatCurrency(month.income)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-rose-600 tabular-nums whitespace-nowrap">
                        -{formatCurrency(month.expense)}
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-bold tabular-nums whitespace-nowrap ${
                          month.net >= 0 ? 'text-indigo-600' : 'text-rose-600'
                        }`}
                      >
                        {month.net > 0 ? '+' : ''}
                        {formatCurrency(month.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
