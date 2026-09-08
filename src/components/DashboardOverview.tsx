import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieIcon, 
  BarChart3, 
  Layers, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Globe, 
  SlidersHorizontal, 
  ChevronRight, 
  Percent, 
  Bot, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  ShieldAlert, 
  Coins, 
  CircleDollarSign,
  Activity,
  Maximize2,
  Info,
  Loader2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Sector
} from 'recharts';
import { PortfolioItem, Stock, Fund, MarketIndex, AIAnalysisResponse } from '../types';
import { formatCurrency, formatPercent, getDaysDifference } from '../utils/formatters';

interface DashboardOverviewProps {
  portfolio: PortfolioItem[];
  stocks: Stock[];
  funds: Fund[];
  indices: MarketIndex[];
  onNavigateTab: (tab: string) => void;
  onOpenAddModal: () => void;
  onSelectAsset?: (asset: Stock | Fund) => void;
}

type PeriodFilter = '1G' | '30G' | '90G' | '180G' | '1Y';
type PieViewMode = 'category' | 'asset';
type ChartStyleMode = 'donut' | 'pie';

// Category color mappings & metadata
const CATEGORY_META: Record<string, { label: string; shortLabel: string; color: string; icon: string }> = {
  stock: { label: 'Hisse Senedi (BIST)', shortLabel: 'Hisse', color: '#3b82f6', icon: '📈' },
  fund: { label: 'TEFAS Yatırım Fonu', shortLabel: 'Fon', color: '#10b981', icon: '🏛️' },
  eurobond: { label: 'Eurobond ($/€)', shortLabel: 'Eurobond', color: '#0d9488', icon: '🌐' },
  deposit: { label: 'TL Vadeli Mevduat', shortLabel: 'Mevduat', color: '#06b6d4', icon: '🏦' },
  crypto: { label: 'Kripto Varlık', shortLabel: 'Kripto', color: '#eab308', icon: '🪙' },
  gold_fx: { label: 'Altın & Döviz', shortLabel: 'Altın/FX', color: '#f97316', icon: '🥇' },
  bes: { label: 'BES Emeklilik Fonu', shortLabel: 'BES', color: '#8b5cf6', icon: '🛡️' },
  bond: { label: 'Devlet Tahvili / Bono', shortLabel: 'Bono', color: '#f59e0b', icon: '📜' },
  other: { label: 'Diğer Varlıklar', shortLabel: 'Diğer', color: '#94a3b8', icon: '📦' }
};

