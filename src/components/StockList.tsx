import React, { useState, useMemo, useEffect } from 'react';
import { Stock, PortfolioItem, WatchlistItem } from '../types';
import { formatCurrency, formatPercent, formatCompactNumber, matchesSearch } from '../utils/formatters';
import { StockScreenerModal, CustomStockFilters } from './StockScreenerModal';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Star, 
  Plus, 
  Bot, 
  ArrowUpDown, 
  LayoutGrid, 
  List,
  Sparkles,
  Info,
  Loader2,
  SlidersHorizontal,
  Zap,
  Target,
  Flame,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Bell
} from 'lucide-react';

interface StockListProps {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
  onOpenAI: (stock: Stock) => void;
  onAddToPortfolio: (stock: Stock) => void;
  onToggleWatchlist: (stock: Stock) => void;
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
  onOpenSetAlert?: (stock: Stock) => void;
}

export type ScreeningPreset = 
  | 'ALL'
  | 'VALUE_MOMENTUM'
  | 'TREND_BREAKOUT_SMART'
  | 'DIVIDEND_VALUE'
  | 'VOLUME_SURGE'
  | 'DEFENSIVE'
  | 'OVERSOLD'
  | 'CUSTOM';

const DEFAULT_CUSTOM_FILTERS: CustomStockFilters = {
  maxPe: 15,
  minPe: '',
  maxPb: 2.0,
  minPb: '',
  minRsi: 40,
  maxRsi: 60,
  minAdx: 25,
  near52wHighOnly: true,
  smartMoneyOnly: true,
  minerviniOnly: true,
  minDividendYield: '',
  minVolumeRatio: 1.5,
};

