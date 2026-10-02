import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, TrendingDown, Shield, BarChart3, ShoppingBag, Settings, BadgePercent, ArrowRight, PlusCircle, ChevronDown, ChevronUp, Info, Smartphone, Menu, Sliders, Check, X, RotateCcw } from 'lucide-react';
import { FinanFlyLogo } from './FinanFlyLogo';

interface HomeProps {
  userName: string;
  onNavigate: (page: string) => void;
  isAdmin: boolean;
  onOpenMenu?: () => void;
  floatingMenuEnabled?: boolean;
  onToggleFloatingMenu?: (enabled: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({ userName, onNavigate, isAdmin, onOpenMenu, floatingMenuEnabled, onToggleFloatingMenu }) => {
  const [isComoComecarOpen, setIsComoComecarOpen] = useState(false);
  const [isMenuSuspensoModalOpen, setIsMenuSuspensoModalOpen] = useState(false);

  const [localFloatingMenuEnabled, setLocalFloatingMenuEnabled] = useState<boolean>(() => {
    if (floatingMenuEnabled !== undefined) return floatingMenuEnabled;
    try {
      const saved = localStorage.getItem('finanfly_floating_menu_enabled');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return true; // Ativado por padrão
  });

  useEffect(() => {
    if (floatingMenuEnabled !== undefined) {
      setLocalFloatingMenuEnabled(floatingMenuEnabled);
    }
  }, [floatingMenuEnabled]);

  const handleSaveFloatingMenu = (newVal: boolean) => {
    setLocalFloatingMenuEnabled(newVal);
    try {
      localStorage.setItem('finanfly_floating_menu_enabled', String(newVal));
    } catch {}
    onToggleFloatingMenu?.(newVal);
    window.dispatchEvent(new CustomEvent('finanfly_floating_menu_changed', { detail: newVal }));
    setIsMenuSuspensoModalOpen(false);
  };

  const handleResetFloatingPosition = () => {
    try {
      localStorage.removeItem('finanfly_floating_menu_position_v2');
      localStorage.removeItem('finanfly_floating_menu_position');
    } catch {}
    window.dispatchEvent(new CustomEvent('finanfly-reset-floating-menu-position'));
  };
  const [notices, setNotices] = useState(() => {
    try {
      const saved = localStorage.getItem('finanfly_home_notices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fluxoCaixa) return parsed;
      }
    } catch (e) {}
    return {
      fluxoCaixa: {
        title: 'Fluxo de Caixa Simplificado',
        message: 'Cadastre suas receitas e despesas de forma imediata, mantendo o controle total dos seus gastos diários sem perder tempo.'
      },
      resumosInteligentes: {
        title: 'Resumos Inteligentes',
        message: 'Acompanhe a sua evolução financeira através de uma visão consolidada mensal e anual, identificando padrões de consumo e oportunidades de economia com facilidade, veja onde está o gargalo das suas finanças.'
      },
      planejamentoObjetivos: {
        title: 'Planejamento e Objetivos',
        message: 'Transforme suas metas em realidade criando planos de ação personalizados com status de acompanhamento em tempo real, ajuste sua realidade de ganhos com os gastos.'
      },
      rule50_30_20: {
        title: 'Regra 70/30',
        message: 'A regra de ouro das finanças recomenda destinar os seus rendimentos da seguinte forma:\n✳️ 70% para o BEM DA FAMÍLIA - Necessidades básicas, desejos, segurança, desenvolvimento, lazer, além do bem-estar físico e emocional.\n✳️ 10% para o BEM DO REINO - Reconhecendo que tudo vem do Criador, uma parte é destinada para expandir o Seu amor, apoiando, por exemplo, instituições religiosas focadas na evangelização.\n✳️ 10% para o BEM DAS PESSOAS - Demonstrando generosidade ao auxiliar o próximo em momentos de necessidade (cestas básicas, remédios, roupas e calçados) e ao celebrar conquistas (presentes de aniversário, casamento, formatura, etc.).\n✳️ 10% para o BEM FUTURO - Investimentos voltados à construção de riqueza, fazendo o dinheiro trabalhar por você para garantir uma aposentadoria farta e abundante.'
      },
      weeklyCheck: {
        title: 'Lançamento diário e Check-in Semanal',
        message: 'Registre suas finanças assim que elas acontecerem. Depois, reserve apenas 10 minutos no início ou no fim da semana para revisar o resumo de receitas e despesas. Manter os lançamentos em dia é o segredo para evitar surpresas no fim do mês!'
      }
    };
  });

  useEffect(() => {
    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        if (data && data.fluxoCaixa) {
          const freshNotices = {
            fluxoCaixa: {
              title: data.fluxoCaixa?.title || '',
              message: data.fluxoCaixa?.message || ''
            },
            resumosInteligentes: {
              title: data.resumosInteligentes?.title || '',
              message: data.resumosInteligentes?.message || ''
            },
            planejamentoObjetivos: {
              title: data.planejamentoObjetivos?.title || '',
              message: data.planejamentoObjetivos?.message || ''
            },
            rule50_30_20: {
              title: data.rule50_30_20?.title || '',
              message: data.rule50_30_20?.message || ''
            },
            weeklyCheck: {
              title: data.weeklyCheck?.title || '',
              message: data.weeklyCheck?.message || ''
            }
          };
          setNotices(freshNotices);
          try {
            localStorage.setItem('finanfly_home_notices', JSON.stringify(freshNotices));
          } catch (e) {}
        }
      })
      .catch(err => console.error('Erro ao carregar avisos sincronizados na Home:', err));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white md:p-10 border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <FinanFlyLogo size={46} rounded="rounded-2xl" shadow />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 text-xs font-semibold text-blue-300">
                  👋 Bem-vindo {userName}!
                </span>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">FinanFly • Controle Financeiro Inteligente</p>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Sua saúde financeira, <br />
              <span className="text-blue-400">sob controle absoluto.</span>
            </h1>
            <p className="text-slate-200 text-base max-w-xl leading-relaxed">
              Acompanhe suas receitas, despesas e investimentos, planeje seu ano, viagens e objetivos. Controle sua lista de compras, anote seus desejos e seus planos de ações para melhoria contínua de finanças. Tudo em um único lugar, adaptado para qualquer tela.
            </p>

            <p className="text-blue-300 font-semibold text-sm sm:text-base">
              Para começar só escolher abaixo.
            </p>

            {/* Botões de Ações Rápidas */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-xl">
              {/* Par 1: Menu e Ir para o Painel (abaixo do Menu) */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onOpenMenu}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-95 border border-blue-400/30 cursor-pointer"
                  title="Abrir menu de navegação lateral"
                >
                  <Menu className="h-4 w-4" />
                  <span>Menu</span>
                </button>
                <button
                  onClick={() => onNavigate(isAdmin ? 'Administrador' : 'Painel')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2.5 text-sm font-semibold transition-all border border-slate-700/50 cursor-pointer"
                  title={`Ir para o ${isAdmin ? 'Painel Admin' : 'Painel'}`}
                >
                  <span>Ir para o {isAdmin ? 'Painel Admin' : 'Painel'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Par 2: Adicionar Receitas e Adicionar Despesas abaixo */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => onNavigate('Receitas (Ganhos)')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 cursor-pointer"
                  title="Cadastrar novas receitas"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Adicionar Receitas</span>
                </button>
                <button
                  onClick={() => onNavigate('Despesas (Gastos)')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 cursor-pointer"
                  title="Cadastrar novas despesas"
                >
                  <PlusCircle className="h-4 w-4 text-rose-400 animate-pulse" />
                  <span>Adicionar Despesas</span>
                </button>
              </div>

              {/* Par 3: Modo Celular e Menu Suspenso colocado abaixo dele */}
              <div className="flex flex-col gap-1.5">
                <button
                  id="btn-home-modo-celular"
                  onClick={() => onNavigate('Modo app Web')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-sm font-bold shadow-md shadow-emerald-950/25 transition-all hover:scale-[1.01] active:scale-100 border border-emerald-400/40 cursor-pointer"
                  title="Acessar instruções do Modo Celular / PWA"
                >
                  <Smartphone className="h-4 w-4 text-emerald-100" />
                  <span>Modo Celular</span>
                </button>
                <button
                  id="btn-home-menu-suspenso"
                  onClick={() => setIsMenuSuspensoModalOpen(true)}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-bold shadow-md transition-all hover:scale-[1.01] active:scale-100 border cursor-pointer ${
                    localFloatingMenuEnabled
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/40 shadow-blue-900/25'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                  }`}
                  title="Ativar ou desativar o Menu Suspenso flutuante na tela"
                >
                  <Sliders className="h-4 w-4 text-blue-200" />
                  <span>Menu suspenso</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                    localFloatingMenuEnabled
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {localFloatingMenuEnabled ? 'Ativo' : 'Inativo'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Logo Badge in Hero on medium+ screens */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/40 border border-slate-800/80 backdrop-blur-sm shrink-0 shadow-2xl">
            <FinanFlyLogo size={120} rounded="rounded-3xl" shadow />
            <span className="mt-3 text-sm font-extrabold tracking-wider text-white">FinanFly</span>
            <span className="text-[11px] font-bold text-sky-400 tracking-wide">Finanças Inteligente</span>
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Fluxo de Caixa */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.fluxoCaixa.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.fluxoCaixa.message}
          </p>
        </div>

        {/* Card 2: Resumos Inteligentes */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.resumosInteligentes.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.resumosInteligentes.message}
          </p>
        </div>

        {/* Card 3: Planejamento e Objetivos */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">{notices.planejamentoObjetivos.title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notices.planejamentoObjetivos.message}
          </p>
        </div>
      </div>

      {/* Card COMO COMEÇAR (Separated above) */}
      <div className="bg-white rounded-xl border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 overflow-hidden transition-all duration-300 shadow-sm">
        <button
          onClick={() => setIsComoComecarOpen(!isComoComecarOpen)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <span className="font-bold tracking-wide">COMO COMEÇAR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">
              {isComoComecarOpen ? 'Clique para fechar' : 'Clique para abrir'}
            </span>
            {isComoComecarOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>
        {isComoComecarOpen && (
          <div className="px-4 pb-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 animate-fade-in">
            Para começar você deve realizar o cadastro de <strong>Tipo de recebimento</strong>, <strong>Tipo de pagamento</strong>, <strong>Situação de recebimento</strong>, <strong>Situação de pagamento</strong>, <strong>Cadastro Categoria Receitas</strong> e <strong>Cadastro Categoria Despesas</strong>, posteriormente é necessário realizar a configuração em <strong>Orçamento anual</strong> clicando em <strong>Orçar por categoria</strong> e definir o Orçado de cada um centro de custo. Terminando, faça seus lançamentos e veja em resumo mensal e anual.
          </div>
        )}
      </div>

      {/* Financial Tips Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          Dicas para Saúde Financeira
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-blue-400 uppercase tracking-wider">{notices.rule50_30_20.title}</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {notices.rule50_30_20.message}
            </p>
          </div>
          <div className="space-y-1 p-3.5 bg-white rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-blue-400 uppercase tracking-wider">{notices.weeklyCheck.title}</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {notices.weeklyCheck.message}
            </p>
          </div>
        </div>
      </div>

      {/* Modal / Popup de Configuração do Menu Suspenso (largura reduzida) */}
      {isMenuSuspensoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <div className="flex flex-col items-center justify-center gap-1 w-4 h-4">
                    <span className="w-3.5 h-0.5 bg-white rounded-full" />
                    <span className="w-4 h-0.5 bg-white rounded-full" />
                    <span className="w-3.5 h-0.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Menu Suspenso (Botão Flutuante)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ativação e visibilidade no celular / iPhone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuSuspensoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                O <strong>Menu Suspenso</strong> é um botão flutuante com 3 barrinhas criado para facilitar a navegação em celulares e iPhones, permitindo abrir o menu de qualquer tela mesmo quando a barra superior estiver bloqueada pelo sistema ou notch.
              </p>

              <div className="space-y-2.5">
                {/* Opção Ativar */}
                <div
                  onClick={() => setLocalFloatingMenuEnabled(true)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    localFloatingMenuEnabled
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    localFloatingMenuEnabled
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {localFloatingMenuEnabled && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        Ativar Menu Suspenso
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      O botão com as 3 barrinhas ficará flutuando na tela em smartphones e iPhones, e pode ser arrastado livremente para onde preferir.
                    </p>
                  </div>
                </div>

                {/* Opção Desativar */}
                <div
                  onClick={() => setLocalFloatingMenuEnabled(false)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    !localFloatingMenuEnabled
                      ? 'border-slate-600 bg-slate-100/80 dark:bg-slate-800/70 dark:border-slate-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    !localFloatingMenuEnabled
                      ? 'border-slate-600 bg-slate-600 text-white dark:border-slate-400 dark:bg-slate-400 dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {!localFloatingMenuEnabled && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        Desativar Menu Suspenso
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Oculta completamente o botão flutuante da tela. Você poderá reativá-lo por aqui sempre que desejar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão extra para redefinir posição padrão se ativado */}
              {localFloatingMenuEnabled && (
                <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>Posição personalizada?</span>
                  <button
                    type="button"
                    onClick={handleResetFloatingPosition}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Redefinir posição padrão</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsMenuSuspensoModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveFloatingMenu(localFloatingMenuEnabled)}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                Salvar Escolha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
