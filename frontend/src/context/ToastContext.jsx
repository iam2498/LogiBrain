import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message, duration = 4000) => {
    showToast({ message, type: "success", duration });
  }, [showToast]);

  const showError = useCallback((message, duration = 4500) => {
    showToast({ message, type: "error", duration });
  }, [showToast]);

  const showInfo = useCallback((message, duration = 4000) => {
    showToast({ message, type: "info", duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        className="fixed top-6 right-6 z-[999999] flex flex-col items-end gap-2.5 pointer-events-none max-w-[calc(100vw-3rem)]"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          let bgClass = "bg-primary-container text-white border-on-primary-container/30";
          let icon = "info";
          let iconColor = "text-secondary";

          if (toast.type === "success") {
            bgClass = "bg-emerald-600 text-white border-emerald-500";
            icon = "check_circle";
            iconColor = "text-white";
          } else if (toast.type === "error") {
            bgClass = "bg-red-600 text-white border-red-500";
            icon = "error";
            iconColor = "text-white";
          } else if (toast.type === "info") {
            bgClass = "bg-[#131b2e] text-white border-slate-700";
            icon = "info";
            iconColor = "text-blue-400";
          }

          return (
            <div
              key={toast.id}
              role="alert"
              className={`toast-enter pointer-events-auto flex items-center justify-between gap-3 px-4 sm:px-5 py-3 rounded-xl shadow-2xl border ${bgClass} transition-all duration-200 min-w-[280px] max-w-[380px]`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`material-symbols-outlined text-[20px] shrink-0 ${iconColor}`}>
                  {icon}
                </span>
                <span className="text-[13px] sm:text-[14px] font-semibold leading-snug break-words">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors ml-2 cursor-pointer shrink-0 flex items-center justify-center"
                aria-label="Close notification"
              >
                <span className="material-symbols-outlined text-[16px] block">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
