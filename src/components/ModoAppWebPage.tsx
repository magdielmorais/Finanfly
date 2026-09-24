import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Smartphone,
  Monitor,
  Apple,
  ArrowLeft,
  ChevronRight,
  Download,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Loader2,
  Maximize2,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface ModoAppWebPageProps {
  onNavigate?: (page: string) => void;
}

type SystemType = 'computador' | 'android' | 'ios';

export const ModoAppWebPage: React.FC<ModoAppWebPageProps> = ({ onNavigate }) => {
  const [selectedSystem, setSelectedSystem] = useState<SystemType | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredInstallPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

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
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);

    setIsIOSDevice(ios);
    setIsAndroidDevice(android);

    // If global prompt already exists, use it
    if ((window as any).deferredInstallPrompt) {
      setDeferredPrompt((window as any).deferredInstallPrompt);
    }

    // Listen for PWA beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleCustomInstallReady = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('finanfly-install-ready', handleCustomInstallReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('finanfly-install-ready', handleCustomInstallReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger PWA install
  const handleInstallClick = async () => {
    setIsTriggering(true);
    const promptToUse = deferredPrompt || (window as any).deferredInstallPrompt;

    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setInstallSuccess(true);
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
      } catch (err) {
        console.warn('Comando de prompt automático não pôde ser concluído:', err);
      } finally {
        setIsTriggering(false);
      }
    } else {
      setIsTriggering(false);
      if (isIOSDevice && navigator.share) {
        try {
          await navigator.share({
            title: 'FinanFly - Controle Financeiro',
            text: 'Acesse e instale o FinanFly no seu iPhone',
            url: window.location.origin
          });
        } catch {
          // User cancelled share
        }
      }
    }
  };

  // Cards definitions for the initial view
  const systemCards = [
    {
      id: 'computador' as SystemType,
      title: 'Computador',
      subtitle: 'PC, Mac & Notebook',
      description: 'Como instalar e usar o FinanFly no computador em tela cheia e modo desktop',
      icon: Monitor,
      color: 'blue',
      borderColor: 'border-blue-500/20 hover:border-blue-500/60 dark:border-blue-500/20 dark:hover:border-blue-400/60',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      badge: 'Desktop'
    },
    {
      id: 'android' as SystemType,
      title: 'Telefone Android',
      subtitle: 'Google Chrome, Samsung Internet & Xiaomi',
      description: 'Passo a passo nativo para celulares Android e alternância entre modos',
      icon: Smartphone,
      color: 'emerald',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/60 dark:border-emerald-500/20 dark:hover:border-emerald-400/60',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'Android'
    },
    {
      id: 'ios' as SystemType,
      title: 'Telefone iOS (iPhone)',
      subtitle: 'Apple iPhone & iPad (Safari)',
      description: 'Passo a passo nativo no Safari para adicionar à tela de início no iOS',
      icon: Apple,
      color: 'indigo',
      borderColor: 'border-indigo-500/20 hover:border-indigo-500/60 dark:border-indigo-500/20 dark:hover:border-indigo-400/60',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      badge: 'iOS / Apple'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 sm:py-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
            <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Modo App Web
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Instalação e modos de visualização no Computador, Android e iPhone (iOS)
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('Início')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        )}
      </div>

      {/* Standalone Status Indicator if already running installed */}
      {isInstalled && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Você já está executando o <strong>FinanFly instalado no Modo App</strong>.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            Ativo
          </span>
        </div>
      )}

      {/* AnimatePresence switching between Initial Cards View and Step-by-Step Screen */}
      <AnimatePresence mode="wait">
        {!selectedSystem ? (
          /* ========================================================================= */
          /* PÁGINA INICIAL: MOSTRAR SÓ OS CARDS COM OS TÍTULOS                        */
          /* ========================================================================= */
          <motion.div
            key="initial-cards-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Selecione o seu dispositivo
              </span>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Clique no card correspondente para abrir o passo a passo nativo:
              </p>
            </div>

            {/* Grid of 3 Cards: Computador, Telefone Android, Telefone iOS (iPhone) */}
            <div className="grid gap-4 sm:grid-cols-3">
              {systemCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <motion.button
                    key={card.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSystem(card.id)}
                    className={`group relative text-left p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 ${card.borderColor} shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden min-h-[190px]`}
                  >
                    {/* Background glow on hover */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-400/5 pointer-events-none group-hover:scale-150 transition-transform" />

                    <div>
                      {/* Top icon and tag */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className={`p-3 rounded-2xl ${card.bgColor} ${card.textColor} border border-slate-100 dark:border-slate-800/80 group-hover:scale-110 transition-transform shadow-xs`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                          {card.badge}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {card.subtitle}
                      </p>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                      <span>Ver passo a passo</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Quick Informational Footer Note */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                O FinanFly é uma aplicação <strong>PWA (Progressive Web App)</strong> moderna e pode ser instalado nativamente em qualquer sistema sem consumir memória extra do seu aparelho.
              </span>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* TELA COM O PASSO A PASSO NATIVO DO SISTEMA ESCOLHIDO                      */
          /* ========================================================================= */
          <motion.div
            key={`detail-${selectedSystem}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Navigation back and switch between platforms */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                onClick={() => setSelectedSystem(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer w-fit"
                id="btn-voltar-modos"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar aos Modos</span>
              </button>

              {/* Quick Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 self-stretch sm:self-auto overflow-x-auto">
                <button
                  onClick={() => setSelectedSystem('computador')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSystem === 'computador'
                      ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Computador</span>
                </button>
                <button
                  onClick={() => setSelectedSystem('android')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSystem === 'android'
                      ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setSelectedSystem('ios')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSystem === 'ios'
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Apple className="h-3.5 w-3.5" />
                  <span>iOS (iPhone)</span>
                </button>
              </div>
            </div>

            {/* DETAIL VIEW: COMPUTADOR */}
            {selectedSystem === 'computador' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Header of the view */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Guia Passo a Passo
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Modo Computador (PC / Mac / Notebook)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Utilize o FinanFly em tela cheia, instale como aplicativo de desktop e tenha atalho na barra de tarefas.
                    </p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      1
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Acesse pelo navegador
                      </h4>
                      <p className="leading-relaxed">
                        Abra o Google Chrome, Microsoft Edge, Brave ou Safari no seu computador e acesse o endereço do FinanFly.
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      2
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Instalar o aplicativo no Desktop
                      </h4>
                      <p className="leading-relaxed">
                        No <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, observe a <strong>barra de endereço</strong> (onde fica o link do site). No lado direito da barra, clique no ícone de instalar aplicativo{' '}
                        <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs font-bold text-[11px]">
                          <Download className="h-3 w-3 inline mr-1" /> Instalar
                        </span>.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ou clique no menu de <strong>3 pontinhos (⋮)</strong> no topo direito ➔ <strong>Salvar e compartilhar</strong> ➔ <strong>Instalar FinanFly...</strong>
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      3
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Janela nativa e atalho na barra de tarefas
                      </h4>
                      <p className="leading-relaxed">
                        Após confirmar em <strong>&quot;Instalar&quot;</strong>, o FinanFly abrirá em sua própria janela independente, sem as barras de navegação do browser, e criará um ícone na sua <strong>Área de Trabalho</strong> e na <strong>Barra de Tarefas do Windows</strong> (ou Dock no Mac).
                      </p>
                    </div>
                  </div>

                  {/* Dica: Modo Tela Cheia */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400">
                      <Maximize2 className="h-4 w-4" />
                      <span>Dica: Modo Tela Cheia (F11)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pressione a tecla <strong>F11</strong> no teclado do computador a qualquer momento para entrar ou sair do modo de tela inteira, aproveitando o máximo de espaço para seus gráficos e planilhas.
                    </p>
                  </div>
                </div>

                {/* Direct action button if browser supports prompt */}
                {deferredPrompt && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleInstallClick}
                      disabled={isTriggering}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Instalar FinanFly no Computador Agora</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DETAIL VIEW: TELEFONE ANDROID */}
            {selectedSystem === 'android' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Sistema Nativo Android
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Passo a Passo: Telefone Android
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Instalação nativa via Google Chrome, Samsung Internet ou Xiaomi Browser.
                    </p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      1
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Acesse pelo navegador do seu celular
                      </h4>
                      <p className="leading-relaxed">
                        Abra o <strong>Google Chrome</strong> ou o <strong>Samsung Internet</strong> no seu smartphone Android e entre no FinanFly.
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      2
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Abra o menu de opções do navegador
                      </h4>
                      <p className="leading-relaxed">
                        Toque no ícone de <strong>3 pontinhos verticais</strong>{' '}
                        <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </span>{' '}
                        localizado no canto superior direito da tela do navegador.
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      3
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Selecione &quot;Instalar aplicativo&quot;
                      </h4>
                      <p className="leading-relaxed">
                        No menu de opções, toque em <strong>&quot;Instalar aplicativo&quot;</strong> (ou <strong>&quot;Adicionar à tela inicial&quot;</strong>).
                      </p>
                    </div>
                  </div>

                  {/* Passo 4 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      4
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Confirmar instalação
                      </h4>
                      <p className="leading-relaxed">
                        Toque em <strong>&quot;Instalar&quot;</strong> na janela de confirmação. Em poucos segundos, o ícone nativo do FinanFly aparecerá na sua tela inicial e na lista de aplicativos, rodando em tela cheia sem barras.
                      </p>
                    </div>
                  </div>

                  {/* Dica: Alternar entre Modo Celular e Modo Computador no Android */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-400">
                      <Monitor className="h-4 w-4" />
                      <span>Alternar entre Modo Celular e Modo Computador no Android</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Se você estiver usando o navegador no Android e quiser ver a tela ampla com tabelas e colunas completas: toque nos <strong>3 pontinhos verticais (⋮)</strong> e marque a opção <strong>&quot;Para computador&quot;</strong> ou <strong>&quot;Site para computador&quot;</strong>. Para voltar ao layout compacto de celular, basta desmarcar a opção.
                    </p>
                  </div>
                </div>

                {/* Direct Action Button if on Android or Prompt available */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleInstallClick}
                    disabled={isTriggering}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Disparando comando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Disparar Instalação Automática no Android</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* DETAIL VIEW: TELEFONE IOS (IPHONE) */}
            {selectedSystem === 'ios' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    <Apple className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Sistema Nativo Apple iOS
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Passo a Passo: Telefone iOS (iPhone & iPad)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Instalação nativa sem necessidade de App Store através do navegador Safari da Apple.
                    </p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      1
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Abra no Safari da Apple
                      </h4>
                      <p className="leading-relaxed">
                        No seu iPhone ou iPad, abra obrigatoriamente o navegador oficial <strong>Safari</strong> (ícone de bússola azul) e acesse o endereço do FinanFly.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        * A Apple só permite a criação de atalhos de tela nativos quando executado pelo Safari.
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      2
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Toque no botão de Compartilhar
                      </h4>
                      <p className="leading-relaxed">
                        Na barra inferior do Safari, toque no ícone central de <strong>Compartilhar</strong>{' '}
                        <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-blue-500 align-middle mx-1 shadow-2xs">
                          <Share2 className="h-3.5 w-3.5" />
                        </span>{' '}
                        (o quadrado azul com uma seta apontando para cima).
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      3
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Selecione &quot;Adicionar à Tela de Início&quot;
                      </h4>
                      <p className="leading-relaxed">
                        No menu de opções que se abrir, role um pouco para baixo e toque em{' '}
                        <strong>&quot;Adicionar à Tela de Início&quot;</strong>{' '}
                        <span className="inline-flex items-center justify-center p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 align-middle mx-1 shadow-2xs">
                          <PlusSquare className="h-3.5 w-3.5" />
                        </span>.
                      </p>
                    </div>
                  </div>

                  {/* Passo 4 */}
                  <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0 shadow-xs mt-0.5">
                      4
                    </span>
                    <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Toque em &quot;Adicionar&quot;
                      </h4>
                      <p className="leading-relaxed">
                        No canto superior direito da tela do iPhone, toque em <strong>&quot;Adicionar&quot;</strong>.
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        ✓ Pronto! O ícone do FinanFly aparecerá como um aplicativo nativo na tela inicial do seu iPhone, sem barras de navegador.
                      </p>
                    </div>
                  </div>

                  {/* Dica: Modo Computador no iPhone */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-400">
                      <Monitor className="h-4 w-4" />
                      <span>Como solicitar o Modo Computador no iPhone</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Caso queira ver o layout expandido de computador no Safari do iPhone: toque no ícone <strong>&quot;aA&quot;</strong> no canto esquerdo da barra de endereço e escolha <strong>&quot;Solicitar Site para Computador&quot;</strong>.
                    </p>
                  </div>
                </div>

                {/* Direct Action for iOS */}
                {navigator.share && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleInstallClick}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Abrir Compartilhamento no Safari</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
