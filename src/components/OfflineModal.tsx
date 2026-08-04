import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export const OfflineModal: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [checking, setChecking] = useState<boolean>(false);
  const [showStillOfflineMessage, setShowStillOfflineMessage] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowStillOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    // Periodic check in case navigator.onLine state updates
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
      } else if (isOffline && navigator.onLine) {
        fetch(window.location.origin + '?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
          .then(() => {
            setIsOffline(false);
            setShowStillOfflineMessage(false);
          })
          .catch(() => {
            // Still offline
          });
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOffline]);

  const handleConfirm = async () => {
    setChecking(true);
    setShowStillOfflineMessage(false);

    // Check navigator.onLine first
    if (!navigator.onLine) {
      setChecking(false);
      setShowStillOfflineMessage(true);
      setIsOffline(true);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      await fetch(window.location.origin + '?check=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      setIsOffline(false);
      setShowStillOfflineMessage(false);
    } catch {
      setIsOffline(true);
      setShowStillOfflineMessage(true);
    } finally {
      setChecking(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <WifiOff className="h-7 w-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Conexão Off-line
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium leading-relaxed">
          Sua internet está off-line, para continuar usando o aplicativo conectar sua internet
        </p>

        {showStillOfflineMessage && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Sua internet continua off-line. Conecte sua rede para fechar o aviso.</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {checking ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Verificando conexão...</span>
            </>
          ) : (
            <span>OK</span>
          )}
        </button>
      </div>
    </div>
  );
};
