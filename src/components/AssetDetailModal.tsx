import React, { useState, useEffect } from 'react';
import { Stock, Fund, PricePoint } from '../types';
import { formatCurrency, formatPercent, formatCompactNumber, getRiskColor } from '../utils/formatters';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Plus, 
  Bot, 
  ExternalLink, 
  Calendar, 
  Layers, 
  ShieldCheck, 
  BarChart2, 
  Newspaper,
  Clock,
  ArrowRight,
  Bell
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface AssetDetailModalProps {
  asset: Stock | Fund | null;
  onClose: () => void;
  onOpenAI: (asset: Stock | Fund) => void;
  onAddToPortfolio: (asset: Stock | Fund) => void;
  onToggleWatchlist: (asset: Stock | Fund) => void;
  isWatchlisted: boolean;
  onOpenSetAlert?: (asset: Stock | Fund) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset: initialAsset,
  onClose,
  onOpenAI,
  onAddToPortfolio,
  onToggleWatchlist,
  isWatchlisted,
  onOpenSetAlert,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1M');
  const [asset, setAsset] = useState<Stock | Fund | null>(initialAsset);

  useEffect(() => {
    setAsset(initialAsset);
    if (!initialAsset) return;

    const endpoint = initialAsset.type === 'stock' ? `/api/stocks/${initialAsset.code}` : `/api/funds/${initialAsset.code}`;
    fetch(endpoint)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.price) {
          setAsset(prev => prev && prev.code === initialAsset.code ? { ...prev, ...data } : prev);
        }
      })
      .catch(() => {});
  }, [initialAsset]);

  if (!asset) return null;

  const isStock = asset.type === 'stock';
  const stock = isStock ? (asset as Stock) : null;
  const fund = !isStock ? (asset as Fund) : null;

  const historyPoints = (asset.history && asset.history[selectedPeriod]) || [];
  const startPrice = historyPoints[0]?.price || asset.price;
  const endPrice = historyPoints[historyPoints.length - 1]?.price || asset.price;
  const periodReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const isPeriodPositive = periodReturn >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
              isStock ? 'bg-emerald-600' : 'bg-teal-600'
            }`}>
              {isStock ? <TrendingUp className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {asset.code}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isStock 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                }`}>
                  {isStock ? stock?.sector : fund?.fundCategory}
                </span>
                {fund && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(fund.riskValue).bg} ${getRiskColor(fund.riskValue).text} ${getRiskColor(fund.riskValue).border}`}>
                    Risk: {fund.riskValue}/7
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {asset.name} {fund ? `• ${fund.issuer}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSetAlert && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSetAlert(asset);
                }}
                className="p-2 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                title="Fiyat Alarmı Kur"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleWatchlist(asset)}
              className={`p-2 rounded-xl border transition-colors ${
                isWatchlisted
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
              }`}
              title={isWatchlisted ? 'Takip Listesinden Çıkar' : 'Takip Listesine Ekle'}
            >
              <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Price Banner & CTAs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <div className="text-xs text-slate-500 font-medium">Güncel Birim Fiyat</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                  {formatCurrency(asset.price, 'TL')}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold font-mono ${
                  asset.changePercent >= 0 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                }`}>
                  {formatPercent(asset.changePercent)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenSetAlert && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSetAlert(asset);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
                  title="Bu ürün belirli fiyata gelince uyar"
                >
                  <Bell className="w-4 h-4" />
                  <span>Alarm Kur</span>
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  onOpenAI(asset);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>AI Analiz</span>
              </button>
              <button
                onClick={() => {
                  onAddToPortfolio(asset);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Portföye Ekle</span>
              </button>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">Fiyat Geçmişi & Trend</span>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Dönem Getirisi: <span className={isPeriodPositive ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                    {formatPercent(periodReturn)}
                  </span>
                </div>
              </div>

              {/* Period Selectors */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedPeriod === period
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => val < 10 ? val.toFixed(2) : val.toLocaleString('tr-TR')}
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '10px', 
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value), 'TL'), 'Fiyat']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isPeriodPositive ? '#10b981' : '#f43f5e'} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Specific Metrics */}
          {isStock && stock && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">F/K Oranı</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{stock.pe > 0 ? stock.pe.toFixed(2) : '-'}</span>
                <span className="text-[10px] text-slate-500 block">Sektör Çarpanı</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">PD/DD Oranı</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{stock.pb > 0 ? stock.pb.toFixed(2) : '-'}</span>
                <span className="text-[10px] text-slate-500 block">Piyasa/Defter Değeri</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Temettü Verimi</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{stock.dividendYield > 0 ? `%${stock.dividendYield.toFixed(2)}` : '-%'}</span>
                <span className="text-[10px] text-slate-500 block">Yıllık Dağıtım</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Piyasa Değeri</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{formatCompactNumber(stock.marketCap, 'TL')}</span>
                <span className="text-[10px] text-slate-500 block">BIST Ağırlığı</span>
              </div>
            </div>
          )}

          {/* TEFAS Fund Specific Periodic Returns & Allocations */}
          {fund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">1 Aylık</span>
                  <span className={`text-base font-bold font-mono ${(fund.return1M ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {(fund.return1M ?? 0) > 0 ? '+' : ''}%{(fund.return1M ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">3 Aylık</span>
                  <span className={`text-base font-bold font-mono ${(fund.return3M ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {(fund.return3M ?? 0) > 0 ? '+' : ''}%{(fund.return3M ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">6 Aylık</span>
                  <span className={`text-base font-bold font-mono ${(fund.return6M ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {(fund.return6M ?? 0) > 0 ? '+' : ''}%{(fund.return6M ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">YBB (Yıl Başı)</span>
                  <span className={`text-base font-bold font-mono ${(fund.returnYtd ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {(fund.returnYtd ?? 0) > 0 ? '+' : ''}%{(fund.returnYtd ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center">
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-bold">1 Yıllık Getiri</span>
                  <span className={`text-base font-bold font-mono ${(fund.return1Y ?? 0) >= 0 ? 'text-teal-600 dark:text-teal-300' : 'text-rose-600 dark:text-rose-400'}`}>
                    {(fund.return1Y ?? 0) > 0 ? '+' : ''}%{(fund.return1Y ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Fund Allocations Breakdown Pie */}
              {fund.allocations && fund.allocations.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-500" />
                    Fon Portföy Varlık Dağılımı
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fund.allocations}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="percentage"
                          >
                            {fund.allocations.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(val: any) => [`%${Number(val).toFixed(1)}`, 'Oran']}
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {fund.allocations.map((alloc) => (
                        <div key={alloc.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alloc.color }} />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{alloc.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">%{alloc.percentage.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fund operational details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-medium">Fon Toplam Büyüklüğü</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">{formatCompactNumber(fund.aum, 'TL')}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-medium">Yatırımcı Sayısı</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">{fund.investorsCount.toLocaleString('tr-TR')} Kişi</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-medium">Alış / Satış Valörü</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                    Alış: {fund.valeurBuy === 0 ? 'T+0' : `T+${fund.valeurBuy}`} / Satış: {fund.valeurSell === 0 ? 'T+0' : `T+${fund.valeurSell}`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-medium">Yıllık Yönetim Ücreti</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">%{fund.managementFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Description & Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hakkında</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {asset.description}
            </p>
          </div>

          {/* KAP News Section */}
          {asset.kapNews && asset.kapNews.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-emerald-500" />
                Son KAP Bildirimleri & Gelişmeler
              </h4>
              <div className="space-y-2">
                {asset.kapNews.map((news) => (
                  <div 
                    key={news.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">
                        {news.title}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">{news.date}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