export const StockList: React.FC<StockListProps> = ({
  stocks,
  onSelectStock,
  onOpenAI,
  onAddToPortfolio,
  onToggleWatchlist,
  watchlist,
  portfolio,
  onOpenSetAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('Tümü');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'price' | 'changePercent' | 'volumeTry' | 'pe' | 'dividendYield' | 'adx' | 'rsi' | 'code'>('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [liveDiscoveredStocks, setLiveDiscoveredStocks] = useState<Stock[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Screener state
  const [selectedPreset, setSelectedPreset] = useState<ScreeningPreset>('ALL');
  const [customFilters, setCustomFilters] = useState<CustomStockFilters>(DEFAULT_CUSTOM_FILTERS);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Combine passed stocks + live discovered ones
  const combinedStocks = useMemo(() => {
    const map = new Map<string, Stock>();
    stocks.forEach(s => map.set(s.code, s));
    liveDiscoveredStocks.forEach(s => {
      if (!map.has(s.code)) map.set(s.code, s);
    });
    return Array.from(map.values());
  }, [stocks, liveDiscoveredStocks]);

  // Live BIST Search effect
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearchingLive(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.stocks) && data.stocks.length > 0) {
              setLiveDiscoveredStocks(prev => {
                const map = new Map<string, Stock>();
                prev.forEach(s => map.set(s.code, s));
                data.stocks.forEach((s: Stock) => map.set(s.code, s));
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

  const sectors = useMemo(() => {
    return ['Tümü', ...Array.from(new Set(combinedStocks.map(s => s.sector)))];
  }, [combinedStocks]);

  // Screening predicate
  const matchesScreeningCriteria = (stock: Stock, preset: ScreeningPreset, custom: CustomStockFilters): boolean => {
    if (preset === 'ALL') return true;

    if (preset === 'VALUE_MOMENTUM') {
      // 1. Değer + Momentum: F/K < 15, PD/DD < 2, RSI 40 - 60
      const peMatch = stock.pe > 0 && stock.pe <= 15.0;
      const pbMatch = stock.pb > 0 && stock.pb <= 2.0;
      const rsiMatch = stock.rsi !== undefined && stock.rsi >= 40 && stock.rsi <= 60;
      return peMatch && pbMatch && rsiMatch;
    }

    if (preset === 'TREND_BREAKOUT_SMART') {
      // 2. Minervini Trend + 52H Kırılım + Akıllı Para (Giriş Tetiği) + ADX > 25
      const is52wBreakout = Boolean(
        stock.breakout52w || 
        (stock.distanceTo52wHigh !== undefined && stock.distanceTo52wHigh >= -6.0)
      );
      const isSmartMoney = Boolean(
        stock.smartMoneyFlow === 'high' || 
        stock.smartMoneyFlow === 'moderate' || 
        (stock.volumeRatio && stock.volumeRatio >= 1.5)
      );
      const isTrend = Boolean(
        stock.trendStatus === 'strong_bull' || 
        stock.trendStatus === 'bullish' ||
        (stock.minerviniScore && stock.minerviniScore >= 80)
      );
      const isAdxStrong = Boolean(stock.adx !== undefined && stock.adx >= 25.0);

      return is52wBreakout && isSmartMoney && isTrend && isAdxStrong;
    }

    if (preset === 'DIVIDEND_VALUE') {
      return stock.dividendYield >= 4.0 && stock.pe > 0 && stock.pe <= 12.0;
    }

    if (preset === 'VOLUME_SURGE') {
      const volMatch = Boolean(stock.volumeRatio && stock.volumeRatio >= 1.7);
      const rsiMatch = Boolean(stock.rsi && stock.rsi >= 50);
      const adxMatch = Boolean(stock.adx && stock.adx >= 22);
      return volMatch && rsiMatch && adxMatch;
    }

    if (preset === 'DEFENSIVE') {
      const betaMatch = Boolean(stock.beta && stock.beta <= 0.98);
      const peMatch = stock.pe > 0 && stock.pe <= 13.0;
      return betaMatch && peMatch;
    }

    if (preset === 'OVERSOLD') {
      return Boolean(stock.rsi !== undefined && stock.rsi <= 45);
    }

    if (preset === 'CUSTOM') {
      if (custom.maxPe !== '' && stock.pe > Number(custom.maxPe)) return false;
      if (custom.minPe !== '' && stock.pe < Number(custom.minPe)) return false;
      if (custom.maxPb !== '' && stock.pb > Number(custom.maxPb)) return false;
      if (custom.minPb !== '' && stock.pb < Number(custom.minPb)) return false;
      if (custom.minRsi !== '' && stock.rsi !== undefined && stock.rsi < Number(custom.minRsi)) return false;
      if (custom.maxRsi !== '' && stock.rsi !== undefined && stock.rsi > Number(custom.maxRsi)) return false;
      if (custom.minAdx !== '' && stock.adx !== undefined && stock.adx < Number(custom.minAdx)) return false;
      if (custom.near52wHighOnly && !(stock.breakout52w || (stock.distanceTo52wHigh && stock.distanceTo52wHigh >= -6))) return false;
      if (custom.smartMoneyOnly && !(stock.smartMoneyFlow === 'high' || stock.smartMoneyFlow === 'moderate' || (stock.volumeRatio && stock.volumeRatio >= 1.5))) return false;
      if (custom.minerviniOnly && !(stock.trendStatus === 'strong_bull' || stock.trendStatus === 'bullish')) return false;
      if (custom.minDividendYield !== '' && stock.dividendYield < Number(custom.minDividendYield)) return false;
      if (custom.minVolumeRatio !== '' && (stock.volumeRatio || 1) < Number(custom.minVolumeRatio)) return false;
      return true;
    }

    return true;
  };

  const filteredStocks = useMemo(() => {
    let result = [...combinedStocks];

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      result = result.filter(
        s => matchesSearch(s.code, q) || matchesSearch(s.name, q) || matchesSearch(s.sector, q)
      );
    }

    // 2. Sector Filter
    if (selectedSector !== 'Tümü') {
      result = result.filter(s => s.sector === selectedSector);
    }

    // 3. Screener Criteria
    result = result.filter(s => matchesScreeningCriteria(s, selectedPreset, customFilters));

    // 4. Sorting
    result.sort((a, b) => {
      let valA = a[sortBy] ?? 0;
      let valB = b[sortBy] ?? 0;
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [combinedStocks, searchQuery, selectedSector, selectedPreset, customFilters, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const isWatchlisted = (code: string) => watchlist.some(w => w.code === code && w.type === 'stock');
  const isPortfoliod = (code: string) => portfolio.some(p => p.code === code && p.type === 'stock');

  // Count matching for custom modal
  const customMatchingCount = useMemo(() => {
    return combinedStocks.filter(s => matchesScreeningCriteria(s, 'CUSTOM', customFilters)).length;
  }, [combinedStocks, customFilters]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                BIST Akıllı Tarama & Filtreleme Motoru
              </span>
              <span className="text-xs text-slate-400">
                ({combinedStocks.length} BIST Hissesi)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
              Borsa İstanbul Hisse Senetleri & Strateji Taramaları
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Değer + Momentum (F/K&lt;15, PD/DD&lt;2, RSI 40-60), Minervini Trend + 52H Kırılımı + Akıllı Para Girişi ve ADX&gt;25 kriterlerini sağlayan hisseleri filtreleyin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Eşleşen Hisse</span>
              <span className="text-lg font-bold text-emerald-400">
                {filteredStocks.length} <span className="text-xs text-slate-400 font-normal">/ {combinedStocks.length}</span>
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Tarama Modu</span>
              <span className="text-xs font-bold text-indigo-300 truncate max-w-[120px] block">
                {selectedPreset === 'ALL' ? 'Tüm Liste' : selectedPreset === 'VALUE_MOMENTUM' ? 'Değer+Momentum' : selectedPreset === 'TREND_BREAKOUT_SMART' ? 'Trend+52H+Akıllı Para' : 'Strateji'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGY PRESET BUTTONS (Kullanıcı Tarama Kriterleri) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Hazır Strateji ve Tarama Filtreleri
            </span>
          </div>
          {selectedPreset !== 'ALL' && (
            <button
              onClick={() => setSelectedPreset('ALL')}
              className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tüm Hisseleri Göster
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Preset 1: Değer + Momentum (Kullanıcının talep ettiği 1. örnek) */}
          <button
            onClick={() => setSelectedPreset('VALUE_MOMENTUM')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'VALUE_MOMENTUM'
                ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-emerald-400/60 dark:hover:border-emerald-600/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <span className="text-emerald-500 text-sm">🎯</span>
                <span>Değer + Momentum</span>
              </div>
              {selectedPreset === 'VALUE_MOMENTUM' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              F/K &lt; 15 • PD/DD &lt; 2 • RSI 40-60
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
              İskontolu & Dengeli Büyüme
            </span>
          </button>

          {/* Preset 2: Minervini Trend + 52H Kırılım + Akıllı Para + ADX > 25 (Kullanıcının talep ettiği 2. örnek) */}
          <button
            onClick={() => setSelectedPreset('TREND_BREAKOUT_SMART')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'TREND_BREAKOUT_SMART'
                ? 'bg-indigo-500/10 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-600/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <span className="text-indigo-500 text-sm">🚀</span>
                <span>Trend + 52H + Akıllı Para</span>
              </div>
              {selectedPreset === 'TREND_BREAKOUT_SMART' && (
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              52H Zirve • Akıllı Para • ADX &gt; 25
            </p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-1">
              Minervini Aşama 2 Güçlü Giriş Tetiği
            </span>
          </button>

          {/* Preset 3: Temettü Şampiyonları */}
          <button
            onClick={() => setSelectedPreset('DIVIDEND_VALUE')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'DIVIDEND_VALUE'
                ? 'bg-amber-500/10 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-400/60 dark:hover:border-amber-600/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <span className="text-amber-500 text-sm">💎</span>
                <span>Temettü Şampiyonları</span>
              </div>
              {selectedPreset === 'DIVIDEND_VALUE' && (
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
              Temettü &gt; %4 • F/K &lt; 12
            </p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
              Yüksek Nakit Kâr Payı Verenler
            </span>
          </button>

          {/* Preset 4: Özel Tarama Paneli */}
          <button
            onClick={() => {
              setSelectedPreset('CUSTOM');
              setIsCustomModalOpen(true);
            }}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedPreset === 'CUSTOM'
                ? 'bg-purple-500/10 border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-purple-400/60 dark:hover:border-purple-600/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                <SlidersHorizontal className="w-4 h-4 text-purple-500" />
                <span>Özel Tarama Ayarla</span>
              </div>
              {selectedPreset === 'CUSTOM' && (
                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              F/K, RSI, ADX, Hacim sınırlarını belirle
            </p>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-1">
              Filtreleri Düzenle (Modal)
            </span>
          </button>
        </div>

        {/* ACTIVE STRATEGY EXPLANATION BAR */}
        {selectedPreset !== 'ALL' && (
          <div className="bg-slate-100 dark:bg-slate-800/70 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                Aktif Tarama Filtresi:
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {selectedPreset === 'VALUE_MOMENTUM' && '🎯 F/K < 15, PD/DD < 2 ve RSI 40-60 aralığındaki değer ve momentum hisseleri listeleniyor.'}
                {selectedPreset === 'TREND_BREAKOUT_SMART' && '🚀 52 Haftalık Zirve Kırılımı + Akıllı Para Girişi (Hacim Patlaması) + Minervini Trend + ADX > 25 kriterlerini karşılayan hisseler.'}
                {selectedPreset === 'DIVIDEND_VALUE' && '💎 Temettü verimi %4 üzeri ve F/K oranı 12 altındaki ucuz kâr dağıtan şirketler.'}
                {selectedPreset === 'CUSTOM' && '⚙️ Kullanıcı tanımlı özel tarama parametreleri uygulanıyor.'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {filteredStocks.length} Hisse Eşleşti
              </span>
              {selectedPreset === 'CUSTOM' && (
                <button
                  onClick={() => setIsCustomModalOpen(true)}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  Ayarları Değiştir
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Sector Filters, View Modes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hisse kodu veya şirket adı ara (örn: AKBNK, THYAO, ASELS, ASTOR, BIMAS, FROTO, TUPRS, REEDR)..."
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSearchingLive && (
                <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Piyasa taranıyor</span>
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

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Geniş Tablo Görünümü"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kart Görünümü"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedSector === sector
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stock Content */}
      {filteredStocks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <Info className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Seçilen Tarama Koşullarına Uygun Hisse Bulunamadı
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Mevcut filtre kriterlerini esnetebilir veya diğer hazır stratejileri deneyebilirsiniz.
          </p>
          <button
            onClick={() => {
              setSelectedPreset('ALL');
              setSelectedSector('Tümü');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tüm Filtreleri Sıfırla
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW WITH TECHNICAL SCANNER COLUMNS */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Hisse & Sektör</th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">
                      <span>Son Fiyat</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('changePercent')}>
                    <div className="flex items-center gap-1">
                      <span>Günlük %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('pe')}>
                    <div className="flex items-center gap-1">
                      <span>F/K</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden md:table-cell">PD/DD</th>
                  <th className="py-3 px-3 hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('rsi')}>
                    <div className="flex items-center gap-1">
                      <span>RSI (14)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('adx')}>
                    <div className="flex items-center gap-1">
                      <span>ADX Trend</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 hidden xl:table-cell">Giriş Tetikleri</th>
                  <th className="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStocks.map((stock) => {
                  const isPositive = stock.changePercent >= 0;
                  const isZero = stock.changePercent === 0;
                  const watch = isWatchlisted(stock.code);
                  const inPort = isPortfoliod(stock.code);

                  const is52wBreak = Boolean(stock.breakout52w || (stock.distanceTo52wHigh && stock.distanceTo52wHigh >= -6));
                  const isSmart = stock.smartMoneyFlow === 'high' || stock.smartMoneyFlow === 'moderate';
                  const isMinervini = stock.trendStatus === 'strong_bull' || stock.trendStatus === 'bullish';

                  return (
                    <tr
                      key={stock.code}
                      onClick={() => onSelectStock(stock)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Ticker & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(stock);
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
                              <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {stock.code}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                {stock.sector}
                              </span>
                              {inPort && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                  Portföyde
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                              {stock.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(stock.price, 'TL')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} TL
                        </div>
                      </td>

                      {/* Change % */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold font-mono ${
                            isZero
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : isPositive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {!isZero && (isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />)}
                          {formatPercent(stock.changePercent)}
                        </span>
                      </td>

                      {/* PE (F/K) */}
                      <td className="py-3 px-3 hidden sm:table-cell font-mono text-xs">
                        <span className={`font-semibold ${stock.pe > 0 && stock.pe < 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {stock.pe > 0 ? stock.pe.toFixed(2) : '-'}
                        </span>
                      </td>

                      {/* PB (PD/DD) */}
                      <td className="py-3 px-3 hidden md:table-cell font-mono text-xs">
                        <span className={`font-semibold ${stock.pb > 0 && stock.pb < 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {stock.pb > 0 ? stock.pb.toFixed(2) : '-'}
                        </span>
                      </td>

                      {/* RSI (14) */}
                      <td className="py-3 px-3 hidden lg:table-cell font-mono text-xs">
                        {stock.rsi ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${
                              stock.rsi >= 40 && stock.rsi <= 60 
                                ? 'text-indigo-600 dark:text-indigo-400' 
                                : stock.rsi > 70 
                                ? 'text-rose-500' 
                                : 'text-slate-500'
                            }`}>
                              {stock.rsi.toFixed(1)}
                            </span>
                            {stock.rsi >= 40 && stock.rsi <= 60 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-medium">
                                Momentum
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* ADX (Trend Strength) */}
                      <td className="py-3 px-3 hidden lg:table-cell font-mono text-xs">
                        {stock.adx ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${stock.adx >= 25 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                              {stock.adx.toFixed(1)}
                            </span>
                            {stock.adx >= 25 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-medium">
                                Güçlü
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Screening Badges / Triggers */}
                      <td className="py-3 px-3 hidden xl:table-cell text-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          {is52wBreak && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="52 Haftalık Zirveye Yakın / Kırılım">
                              🚀 52H Kırılım
                            </span>
                          )}
                          {isSmart && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Akıllı Para Girişi & Hacim">
                              🟢 Akıllı Para
                            </span>
                          )}
                          {isMinervini && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Minervini Aşama 2 Trend Şablonu">
                              📈 Trend
                            </span>
                          )}
                          {stock.dividendYield >= 4.0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title={`Temettü Verimi %${stock.dividendYield.toFixed(1)}`}>
                              💎 %{stock.dividendYield.toFixed(1)} Temettü
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onOpenSetAlert && (
                            <button
                              onClick={() => onOpenSetAlert(stock)}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Fiyat Alarmı Kur (Düşüş/Yükseliş Fırsatı)"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Alarm</span>
                            </button>
                          )}
                          <button
                            onClick={() => onOpenAI(stock)}
                            className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="AI ile Hisseyi Analiz Et"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">AI Analiz</span>
                          </button>
                          <button
                            onClick={() => onAddToPortfolio(stock)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1 transition-colors"
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
      ) : (
        /* GRID CARD VIEW WITH TECHNICAL SCREENING BADGES */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStocks.map((stock) => {
            const isPositive = stock.changePercent >= 0;
            const isZero = stock.changePercent === 0;
            const watch = isWatchlisted(stock.code);

            const is52wBreak = Boolean(stock.breakout52w || (stock.distanceTo52wHigh && stock.distanceTo52wHigh >= -6));
            const isSmart = stock.smartMoneyFlow === 'high' || stock.smartMoneyFlow === 'moderate';
            const isMinervini = stock.trendStatus === 'strong_bull' || stock.trendStatus === 'bullish';

            return (
              <div
                key={stock.code}
                onClick={() => onSelectStock(stock)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {stock.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {stock.sector}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {stock.name}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(stock);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        watch ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${watch ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Price & Change */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(stock.price, 'TL')}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold font-mono ${
                        isZero
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          : isPositive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {!isZero && (isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />)}
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>

                  {/* Key Multiples & Technical Signals */}
                  <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">F/K</span>
                      <span className={`font-mono font-semibold ${stock.pe < 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {stock.pe.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">PD/DD</span>
                      <span className={`font-mono font-semibold ${stock.pb < 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {stock.pb.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">RSI(14)</span>
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {stock.rsi ? stock.rsi.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">ADX</span>
                      <span className={`font-mono font-semibold ${stock.adx && stock.adx >= 25 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {stock.adx ? stock.adx.toFixed(1) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Screening Trigger Badges */}
                  <div className="flex items-center gap-1 flex-wrap mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {is52wBreak && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        🚀 52H Kırılım
                      </span>
                    )}
                    {isSmart && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        🟢 Akıllı Para
                      </span>
                    )}
                    {isMinervini && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        📈 Minervini
                      </span>
                    )}
                    {stock.dividendYield >= 4.0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        💎 %{stock.dividendYield.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card footer buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {onOpenSetAlert && (
                    <button
                      onClick={() => onOpenSetAlert(stock)}
                      className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold flex items-center justify-center transition-colors border border-amber-200 dark:border-amber-800"
                      title="Fiyat Alarmı Kur"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onOpenAI(stock)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 hover:bg-purple-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-purple-200 dark:border-purple-800"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI Raporu</span>
                  </button>
                  <button
                    onClick={() => onAddToPortfolio(stock)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Portföye Ekle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOM STOCK SCREENER MODAL */}
      <StockScreenerModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        filters={customFilters}
        onFiltersChange={setCustomFilters}
        onReset={() => setCustomFilters(DEFAULT_CUSTOM_FILTERS)}
        matchingCount={customMatchingCount}
        totalCount={combinedStocks.length}
      />
    </div>
  );
};
