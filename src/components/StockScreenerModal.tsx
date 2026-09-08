import React from 'react';
import { X, SlidersHorizontal, Check, RefreshCw, Zap, TrendingUp, ShieldCheck, DollarSign } from 'lucide-react';

export interface CustomStockFilters {
  maxPe: number | '';
  minPe: number | '';
  maxPb: number | '';
  minPb: number | '';
  minRsi: number | '';
  maxRsi: number | '';
  minAdx: number | '';
  near52wHighOnly: boolean;
  smartMoneyOnly: boolean;
  minerviniOnly: boolean;
  minDividendYield: number | '';
  minVolumeRatio: number | '';
}

interface StockScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CustomStockFilters;
  onFiltersChange: (filters: CustomStockFilters) => void;
  onReset: () => void;
  matchingCount: number;
  totalCount: number;
}

export const StockScreenerModal: React.FC<StockScreenerModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onReset,
  matchingCount,
  totalCount,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof CustomStockFilters>(
    field: K,
    value: CustomStockFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Gelişmiş Hisse Tarama & Filtreleme Motoru
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Temel ve teknik analiz kriterlerini özelleştirerek ideal hisseleri filtreleyin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Group 1: Temel Değerleme Kriterleri */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                1. Temel Değerleme Kriterleri (F/K & PD/DD & Temettü)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {/* Max F/K */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Maksimum F/K (Fiyat/Kazanç)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={filters.maxPe}
                    onChange={(e) => handleChange('maxPe', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Örn: 15.0 (F/K < 15)"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  {filters.maxPe !== '' && (
                    <button
                      onClick={() => handleChange('maxPe', '')}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Düşük F/K ucuz hisseleri listeler (örn: 15 altı)
                </span>
              </div>

              {/* Max PD/DD */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Maksimum PD/DD (Piyasa/Defter Değeri)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={filters.maxPb}
                    onChange={(e) => handleChange('maxPb', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Örn: 2.0 (PD/DD < 2.0)"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  {filters.maxPb !== '' && (
                    <button
                      onClick={() => handleChange('maxPb', '')}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Özkaynağına oranla ucuz şirketler (örn: 2.0 altı)
                </span>
              </div>

              {/* Min Temettü Verimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Minimum Temettü Verimi (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={filters.minDividendYield}
                  onChange={(e) => handleChange('minDividendYield', e.target.value ? Number(e.target.value) : '')}
                  placeholder="Örn: 4.0 (%4 ve üzeri)"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Min Hacim Oranı */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hacim Çarpanı (x 20G Ort.)
                </label>
                <input
                  type="number"
                  step="0.2"
                  min="0"
                  max="10"
                  value={filters.minVolumeRatio}
                  onChange={(e) => handleChange('minVolumeRatio', e.target.value ? Number(e.target.value) : '')}
                  placeholder="Örn: 1.5 (Ortalamanın 1.5 katı hacim)"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Teknik İndikatörler (RSI & ADX & Trend) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                2. Teknik Göstergeler & Momentum (RSI, ADX, Trend)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {/* RSI Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  RSI (14) Aralığı (Min - Max)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minRsi}
                    onChange={(e) => handleChange('minRsi', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Min (Örn: 40)"
                    className="w-1/2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxRsi}
                    onChange={(e) => handleChange('maxRsi', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Max (Örn: 60)"
                    className="w-1/2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Momentum koridoru: 40 - 60 (ne aşırı satım ne de şişmiş)
                </span>
              </div>

              {/* Min ADX */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Minimum ADX (Trend Gücü)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minAdx}
                  onChange={(e) => handleChange('minAdx', e.target.value ? Number(e.target.value) : '')}
                  placeholder="Örn: 25.0 (ADX > 25 Güçlü Trend)"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  ADX {'>'} 25 yükseliş trendinin güçlü olduğunu gösterir
                </span>
              </div>
            </div>
          </div>

          {/* Group 3: İleri Düzey Giriş Tetikleri (52H Kırılım, Akıllı Para, Minervini) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                3. Giriş Tetikleri (52H Zirve Kırılımı, Akıllı Para, Minervini)
              </h4>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {/* 52H Breakout Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.near52wHighOnly}
                  onChange={(e) => handleChange('near52wHighOnly', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                    52 Haftalık Zirveye Yakınlık / Kırılım Tetiği (52W High Breakout)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Fiyat 52 haftalık tarihi zirvesine %6’dan daha yakın veya yeni zirve yapıyor
                  </span>
                </div>
              </label>

              {/* Smart Money Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.smartMoneyOnly}
                  onChange={(e) => handleChange('smartMoneyOnly', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                    Akıllı Para Girişi Tetiği (Smart Money Inflow & Hacim Patlaması)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Kurumsal fonların ve büyük oyuncuların net para girişi sağladığı hisseler
                  </span>
                </div>
              </label>

              {/* Minervini Trend Template */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.minerviniOnly}
                  onChange={(e) => handleChange('minerviniOnly', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                    Mark Minervini Trend Şablonu (EMA20 {'>'} EMA50 {'>'} EMA200)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Hissenin net bir Aşama 2 (Stage 2) yükseliş trendi içinde olduğunu doğrular
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer with summary and action buttons */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {matchingCount} / {totalCount} Hisse Eşleşti
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sıfırla
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Sonuçları Gör ({matchingCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
