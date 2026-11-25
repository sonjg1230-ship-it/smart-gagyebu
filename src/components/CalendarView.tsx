import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  formatCurrency,
  getCategoryMeta,
  getTodayDateString,
  type Transaction,
} from '../types/ledger';

interface CalendarViewProps {
  transactions: Transaction[];
  onOpenAddModalWithDate: (dateStr: string) => void;
  onEditTransaction: (item: Transaction) => void;
  onDeleteTransaction: (item: Transaction) => void;
}

export function CalendarView({
  transactions,
  onOpenAddModalWithDate,
  onEditTransaction,
  onDeleteTransaction,
}: CalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1..12
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`
  );

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDateStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`
    );
  };

  // Build month calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding days to complete 35 or 42 cells
    const remainingCells = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Map transactions by date string
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const item of transactions) {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [transactions]);

  // Monthly breakdown (Fixed vs Variable)
  const monthStats = useMemo(() => {
    let fixedIncome = 0;
    let variableIncome = 0;
    let fixedExpense = 0;
    let variableExpense = 0;

    for (const item of transactions) {
      const itemYear = Number.parseInt(item.date.slice(0, 4), 10);
      const itemMonth = Number.parseInt(item.date.slice(5, 7), 10);
      if (itemYear === currentYear && itemMonth === currentMonth) {
        if (item.type === 'income') {
          if (item.isFixed) fixedIncome += item.amount;
          else variableIncome += item.amount;
        } else {
          if (item.isFixed) fixedExpense += item.amount;
          else variableExpense += item.amount;
        }
      }
    }

    const totalIncome = fixedIncome + variableIncome;
    const totalExpense = fixedExpense + variableExpense;

    return {
      fixedIncome,
      variableIncome,
      totalIncome,
      fixedExpense,
      variableExpense,
      totalExpense,
      net: totalIncome - totalExpense,
    };
  }, [transactions, currentYear, currentMonth]);

  const selectedDateTransactions = useMemo(() => {
    return transactionsByDate.get(selectedDateStr) || [];
  }, [transactionsByDate, selectedDateStr]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      {/* Calendar Header & Controls */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentYear}년 {currentMonth}월 캘린더
            </h2>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              오늘
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="이전 달"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
              {currentYear}.{String(currentMonth).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="다음 달"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monthly Fixed vs Variable Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          {/* Fixed & Variable Income */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>수입 요약</span>
              </span>
              <span className="text-emerald-700 tabular-nums">
                +{formatCurrency(monthStats.totalIncome)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white border border-slate-200/70 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-indigo-600 font-semibold mb-1">
                  <Pin className="w-3 h-3" />
                  <span>고정 수입</span>
                </div>
                <p className="font-bold text-slate-900 tabular-nums">
                  +{formatCurrency(monthStats.fixedIncome)}
                </p>
              </div>
              <div className="bg-white border border-slate-200/70 rounded-xl p-2.5">
                <div className="text-slate-500 font-medium mb-1">변동 수입</div>
                <p className="font-bold text-slate-900 tabular-nums">
                  +{formatCurrency(monthStats.variableIncome)}
                </p>
              </div>
            </div>
          </div>

          {/* Fixed & Variable Expense */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1 text-rose-700">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>지출 요약</span>
              </span>
              <span className="text-rose-700 tabular-nums">
                -{formatCurrency(monthStats.totalExpense)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white border border-slate-200/70 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-indigo-600 font-semibold mb-1">
                  <Pin className="w-3 h-3" />
                  <span>고정 지출</span>
                </div>
                <p className="font-bold text-slate-900 tabular-nums">
                  -{formatCurrency(monthStats.fixedExpense)}
                </p>
              </div>
              <div className="bg-white border border-slate-200/70 rounded-xl p-2.5">
                <div className="text-slate-500 font-medium mb-1">변동 지출</div>
                <p className="font-bold text-slate-900 tabular-nums">
                  -{formatCurrency(monthStats.variableExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid Header (Sun - Sat) */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 mb-2">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className={`py-2 ${
                idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-indigo-500' : 'text-slate-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dayObj) => {
            const dayItems = transactionsByDate.get(dayObj.dateStr) || [];
            let dayIncome = 0;
            let dayExpense = 0;
            for (const item of dayItems) {
              if (item.type === 'income') dayIncome += item.amount;
              else dayExpense += item.amount;
            }

            const isSelected = selectedDateStr === dayObj.dateStr;
            const isToday = dayObj.dateStr === getTodayDateString();

            return (
              <div
                key={dayObj.dateStr}
                onClick={() => setSelectedDateStr(dayObj.dateStr)}
                className={`min-h-[92px] sm:min-h-[108px] rounded-2xl p-1.5 sm:p-2 border transition-all flex flex-col justify-between cursor-pointer group relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                    : isToday
                      ? 'border-indigo-300 bg-white'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                } ${!dayObj.isCurrentMonth ? 'opacity-40 bg-slate-50/40' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : isSelected
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-slate-700'
                    }`}
                  >
                    {dayObj.dayNum}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddModalWithDate(dayObj.dateStr);
                    }}
                    aria-label={`${dayObj.dateStr} 내역 추가`}
                    className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Summary Pills / List */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayIncome > 0 && (
                    <div className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate tabular-nums">
                      +{formatCurrency(dayIncome)}
                    </div>
                  )}
                  {dayExpense > 0 && (
                    <div className="bg-rose-50 text-rose-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate tabular-nums">
                      -{formatCurrency(dayExpense)}
                    </div>
                  )}
                  {dayItems.length === 0 && (
                    <div className="hidden sm:block text-[10px] text-slate-300 text-center py-2">
                      -
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details Panel */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tabular-nums">
              {selectedDateStr} 상세 내역
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              총 {selectedDateTransactions.length}건의 거래가 기록되어 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenAddModalWithDate(selectedDateStr)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>이 날짜에 추가</span>
          </button>
        </div>

        {selectedDateTransactions.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <p className="text-sm font-medium">선택한 날짜에 기록된 내역이 없습니다.</p>
            <p className="text-xs mt-1">우측 상단 버튼을 눌러 내역을 추가해 보세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {selectedDateTransactions.map((item) => {
              const isIncome = item.type === 'income';
              const meta = getCategoryMeta(item.type, item.category);
              const amountClass = isIncome ? 'text-emerald-600' : 'text-slate-900';
              const amountPrefix = isIncome ? '+' : '-';

              return (
                <li
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors px-3 rounded-2xl"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl ${meta.colorClass} flex items-center justify-center shrink-0`}
                    >
                      <span className="text-xs font-bold">{meta.name.slice(0, 2)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm truncate">{item.title}</p>
                        {item.isFixed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            <Pin className="w-3 h-3" />
                            <span>고정</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                            변동
                          </span>
                        )}
                        {item.bankName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>{item.bankName}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-sm sm:text-base tabular-nums ${amountClass}`}>
                      {amountPrefix}
                      {formatCurrency(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTransaction(item)}
                      aria-label="수정"
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(item)}
                      aria-label="삭제"
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
