import React, { useState, useEffect } from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  Download,
  MoreVertical,
  CheckCircle2,
  ArrowLeft,
  Share2,
  PlusSquare,
  Sparkles,
  Info,
  X
} from 'lucide-react';

interface ModoAppWebPageProps {
  onNavigate?: (page: string) => void;
}

export const ModoAppWebPage: React.FC<ModoAppWebPageProps> = ({ onNavigate }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect device OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for PWA beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Erro ao acionar prompt de instalação:', err);
        setShowInstructionsModal(true);
      }
    } else {
      // If deferredPrompt is not available (iOS, in-app browser, or already prompted), show platform instructions
      setShowInstructionsModal(true);
    }
  };

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

        {/* Botão com mecanismo de instalação no celular quando no modo navegador */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          {installSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Aplicativo Instalado com Sucesso!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  O atalho do FinanFly foi adicionado à tela inicial do seu celular.
                </p>
              </div>
            </div>
          ) : isInstalled ? (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>
                  Você já está executando o <strong>FinanFly no Modo Aplicativo</strong> no seu dispositivo.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Instalado
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>Instalação Rápida no Navegador</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Clique no botão para instalar o FinanFly direto na tela inicial do seu celular ou tablet.
                  </p>
                </div>

                <button
                  id="btn-instalar-app-celular"
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-100 cursor-pointer shrink-0"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Instalar Aplicativo no Celular</span>
                </button>
              </div>

              {deferredPrompt && (
                <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Seu navegador suporta instalação com 1 clique. Clique no botão acima para confirmar.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal / Guia de Instalação Manual para Celulares (iOS Safari / Android Chrome) */}
      {showInstructionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowInstructionsModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                <Smartphone className="h-5 w-5 text-emerald-500" />
                <span>Como Instalar no Celular</span>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isIOS ? (
              /* Instruções específicas para iOS Safari */
              <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">
                  No iPhone ou iPad (Navegador Safari):
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Toque no botão de <strong>Compartilhar</strong>{' '}
                      <Share2 className="h-3.5 w-3.5 inline text-blue-500 mx-0.5" /> (na barra inferior do Safari).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Role para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>{' '}
                      <PlusSquare className="h-3.5 w-3.5 inline text-slate-500 mx-0.5" />.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior direito. Pronto!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Instruções para Android / Chrome / Outros Navegadores */
              <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">
                  No Android (Google Chrome ou Samsung Internet):
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Toque no ícone de <strong>3 pontinhos verticais</strong>{' '}
                      <MoreVertical className="h-3.5 w-3.5 inline text-slate-500 mx-0.5" /> no canto superior direito do navegador.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Selecione <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Confirme em <strong>&quot;Instalar&quot;</strong> para criar o ícone direto no seu celular.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Entendi, fechar instruções
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
