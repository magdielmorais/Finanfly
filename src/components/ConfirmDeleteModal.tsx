import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemDetails?: {
    label: string;
    value: string;
  }[];
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  description = 'Tem certeza de que deseja excluir este item? Esta ação não poderá ser desfeita.',
  itemName,
  itemDetails,
  confirmLabel = 'Excluir Lançamento',
  cancelLabel = 'Cancelar',
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in cursor-pointer overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scale-up cursor-default my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl shrink-0">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ação irreversível</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content & Warning */}
        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
            {description}
          </p>

          {itemName && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Lançamento
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white break-words">
                {itemName}
              </div>
            </div>
          )}

          {itemDetails && itemDetails.length > 0 && (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {itemDetails.map((det, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                    {det.label}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate font-mono">
                    {det.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-[11px] font-medium leading-tight">
              Os dados apagados serão removidos permanentemente do seu histórico.
            </span>
          </div>
        </div>

        {/* Actions Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors flex items-center gap-2 shadow-md shadow-red-600/20"
          >
            <Trash2 className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
