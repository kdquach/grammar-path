import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastRecord {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  info: (message: string, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION_MS = 5000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const variant: ToastVariant = options?.variant ?? "info";
      const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;

      setToasts((prev) => [...prev.slice(-3), { id, message: trimmed, variant }]);

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextType>(
    () => ({
      showToast,
      info: (msg, durationMs) => showToast(msg, { variant: "info", durationMs }),
      success: (msg, durationMs) => showToast(msg, { variant: "success", durationMs }),
      warning: (msg, durationMs) => showToast(msg, { variant: "warning", durationMs }),
      error: (msg, durationMs) => showToast(msg, { variant: "error", durationMs }),
      dismissToast,
    }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-4 right-4 z-[70] flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
        >
          {toasts.map((toast) => {
            const isAlert = toast.variant === "error" || toast.variant === "warning";
            const styleByVariant: Record<ToastVariant, string> = {
              info: "bg-slate-900 text-white border-slate-700",
              success: "bg-emerald-700 text-white border-emerald-600",
              warning: "bg-amber-50 text-amber-950 border-amber-300",
              error: "bg-rose-50 text-rose-900 border-rose-300",
            };
            const Icon =
              toast.variant === "success"
                ? CheckCircle2
                : toast.variant === "warning"
                ? AlertTriangle
                : toast.variant === "error"
                ? AlertCircle
                : Info;

            return (
              <div
                key={toast.id}
                role={isAlert ? "alert" : "status"}
                className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg text-xs sm:text-sm ${styleByVariant[toast.variant]}`}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="flex-1 font-medium leading-snug">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};

const fallbackToast: ToastContextType = {
  showToast: () => {},
  info: () => {},
  success: () => {},
  warning: () => {},
  error: () => {},
  dismissToast: () => {},
};

export function useToast(): ToastContextType {
  return useContext(ToastContext) || fallbackToast;
}

export default ToastContext;

