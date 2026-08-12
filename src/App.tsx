import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserData } from './types';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { SubscriptionPage } from './components/SubscriptionPage';
import { AdminPage } from './components/AdminPage';
import {
  ReceitasPage,
  DespesasPage,
  ResumoMensalPage,
  ResumoAnualPage,
  MetasPage,
  DesejosPage,
  AcaoDeficitPage,
  ListaDeComprasPage,
  PlanejamentoAnualPage,
  ListManagerPage,
  DadosPessoaisPage
} from './components/Pages';
import { SuportePage } from './components/SuportePage';
import { ViagemPage } from './components/ViagemPage';
import { InvestimentosPage } from './components/InvestimentosPage';
import { OfflineModal } from './components/OfflineModal';

import {
  Home as HomeIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Target,
  ShoppingCart,
  Settings,
  User,
  Sparkles,
  Shield,
  LogOut,
  Menu,
  X,
  CreditCard,
  CheckCircle,
  FileText,
  Sun,
  Moon,
  AlertTriangle,
  HelpCircle,
  Plane,
  Heart,
  Database,
  PiggyBank
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('Início');
  const [subscriptionWarning, setSubscriptionWarning] = useState<string>('');
  const [inactivityNotice, setInactivityNotice] = useState<string>('');

  // Sidebar toggle for responsive mobile views
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Settings menu submenus expanded status
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  // Dados menu submenus expanded status
  const [dadosExpanded, setDadosExpanded] = useState(false);

  // Refs and auto-scroll for sidebar menu sections
  const navRef = useRef<HTMLElement>(null);
  const settingsSectionRef = useRef<HTMLDivElement>(null);
  const dadosSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (elementRef: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => {
      if (elementRef.current && navRef.current) {
        const nav = navRef.current;
        const elem = elementRef.current;
        const elemBottom = elem.offsetTop + elem.offsetHeight;
        const navVisibleBottom = nav.scrollTop + nav.clientHeight;
        
        if (elemBottom > navVisibleBottom || elem.offsetTop < nav.scrollTop) {
          nav.scrollTo({
            top: Math.max(0, elemBottom - nav.clientHeight + 24),
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  };

  useEffect(() => {
    if (settingsExpanded) {
      scrollToSection(settingsSectionRef);
    }
  }, [settingsExpanded]);

  useEffect(() => {
    if (dadosExpanded) {
      scrollToSection(dadosSectionRef);
    }
  }, [dadosExpanded]);

  // Auto collapse submenus whenever navigating away from their pages
  useEffect(() => {
    const isConfigPage = ['Plano anual', 'Tipo de pagamento', 'Situação de pagamento', 'Cadastro tipos de Receitas', 'Cadastro categoria Despesas'].includes(currentPage);
    if (!isConfigPage) {
      setSettingsExpanded(false);
    }
    const isDadosPage = ['Dados pessoais', 'Assinatura', 'Suporte'].includes(currentPage);
    if (!isDadosPage) {
      setDadosExpanded(false);
    }
  }, [currentPage]);

  // Auto-detect language and enforce Português (Brasil) - pt-BR
  useEffect(() => {
    const detectedLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'pt-BR';
    console.log(`[Idioma] Idioma detectado do navegador: ${detectedLang}. Selecionado Português (Brasil) - pt-BR automaticamente.`);
    document.documentElement.lang = 'pt-BR';
    localStorage.setItem('finanfly_language', 'pt-BR');
  }, []);

  // Auto-detect mobile devices and screen resizes
  useEffect(() => {
    const handleMobileDetection = () => {
      const isMobileView = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileView) {
        // Automatically ensure menu starts closed or closes on screen switch to mobile
        setSidebarOpen(false);
      }
    };

    handleMobileDetection();
    window.addEventListener('resize', handleMobileDetection);
    window.addEventListener('orientationchange', handleMobileDetection);
    return () => {
      window.removeEventListener('resize', handleMobileDetection);
      window.removeEventListener('orientationchange', handleMobileDetection);
    };
  }, []);

  // Close floating menu when pressing ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Theme layout: clear vs dark state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('finanfly_theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('finanfly_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('finanfly_theme', 'light');
    }
  }, [isDark]);

  // Persistent session restore on page reload: restore user if within 5 minutes (300,000 ms) of last activity
  useEffect(() => {
    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
    const savedUserStr = localStorage.getItem('finanfly_user');
    const lastActivityStr = localStorage.getItem('finanfly_last_activity');

    if (savedUserStr && lastActivityStr) {
      const lastActivityTime = parseInt(lastActivityStr, 10);
      const now = Date.now();
      if (!isNaN(lastActivityTime) && (now - lastActivityTime < INACTIVITY_TIMEOUT_MS)) {
        try {
          const user = JSON.parse(savedUserStr);
          setCurrentUser(user);
          localStorage.setItem('finanfly_last_activity', now.toString());
          return;
        } catch (e) {
          console.error('Error parsing saved user session:', e);
        }
      } else {
        setInactivityNotice('Você foi desconectado automaticamente por inatividade. Faça login para continuar.');
      }
    }

    // Clean up if expired or no active session
    localStorage.removeItem('finanfly_user');
    localStorage.removeItem('finanfy_user');
    localStorage.removeItem('finanfly_token');
    localStorage.removeItem('finanfly_last_activity');
    setCurrentUser(null);
  }, []);

  // Sync user data whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchUserData(currentUser.email);
    } else {
      setUserData(null);
    }
  }, [currentUser]);

  const refreshProfile = async (email: string) => {
    try {
      const token = localStorage.getItem('finanfly_token') || '';
      const res = await fetch('/api/user/profile', {
        headers: {
          'x-user-email': email,
          'x-auth-token': token
        }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('finanfly_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  const fetchUserData = async (email: string) => {
    try {
      const token = localStorage.getItem('finanfly_token') || '';
      const res = await fetch('/api/user/data', {
        headers: {
          'x-user-email': email,
          'x-auth-token': token
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const handleUpdateUserData = async (newData: Partial<UserData>) => {
    if (!currentUser || !userData) return;

    const merged = { ...userData, ...newData };
    setUserData(merged); // Optimistic UI update

    try {
      const token = localStorage.getItem('finanfly_token') || '';
      const res = await fetch('/api/user/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
          'x-auth-token': token
        },
        body: JSON.stringify(newData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      console.error('Error saving user data:', err);
    }
  };

  const handleUpdateUserProfileInState = (name: string, address: string, phone: string, city?: string, state?: string, cpf?: string) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      name,
      address,
      phone,
      city: city !== undefined ? city : currentUser.city,
      state: state !== undefined ? state : currentUser.state,
      cpf: cpf !== undefined ? cpf : currentUser.cpf
    };
    setCurrentUser(updated);
    localStorage.setItem('finanfly_user', JSON.stringify(updated));
  };

  // Auto-logout mechanism after 5 minutes (300,000 ms) of inactivity
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    let timer: NodeJS.Timeout;
    let lastActivityTime = Date.now();

    const performLogout = () => {
      clearTimeout(timer);
      setCurrentUser(null);
      setUserData(null);
      localStorage.removeItem('finanfly_user');
      localStorage.removeItem('finanfy_user');
      localStorage.removeItem('finanfly_token');
      localStorage.removeItem('finanfly_last_activity');
      setCurrentPage('Início');
      setSubscriptionWarning('');
      setInactivityNotice('Você foi desconectado automaticamente por inatividade. Faça login para continuar.');
    };

    const resetTimer = () => {
      clearTimeout(timer);
      lastActivityTime = Date.now();
      localStorage.setItem('finanfly_last_activity', lastActivityTime.toString());
      timer = setTimeout(performLogout, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime >= INACTIVITY_TIMEOUT_MS) {
        performLogout();
        return;
      }
      // Throttle resetting the timer to once every second
      if (now - lastActivityTime > 1000) {
        resetTimer();
      }
    };

    const handleVisibilityOrFocus = () => {
      const savedLastActivity = localStorage.getItem('finanfly_last_activity');
      const timeToCheck = savedLastActivity ? parseInt(savedLastActivity, 10) : lastActivityTime;
      if (Date.now() - timeToCheck >= INACTIVITY_TIMEOUT_MS) {
        performLogout();
      }
    };

    resetTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('finanfly_user', JSON.stringify(user));
    localStorage.setItem('finanfly_last_activity', Date.now().toString());
    setSubscriptionWarning('');
    setInactivityNotice('');

    if (user.role === 'admin') {
      setCurrentPage('Administrador');
    } else {
      setCurrentPage('Início');
    }
  };

  const handleRedirectToSubscription = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('finanfly_user', JSON.stringify(user));
    localStorage.setItem('finanfly_last_activity', Date.now().toString());
    setSubscriptionWarning('Sua assinatura não está ativa ou expirou! Por favor, ative um plano.');
    setInactivityNotice('');
    setCurrentPage('Assinatura');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserData(null);
    localStorage.removeItem('finanfly_user');
    localStorage.removeItem('finanfly_token');
    localStorage.removeItem('finanfy_user');
    localStorage.removeItem('finanfly_last_activity');
    setCurrentPage('Início');
    setSubscriptionWarning('');
    setInactivityNotice('');
  };

  // Subscription gate check for normal users
  const isSubscriptionActive = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Admins bypass subscription check

    const plan = currentUser.subscription?.plan || 'none';
    const validUntil = currentUser.subscription?.validUntil;
    const approved = currentUser.subscription?.approved;

    if (plan === 'none') return false;
    if (!approved) return false;
    if (validUntil && new Date(validUntil) < new Date()) return false;

    return true;
  };

  // Render specific financial subpages
  const renderPageContent = () => {
    if (!currentUser) return null;

    // Gate all non-subscription pages for normal users
    const hasAccess = isSubscriptionActive();
    const isPublicPageForAuthed = ['Assinatura', 'Início', 'Home', 'Administrador', 'Dados pessoais'].includes(currentPage);

    if (!hasAccess && !isPublicPageForAuthed) {
      return (
        <SubscriptionPage
          user={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem('finanfly_user', JSON.stringify(updated));
            setSubscriptionWarning('');
          }}
          message="É necessário escolher um plano para continuar utilizando este recurso."
        />
      );
    }

    // Routing
    switch (currentPage) {
      case 'Início':
      case 'Home':
        return (
          <Home
            userName={currentUser.name}
            isAdmin={currentUser.role === 'admin'}
            onNavigate={(page) => {
              setCurrentPage(page);
              setSidebarOpen(false);
            }}
          />
        );
      case 'Painel':
      case 'Dashboard':
        if (!userData) return <p className="text-xs text-slate-400">Carregando painel...</p>;
        return (
          <Dashboard
            userData={userData}
            onNavigate={(page) => {
              setCurrentPage(page);
              setSidebarOpen(false);
            }}
          />
        );
      case 'Receitas':
      case 'Receitas (Ganhos)':
        if (!userData) return null;
        return (
          <ReceitasPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Despesas':
      case 'Despesas (Gastos)':
        if (!userData) return null;
        return (
          <DespesasPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Resumo mensal':
        if (!userData) return null;
        return (
          <ResumoMensalPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Resumo Anual':
        if (!userData) return null;
        return (
          <ResumoAnualPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Investimentos':
      case 'Investimento':
        if (!userData) return null;
        return (
          <InvestimentosPage
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        );
      case 'Objetivos':
      case 'Metas':
        if (!userData) return null;
        return (
          <MetasPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Viagens':
      case 'Viagem':
        if (!userData) return null;
        return (
          <ViagemPage
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        );
      case 'Desejos':
        if (!userData) return null;
        return (
          <DesejosPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Melhoria financeira':
      case 'Ação de melhoria':
      case 'Ação para déficit':
        if (!userData) return null;
        return (
          <AcaoDeficitPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Lista de compras':
        if (!userData) return null;
        return (
          <ListaDeComprasPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Suporte':
        return <SuportePage />;
      
      // Configuration Submenus
      case 'Planejamento anual':
      case 'Plano anual':
        if (!userData) return null;
        return (
          <PlanejamentoAnualPage
            userData={userData}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
          />
        );
      case 'Tipo de pagamento':
        if (!userData) return null;
        return (
          <ListManagerPage
            title="Formas de Pagamento"
            description="Cadastre as opções que você utiliza para pagar despesas ou receber receitas (Pix, Cartão, Boleto, etc)."
            items={userData.paymentTypes}
            placeholder="Ex: Cartão de Débito"
            onUpdateItems={(items) => handleUpdateUserData({ paymentTypes: items })}
            onRenameItem={(oldVal, newVal) => {
              const updatedTypes = userData.paymentTypes.map(t => t === oldVal ? newVal : t);
              const updatedIncomes = userData.incomes.map(i => i.paymentType === oldVal ? { ...i, paymentType: newVal } : i);
              const updatedExpenses = userData.expenses.map(e => e.paymentType === oldVal ? { ...e, paymentType: newVal } : e);
              handleUpdateUserData({
                paymentTypes: updatedTypes,
                incomes: updatedIncomes,
                expenses: updatedExpenses
              });
            }}
          />
        );
      case 'Situação de pagamento':
        if (!userData) return null;
        return (
          <ListManagerPage
            title="Situação de Pagamento"
            description="Defina as tags de situação para acompanhar contas em aberto ou já quitadas (Pago, Pendente, Atrasado, etc)."
            items={userData.paymentStatuses}
            placeholder="Ex: Em Análise"
            onUpdateItems={(items) => handleUpdateUserData({ paymentStatuses: items })}
            onRenameItem={(oldVal, newVal) => {
              const updatedStatuses = userData.paymentStatuses.map(s => s === oldVal ? newVal : s);
              const updatedIncomes = userData.incomes.map(i => i.status === oldVal ? { ...i, status: newVal } : i);
              const updatedExpenses = userData.expenses.map(e => e.status === oldVal ? { ...e, status: newVal } : e);
              handleUpdateUserData({
                paymentStatuses: updatedStatuses,
                incomes: updatedIncomes,
                expenses: updatedExpenses
              });
            }}
          />
        );
      case 'Cadastro tipos de Receitas':
        if (!userData) return null;
        return (
          <ListManagerPage
            title="Categorias de Receitas"
            description="Organize suas fontes de renda por categoria (Salário, Investimentos, Freelance, Bônus, etc)."
            items={userData.incomeCategories}
            placeholder="Ex: Aluguel Recebido"
            onUpdateItems={(items) => handleUpdateUserData({ incomeCategories: items })}
            onRenameItem={(oldVal, newVal) => {
              const updatedCategories = userData.incomeCategories.map(c => c === oldVal ? newVal : c);
              const updatedIncomes = userData.incomes.map(i => i.category === oldVal ? { ...i, category: newVal } : i);
              handleUpdateUserData({
                incomeCategories: updatedCategories,
                incomes: updatedIncomes
              });
            }}
          />
        );
      case 'Cadastro categoria Despesas':
      case 'Cadastro tipos de Despesas':
        if (!userData) return null;
        return (
          <ListManagerPage
            title="Categoria de Despesas"
            description="Agrupe seus custos mensais para entender onde você gasta mais (Moradia, Alimentação, Saúde, Transporte, etc)."
            items={userData.expenseCategories}
            placeholder="Ex: Serviços de Streaming"
            onUpdateItems={(items) => handleUpdateUserData({ expenseCategories: items })}
            onRenameItem={(oldVal, newVal) => {
              const updatedCategories = userData.expenseCategories.map(c => c === oldVal ? newVal : c);
              const updatedExpenses = userData.expenses.map(e => e.category === oldVal ? { ...e, category: newVal } : e);
              handleUpdateUserData({
                expenseCategories: updatedCategories,
                expenses: updatedExpenses
              });
            }}
          />
        );
      case 'Dados pessoais':
        return (
          <DadosPessoaisPage
            userData={userData || { incomes: [], expenses: [], actionPlans: [], shoppingList: [], annualPlanning: [], paymentTypes: [], paymentStatuses: [], incomeCategories: [], expenseCategories: [] }}
            userProfile={currentUser}
            onUpdateUserData={handleUpdateUserData}
            onUpdateUserProfile={handleUpdateUserProfileInState}
            onLogout={handleLogout}
          />
        );
      case 'Assinatura':
        return (
          <SubscriptionPage
            user={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              localStorage.setItem('finanfly_user', JSON.stringify(updated));
              setSubscriptionWarning('');
            }}
            message={subscriptionWarning}
          />
        );
      case 'Administrador':
        if (currentUser.role !== 'admin') {
          return <p className="text-red-500 font-bold text-xs">Acesso restrito ao administrador!</p>;
        }
        return <AdminPage adminUser={currentUser} />;
      default:
        return <Home userName={currentUser.name} isAdmin={currentUser.role === 'admin'} onNavigate={setCurrentPage} />;
    }
  };

  // If user is not logged in, render Login screen
  if (!currentUser) {
    return (
      <>
        <OfflineModal />
        <Login
          onLoginSuccess={handleLoginSuccess}
          onRedirectToSubscription={handleRedirectToSubscription}
          inactivityNotice={inactivityNotice}
        />
      </>
    );
  }

  // Sidebar navigation menu options structured as expected
  const menuItems = [
    { name: 'Início', icon: HomeIcon, type: 'link' },
    { name: 'Painel', icon: BarChart3, type: 'link' },
    { name: 'Resumo mensal', icon: Calendar, type: 'link' },
    { name: 'Resumo Anual', icon: Layers, type: 'link' },
    { name: 'Receitas (Ganhos)', icon: TrendingUp, type: 'link' },
    { name: 'Despesas (Gastos)', icon: TrendingDown, type: 'link' },
    { name: 'Melhoria financeira', icon: AlertTriangle, type: 'link' },
    { name: 'Investimentos', icon: PiggyBank, type: 'link' },
    { name: 'Objetivos', icon: Target, type: 'link' },
    { name: 'Viagens', icon: Plane, type: 'link' },
    { name: 'Desejos', icon: Heart, type: 'link' },
    { name: 'Lista de compras', icon: ShoppingCart, type: 'link' },
  ];

  const configSubmenus = [
    { name: 'Plano anual', icon: FileText },
    { name: 'Tipo de pagamento', icon: CreditCard },
    { name: 'Situação de pagamento', icon: CheckCircle },
    { name: 'Cadastro tipos de Receitas', icon: TrendingUp },
    { name: 'Cadastro categoria Despesas', icon: TrendingDown },
  ];

  const dadosSubmenus = [
    { name: 'Dados pessoais', icon: User },
    { name: 'Assinatura', icon: Sparkles },
    { name: 'Suporte', icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden dark:bg-slate-950 dark:text-slate-100">
      <OfflineModal />
      
      {/* Backdrop overlay for mobile menu - closes menu when clicking outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* SIDEBAR NAVIGATION - Responsive Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-80 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand logo */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-500/10">F</div>
            <span className="text-lg font-bold text-white tracking-tight">FinanFly</span>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable menu links */}
        <nav ref={navRef} className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar relative">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = currentPage === item.name || 
              (item.name === 'Início' && currentPage === 'Home') || 
              (item.name === 'Painel' && currentPage === 'Dashboard') ||
              (item.name === 'Receitas (Ganhos)' && currentPage === 'Receitas') ||
              (item.name === 'Despesas (Gastos)' && currentPage === 'Despesas');
            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    setCurrentPage(item.name);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <IconComponent className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-white' : 'opacity-80'}`} />
                  <span>{item.name}</span>
                </button>

                {/* Highlighted divider line below Melhoria financeira */}
                {item.name === 'Melhoria financeira' && (
                  <div className="my-2.5 border-b-4 border-slate-700/90 shadow-sm mx-1" />
                )}
              </div>
            );
          })}

          {/* Configurações Seção / Header */}
          <div ref={settingsSectionRef}>
            <div className="pt-3 pb-1.5">
              <button
                onClick={() => {
                  const next = !settingsExpanded;
                  setSettingsExpanded(next);
                  if (next) {
                    scrollToSection(settingsSectionRef);
                  }
                }}
                className="w-full flex items-center justify-between px-3 tracking-wide text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Configurações</span>
                <Settings className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>

            {settingsExpanded && (
              <div className="space-y-1 pl-1">
                {configSubmenus.map((sub) => {
                  const Icon = sub.icon;
                  const active = currentPage === sub.name;
                  return (
                    <button
                      key={sub.name}
                      onClick={() => {
                        setCurrentPage(sub.name);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                        active
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0 opacity-80" />
                      <span className="truncate">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dados Seção / Header */}
          <div ref={dadosSectionRef}>
            <div className="pt-3 pb-1.5 border-t border-slate-800/60 mt-2">
              <button
                onClick={() => {
                  const next = !dadosExpanded;
                  setDadosExpanded(next);
                  if (next) {
                    scrollToSection(dadosSectionRef);
                  }
                }}
                className="w-full flex items-center justify-between px-3 tracking-wide text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados</span>
                <Database className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>

            {dadosExpanded && (
              <div className="space-y-1 pl-1">
                {dadosSubmenus.map((sub) => {
                  const Icon = sub.icon;
                  const active = currentPage === sub.name;
                  const isLightBlue = sub.name === 'Dados pessoais' || sub.name === 'Assinatura';
                  return (
                    <button
                      key={sub.name}
                      onClick={() => {
                        setCurrentPage(sub.name);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                        active
                          ? isLightBlue
                            ? 'bg-slate-800 text-sky-300 font-bold'
                            : 'bg-slate-800 text-white font-bold'
                          : isLightBlue
                          ? 'text-sky-300 font-bold hover:bg-slate-800/50 hover:text-sky-200'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${isLightBlue ? 'text-sky-300 opacity-100' : 'opacity-80'}`} />
                      <span className="truncate">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin exclusive menu block */}
          {currentUser.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-800/60">
              <span className="block px-3 text-[10px] uppercase tracking-wider text-rose-500 font-bold mb-1.5">
                Admin Area
              </span>
              <button
                onClick={() => {
                  setCurrentPage('Administrador');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  currentPage === 'Administrador'
                    ? 'bg-rose-950/40 text-rose-400 border border-rose-800'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Shield className="h-4 w-4 shrink-0 text-rose-500" />
                <span>Administrador</span>
              </button>
            </div>
          )}
        </nav>

        {/* Profile indicator & log out option at the footer of sidebar */}
        <div className="p-3 border-t border-slate-800">
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                  {currentUser.role === 'admin' ? 'Administrador ✓' : 'Membro'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da Conta
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT PORTAL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Row */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 dark:bg-slate-900 dark:border-slate-800 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 md:hidden dark:hover:bg-slate-800 dark:text-slate-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {currentPage}
            </h2>

            <div className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-md uppercase font-bold ${
              currentUser.role === 'admin'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                : isSubscriptionActive()
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              {currentUser.role === 'admin'
                ? 'Administrador'
                : isSubscriptionActive()
                ? 'Assinatura Ativa ✓'
                : 'Assinatura Pendente/Inativa'}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {isDark ? <Sun className="h-6 w-6 text-amber-400" /> : <Moon className="h-6 w-6 text-slate-700 dark:text-slate-200" />}
            </button>

            {/* Display profile initials */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-800 dark:text-white">{currentUser.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{currentUser.email}</div>
              </div>
              <div
                onClick={() => setCurrentPage('Dados pessoais')}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-600/10 cursor-pointer hover:opacity-85"
              >
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable contents frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
          {renderPageContent()}
        </div>
      </main>
    </div>
  );
}