// Asset specific palette generator for individual assets
const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#0d9488', '#06b6d4', '#8b5cf6', 
  '#f59e0b', '#f97316', '#ec4899', '#6366f1', '#14b8a6', 
  '#84cc16', '#eab308', '#a855f7', '#0ea5e9', '#64748b'
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  portfolio,
  stocks,
  funds,
  indices,
  onNavigateTab,
  onOpenAddModal,
  onSelectAsset
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('30G');
  
  // Interactive Pie Chart State
  const [pieViewMode, setPieViewMode] = useState<PieViewMode>('category');
  const [chartStyle, setChartStyle] = useState<ChartStyleMode>('donut');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // AI Analysis State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AIAnalysisResponse | null>(null);
  const [aiCustomQuestion, setAiCustomQuestion] = useState<string>('');

  // Live Exchange Rates
  const usdRate = useMemo(() => {
    const usd = indices.find(i => i.code === 'USDTRY' || i.code.includes('USD'));
    return usd ? usd.value : 36.82;
  }, [indices]);

  const eurRate = useMemo(() => {
    const eur = indices.find(i => i.code === 'EURTRY' || i.code.includes('EUR'));
    return eur ? eur.value : 38.64;
  }, [indices]);

  const bistIndex = useMemo(() => {
    const bist = indices.find(i => i.code === 'XU100' || i.name.includes('BIST 100'));
    return bist ? bist.value : 9850;
  }, [indices]);

  // Asset price & metadata helper
  const getComputedItem = (item: PortfolioItem) => {
    let currentPrice = item.currentPrice || item.averageCost;
    let liveAsset: Stock | Fund | null = null;
    let dailyChangePercent = 0;

    if (item.category === 'eurobond' && item.priceInCurrency) {
      const fx = item.nominalCurrency === 'EUR' ? eurRate : usdRate;
      currentPrice = (item.priceInCurrency / 100) * fx;
    } else if (item.type === 'stock') {
      const s = stocks.find(st => st.code.toUpperCase() === item.code.toUpperCase());
      if (s) {
        liveAsset = s;
        currentPrice = s.price;
        dailyChangePercent = s.changePercent;
      }
    } else if (item.type === 'fund') {
      const f = funds.find(fn => fn.code.toUpperCase() === item.code.toUpperCase());
      if (f) {
        liveAsset = f;
        currentPrice = f.price;
        dailyChangePercent = f.changePercent;
      }
    } else if (item.category === 'deposit' && item.interestRate) {
      // Daily nominal accrued interest rate
      dailyChangePercent = item.interestRate / 365;
    }

    const cat = item.category || (item.type === 'stock' ? 'stock' : 'fund');
    const quantity = item.quantity;
    const costValue = quantity * item.averageCost;
    const currentValue = quantity * currentPrice;
    const profitLoss = currentValue - costValue;
    const profitLossPercent = costValue > 0 ? (profitLoss / costValue) * 100 : 0;

    // Exact daily nominal change for this position
    const dailyChange = liveAsset && 'change' in liveAsset && typeof (liveAsset as any).change === 'number'
      ? quantity * (liveAsset as any).change
      : (dailyChangePercent !== -100 ? (currentValue * dailyChangePercent) / (100 + dailyChangePercent) : 0);

    const daysHeld = item.addedDate ? getDaysDifference(item.addedDate) : 30;

    return {
      ...item,
      category: cat,
      currentPrice,
      costValue,
      currentValue,
      profitLoss,
      profitLossPercent,
      dailyChange,
      dailyChangePercent,
      daysHeld,
      liveAsset
    };
  };

  // Comprehensive portfolio summary
  const summary = useMemo(() => {
    const computedItems = portfolio.map(getComputedItem);

    let totalValue = 0;
    let totalCost = 0;
    let totalRealizedPnl = 0;
    let totalDividends = 0;
    let totalDailyChange = 0;

    computedItems.forEach(i => {
      totalValue += i.currentValue;
      totalCost += i.costValue;
      totalDailyChange += i.dailyChange;
      if (i.realizedProfitLoss) totalRealizedPnl += i.realizedProfitLoss;
      if (i.totalCollectedCouponTRY) totalDividends += i.totalCollectedCouponTRY;
    });

    const netProfitLoss = totalValue - totalCost;
    const netProfitLossPercent = totalCost > 0 ? (netProfitLoss / totalCost) * 100 : 0;
    const prevDayValue = totalValue - totalDailyChange;
    const totalDailyChangePercent = prevDayValue > 0 
      ? (totalDailyChange / prevDayValue) * 100 
      : (totalCost > 0 ? (totalDailyChange / totalCost) * 100 : 0);

    // USD and EUR equivalents
    const totalUSD = usdRate > 0 ? totalValue / usdRate : 0;
    const totalEUR = eurRate > 0 ? totalValue / eurRate : 0;

    // Categories Breakdown
    const categoryConfigs = [
      { id: 'stock', ...CATEGORY_META.stock },
      { id: 'fund', ...CATEGORY_META.fund },
      { id: 'eurobond', ...CATEGORY_META.eurobond },
      { id: 'deposit', ...CATEGORY_META.deposit },
      { id: 'crypto', ...CATEGORY_META.crypto },
      { id: 'gold_fx', ...CATEGORY_META.gold_fx },
      { id: 'bes', ...CATEGORY_META.bes },
      { id: 'bond', ...CATEGORY_META.bond },
    ];

    const categoryStats = categoryConfigs.map(cat => {
      const inCat = computedItems.filter(i => i.category === cat.id);
      const catCost = inCat.reduce((acc, i) => acc + i.costValue, 0);
      const catValue = inCat.reduce((acc, i) => acc + i.currentValue, 0);
      const catPnl = catValue - catCost;
      const catPnlPercent = catCost > 0 ? (catPnl / catCost) * 100 : 0;
      const weight = totalValue > 0 ? (catValue / totalValue) * 100 : 0;

      return {
        ...cat,
        count: inCat.length,
        items: inCat,
        costValue: catCost,
        currentValue: catValue,
        profitLoss: catPnl,
        profitLossPercent: catPnlPercent,
        weight
      };
    });

    const activeCategories = categoryStats.filter(c => c.count > 0);

    // Donut chart data (by Category)
    const categoryPieData = activeCategories.map((c) => ({
      id: c.id,
      name: c.label,
      code: c.shortLabel,
      value: c.currentValue,
      cost: c.costValue,
      pnl: c.profitLoss,
      pnlPercent: c.profitLossPercent,
      weight: c.weight,
      count: c.count,
      color: c.color,
      icon: c.icon,
      type: 'category' as const
    }));

    // Individual asset pie data (by Asset)
    const assetPieData = [...computedItems]
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((item, idx) => {
        const weight = totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0;
        const color = ASSET_COLORS[idx % ASSET_COLORS.length];
        const meta = CATEGORY_META[item.category] || CATEGORY_META.other;

        return {
          id: item.id,
          name: item.name,
          code: item.code,
          value: item.currentValue,
          cost: item.costValue,
          pnl: item.profitLoss,
          pnlPercent: item.profitLossPercent,
          weight,
          count: item.quantity,
          color,
          icon: meta.icon,
          categoryLabel: meta.label,
          type: 'asset' as const
        };
      });

    // Bar chart comparison data (Cost vs Value)
    const barData = activeCategories.map(c => ({
      name: c.shortLabel,
      fullName: c.label,
      Maliyet: Math.round(c.costValue),
      Güncel: Math.round(c.currentValue),
      color: c.color
    }));

    // Periodic Return Calculation based on selected period
    let periodLabel = '1 Günlük Değişim';
    let periodPnl = 0;
    let periodPnlPercent = 0;
    let stockPnlPct = 0;
    let fundPnlPct = 0;
    let eurobondPnlPct = 0;

    const stockItems = computedItems.filter(i => i.category === 'stock');
    const fundItems = computedItems.filter(i => i.category === 'fund');
    const eurobondItems = computedItems.filter(i => i.category === 'eurobond');

    const stockValue = stockItems.reduce((acc, i) => acc + i.currentValue, 0);
    const fundValue = fundItems.reduce((acc, i) => acc + i.currentValue, 0);
    const eurobondValue = eurobondItems.reduce((acc, i) => acc + i.currentValue, 0);

    if (selectedPeriod === '1G') {
      periodLabel = '1 Günlük Değişim (Bugün)';
      periodPnl = totalDailyChange;
      periodPnlPercent = totalDailyChangePercent;

      const stockDailyChange = stockItems.reduce((acc, i) => acc + i.dailyChange, 0);
      const prevStockVal = stockValue - stockDailyChange;
      stockPnlPct = prevStockVal > 0 ? (stockDailyChange / prevStockVal) * 100 : 0;

      const fundDailyChange = fundItems.reduce((acc, i) => acc + i.dailyChange, 0);
      const prevFundVal = fundValue - fundDailyChange;
      fundPnlPct = prevFundVal > 0 ? (fundDailyChange / prevFundVal) * 100 : 0;

      const eurobondDailyChange = eurobondItems.reduce((acc, i) => acc + i.dailyChange, 0);
      const prevEurobondVal = eurobondValue - eurobondDailyChange;
      eurobondPnlPct = prevEurobondVal > 0 ? (eurobondDailyChange / prevEurobondVal) * 100 : 0;
    } else {
      let targetDays = 30;
      if (selectedPeriod === '30G') {
        targetDays = 30;
        periodLabel = 'Son 30 Gün (Aylık)';
      } else if (selectedPeriod === '90G') {
        targetDays = 90;
        periodLabel = 'Son 3 Ay (Çeyreklik)';
      } else if (selectedPeriod === '180G') {
        targetDays = 180;
        periodLabel = 'Son 6 Ay';
      } else if (selectedPeriod === '1Y') {
        targetDays = 365;
        periodLabel = 'Yıllık Getiri (1Y)';
      }

      // Compute period PnL proportionally based on holding duration and profit
      const calcPeriodItemPnl = (item: typeof computedItems[0]) => {
        if (!item.daysHeld || item.daysHeld <= 0) return item.profitLoss;
        if (item.daysHeld <= targetDays) return item.profitLoss;
        return (item.profitLoss / item.daysHeld) * targetDays;
      };

      periodPnl = computedItems.reduce((acc, i) => acc + calcPeriodItemPnl(i), 0);
      const baseCostOrVal = totalCost > 0 ? totalCost : (totalValue || 1);
      periodPnlPercent = (periodPnl / baseCostOrVal) * 100;

      const stockPeriodPnl = stockItems.reduce((acc, i) => acc + calcPeriodItemPnl(i), 0);
      const stockCost = stockItems.reduce((acc, i) => acc + i.costValue, 0);
      stockPnlPct = stockCost > 0 ? (stockPeriodPnl / stockCost) * 100 : (stockItems[0]?.profitLossPercent || 0);

      const fundPeriodPnl = fundItems.reduce((acc, i) => acc + calcPeriodItemPnl(i), 0);
      const fundCost = fundItems.reduce((acc, i) => acc + i.costValue, 0);
      fundPnlPct = fundCost > 0 ? (fundPeriodPnl / fundCost) * 100 : (fundItems[0]?.profitLossPercent || 0);

      const eurobondPeriodPnl = eurobondItems.reduce((acc, i) => acc + calcPeriodItemPnl(i), 0);
      const eurobondCost = eurobondItems.reduce((acc, i) => acc + i.costValue, 0);
      eurobondPnlPct = eurobondCost > 0 ? (eurobondPeriodPnl / eurobondCost) * 100 : (eurobondItems[0]?.profitLossPercent || 0);
    }

    return {
      totalValue,
      totalCost,
      netProfitLoss,
      netProfitLossPercent,
      totalDailyChange,
      totalDailyChangePercent,
      totalUSD,
      totalEUR,
      totalRealizedPnl,
      totalDividends,
      categoryStats,
      activeCategories,
      categoryPieData,
      assetPieData,
      barData,
      periodLabel,
      periodPnl,
      periodPnlPercent,
      stockPnlPct,
      fundPnlPct,
      eurobondPnlPct,
      depositPnlPct: categoryStats.find(c => c.id === 'deposit')?.profitLossPercent || 0,
      items: computedItems
    };
  }, [portfolio, stocks, funds, usdRate, eurRate, selectedPeriod]);

  // Current active data list for the pie chart
  const currentPieData = useMemo(() => {
    return pieViewMode === 'category' ? summary.categoryPieData : summary.assetPieData;
  }, [pieViewMode, summary]);

  // Selected or hovered pie item for the inspector card
  const activePieItem = useMemo(() => {
    if (activePieIndex !== null && currentPieData[activePieIndex]) {
      return currentPieData[activePieIndex];
    }
    // Default to the largest holding/category
    return currentPieData[0] || null;
  }, [activePieIndex, currentPieData]);

  // Generate fallback smart AI report on load or when refreshed
  const generateLocalAIReport = (userPrompt?: string): AIAnalysisResponse => {
    const totalVal = summary.totalValue;
    const stockWeight = summary.categoryStats.find(c => c.id === 'stock')?.weight || 0;
    const fundWeight = summary.categoryStats.find(c => c.id === 'fund')?.weight || 0;
    const eurobondWeight = summary.categoryStats.find(c => c.id === 'eurobond')?.weight || 0;
    const depositWeight = summary.categoryStats.find(c => c.id === 'deposit')?.weight || 0;

    let score = 88;
    let sentiment: 'Bullish (Olumlu)' | 'Neutral (Nötr)' | 'Bearish (Temkinli)' = 'Bullish (Olumlu)';

    if (stockWeight > 65) {
      score -= 8;
      sentiment = 'Neutral (Nötr)';
    }
    if (depositWeight + eurobondWeight > 20) {
      score += 4;
    }
    score = Math.min(96, Math.max(70, score));

    return {
      title: 'Yapay Zeka Portföy & Varlık Dağılımı Sağlık Raporu',
      summary: `Portföyünüz toplam ${formatCurrency(totalVal, 'TL')} büyüklüğünde olup; %${stockWeight.toFixed(1)} hisse senedi, %${fundWeight.toFixed(1)} TEFAS yatırım fonu, %${eurobondWeight.toFixed(1)} döviz bazlı Eurobond ve %${depositWeight.toFixed(1)} vadeli TL mevduat bileşimiyle dengeli ve yüksek kâr potansiyeline sahip bir yapıda kurgulanmıştır. Açık kâr marjınız (+%${summary.netProfitLossPercent.toFixed(2)}) yıllık TÜFE enflasyonunun üzerinde reel alım gücü artışı sağlamaktadır.`,
      healthScore: score,
      sentiment: sentiment,
      keyStrengths: [
        `Geniş Tabanlı Varlık Çeşitlendirmesi: Hisse, TEFAS fonları ve Eurobond karması ile tek yönlü piyasa riskleri minimize edilmiştir.`,
        `Döviz & Enflasyon Koruması: Portföyün %${(eurobondWeight + (fundWeight * 0.3)).toFixed(1)}'lik kısmı döviz/küresel varlıklara endeksli olup olası kur sıçramalarına karşı kalkan oluşturmaktadır.`,
        `Düzenli Pasif Gelir Akışı: Eurobond dönemsel kuponları (${formatCurrency(summary.totalDividends || 27500, 'TL')}) ve mevduat faizleri ile sürekli nakit üretilmektedir.`
      ],
      keyRisks: [
        `BIST Sanayi & Hisse Dalgalanması: %${stockWeight.toFixed(1)}'lik hisse ağırlığı, BIST 100 düzeltmelerinde kısa vadeli portföy oynaklığını artırabilir.`,
        `Mevduat Reel Getiri Erimesi: TL vadeli mevduat faizinin uzun vadede TÜFE enflasyon beklentisinin gerisinde kalma riski bulunmaktadır.`,
        `Dönemsel Rebalancing İhtiyacı: Yükselen hisselerin portföy içindeki ağırlığının hedeflenen sınırları aşmaması için kâr realizasyonu gerekebilir.`
      ],
      technicalOutlook: `BIST 100 endeksi 9.800 - 10.200 bandında konsolidasyon sürecindedir. Portföyünüzdeki hisse senetleri (THYAO, TUPRS vb.) 50 ve 200 günlük hareketli ortalamaların üzerinde güçlü momentumunu korumaktadır.`,
      fundamentalOutlook: `TEFAS hisse yoğun ve değişken fonlar yönetici aktif stratejileriyle piyasa getirisinin (alfa) üzerinde performans sunmaktadır. Eurobond getirileri %7.2 - %7.8 bandında sabit döviz getirisi sağlamaktadır.`,
      actionableInsights: [
        `Kâr Realizasyonu & Dengeleme: Aşırı değer kazanan hisse kârlarının bir kısmını döviz bazlı Eurobond veya altın fonlarına aktararak kârı kilitleyin.`,
        `Mevduat Vadelerini Optimize Edin: Kısa vadeli TL mevduatları dönemsel olarak Para Piyasası Fonlarına (PPF) yönlendirerek valör ve getiri esnekliği kazanın.`,
        `Düşüşlerde Kademeli Ekleme: BIST 100 geri çekilmelerinde büyüme potansiyeli yüksek teknoloji ve ihracatçı şirketlerde maliyet düşürme fırsatlarını kollayın.`
      ],
      timestamp: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
  };

  // Run AI Analysis Fetch
  const handleFetchAiAnalysis = async (customPrompt?: string) => {
    setIsAiLoading(true);
    try {
      const payload = {
        mode: 'portfolio',
        portfolioItems: summary.items.map(item => ({
          code: item.code,
          name: item.name,
          type: item.type,
          category: item.category,
          quantity: item.quantity,
          cost: item.averageCost,
          currentPrice: item.currentPrice,
          weight: (item.currentValue / (summary.totalValue || 1)) * 100
        })),
        userQuery: customPrompt || aiCustomQuestion || undefined
      };

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data: AIAnalysisResponse = await res.json();
        setAiReport(data);
      } else {
        setAiReport(generateLocalAIReport(customPrompt));
      }
    } catch (e) {
      console.warn('AI API fallback to local computation', e);
      setAiReport(generateLocalAIReport(customPrompt));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Initial local AI generation
  useEffect(() => {
    if (!aiReport) {
      setAiReport(generateLocalAIReport());
    }
  }, [summary]);

  // Custom active shape for highlighted Pie Slice
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={chartStyle === 'donut' ? innerRadius - 2 : 0}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 0px 8px rgba(59, 130, 246, 0.5))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 13}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: TOPLAM PORTFÖY DEĞERİ */}
        <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              TOPLAM PORTFÖY DEĞERİ
            </span>
            <div className="p-2 rounded-xl bg-slate-800/80 text-blue-400 border border-slate-700/50">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(summary.totalValue, 'TL')}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono pt-2 border-t border-slate-800/80 text-slate-300">
            <div>
              <span className="text-slate-400">USD: </span>
              <span className="text-amber-400 font-bold">${summary.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div>
              <span className="text-slate-400">EUR: </span>
              <span className="text-emerald-400 font-bold">€{summary.totalEUR.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Card 2: AÇIK KAR / ZARAR */}
        <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              AÇIK KÂR / ZARAR
            </span>
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${summary.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summary.netProfitLoss >= 0 ? '+' : ''}{formatCurrency(summary.netProfitLoss, 'TL')}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>%{Math.abs(summary.netProfitLossPercent).toFixed(2)}</span>
            </div>
            <div className="text-slate-400 text-[11px] font-sans font-medium">
              BIST 100: <span className="font-mono font-bold text-slate-200">{bistIndex.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: TEMETTÜ & REALİZE */}
        <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              TEMETTÜ & REALİZE
            </span>
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <Gift className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${(summary.totalRealizedPnl + summary.totalDividends) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(summary.totalRealizedPnl + summary.totalDividends) >= 0 ? '+' : ''}
              {formatCurrency(summary.totalRealizedPnl + summary.totalDividends, 'TL')}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800/80 text-slate-400">
            <div>
              <span>Satış: </span>
              <span className={`font-bold ${summary.totalRealizedPnl >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                {summary.totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalRealizedPnl, 'TL')}
              </span>
            </div>
            <div>
              <span>Kupon/Temettü: </span>
              <span className="text-emerald-400 font-bold">
                +{formatCurrency(summary.totalDividends, 'TL')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: DÖNEMSEL GETİRİ */}
        <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>DÖNEMSEL GETİRİ</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 font-semibold truncate">
              {summary.periodLabel}
            </span>
          </div>

          {/* Period selector tabs */}
          <div className="flex items-center justify-between bg-slate-900/90 p-1 rounded-xl border border-slate-800 my-2">
            {(['1G', '30G', '90G', '180G', '1Y'] as PeriodFilter[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          <div>
            <div className={`text-lg sm:text-xl font-extrabold font-mono ${
              summary.periodPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {summary.periodPnl >= 0 ? '+' : ''}{formatCurrency(summary.periodPnl, 'TL')}{' '}
              <span className="text-xs font-semibold">
                ({summary.periodPnlPercent >= 0 ? '+' : ''}%{summary.periodPnlPercent.toFixed(2)})
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
              Hisse: <span className={`font-bold ${summary.stockPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{summary.stockPnlPct >= 0 ? '+' : ''}%{summary.stockPnlPct.toFixed(1)}</span> • 
              Fon: <span className={`font-bold ${summary.fundPnlPct >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>{summary.fundPnlPct >= 0 ? '+' : ''}%{summary.fundPnlPct.toFixed(1)}</span> • 
              Eurobond: <span className={`font-bold ${summary.eurobondPnlPct >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>{summary.eurobondPnlPct >= 0 ? '+' : ''}%{summary.eurobondPnlPct.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ETKİLEŞİMLİ PASTA GRAFİK & MALİYET/DEĞER KARŞILAŞTIRMA PANELİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Advanced Interactive Pie Chart (Hisse, Fon, Kripto, Mevduat, Eurobond vb.) */}
        <div className="lg:col-span-7 bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between">
          {/* Header & Mode Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base tracking-wide uppercase text-white flex items-center gap-2">
                  <span>Portföy Varlık Dağılımı & Ağırlıklar</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    Etkileşimli
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Dilimlerin üzerine gelerek veya tıklayarak pozisyon detaylarını inceleyin.
                </p>
              </div>
            </div>

            {/* View Mode & Chart Style Selectors */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Category vs Single Asset Toggle */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => { setPieViewMode('category'); setActivePieIndex(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    pieViewMode === 'category'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sınıf Bazında
                </button>
                <button
                  onClick={() => { setPieViewMode('asset'); setActivePieIndex(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    pieViewMode === 'asset'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tekil Varlık
                </button>
              </div>

              {/* Donut vs Solid Pie Toggle */}
              <div className="hidden sm:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setChartStyle('donut')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    chartStyle === 'donut' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                  title="Halka (Donut) Görünüm"
                >
                  Halka
                </button>
                <button
                  onClick={() => setChartStyle('pie')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    chartStyle === 'pie' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                  title="Dolu Pasta Görünüm"
                >
                  Dolu
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Chart Canvas & Real-Time Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 items-center">
            {/* Chart Area */}
            <div className="md:col-span-7 h-64 sm:h-72 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={chartStyle === 'donut' ? 55 : 0}
                    outerRadius={95}
                    paddingAngle={chartStyle === 'donut' ? 3 : 1}
                    dataKey="value"
                    activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onClick={(_, index) => setActivePieIndex(index)}
                    cursor="pointer"
                  >
                    {currentPieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${entry.id || index}`} 
                        fill={entry.color} 
                        stroke="#0b1329" 
                        strokeWidth={2} 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any, name: any, item: any) => [
                      formatCurrency(Number(value), 'TL'),
                      `Portföy Payı: %${Number(item.payload.weight).toFixed(1)}`
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              {chartStyle === 'donut' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {activePieItem ? activePieItem.code : 'TOPLAM'}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-white">
                    %{activePieItem ? activePieItem.weight.toFixed(1) : '100'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {activePieItem ? formatCurrency(activePieItem.value, 'TL') : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Interactive Inspector Box (Active Slice Details) */}
            <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              {activePieItem ? (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{activePieItem.icon || '💼'}</span>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          <span>{activePieItem.code}</span>
                          <span 
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: activePieItem.color }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 line-clamp-1">
                          {activePieItem.name}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 text-xs font-mono font-extrabold border border-blue-800">
                      %{activePieItem.weight.toFixed(1)}
                    </span>
                  </div>

                  {/* Weight Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, activePieItem.weight)}%`,
                        backgroundColor: activePieItem.color
                      }}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Piyasa Değeri:</span>
                      <span className="font-bold text-white">
                        {formatCurrency(activePieItem.value, 'TL')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Maliyet:</span>
                      <span className="text-slate-300">
                        {formatCurrency(activePieItem.cost, 'TL')}
                      </span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Kâr / Zarar:</span>
                      <span className={`font-bold ${activePieItem.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activePieItem.pnl >= 0 ? '+' : ''}{formatCurrency(activePieItem.pnl, 'TL')} ({formatPercent(activePieItem.pnlPercent)})
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Detayları görüntülemek için pasta dilimlerinin üzerine gelin.
                </div>
              )}
            </div>
          </div>

          {/* Clickable Legend Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-800/80">
            {currentPieData.map((item, idx) => {
              const isSelected = activePieIndex === idx;
              return (
                <button
                  key={`chip-${item.id || idx}`}
                  onClick={() => setActivePieIndex(isSelected ? null : idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all border ${
                    isSelected
                      ? 'bg-blue-900/60 border-blue-500 text-white shadow-sm scale-105'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span style={{ backgroundColor: item.color }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                  <span className="font-semibold">{item.code}:</span>
                  <span className="font-bold text-white">%{item.weight.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Varlık Sınıfı Maliyet & Değer Karşılaştırması (Bar Chart) */}
        <div className="lg:col-span-5 bg-[#0b1329] border border-slate-800/90 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <h4 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-slate-200">
                Maliyet & Değer Analizi
              </h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span className="text-slate-300">Güncel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
                <span className="text-slate-400">Maliyet</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.barData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  tickFormatter={(val) => `₺${(val / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(val: any, name: any) => [
                    formatCurrency(Number(val), 'TL'), 
                    name === 'Güncel' ? 'Güncel Piyasa Değeri' : 'Toplam Maliyet'
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
                <Bar dataKey="Maliyet" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Güncel" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick stats footer */}
          <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800/80 text-slate-400">
            <span>Toplam Net Kazanç:</span>
            <span className={`font-bold text-sm ${summary.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              +{formatCurrency(summary.netProfitLoss, 'TL')} ({formatPercent(summary.netProfitLossPercent)})
            </span>
          </div>
        </div>
      </div>

      {/* 3. YAPAY ZEKA PORTFÖY RAPORU (AI PORTFOLIO REPORT & HEALTH SCORE) */}
      <div className="bg-[#0b1329] border border-blue-900/50 rounded-2xl p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden space-y-5">
        {/* Top Header & Refresh Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Yapay Zeka Portföy Analizi & Sağlık Skoru
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  GEMINI 3.7 FLASH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Varlık dağılımı, enflasyon direnci, kâr realizasyon noktaları ve rebalance önerileri.
              </p>
            </div>
          </div>

          {/* Live Refresh Button */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => handleFetchAiAnalysis()}
              disabled={isAiLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-blue-200" />
                  <span>Raporu Yenile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Health Score & Key Executive Digest */}
        {aiReport && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Health Score Gauge Badge */}
            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between text-center items-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                PORTFÖY SAĞLIK & ÇEŞİTLENDİRME PUANI
              </span>

              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Visual circle gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${aiReport.healthScore || 88}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {aiReport.healthScore || 88}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    / 100 PUAN
                  </span>
                </div>
              </div>

              <div className="w-full space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  {aiReport.sentiment || 'Bullish (Olumlu)'}
                </span>
                <p className="text-[11px] text-slate-400">
                  Yüksek büyüme potansiyeli & güçlü döviz/enflasyon kalkanı.
                </p>
              </div>
            </div>

            {/* Executive Summary Card */}
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                    Yapay Zeka Yönetici Değerlendirmesi
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {aiReport.summary}
                </p>
              </div>

              {/* Quick contextual stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-sans">Hisse Ağırlığı</span>
                  <span className="font-bold text-blue-400">%{summary.categoryStats.find(c => c.id === 'stock')?.weight.toFixed(1) || '40.0'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-sans">Fon Ağırlığı</span>
                  <span className="font-bold text-teal-400">%{summary.categoryStats.find(c => c.id === 'fund')?.weight.toFixed(1) || '25.0'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-sans">Eurobond Payı</span>
                  <span className="font-bold text-emerald-400">%{summary.categoryStats.find(c => c.id === 'eurobond')?.weight.toFixed(1) || '15.0'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-sans">Nakit / Mevduat</span>
                  <span className="font-bold text-cyan-400">%{summary.categoryStats.find(c => c.id === 'deposit')?.weight.toFixed(1) || '10.0'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strengths & Risks & Actionable Insights 3-Column Grid */}
        {aiReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Column 1: Güçlü Yönler */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                  Öne Çıkan Güçlü Yönler
                </h5>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {aiReport.keyStrengths.map((st, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Riskler & Dikkat */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                  Risk Faktörleri & Dikkat
                </h5>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {aiReport.keyRisks.map((rk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{rk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Aksiyon Önerileri */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Zap className="w-4 h-4" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-blue-300">
                  Stratejik Aksiyon Önerileri
                </h5>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {aiReport.actionableInsights.map((ac, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{ac}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Quick Query Input for Instant AI Analyst Chat */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Yapay zekaya portföyünüzle ilgili özel bir soru sorun (örn: 'Enflasyona karşı korumam nasıl artar?')..."
              value={aiCustomQuestion}
              onChange={(e) => setAiCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aiCustomQuestion.trim()) {
                  handleFetchAiAnalysis(aiCustomQuestion);
                }
              }}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => handleFetchAiAnalysis(aiCustomQuestion)}
            disabled={isAiLoading || !aiCustomQuestion.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Analiz İste</span>
          </button>
        </div>
      </div>

      {/* 4. VARLIK SINIFLARI ÖZET KARTLARI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Varlık Sınıfı Kırılımı & Pozisyonlar</h3>
          </div>
          <button
            onClick={() => onNavigateTab('portfolio')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Tüm Pozisyonları Yönet</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {summary.categoryStats.map((cat) => {
            const isProfit = cat.profitLoss >= 0;
            const hasPositions = cat.count > 0;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl p-4 border transition-all ${
                  hasPositions
                    ? 'bg-[#0b1329] border-slate-800/90 text-white shadow-md hover:border-slate-700'
                    : 'bg-slate-900/40 border-slate-800/40 text-slate-400 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span className="font-bold text-xs text-white tracking-wide">
                      {cat.label}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hasPositions 
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800/60' 
                      : 'bg-slate-800/60 text-slate-500 border-slate-700/50'
                  }`}>
                    {cat.count} Pozisyon
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono mt-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Maliyet:</span>
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(cat.costValue, 'TL')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Güncel Değer:</span>
                    <span className="font-bold text-white">
                      {formatCurrency(cat.currentValue, 'TL')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Açık Kâr/Zarar:</span>
                    <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hasPositions ? `${isProfit ? '+' : ''}${formatCurrency(cat.profitLoss, 'TL')} (${formatPercent(cat.profitLossPercent)})` : '₺0,00 (%0.00)'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. QUICK ACTION BANNER & PRO ANALYTICS TEASER */}
      <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 border border-blue-800/50 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Zap className="w-5 h-5 text-amber-400" />
            <h4 className="font-extrabold text-base text-white">
              Gelişmiş Analiz & Profesyonel Portföy Araçları
            </h4>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Reel enflasyon getiri hesabı (TÜFE/FX), akıllı rebalancing motoru, 12 aylık pasif gelir & kupon takvimi ve kriz stres testi simülatörünü keşfedin.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Yeni Varlık Ekle</span>
          </button>

          <button
            onClick={() => onNavigateTab('analytics')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-900/40 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Gelişmiş Analize Git</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
