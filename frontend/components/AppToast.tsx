'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

let _addToast: ((message: string) => void) | null = null;

export default function AppToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let counter = 0;

  useEffect(() => {
    _addToast = (message: string) => {
      const type = /success|saved|updated|added|created|issued|received|duplicated/i.test(message)
        ? 'success'
        : /error|failed|fail/i.test(message)
        ? 'error'
        : /cannot|exceed|invalid|out of stock/i.test(message)
        ? 'error'
        : 'warning';

      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    // Override window.alert globally
    (window as any).appAlert = _addToast;

    return () => {
      _addToast = null;
    };
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const config = {
    success: {
      gradient: 'from-emerald-500 to-green-600',
      border: 'border-emerald-100',
      icon: <CheckCircleIcon className="w-5 h-5 text-white" />,
      label: 'Success',
    },
    error: {
      gradient: 'from-rose-500 to-red-600',
      border: 'border-rose-100',
      icon: <XCircleIcon className="w-5 h-5 text-white" />,
      label: 'Error',
    },
    warning: {
      gradient: 'from-amber-500 to-orange-500',
      border: 'border-amber-100',
      icon: <ExclamationTriangleIcon className="w-5 h-5 text-white" />,
      label: 'Warning',
    },
    info: {
      gradient: 'from-sky-500 to-blue-600',
      border: 'border-sky-100',
      icon: <InformationCircleIcon className="w-5 h-5 text-white" />,
      label: 'Info',
    },
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none items-center">
      {toasts.map((toast) => {
        const c = config[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-5 py-4 bg-white rounded-2xl shadow-xl border ${c.border} animate-fade-in max-w-sm`}
          >
            <div className={`flex-shrink-0 p-1.5 bg-gradient-to-br ${c.gradient} rounded-xl`}>
              {c.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => remove(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
