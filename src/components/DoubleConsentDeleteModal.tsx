import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Clock, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface DoubleConsentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  userName?: string;
  userEmail: string;
  userCpf?: string;
  isLoading?: boolean;
  errorMessage?: string;
  isAdmin?: boolean;
}

export const DoubleConsentDeleteModal: React.FC<DoubleConsentDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  userName,
  userEmail,
  userCpf,
  isLoading = false,
  errorMessage = '',
  isAdmin = false,
}) => {
  // Step 1: First layer confirmation popup
  // Step 2: Second layer countdown popup (rendered on top of step 1)
  const [step, setStep] = useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Timer effect for Step 2 countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && step === 2) {
      setTimeLeft(20);
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, step]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTimeLeft(20);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCancelAll = () => {
    if (isLoading) return;
    setStep(1);
    setTimeLeft(20);
    onClose();
  };

  const handleProceedToSecondLayer = () => {
    setStep(2);
  };

  const handleFinalConfirmClick = async () => {
    if (timeLeft > 0 || isLoading) return;
    await onConfirm();
  };

  return createPortal(
    <>
      {/* ============================================================ */}
      {/* CAMADA 1: Primeiro Pop-up de Confirmação (Permanece no fundo) */}
      {/* ============================================================ */}
      <div
        className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in cursor-pointer overflow-y-auto"
        onClick={handleCancelAll}
      >
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 cursor-default max-h-[90vh] overflow-y-auto custom-scrollbar my-auto transition-all ${
            step === 2 ? 'opacity-40 scale-95 pointer-events-none filter blur-[1px]' : 'opacity-100 scale-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                  {title || (isAdmin ? 'Confirmar Exclusão de Registro' : 'Confirmar Exclusão de Conta')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ação irreversível de segurança</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelAll}
              disabled={isLoading}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User information & warnings */}
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3">
            <p>
              {isAdmin ? 'Você está prestes a excluir o usuário ' : 'Você está prestes a excluir a conta de '}
              <strong className="text-slate-900 dark:text-white">{userName || userEmail}</strong>
              {userName && (
                <>
                  {' '}(<span className="font-mono font-bold">{userEmail}</span>)
                </>
              )}.
            </p>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 p-3.5 rounded-xl space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Exclusão Total de Dados Financeiros e Cadastrais</span>
              </div>
              <p className="text-[11px]">
                Esta ação apagará permanentemente o perfil, receitas, despesas, metas, categorias, planejamentos anuais,
                listas de compras, ações e todo o histórico financeiro. Não será possível recuperar estas informações posteriormente.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Retenção Restrita:</strong> Por diretrizes de segurança, auditoria e controle de planos de assinatura,
                apenas o registro do CPF é mantido em tabela restrita para impedir uso fraudulento de novos períodos gratuitos.
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/40">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleProceedToSecondLayer}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/15 disabled:opacity-50 cursor-pointer"
            >
              Sim, apagar tudo
            </button>
            <button
              type="button"
              onClick={handleCancelAll}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CAMADA 2: Segundo Pop-up de Consentimento (Por cima de tudo)   */}
      {/* ============================================================ */}
      {step === 2 && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in cursor-pointer overflow-y-auto"
          onClick={handleCancelAll}
        >
          <div
            className="bg-white dark:bg-slate-900 border-2 border-red-500/80 dark:border-red-500/60 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 cursor-default max-h-[92vh] overflow-y-auto custom-scrollbar my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com destaque de dupla camada */}
            <div className="flex items-start gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl shrink-0 ring-4 ring-red-500/10 animate-pulse">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 mb-1">
                  Dupla Camada de Consentimento
                </span>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  Confirmação Definitiva de Exclusão
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conta: <strong className="text-slate-800 dark:text-slate-200">{userEmail}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelAll}
                disabled={isLoading}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Cancelar e fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aviso crítico e Contador Regressivo */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p className="leading-relaxed">
                  Por medidas de segurança e conformidade, é obrigatório aguardar a contagem regressiva de segurança.
                  O botão final de exclusão só será liberado após o término do cronômetro.
                </p>
                <div className="flex items-center gap-2 pt-1 font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span>Todos os dados serão apagados imediatamente sem possibilidade de recuperação.</span>
                </div>
              </div>

              {/* Caixa do Contador de 20 segundos */}
              <div className="rounded-2xl border-2 border-dashed border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-5 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className={`h-5 w-5 ${timeLeft > 0 ? 'text-red-500 animate-spin' : 'text-emerald-500'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {timeLeft > 0 ? 'Contagem Regressiva de Segurança' : 'Liberação Autorizada'}
                  </span>
                </div>

                {/* Exibição Numérica do Cronômetro */}
                <div className="flex items-baseline justify-center gap-1.5">
                  <span
                    className={`font-mono text-5xl sm:text-6xl font-black tracking-tight transition-colors ${
                      timeLeft > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {String(timeLeft).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold text-slate-400 uppercase">segundos</span>
                </div>

                {/* Barra de Progresso visual (20s -> 0s) */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      timeLeft > 0 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${((20 - timeLeft) / 20) * 100}%` }}
                  />
                </div>

                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {timeLeft > 0
                    ? `Aguarde ${timeLeft}s para habilitar a confirmação definitiva.`
                    : '✓ Cronômetro finalizado. O botão de exclusão permanente foi habilitado.'}
                </p>
              </div>

              {/* Informação sobre apagamento definitivo */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Todos os dados serão irrevogavelmente apagados.</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/40">
                {errorMessage}
              </div>
            )}

            {/* Ações da Segunda Camada */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Botão Cancelar: Visível e 100% funcional desde o início */}
              <button
                type="button"
                onClick={handleCancelAll}
                disabled={isLoading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer text-center"
              >
                Cancelar
              </button>

              {/* Botão Confirmar: Bloqueado (disabled) até o cronômetro zerar (0s) */}
              <button
                type="button"
                onClick={handleFinalConfirmClick}
                disabled={timeLeft > 0 || isLoading}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-center ${
                  timeLeft > 0 || isLoading
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800 shadow-none'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 cursor-pointer active:scale-95 animate-pulse'
                }`}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>
                  {isLoading
                    ? 'Excluindo conta...'
                    : timeLeft > 0
                    ? `Sim - apagar tudo (${timeLeft}s)`
                    : 'Sim - apagar tudo'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
