import React, { useState, useEffect } from 'react';
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
  AcaoDeficitPage,
  ListaDeComprasPage,
  PlanejamentoAnualPage,
  ListManagerPage,
  DadosPessoaisPage
} from './components/Pages';
import { SuportePage } from './components/SuportePage';
import { ViagemPage } from './components/ViagemPage';

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
  Plane
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('Home');
  const [subscriptionWarning, setSubscriptionWarning] = useState<string>('');

  // Sidebar toggle for responsive mobile views
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Settings menu submenus expanded status
  const [settingsExpanded, setSettingsExpanded] = useState(true);

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

  // Load user from localStorage if saved
  useEffect(() => {
    const saved = localStorage.getItem('finanfly_user') || localStorage.getItem('finanfy_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.email.endsWith('@finanfy.com')) {
          parsed.email = parsed.email.replace('@finanfy.com', '@finanfly.com');
        }
        setCurrentUser(parsed);
        localStorage.setItem('finanfly_user', JSON.stringify(parsed));
        localStorage.removeItem('finanfy_user');
        // Refresh profile on boot
        refreshProfile(parsed.email);
      } catch (e) {
        localStorage.removeItem('finanfy_user');
        localStorage.removeItem('finanfly_user');
      }
    }
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
      const res = await fetch('/api/user/profile', {
        headers: { 'x-user-email': email }
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
      const res = await fetch('/api/user/data', {
        headers: { 'x-user-email': email }
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
      const res = await fetch('/api/user/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify(newData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      console.error('Error saving user data:', err);
    }
  };

  const handleUpdateUserProfileInState = (name: string, address: string, phone: string, city?: string, state?: string) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      name,
      address,
      phone,
      city: city !== undefined ? city : currentUser.city,
      state: state !== undefined ? state : currentUser.state
    };
    setCurrentUser(updated);
    localStorage.setItem('finanfly_user', JSON.stringify(updated));
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('finanfly_user', JSON.stringify(user));
    setSubscriptionWarning('');

    if (user.role === 'admin') {
      setCurrentPage('Administrador');
    } else {
      setCurrentPage('Home');
    }
  };

  const handleRedirectToSubscription = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('finanfly_user', JSON.stringify(user));
    setSubscriptionWarning('Sua assinatura não está ativa ou expirou! Por favor, ative um plano.');
    setCurrentPage('Assinatura');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserData(null);
    localStorage.removeItem('finanfly_user');
    localStorage.removeItem('finanfy_user');
    setCurrentPage('Home');
    setSubscriptionWarning('');
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
    const isPublicPageForAuthed = ['Assinatura', 'Home', 'Administrador', 'Dados pessoais'].includes(currentPage);

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
      case 'Viagem':
        if (!userData) return null;
        return (
          <ViagemPage
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        );
      case 'Ação de melhoria':
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
      case 'Cadastro tipos de Despesas':
        if (!userData) return null;
        return (
          <ListManagerPage
            title="Categorias de Despesas (Centro de Despesa)"
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
      <Login
        onLoginSuccess={handleLoginSuccess}
        onRedirectToSubscription={handleRedirectToSubscription}
      />
    );
  }

  // Sidebar navigation menu options structured as expected
  const menuItems = [
    { name: 'Home', icon: HomeIcon, type: 'link' },
    { name: 'Dashboard', icon: BarChart3, type: 'link' },
    { name: 'Receitas', icon: TrendingUp, type: 'link' },
    { name: 'Despesas', icon: TrendingDown, type: 'link' },
    { name: 'Resumo mensal', icon: Calendar, type: 'link' },
    { name: 'Resumo Anual', icon: Layers, type: 'link' },
    { name: 'Metas', icon: Target, type: 'link' },
    { name: 'Viagem', icon: Plane, type: 'link' },
    { name: 'Ação de melhoria', icon: AlertTriangle, type: 'link' },
    { name: 'Lista de compras', icon: ShoppingCart, type: 'link' },
    { name: 'Suporte', icon: HelpCircle, type: 'link' },
  ];

  const configSubmenus = [
    { name: 'Planejamento anual', icon: FileText },
    { name: 'Tipo de pagamento', icon: CreditCard },
    { name: 'Situação de pagamento', icon: CheckCircle },
    { name: 'Cadastro tipos de Receitas', icon: TrendingUp },
    { name: 'Cadastro tipos de Despesas', icon: TrendingDown },
    { name: 'Dados pessoais', icon: User },
    { name: 'Assinatura', icon: Sparkles },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden dark:bg-slate-950 dark:text-slate-100">
      
      {/* SIDEBAR NAVIGATION - Responsive Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand logo */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/10">F</div>
            <span className="text-xl font-bold text-white tracking-tight">Finanfly</span>
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
        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = currentPage === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setCurrentPage(item.name);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <IconComponent className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'opacity-80'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}

          {/* Configurações Seção / Header */}
          <div className="pt-4 pb-2">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full flex items-center justify-between px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold hover:text-slate-300"
            >
              <span>Configurações</span>
              <Settings className="h-3 w-3" />
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
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                      active
                        ? 'bg-slate-800 text-blue-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-60" />
                    <span className="truncate">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

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
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                  {currentUser.role === 'admin' ? 'Administrador ✓' : 'Membro'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
            
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {currentPage}
            </h2>

            <div className={`hidden sm:inline-flex text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
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

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Display profile initials */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-white">{currentUser.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{currentUser.email}</div>
              </div>
              <div
                onClick={() => setCurrentPage('Dados pessoais')}
                className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-600/10 cursor-pointer hover:opacity-85"
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
