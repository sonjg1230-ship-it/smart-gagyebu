import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  HardDrive,
  ImagePlus,
  List,
  Loader2,
  Lock,
  Pencil,
  Pin,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { CategoryIcon } from './components/CategoryIcon';
import { DeleteModal } from './components/DeleteModal';
import { ImportModal } from './components/ImportModal';
import { MonthlyStatsView } from './components/MonthlyStatsView';
import { Toast, type ToastState } from './components/Toast';
import { TransactionModal } from './components/TransactionModal';
import {
  formatCurrency,
  getCategoryMeta,
  type FilterType,
  type Transaction,
  type TransactionDraft,
} from './types/ledger';
import { exportToExcel, exportToPdf } from './utils/exportLedger';
import {
  parseExcelFile,
  parseImageFile,
  type ImportCandidate,
} from './utils/importLedger';
import {
  generateTransactionId,
  loadTransactions,
  saveTransactions,
  sortTransactions,
} from './utils/storage';

type WorkspaceView = 'ledger' | 'stats' | 'calendar';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [activeView, setActiveView] = useState<WorkspaceView>('ledger');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [isParsingImage, setIsParsingImage] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importModalState, setImportModalState] = useState<{
    isOpen: boolean;
    sourceType: 'image' | 'excel';
    candidates: ImportCandidate[];
  }>({ isOpen: false, sourceType: 'image', candidates: [] });

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const persistList = useCallback(
    (nextList: Transaction[]): boolean => {
      const sorted = sortTransactions(nextList);
      const saved = saveTransactions(sorted);
      if (!saved) {
        showToast('브라우저 저장 공간에 저장하지 못했습니다.', 'error');
        return false;
      }
      setTransactions(sorted);
      return true;
    },
    [showToast]
  );

  const handleOpenAddModal = (defaultDateStr?: string) => {
    setEditingTransaction(null);
    setModalDefaultDate(defaultDateStr);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalDefaultDate(transaction.date);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (draft: TransactionDraft, editingId?: string) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        const nextList = transactions.map((item) =>
          item.id === editingId
            ? {
                ...item,
                type: draft.type,
                amount: draft.amount,
                category: draft.category,
                title: draft.title,
                date: draft.date,
                isFixed: draft.isFixed,
                bankName: draft.bankName,
              }
            : item
        );
        if (persistList(nextList)) {
          setIsModalOpen(false);
          setEditingTransaction(null);
          showToast('내역이 수정되었습니다.');
        }
      } else {
        const newItem: Transaction = {
          id: generateTransactionId(),
          type: draft.type,
          amount: draft.amount,
          category: draft.category,
          title: draft.title,
          date: draft.date,
          isFixed: draft.isFixed,
          bankName: draft.bankName,
          createdAt: Date.now(),
        };
        if (persistList([newItem, ...transactions])) {
          setIsModalOpen(false);
          showToast('내역이 브라우저에 저장되었습니다.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const nextList = transactions.filter((item) => item.id !== deleteTarget.id);
      if (persistList(nextList)) {
        setDeleteTarget(null);
        showToast('내역이 삭제되었습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const { totalIncome, totalExpense, totalBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const item of transactions) {
      if (item.type === 'income') income += item.amount;
      else expense += item.amount;
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return transactions.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (!normalizedQuery) return true;
      const categoryName = getCategoryMeta(item.type, item.category).name.toLowerCase();
      const bank = (item.bankName || '').toLowerCase();
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        categoryName.includes(normalizedQuery) ||
        bank.includes(normalizedQuery) ||
        item.date.includes(normalizedQuery)
      );
    });
  }, [transactions, filter, searchQuery]);

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsParsingImage(true);
    try {
      const candidates = await parseImageFile(file);
      setImportModalState({
        isOpen: true,
        sourceType: 'image',
        candidates,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '이미지에서 내역을 추출하지 못했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsParsingImage(false);
    }
  };

  const handleExcelFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsParsingExcel(true);
    try {
      const candidates = await parseExcelFile(file);
      setImportModalState({
        isOpen: true,
        sourceType: 'excel',
        candidates,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '엑셀 파일을 읽는 중 오류가 발생했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleConfirmImport = (items: TransactionDraft[]) => {
    if (items.length === 0) return;
    const baseTime = Date.now();
    const newRecords: Transaction[] = items.map((draft, idx) => ({
      id: generateTransactionId(),
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      title: draft.title,
      date: draft.date,
      isFixed: draft.isFixed,
      bankName: draft.bankName,
      createdAt: baseTime + idx,
    }));

    if (persistList([...newRecords, ...transactions])) {
      setImportModalState((prev) => ({ ...prev, isOpen: false, candidates: [] }));
      showToast(`${newRecords.length}건의 내역이 추가되었습니다.`);
    }
  };

  const categoryBreakdown = useMemo(() => {
    if (totalExpense <= 0) return [];
    const totals = new Map<string, number>();
    for (const item of transactions) {
      if (item.type === 'expense') {
        totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
      }
    }

    return Array.from(totals.entries())
      .map(([categoryId, amount]) => {
        const meta = getCategoryMeta('expense', categoryId);
        const percent = Math.round((amount / totalExpense) * 100);
        return { categoryId, meta, amount, percent };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, totalExpense]);

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      showToast('내보낼 거래 내역이 없습니다.', 'error');
      return;
    }
    try {
      exportToExcel(filteredTransactions, filter);
      showToast('엑셀(.xlsx) 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('Excel export failed:', error);
      showToast('엑셀 내보내기 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleExportPdf = async () => {
    if (filteredTransactions.length === 0) {
      showToast('내보낼 거래 내역이 없습니다.', 'error');
      return;
    }
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportToPdf(filteredTransactions, filter);
      showToast('PDF 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast('PDF 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Toast toast={toast} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 whitespace-nowrap truncate">
              스마트 가계부
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>내 브라우저 전용</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 lg:pb-10">
        {/* Workspace View Switcher & Import Actions */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="화면 전환"
            className="inline-flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'ledger'}
              onClick={() => setActiveView('ledger')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'ledger'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4 shrink-0" />
              <span>가계부 내역</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'calendar'}
              onClick={() => setActiveView('calendar')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>달력</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'stats'}
              onClick={() => setActiveView('stats')}
              className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'stats'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>월별 통계</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isParsingImage}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isParsingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              ) : (
                <ImagePlus className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <span>{isParsingImage ? '이미지 분석 중...' : '이미지로 넣기'}</span>
            </button>

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={isParsingExcel}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isParsingExcel ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{isParsingExcel ? '엑셀 읽는 중...' : '엑셀로 넣기'}</span>
            </button>

            {activeView !== 'ledger' && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>내역 추가</span>
              </button>
            )}
          </div>
        </div>

        {activeView === 'calendar' ? (
          <CalendarView
            transactions={transactions}
            onOpenAddModalWithDate={(dateStr) => handleOpenAddModal(dateStr)}
            onEditTransaction={handleOpenEditModal}
            onDeleteTransaction={(item) => setDeleteTarget(item)}
          />
        ) : activeView === 'stats' ? (
          <MonthlyStatsView
            transactions={transactions}
            onOpenAddModal={() => handleOpenAddModal()}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Balance Summary + Category Breakdown */}
            <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
              <section className="bg-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-indigo-100 text-xs font-medium mb-1">현재 총 잔액</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                      {formatCurrency(totalBalance)}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>내역 추가</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10">
                    <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-medium mb-1">
                      <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>총 수입</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white tabular-nums truncate">
                      +{formatCurrency(totalIncome)}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10">
                    <div className="flex items-center gap-1.5 text-rose-200 text-xs font-medium mb-1">
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      <span>총 지출</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white tabular-nums truncate">
                      -{formatCurrency(totalExpense)}
                    </p>
                  </div>
                </div>
              </section>

              {categoryBreakdown.length > 0 && (
                <section className="bg-white border border-slate-200/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-900">주요 지출 카테고리</h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      상위 {categoryBreakdown.length}개
                    </span>
                  </div>
                  <div className="space-y-3.5">
                    {categoryBreakdown.map(({ categoryId, meta, amount, percent }) => (
                      <div key={categoryId}>
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                          <span className="font-medium text-slate-700 truncate">{meta.name}</span>
                          <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                            {formatCurrency(amount)} · {percent}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.barColorClass}`}
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>

            {/* Right Column: Filter, Export Actions & Transaction Ledger */}
            <main className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <h2 className="font-bold text-slate-900 text-base whitespace-nowrap">
                      최근 거래 내역
                    </h2>
                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {filteredTransactions.length}건
                    </span>
                  </div>

                  {/* Excel & PDF Export Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={filteredTransactions.length === 0}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-700"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>엑셀</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={filteredTransactions.length === 0 || isExportingPdf}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-700"
                    >
                      {isExportingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{isExportingPdf ? '생성 중...' : 'PDF'}</span>
                    </button>
                  </div>
                </div>

                {/* Segmented Filter Control */}
                <div
                  role="tablist"
                  aria-label="거래 유형 필터"
                  className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold"
                >
                  {(
                    [
                      { key: 'all', label: '전체' },
                      { key: 'income', label: '수입' },
                      { key: 'expense', label: '지출' },
                    ] as const
                  ).map((tab) => {
                    const isActive = filter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setFilter(tab.key)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Real-time Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제목, 은행명 또는 카테고리로 검색..."
                    aria-label="거래 내역 검색"
                    className="w-full min-h-[42px] pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="검색어 지우기"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                    {searchQuery.trim() ? (
                      <Search className="w-6 h-6" />
                    ) : (
                      <Receipt className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {searchQuery.trim()
                      ? '검색어에 일치하는 거래 내역이 없습니다.'
                      : '표시할 거래 내역이 없습니다.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    {searchQuery.trim()
                      ? '다른 검색어를 입력하거나 검색어를 초기화해 보세요.'
                      : '아래 버튼을 눌러 첫 수입이나 지출 내역을 추가해 보세요.'}
                  </p>
                  {searchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>검색 초기화</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal()}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>첫 내역 추가하기</span>
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredTransactions.map((item) => {
                    const isIncome = item.type === 'income';
                    const meta = getCategoryMeta(item.type, item.category);
                    const amountClass = isIncome ? 'text-emerald-600' : 'text-slate-900';
                    const amountPrefix = isIncome ? '+' : '-';

                    return (
                      <li
                        key={item.id}
                        className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl ${meta.colorClass} flex items-center justify-center shrink-0`}
                          >
                            <CategoryIcon categoryId={meta.id} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {item.title}
                              </p>
                              {item.isFixed ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                  <Pin className="w-3 h-3" />
                                  <span>고정</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  변동
                                </span>
                              )}
                              {item.bankName && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                                  {item.bankName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 tabular-nums">
                              <span className="truncate">{meta.name}</span>
                              <span aria-hidden="true">·</span>
                              <span className="shrink-0">{item.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`font-bold text-sm sm:text-base tabular-nums mr-1 ${amountClass}`}
                          >
                            {amountPrefix}
                            {formatCurrency(item.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            aria-label={`${item.title} 수정`}
                            className="w-10 h-10 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`${item.title} 삭제`}
                            className="w-10 h-10 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Quiet Privacy Notice Footer */}
      <footer className="bg-white border-t border-slate-200/80 px-5 py-3 text-center">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>이 브라우저 전용 보관함 · 내 기기에만 안전하게 저장됩니다</span>
        </div>
      </footer>

      {/* Mobile Floating Action Button (Thumb Zone) */}
      <button
        type="button"
        onClick={() => handleOpenAddModal()}
        aria-label="내역 추가"
        className="lg:hidden fixed bottom-12 right-5 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all z-20 cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        editingTransaction={editingTransaction}
        defaultDate={modalDefaultDate}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          setModalDefaultDate(undefined);
        }}
        onSubmit={handleSaveTransaction}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        transaction={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Image / Excel Import Preview Modal */}
      <ImportModal
        isOpen={importModalState.isOpen}
        sourceType={importModalState.sourceType}
        initialCandidates={importModalState.candidates}
        isSubmitting={false}
        onClose={() =>
          setImportModalState((prev) => ({ ...prev, isOpen: false, candidates: [] }))
        }
        onConfirm={handleConfirmImport}
      />
    </div>
  );
}
