import { Trash2 } from 'lucide-react';
import { formatCurrency, type Transaction } from '../types/ledger';

interface DeleteModalProps {
  transaction: Transaction | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ transaction, isDeleting, onCancel, onConfirm }: DeleteModalProps) {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white w-full max-w-xs rounded-2xl p-6 text-center shadow-xl border border-slate-100">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-5 h-5" />
        </div>
        <h4 id="delete-modal-title" className="font-bold text-slate-900 text-base mb-1">
          내역을 삭제할까요?
        </h4>
        <p className="text-xs text-slate-500 mb-1 truncate">{transaction.title}</p>
        <p className="text-sm font-bold text-slate-800 tabular-nums mb-5">
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
        <p className="text-xs text-slate-500 mb-5">
          삭제된 내역은 이 브라우저에서 즉시 삭제되며 복구할 수 없습니다.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="min-h-[44px] py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-[44px] py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
