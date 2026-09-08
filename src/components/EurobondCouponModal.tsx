import React, { useState, useMemo } from 'react';
import { 
  EurobondCouponPayment, 
  PortfolioItem, 
  MarketIndex 
} from '../types';
import { 
  calculateEurobondDetails, 
  generateEurobondCouponSchedule 
} from '../data/assetCategoriesData';
import { 
  Globe, 
  Calendar, 
  DollarSign, 
  Coins, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  Percent, 
  Wallet,
  Check
} from 'lucide-react';

interface EurobondCouponModalProps {
  item: PortfolioItem;
  indices?: MarketIndex[];
  onClose: () => void;
  onSaveEurobond: (updatedItem: PortfolioItem) => void;
}

export const EurobondCouponModal: React.FC<EurobondCouponModalProps> = ({
  item,
  indices = [],
  onClose,
  onSaveEurobond,
}) => {
  // Live rates from indices or fallback
  const usdRate = indices.find(i => i.code === 'USDTRY')?.value || 36.82;
  const eurRate = indices.find(i => i.code === 'EURTRY')?.value || 38.65;

  const rawCurr = (item.nominalCurrency || item.currency || (item.code.toUpperCase().includes('EUR') ? 'EUR' : 'USD')).toUpperCase();
  const [currency, setCurrency] = useState<'USD' | 'EUR'>(rawCurr === 'EUR' ? 'EUR' : 'USD');
  const [nominalAmount, setNominalAmount] = useState<number>(Number(item.nominalAmount || item.quantity || 1000));
  const [priceInCurrency, setPriceInCurrency] = useState<number>(Number(item.priceInCurrency ?? 100.0));
  const [buyExchangeRate, setBuyExchangeRate] = useState<number>(Number(item.buyExchangeRate || (rawCurr === 'EUR' ? eurRate : usdRate)));
  const [couponRateAnnual, setCouponRateAnnual] = useState<number>(Number(item.couponRateAnnual ?? item.interestRate ?? 7.625));
  const [couponFrequency, setCouponFrequency] = useState<number>(Number(item.couponFrequency || 2));
  const [maturityDate, setMaturityDate] = useState<string>(item.maturityDate || '2030-03-25');
  const [addedDate, setAddedDate] = useState<string>(item.addedDate || '2024-01-15');

  const currentFxRate = currency === 'EUR' ? eurRate : usdRate;
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  // State of coupons
  const [coupons, setCoupons] = useState<EurobondCouponPayment[]>(() => {
    if (item.couponPayments && item.couponPayments.length > 0) {
      return item.couponPayments;
    }
    // Auto-generate initial schedule
    const autoSchedule = generateEurobondCouponSchedule(
      item.nominalAmount || item.quantity || 1000,
      currency,
      item.couponRateAnnual ?? item.interestRate ?? 7.625,
      item.couponFrequency || 2,
      item.addedDate || '2024-01-15',
      item.maturityDate || '2030-03-25',
      currentFxRate
    );
    return autoSchedule.map(s => ({
      id: s.id,
      paymentDate: s.paymentDate,
      couponRateAnnual: item.couponRateAnnual ?? item.interestRate ?? 7.625,
      amountInCurrency: s.amountInCurrency,
      currency: s.currency,
      exchangeRate: s.isPaid ? (item.buyExchangeRate || currentFxRate) : currentFxRate,
      amountInTRY: s.amountInTRY,
      isPaid: s.isPaid,
      periodLabel: s.periodLabel
    }));
  });

  // New coupon form state
  const [isAddingNewCoupon, setIsAddingNewCoupon] = useState(false);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newAmountFX, setNewAmountFX] = useState<number>(() => {
    return Number((nominalAmount * (couponRateAnnual / 100) / couponFrequency).toFixed(2));
  });
  const [newFxRate, setNewFxRate] = useState<number>(currentFxRate);
  const [newIsPaid, setNewIsPaid] = useState<boolean>(true);
  const [newLabel, setNewLabel] = useState<string>('Manuel Kupon Tahsilatı');

  // Calculations
  const calculations = useMemo(() => {
    return calculateEurobondDetails(
      {
        nominalCurrency: currency,
        currency,
        nominalAmount,
        priceInCurrency,
        buyExchangeRate,
        couponRateAnnual,
        couponFrequency,
        addedDate,
        couponPayments: coupons,
        code: item.code
      },
      usdRate,
      eurRate
    );
  }, [currency, nominalAmount, priceInCurrency, buyExchangeRate, couponRateAnnual, couponFrequency, addedDate, coupons, usdRate, eurRate, item.code]);

  // Handle regenerating schedule
  const handleRegenerateSchedule = () => {
    if (!window.confirm('Kupon takvimi girdiğiniz vade ve parametrelere göre otomatik olarak baştan oluşturulacak. Devam edilsin mi?')) {
      return;
    }
    const autoSchedule = generateEurobondCouponSchedule(
      nominalAmount,
      currency,
      couponRateAnnual,
      couponFrequency,
      addedDate,
      maturityDate,
      currentFxRate
    );
    const newCoupons: EurobondCouponPayment[] = autoSchedule.map(s => ({
      id: s.id,
      paymentDate: s.paymentDate,
      couponRateAnnual,
      amountInCurrency: s.amountInCurrency,
      currency,
      exchangeRate: s.isPaid ? buyExchangeRate : currentFxRate,
      amountInTRY: Number((s.amountInCurrency * (s.isPaid ? buyExchangeRate : currentFxRate)).toFixed(2)),
      isPaid: s.isPaid,
      periodLabel: s.periodLabel
    }));
    setCoupons(newCoupons);
  };

  // Toggle paid status
  const handleTogglePaid = (couponId: string) => {
    setCoupons(prev => prev.map(c => {
      if (c.id === couponId) {
        const nextPaid = !c.isPaid;
        const rateToUse = c.exchangeRate || currentFxRate;
        return {
          ...c,
          isPaid: nextPaid,
          exchangeRate: rateToUse,
          amountInTRY: Number((c.amountInCurrency * rateToUse).toFixed(2)),
          paidDate: nextPaid ? (c.paidDate || new Date().toISOString().split('T')[0]) : undefined
        };
      }
      return c;
    }));
  };

  // Delete a coupon
  const handleDeleteCoupon = (couponId: string) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId));
  };

  // Add custom coupon
  const handleAddCustomCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: EurobondCouponPayment = {
      id: `cp-custom-${Date.now()}`,
      paymentDate: newDate,
      couponRateAnnual,
      amountInCurrency: Number(newAmountFX),
      currency,
      exchangeRate: Number(newFxRate),
      amountInTRY: Number((newAmountFX * newFxRate).toFixed(2)),
      isPaid: newIsPaid,
      periodLabel: newLabel.trim() || 'Kupon Ödemesi',
      paidDate: newIsPaid ? newDate : undefined
    };
    setCoupons(prev => [...prev, newEntry].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)));
    setIsAddingNewCoupon(false);
  };

  // Save all changes to portfolio item
  const handleSaveAll = () => {
    const updated: PortfolioItem = {
      ...item,
      category: 'eurobond',
      nominalCurrency: currency,
      currency: currency,
      nominalAmount: Number(nominalAmount),
      quantity: Number(nominalAmount),
      priceInCurrency: Number(priceInCurrency),
      buyExchangeRate: Number(buyExchangeRate),
      couponRateAnnual: Number(couponRateAnnual),
      interestRate: Number(couponRateAnnual),
      couponFrequency: Number(couponFrequency),
      maturityDate: maturityDate || undefined,
      addedDate: addedDate || item.addedDate,
      // Computed TRY fields for seamless portfolio aggregation
      averageCost: Number((nominalAmount * (priceInCurrency / 100) * buyExchangeRate / nominalAmount).toFixed(4)),
      currentPrice: Number(((priceInCurrency / 100) * currentFxRate).toFixed(4)),
      couponPayments: coupons,
      totalCollectedCouponCurrency: calculations.totalCollectedCouponCurrency,
      totalCollectedCouponTRY: calculations.totalCollectedCouponTRY
    };

    onSaveEurobond(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl border border-teal-200/80 dark:border-teal-900/60 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 dark:bg-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-300 dark:border-teal-700">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 text-xs font-mono font-black border border-teal-300 dark:border-teal-800">
                  {item.code}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                  <Coins className="w-3 h-3" />
                  <span>Döviz Cinsi: {currency} ({currencySymbol})</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                  Canlı Kur: 1 {currency} = {currentFxRate.toFixed(2)} ₺
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {item.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Eurobond Döviz Cinsi Pozisyon, Canlı Kur Çevrimi ve Dönemsel Kupon Getirisi Takip Sistemi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* Top Quick Parameters Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Eurobond Temel Parametreleri</span>
              </span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                Değişiklikler canlı olarak TL ve Kupon tablosuna yansır
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Currency Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Para Birimi</label>
                <select
                  value={currency}
                  onChange={(e) => {
                    const newC = e.target.value as 'USD' | 'EUR';
                    setCurrency(newC);
                    setBuyExchangeRate(newC === 'EUR' ? eurRate : usdRate);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="USD">USD ($) Dolar</option>
                  <option value="EUR">EUR (€) Euro</option>
                </select>
              </div>

              {/* Nominal Amount */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Nominal Tutar ({currencySymbol})</label>
                <input
                  type="number"
                  step="100"
                  value={nominalAmount}
                  onChange={(e) => setNominalAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Price in Currency % */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Fiyat (% Nominal)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceInCurrency}
                  onChange={(e) => setPriceInCurrency(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Buy FX Rate */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Alış Kuru ({currency}/TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyExchangeRate}
                  onChange={(e) => setBuyExchangeRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Coupon Rate */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Yıllık Kupon %</label>
                <input
                  type="number"
                  step="0.001"
                  value={couponRateAnnual}
                  onChange={(e) => setCouponRateAnnual(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Coupon Frequency */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Kupon Sıklığı</label>
                <select
                  value={couponFrequency}
                  onChange={(e) => setCouponFrequency(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value={2}>6 Aylık (2 Kupon/Yıl)</option>
                  <option value={1}>Yıllık (1 Kupon/Yıl)</option>
                  <option value={4}>3 Aylık (4 Kupon/Yıl)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Value and Yield Summary Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Güncel Değer ($ / € -> TL) */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 space-y-1">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                Güncel Portföy Değeri
              </span>
              <div className="text-xl font-black text-teal-900 dark:text-teal-100 font-mono">
                {calculations.currentValueInTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <div className="text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1 font-mono">
                <span>{currencySymbol}{calculations.currentValueInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-500 font-normal">(@ {currentFxRate.toFixed(2)} ₺)</span>
              </div>
            </div>

            {/* Toplam Maliyet & Net Kâr/Zarar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Toplam Maliyet & Net K/Z
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {calculations.costInTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <div className={`text-xs font-bold font-mono flex items-center gap-1 ${calculations.netProfitLossTRY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                <span>{calculations.netProfitLossTRY >= 0 ? '+' : ''}{calculations.netProfitLossTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                <span>({calculations.netProfitLossPercent >= 0 ? '+' : ''}{calculations.netProfitLossPercent.toFixed(2)}%)</span>
              </div>
            </div>

            {/* Dönemsel & Yıllık Kupon Getirisi */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Dönem Başına Kupon ({calculations.frequencyLabel})
              </span>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
                {calculations.periodCouponTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {currencySymbol}{calculations.periodCouponCurrency.toFixed(2)} / Dönem (Yıllık: {currencySymbol}{calculations.annualCouponCurrency.toFixed(2)})
              </div>
            </div>

            {/* Toplam Tahsil Edilen Kuponlar */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1">
              <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">
                Tahsil Edilen Kupon Toplamı
              </span>
              <div className="text-xl font-black text-indigo-900 dark:text-indigo-100 font-mono">
                {calculations.totalCollectedCouponTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </div>
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                {currencySymbol}{calculations.totalCollectedCouponCurrency.toFixed(2)} nakit tahsil edildi
              </div>
            </div>
          </div>

          {/* Return Breakdown Explanatory Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Eurobond Toplam Getiri Ayrıştırması (Kur Farkı + Fiyat Değişimi + Kupon Geliri)</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Toplam Bileşik Getiri: +{calculations.totalOverallReturnTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ (+{calculations.totalOverallReturnPercent.toFixed(2)}%)
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block font-medium">1. Kur Farkı Getirisi (FX Gain)</span>
                <span className="font-bold font-mono text-indigo-200">
                  +{calculations.fxGainTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Alış: {buyExchangeRate.toFixed(2)} ₺ ➔ Güncel: {currentFxRate.toFixed(2)} ₺</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block font-medium">2. Tahsil Edilen Kuponlar</span>
                <span className="font-bold font-mono text-emerald-300">
                  +{calculations.totalCollectedCouponTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Tahsil edilen toplam kupon nakit girişi</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block font-medium">3. Birikmiş Kupon Faizi (Accrued)</span>
                <span className="font-bold font-mono text-amber-300">
                  +{calculations.accruedInterestTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Son kupondan bu yana biriken {currencySymbol}{calculations.accruedInterestCurrency.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Coupon Cashflow & Payment Schedule Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Dönemsel Kupon Getirileri & Kupon Ödeme Takvimi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tarih bazında kupon tahsilatlarınızı yönetin, ödendi olarak işaretleyin veya manuel ekleyin
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateSchedule}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-colors"
                  title="Vade tarihine kadar periyodik takvimi otomatik yeniler"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Takvimi Otomatik Doldur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingNewCoupon(!isAddingNewCoupon)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Özel Kupon Ekle</span>
                </button>
              </div>
            </div>

            {/* New Coupon Input Form */}
            {isAddingNewCoupon && (
              <form onSubmit={handleAddCustomCoupon} className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in duration-150">
                <div className="font-bold text-xs text-indigo-900 dark:text-indigo-300">
                  Yeni Kupon Ödemesi Ekle
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Ödeme Tarihi</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Kupon Tutarı ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAmountFX}
                      onChange={(e) => setNewAmountFX(Number(e.target.value))}
                      required
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">İşlem / Tahsil Kuru (TL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newFxRate}
                      onChange={(e) => setNewFxRate(Number(e.target.value))}
                      required
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Kupon Açıklaması</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="örn: 2026 / 1. Kupon"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newIsPaid}
                      onChange={(e) => setNewIsPaid(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Bu kupon tahsil edildi (Ödendi)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCoupon(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      Kuponu Listeye Ekle
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Coupons List Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700/80">
                    <tr>
                      <th className="py-2.5 px-3">Kupon Dönemi & Tarih</th>
                      <th className="py-2.5 px-3 text-right">Döviz Tutarı</th>
                      <th className="py-2.5 px-3 text-right">Kur (TL)</th>
                      <th className="py-2.5 px-3 text-right">TL Karşılığı</th>
                      <th className="py-2.5 px-3 text-center">Durum / Tahsilat</th>
                      <th className="py-2.5 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Henüz kupon takvimi eklenmedi. Yukarıdaki <strong>"Takvimi Otomatik Doldur"</strong> butonuyla oluşturabilirsiniz.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr 
                          key={coupon.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${coupon.isPaid ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''}`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {coupon.isPaid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span>{coupon.periodLabel || 'Dönemsel Kupon'}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {coupon.paymentDate}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {currencySymbol}{coupon.amountInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {(coupon.exchangeRate || currentFxRate).toFixed(2)} ₺
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {(coupon.amountInTRY || (coupon.amountInCurrency * (coupon.exchangeRate || currentFxRate))).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(coupon.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                coupon.isPaid
                                  ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {coupon.isPaid ? '✓ Tahsil Edildi' : '○ Tahsil Et'}
                            </button>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Kuponu Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:block">
            Eurobond ve Kupon verileri portföy ağırlıklı maliyet ve toplam varlık hesaplamasına anlık dahil edilir.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Değişiklikleri Portföye Kaydet</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
