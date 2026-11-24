import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ToastState {
  message: string;
  variant: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  const isError = toast.variant === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg flex items-center gap-2 max-w-[90vw]"
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      <span className="truncate">{toast.message}</span>
    </div>
  );
}
