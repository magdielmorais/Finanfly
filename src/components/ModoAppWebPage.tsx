import React from 'react';
import { Globe, Smartphone, Monitor, Download, MoreVertical, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ModoAppWebPageProps {
  onNavigate?: (page: string) => void;
}

export const ModoAppWebPage: React.FC<ModoAppWebPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4 sm:py-8 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Modo app Web
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Guia de visualização e instalação do FinanFly no navegador e celular
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('Início')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        )}
      </div>

      {/* Section 1: APP WEB */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
            1
          </span>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">
            APP WEB
          </h3>
        </div>

        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          Se você estiver usando o aplicativo através de um navegador da web através do endereço{' '}
          <span className="font-bold text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2">
            www.FinanFly.com.br
          </span>{' '}
          você pode escolher entre os dois modos, <strong className="font-bold text-slate-900 dark:text-white">&quot;COMPUTADOR&quot;</strong> ou <strong className="font-bold text-slate-900 dark:text-white">&quot;CELULAR/TABLET&quot;</strong>
        </p>

        <div className="grid gap-4 pt-1">
          {/* Modo Computador */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0 mt-0.5">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                Modo COMPUTADOR
              </h4>
              <p className="leading-relaxed">
                Vá até Configurações do seu navegador geralmente um ícone{' '}
                <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>{' '}
                (três pontinhos na vertical) e escolher/marcar{' '}
                <strong className="font-bold text-slate-900 dark:text-white">( Site para computador )</strong>
              </p>
            </div>
          </div>

          {/* Modo Celular / Tablet */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 mt-0.5">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                Modo CELULAR/TABLET
              </h4>
              <p className="leading-relaxed">
                Vá até Configurações do seu navegador geralmente um ícone{' '}
                <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>{' '}
                (três pontinhos na vertical) e desmarcar{' '}
                <strong className="font-bold text-slate-900 dark:text-white">( Site para computador )</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: INSTALAR APP NO CELULAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs shadow-xs">
            2
          </span>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            INSTALAR APP NO CELULAR
          </h3>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 mt-0.5">
            <Download className="h-5 w-5" />
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              Vá até Configurações do seu navegador geralmente um ícone{' '}
              <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs">
                <MoreVertical className="h-3.5 w-3.5" />
              </span>{' '}
              (três pontinhos na vertical) e selecionar{' '}
              <strong className="font-bold text-slate-900 dark:text-white">( Instalar e criar atalho )</strong> — será instalado e criado um atalho no seu celular para o APP.
            </p>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Para usar no modo Celular, deve-se fazer a configuração no navegador conforme explicado acima (<strong>Modo CELULAR/TABLET</strong>).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
