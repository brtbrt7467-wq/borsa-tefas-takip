import React, { useState, useMemo, useEffect } from 'react';
import { Fund, PortfolioItem, WatchlistItem } from '../types';
import { formatCurrency, formatPercent, formatCompactNumber, getRiskColor, matchesSearch } from '../utils/formatters';
import { 
  Briefcase, 
  Search, 
  Star, 
  Plus, 
  Bot, 
  ArrowUpDown, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Layers,
  Loader2,
  Sparkles,
  RotateCcw,
  Target,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Award,
  Globe2,
  Coins,
  Bell
} from 'lucide-react';

interface FundListProps {
  funds: Fund[];
  onSelectFund: (fund: Fund) => void;
  onOpenAI: (fund: Fund) => void;
  onAddToPortfolio: (fund: Fund) => void;
  onToggleWatchlist: (fund: Fund) => void;
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
  onOpenSetAlert?: (fund: Fund) => void;
}

export type FundScreeningPreset = 
  | 'ALL'
  | 'TOP_1Y_RETURNS'
  | 'LOW_RISK_INCOME'
  | 'FOREIGN_TECH'
  | 'GOLD_PRECIOUS'
  | 'EQUITY_HEAVY'
  | 'LOW_EXPENSE'
  | 'BES_FUNDS';

