import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard,
  TrendingUp, 
  Briefcase, 
  PieChart, 
  BarChart3,
  Bot, 
  Scale, 
  Calculator, 
  Search, 
  RefreshCw,
  Sun,
  Moon,
  X,
  ArrowRight,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Menu,
  ChevronDown,
  ChevronRight,
  Check,
  Zap,
  SlidersHorizontal,
  Layers,
  Bell,
  BellRing
} from 'lucide-react';
import { Stock, Fund } from '../types';
import { formatCurrency, formatPercent, matchesSearch } from '../utils/formatters';

export type NavTab = 'overview' | 'stocks' | 'funds' | 'portfolio' | 'analytics' | 'ai' | 'compare' | 'calculator';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  portfolioCount: number;
  watchlistCount: number;
  stocks?: Stock[];
  funds?: Fund[];
  onSelectAsset?: (asset: Stock | Fund) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenBackupModal?: () => void;
  alertsCount?: number;
  triggeredAlertsCount?: number;
  onOpenAlertsModal?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'portfolio' | 'markets' | 'tools';
  badge?: string;
  badgeType?: 'emerald' | 'blue' | 'purple';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  portfolioCount,
  watchlistCount,
  stocks = [],
  funds = [],
  onSelectAsset,
  isDarkMode,
  onToggleDarkMode,
  onRefresh,
  isRefreshing = false,
  onOpenBackupModal,
  alertsCount = 0,
  triggeredAlertsCount = 0,
  onOpenAlertsModal
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [remoteResults, setRemoteResults] = useState<{ stocks: Stock[]; funds: Fund[] }>({ stocks: [], funds: [] });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Define navigation items with descriptions and categories
  const NAV_ITEMS: NavItemConfig[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Genel Özet',
      shortLabel: 'Özet',
      description: 'Portföy KPI, varlık dağılımı pasta grafiği & AI sağlık skoru',
      icon: LayoutDashboard,
      group: 'portfolio'
    },
    {
      id: 'portfolio',
      label: 'Portföyüm & Takip',
      shortLabel: 'Portföy',
      description: 'Hisse, Fon, Eurobond, Kripto ve Mevduat varlıkları',
      icon: PieChart,
      group: 'portfolio',
      badge: portfolioCount > 0 ? `${portfolioCount}` : undefined,
      badgeType: 'emerald'
    },
    {
      id: 'analytics',
      label: 'Gelişmiş Analiz',
      shortLabel: 'Analiz',
      description: '% Reel Getiri (TÜFE/FX), Rebalance motoru & stres testi',
      icon: BarChart3,
      group: 'portfolio',
      badge: 'PRO',
      badgeType: 'blue'
    },
    {
      id: 'stocks',
      label: 'BIST Hisseleri',
      shortLabel: 'Hisseler',
      description: 'Canlı BIST 100/30 hisse fiyatları ve piyasa verileri',
      icon: TrendingUp,
      group: 'markets'
    },
    {
      id: 'funds',
      label: 'TEFAS Yatırım Fonları',
      shortLabel: 'Fonlar',
      description: 'Tüm TEFAS fon getirileri, kategorileri & portföy dağılımı',
      icon: Briefcase,
      group: 'markets'
    },
    {
      id: 'ai',
      label: 'AI Piyasa Analisti',
      shortLabel: 'AI Analist',
      description: 'Gemini 3.7 Flash destekli canlı analiz & hisse/fon raporu',
      icon: Bot,
      group: 'tools',
      badge: 'Gemini 3.7',
      badgeType: 'purple'
    },
    {
      id: 'compare',
      label: 'Fon & Hisse Kıyaslama',
      shortLabel: 'Kıyasla',
      description: 'Çoklu varlık getiri karşılaştırma & risk grafiği',
      icon: Scale,
      group: 'tools'
    },
    {
      id: 'calculator',
      label: 'Getiri Simülatörü',
      shortLabel: 'Hesapla',
      description: 'Bileşik getiri, hedef birikim ve enflasyon simülasyonu',
      icon: Calculator,
      group: 'tools'
    }
  ], [portfolioCount]);

  const activeItem = useMemo(() => {
    return NAV_ITEMS.find(item => item.id === activeTab) || NAV_ITEMS[0];
  }, [NAV_ITEMS, activeTab]);

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  // Server-side search if local search returns few/no results
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearchingServer(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            setRemoteResults({
              stocks: Array.isArray(data.stocks) ? data.stocks : [],
              funds: Array.isArray(data.funds) ? data.funds : []
            });
          }
        } catch {
          // ignore
        } finally {
          setIsSearchingServer(false);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setRemoteResults({ stocks: [], funds: [] });
    }
  }, [searchQuery]);

  // Local filter search results with Turkish-safe normalization
  const q = searchQuery.trim();
  const localMatchedStocks = q 
    ? stocks.filter(s => 
        matchesSearch(s.code, q) || 
        matchesSearch(s.name, q) || 
        matchesSearch(s.sector, q)
      )
    : stocks.slice(0, 4);

  const localMatchedFunds = q 
    ? funds.filter(f => 
        matchesSearch(f.code, q) || 
        matchesSearch(f.name, q) || 
        matchesSearch(f.issuer, q) || 
        matchesSearch(f.fundCategory, q)
      )
    : funds.slice(0, 4);

  // Merge local & remote results without duplicates
  const allMatchedStocks = useMemo(() => {
    const map = new Map<string, Stock>();
    localMatchedStocks.forEach(s => map.set(s.code, s));
    remoteResults.stocks.forEach(s => {
      if (!map.has(s.code)) map.set(s.code, s);
    });
    return Array.from(map.values()).slice(0, 8);
  }, [localMatchedStocks, remoteResults.stocks]);

  const allMatchedFunds = useMemo(() => {
    const map = new Map<string, Fund>();
    localMatchedFunds.forEach(f => map.set(f.code, f));
    remoteResults.funds.forEach(f => {
      if (!map.has(f.code)) map.set(f.code, f);
    });
    return Array.from(map.values()).slice(0, 8);
  }, [localMatchedFunds, remoteResults.funds]);

  const handleItemClick = (asset: Stock | Fund) => {
    if (onSelectAsset) {
      onSelectAsset(asset);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  const ActiveIcon = activeItem.icon;

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Main Top Header Bar */}
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Logo and Brand */}
            <div 
              onClick={() => onTabChange('overview')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 tracking-wide shadow-xs">
                  CANLI
                </span>
              </div>
            </div>

            {/* Quick Actions Center */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Search Bar Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-xs sm:text-sm font-medium border border-slate-200/80 dark:border-slate-700 max-w-[130px] sm:max-w-none sm:w-56 justify-between group"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                  <span className="truncate">Ara...</span>
                </div>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded text-slate-400 border border-slate-200 dark:border-slate-700">
                  ⌘K
                </kbd>
              </button>

              {onOpenAlertsModal && (
                <button
                  onClick={onOpenAlertsModal}
                  title="Fiyat Alarmları & Fırsat Takipçisi"
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all relative cursor-pointer ${
                    triggeredAlertsCount > 0
                      ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25 animate-pulse'
                      : alertsCount > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/80 hover:bg-amber-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {triggeredAlertsCount > 0 ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  {alertsCount > 0 && (
                    <span className={`absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded-full text-white shadow-xs ${
                      triggeredAlertsCount > 0 ? 'bg-rose-600 ring-2 ring-white dark:ring-slate-900' : 'bg-amber-500'
                    }`}>
                      {triggeredAlertsCount > 0 ? `${triggeredAlertsCount}!` : alertsCount}
                    </span>
                  )}
                </button>
              )}

              {onOpenBackupModal && (
                <button
                  onClick={onOpenBackupModal}
                  title="Google Sheets'e Yedekle"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Sheets</span>
                </button>
              )}

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Verileri Yenile"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              )}

              {onToggleDarkMode && (
                <button
                  onClick={onToggleDarkMode}
                  title={isDarkMode ? 'Açık Mod' : 'Koyu Mod'}
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
              )}

              {/* Mobile Menu Trigger Button (Prominent in top bar) */}
              <button
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                aria-label="Tüm Menüyü Aç"
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {isMobileMenuOpen ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Kapat</span>
                  </>
                ) : (
                  <>
                    <Menu className="w-4 h-4" />
                    <span>Menü</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Visible on tablet & desktop, hidden on mobile) */}
          <nav className="hidden sm:flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar pt-1 pb-2.5 border-t border-slate-100 dark:border-slate-800/80">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              let activeClass = 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm';
              if (item.id === 'overview') activeClass = 'bg-blue-600 text-white shadow-sm';
              if (item.id === 'analytics') activeClass = 'bg-blue-600 text-white shadow-sm';
              if (item.id === 'ai') activeClass = 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm';

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 relative ${
                    isActive
                      ? activeClass
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  
                  {item.badge && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                      item.badgeType === 'purple'
                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                        : item.badgeType === 'blue'
                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Current Active Tab Bar (Quick Selector on Mobile instead of horizontal scrolling) */}
          <div className="sm:hidden flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold w-full justify-between active:scale-[0.99] transition-all shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="p-1 rounded-lg bg-emerald-600 text-white">
                  <ActiveIcon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{activeItem.label}</span>
                {activeItem.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-white font-bold">
                    {activeItem.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                <span>Sekme Değiştir</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE FULL-SCREEN / DRAWER NAVIGATION MENU */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm sm:hidden flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-5 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Menü & Sayfa Seçimi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gitmek istediğiniz sayfaya dokunun
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: PORTFÖY & ANALİZ */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Portföy & Analiz Modülleri
              </span>
              <div className="grid grid-cols-1 gap-2">
                {NAV_ITEMS.filter(i => i.group === 'portfolio').map(item => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/80 text-blue-900 dark:text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.badgeType === 'blue'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                  : 'bg-emerald-500 text-white'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="p-1 rounded-full bg-blue-600 text-white shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: PİYASALAR */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Canlı Piyasalar & Fonlar
              </span>
              <div className="grid grid-cols-1 gap-2">
                {NAV_ITEMS.filter(i => i.group === 'markets').map(item => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {item.label}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="p-1 rounded-full bg-emerald-600 text-white shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: AKILLI ARAÇLAR & AI */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Yapay Zeka & Finansal Araçlar
              </span>
              <div className="grid grid-cols-1 gap-2">
                {NAV_ITEMS.filter(i => i.group === 'tools').map(item => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700/80 text-purple-900 dark:text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          isSelected 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="p-1 rounded-full bg-purple-600 text-white shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS ROW IN DRAWER */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {onOpenAlertsModal && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenAlertsModal(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-xs border transition-all ${
                      triggeredAlertsCount > 0
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Fiyat Alarmları ({alertsCount})</span>
                  </button>
                )}

                {onOpenBackupModal && (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); onOpenBackupModal(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Sheets Yedeği</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onToggleDarkMode && (
                  <button
                    onClick={onToggleDarkMode}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 active:scale-98 transition-all"
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-400" />
                        <span>Açık Mod (Gündüz)</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-indigo-500" />
                        <span>Gece Modu (Karanlık)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                  className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  title="Hisse/Fon Ara"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION DOCK (1-Thumb Instant Reach Bar) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        {/* Tab 1: Özet */}
        <button
          onClick={() => onTabChange('overview')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Özet</span>
        </button>

        {/* Tab 2: Portföyüm */}
        <button
          onClick={() => onTabChange('portfolio')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeTab === 'portfolio'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <PieChart className={`w-5 h-5 ${activeTab === 'portfolio' ? 'scale-110' : ''}`} />
            {portfolioCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.1 text-[8px] rounded-full bg-emerald-500 text-white font-bold">
                {portfolioCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Portföyüm</span>
        </button>

        {/* Tab 3: Hisseler */}
        <button
          onClick={() => onTabChange('stocks')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'stocks'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'stocks' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Hisseler</span>
        </button>

        {/* Tab 4: AI Analist */}
        <button
          onClick={() => onTabChange('ai')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'ai'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Bot className={`w-5 h-5 ${activeTab === 'ai' ? 'scale-110 text-purple-500' : ''}`} />
          <span className="text-[10px] mt-0.5">AI Analiz</span>
        </button>

        {/* Tab 5: Tüm Menü Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isMobileMenuOpen
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Menü</span>
        </button>
      </div>

      {/* Global Quick Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 sm:pt-20 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hisse (AKBNK, THYAO, SASA, PETKM...) veya Fon (YLB, AD4, MAC, TTE...)"
                className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
              />
              {isSearchingServer && (
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            {!searchQuery && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Popüler:</span>
                {['AKBNK', 'THYAO', 'GARAN', 'SASA', 'PETKM', 'TCELL', 'YLB', 'AD4', 'MAC', 'GTA'].map(code => (
                  <button
                    key={code}
                    onClick={() => setSearchQuery(code)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}

            {/* Results container */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
              {/* Stocks section */}
              {allMatchedStocks.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Borsa İstanbul Hisseleri</span>
                    <span className="text-[10px] font-normal text-slate-500">{allMatchedStocks.length} sonuç</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {allMatchedStocks.map((stock) => (
                      <button
                        key={stock.code}
                        onClick={() => handleItemClick(stock)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
                            {stock.code.slice(0, 3)}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {stock.code}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                              {stock.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(stock.price, 'TL')}
                          </div>
                          <div className={`text-[10px] font-bold ${stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatPercent(stock.changePercent)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Funds section */}
              {allMatchedFunds.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>TEFAS Yatırım Fonları</span>
                    <span className="text-[10px] font-normal text-slate-500">{allMatchedFunds.length} sonuç</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {allMatchedFunds.map((fund) => (
                      <button
                        key={fund.code}
                        onClick={() => handleItemClick(fund)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                            {fund.code}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {fund.code}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                              {fund.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(fund.price, 'TL')}
                          </div>
                          <div className={`text-[10px] font-bold ${fund.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatPercent(fund.changePercent)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {q && allMatchedStocks.length === 0 && allMatchedFunds.length === 0 && (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  "{searchQuery}" aramasıyla eşleşen hisse veya fon bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
