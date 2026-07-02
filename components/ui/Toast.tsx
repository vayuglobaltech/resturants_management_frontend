// components/ui/Toast.tsx
"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const toastStyles = {
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Individual Toast Component
function ToastItem({ id, message, type = "error", duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const Icon = toastIcons[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${toastStyles[type]}`}>
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(id), 300);
            }}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType; duration?: number }>>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: ToastType = "error", duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const value = {
    showToast,
    success: (message: string, duration?: number) => showToast(message, "success", duration),
    error: (message: string, duration?: number) => showToast(message, "error", duration),
    info: (message: string, duration?: number) => showToast(message, "info", duration),
    warning: (message: string, duration?: number) => showToast(message, "warning", duration),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </ToastContext.Provider>
  );
}