export const FundList: React.FC<FundListProps> = ({
  funds,
  onSelectFund,
  onOpenAI,
  onAddToPortfolio,
  onToggleWatchlist,
  watchlist,
  portfolio,
  onOpenSetAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedIssuer, setSelectedIssuer] = useState('Tümü');
  const [selectedPreset, setSelectedPreset] = useState<FundScreeningPreset>('ALL');
  const [sortBy, setSortBy] = useState<'return1Y' | 'return1M' | 'return3M' | 'return6M' | 'returnYtd' | 'changePercent' | 'aum' | 'riskValue' | 'code'>('return1Y');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [liveDiscoveredFunds, setLiveDiscoveredFunds] = useState<Fund[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Combine passed funds + live discovered ones
  const combinedFunds = useMemo(() => {
    const map = new Map<string, Fund>();
    funds.forEach(f => map.set(f.code, f));
    liveDiscoveredFunds.forEach(f => {
      if (!map.has(f.code)) map.set(f.code, f);
    });
    return Array.from(map.values());
  }, [funds, liveDiscoveredFunds]);

  // Live TEFAS Search effect
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearchingLive(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.funds) && data.funds.length > 0) {
              setLiveDiscoveredFunds(prev => {
                const map = new Map<string, Fund>();
                prev.forEach(f => map.set(f.code, f));
                data.funds.forEach((f: Fund) => map.set(f.code, f));
                return Array.from(map.values());
              });
            }
          }
        } catch {
          // ignore
        } finally {
          setIsSearchingLive(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const categories = useMemo(() => {
    return [
      'Tümü',
      'Para Piyasası',
      'Hisse Senedi',
      'Değişken',
      'Altın / Emtia',
      'Yabancı Hisse / Teknoloji',
      'Katılım / Faizsiz',
      'Emeklilik (BES)'
    ];
  }, []);

  const matchesFundScreener = (fund: Fund, preset: FundScreeningPreset): boolean => {
    if (preset === 'ALL') return true;

    if (preset === 'TOP_1Y_RETURNS') {
      return fund.return1Y >= 75;
    }
    if (preset === 'LOW_RISK_INCOME') {
      return fund.riskValue <= 2 && fund.return1Y >= 45;
    }
    if (preset === 'FOREIGN_TECH') {
      return (
        fund.fundCategory.includes('Yabancı') || 
        fund.fundCategory.includes('Teknoloji') || 
        fund.name.toLowerCase().includes('yabancı') ||
        fund.name.toLowerCase().includes('teknoloji') ||
        fund.name.toLowerCase().includes('nasdaq')
      );
    }
    if (preset === 'GOLD_PRECIOUS') {
      return (
        fund.fundCategory.includes('Altın') || 
        fund.fundCategory.includes('Emtia') || 
        fund.name.toLowerCase().includes('altın') ||
        fund.name.toLowerCase().includes('gümüş')
      );
    }
    if (preset === 'EQUITY_HEAVY') {
      return fund.fundCategory.includes('Hisse') || fund.fundType.includes('Hisse');
    }
    if (preset === 'LOW_EXPENSE') {
      return fund.managementFee !== undefined && fund.managementFee <= 1.5;
    }
    if (preset === 'BES_FUNDS') {
      return (
        fund.fundCategory.includes('Emeklilik') || 
        fund.fundCategory.includes('BES') || 
        fund.name.toLowerCase().includes('emeklilik') ||
        fund.name.toLowerCase().includes('bes')
      );
    }
    return true;
  };

  const filteredFunds = useMemo(() => {
    let result = [...combinedFunds];

    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      result = result.filter(
        f => matchesSearch(f.code, q) || matchesSearch(f.name, q) || matchesSearch(f.issuer, q) || matchesSearch(f.fundCategory, q)
      );
    }

    if (selectedCategory !== 'Tümü') {
      result = result.filter(f => f.fundCategory === selectedCategory);
    }

    if (selectedIssuer !== 'Tümü') {
      result = result.filter(f => f.issuer === selectedIssuer);
    }

    result = result.filter(f => matchesFundScreener(f, selectedPreset));

    result.sort((a, b) => {
      let valA = a[sortBy] ?? 0;
      let valB = b[sortBy] ?? 0;
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [combinedFunds, searchQuery, selectedCategory, selectedIssuer, selectedPreset, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const isWatchlisted = (code: string) => watchlist.some(w => w.code === code && w.type === 'fund');
  const isPortfoliod = (code: string) => portfolio.some(p => p.code === code && p.type === 'fund');

  return (
    <div className="space-y-4">
      {/* TEFAS Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-teal-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                TEFAS & BEFAS Akıllı Fon Tarama
              </span>
              <span className="text-xs text-slate-400">
                ({combinedFunds.length} Yatırım & Emeklilik Fonu)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
              Türkiye Yatırım Fonları & Stratejik Tarama Platformu
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              1Y Yüksek Getiri (%75+), Düşük Riskli Para Piyasası, Yabancı Teknoloji, Altın ve BES Emeklilik fonlarını anlık kriterlerle filtreleyin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Eşleşen Fon</span>
              <span className="text-lg font-bold text-teal-400">
                {filteredFunds.length} <span className="text-xs text-slate-400 font-normal">/ {combinedFunds.length}</span>
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">İşlem Platformu</span>
              <span className="text-sm font-bold text-white">TEFAS / BEFAS</span>
            </div>
          </div>
        </div>
      </div>

      {/* FUND SCREENING PRESETS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Fon Tarama Stratejileri
            </span>
          </div>
          {selectedPreset !== 'ALL' && (
            <button
              onClick={() => setSelectedPreset('ALL')}
              className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tüm Fonları Listele
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Preset 1: 1Y Liderleri */}
          <button
            onClick={() => setSelectedPreset('TOP_1Y_RETURNS')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'TOP_1Y_RETURNS'
                ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-teal-400/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                <Award className="w-4 h-4 text-teal-500" />
                <span>1 Yıllık Liderler</span>
              </div>
              {selectedPreset === 'TOP_1Y_RETURNS' && (
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              1 Yıllık Getiri &gt; %75
            </p>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block mt-1">
              Yıllık En Çok Kazandıranlar
            </span>
          </button>

          {/* Preset 2: Düşük Risk & Likit */}
          <button
            onClick={() => setSelectedPreset('LOW_RISK_INCOME')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'LOW_RISK_INCOME'
                ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-emerald-400/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Düşük Risk (1-2)</span>
              </div>
              {selectedPreset === 'LOW_RISK_INCOME' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              Risk: 1-2 • Getiri &gt; %45
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
              Para Piyasası & Güvenli Liman
            </span>
          </button>

          {/* Preset 3: Yabancı Hisse & Teknoloji */}
          <button
            onClick={() => setSelectedPreset('FOREIGN_TECH')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'FOREIGN_TECH'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-400/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                <Globe2 className="w-4 h-4 text-blue-500" />
                <span>Yabancı & Teknoloji</span>
              </div>
              {selectedPreset === 'FOREIGN_TECH' && (
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              Nasdaq, AI & Yarı İletken
            </p>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-1">
              AFT, YAY, TGE vb. Global Fonlar
            </span>
          </button>

          {/* Preset 4: BES Emeklilik Fonları */}
          <button
            onClick={() => setSelectedPreset('BES_FUNDS')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'BES_FUNDS'
                ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-purple-400/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                <Briefcase className="w-4 h-4 text-purple-500" />
                <span>BES Emeklilik (BEFAS)</span>
              </div>
              {selectedPreset === 'BES_FUNDS' && (
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              Devlet Katkılı BES Portföyleri
            </p>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-1">
              Bireysel Emeklilik Fonları
            </span>
          </button>
        </div>
      </div>

      {/* Controls & Category Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fon kodu (örn: YLB, AD4, MAC, TTE, TI3, ZP6, GTA, BIO, AFT, YAY, VEG, KRF) veya fon adı ara..."
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSearchingLive && (
                <div className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">TEFAS taranıyor</span>
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Quick Return Sort shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">Sırala:</span>
            <button
              onClick={() => handleSort('return1M')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'return1M' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              1 Aylık
            </button>
            <button
              onClick={() => handleSort('returnYtd')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'returnYtd' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              YBB %
            </button>
            <button
              onClick={() => handleSort('return1Y')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'return1Y' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              1 Yıllık
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Funds Table */}
      {filteredFunds.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <Info className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Fon Bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Arama kriterlerinize uygun TEFAS/BEFAS fonu bulunamadı. Lütfen filtrelerinizi kontrol edin.
          </p>
          <button
            onClick={() => {
              setSelectedPreset('ALL');
              setSelectedCategory('Tümü');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Filtreleri Sıfırla
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Fon Kodu & Adı</th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">
                      <span>Birim Fiyat</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('changePercent')}>
                    <div className="flex items-center gap-1">
                      <span>Günlük %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('return1M')}>
                    <div className="flex items-center gap-1">
                      <span>1 Aylık %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('returnYtd')}>
                    <div className="flex items-center gap-1">
                      <span>YBB %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('return1Y')}>
                    <div className="flex items-center gap-1">
                      <span>1 Yıllık %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('riskValue')}>
                    <div className="flex items-center gap-1">
                      <span>Risk (1-7)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden xl:table-cell cursor-pointer select-none" onClick={() => handleSort('aum')}>
                    <div className="flex items-center gap-1">
                      <span>Fon Büyüklüğü</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFunds.map((fund) => {
                  const isPositive = fund.changePercent >= 0;
                  const watch = isWatchlisted(fund.code);
                  const inPort = isPortfoliod(fund.code);
                  const riskStyle = getRiskColor(fund.riskValue);

                  return (
                    <tr
                      key={fund.code}
                      onClick={() => onSelectFund(fund)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Fund Code & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(fund);
                            }}
                            className={`p-1 rounded-md transition-colors ${
                              watch ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                            }`}
                            title={watch ? 'Takip Listesinden Çıkar' : 'Takip Listesine Ekle'}
                          >
                            <Star className={`w-4 h-4 ${watch ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                {fund.code}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-medium">
                                {fund.fundCategory}
                              </span>
                              {inPort && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                  Portföyde
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                              {fund.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(fund.price, 'TL')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Valör: {fund.valeurBuy === 0 ? 'T+0' : `T+${fund.valeurBuy}`} / {fund.valeurSell === 0 ? 'T+0' : `T+${fund.valeurSell}`}
                        </div>
                      </td>

                      {/* Daily % */}
                      <td className="py-3 px-3 font-mono text-xs">
                        <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatPercent(fund.changePercent, true, 3)}
                        </span>
                      </td>

                      {/* 1 Month % */}
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatPercent(fund.return1M, true, 2)}
                      </td>

                      {/* YTD % */}
                      <td className="py-3 px-3 hidden md:table-cell font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatPercent(fund.returnYtd, true, 2)}
                      </td>

                      {/* 1 Year % */}
                      <td className="py-3 px-3 font-mono text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                          {formatPercent(fund.return1Y, true, 1)}
                        </span>
                      </td>

                      {/* Risk Value */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                          {fund.riskValue} / 7
                        </span>
                      </td>

                      {/* AUM */}
                      <td className="py-3 px-3 hidden xl:table-cell font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatCompactNumber(fund.aum, 'TL')}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onOpenSetAlert && (
                            <button
                              onClick={() => onOpenSetAlert(fund)}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Fiyat Alarmı Kur (Düşüş/Yükseliş Fırsatı)"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Alarm</span>
                            </button>
                          )}
                          <button
                            onClick={() => onOpenAI(fund)}
                            className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="AI ile Fonu Değerlendir"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">AI Analiz</span>
                          </button>
                          <button
                            onClick={() => onAddToPortfolio(fund)}
                            className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Portföye Ekle"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ekle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
