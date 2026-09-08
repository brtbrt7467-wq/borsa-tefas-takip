import { PortfolioCategory } from '../types';

export interface CategoryMeta {
  id: PortfolioCategory;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
  unitLabel: string;
}

export const PORTFOLIO_CATEGORIES: CategoryMeta[] = [
  {
    id: 'stock',
    label: 'Hisse Senedi (BIST)',
    shortLabel: 'Hisse',
    iconName: 'TrendingUp',
    color: '#3b82f6',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Borsa İstanbul pay senetleri ve hisseler',
    unitLabel: 'Lot'
  },
  {
    id: 'fund',
    label: 'Yatırım Fonu (TEFAS)',
    shortLabel: 'TEFAS Fon',
    iconName: 'Layers',
    color: '#10b981',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Menkul kıymet, hisse, para piyasası ve borçlanma fonları',
    unitLabel: 'Pay'
  },
  {
    id: 'bes',
    label: 'BES / Emeklilik Fonları (BEFAS)',
    shortLabel: 'BES Fonu',
    iconName: 'ShieldCheck',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Bireysel Emeklilik Sistemi (BES) ve Otomatik Katılım fonları',
    unitLabel: 'Pay'
  },
  {
    id: 'bond',
    label: 'Bono & Devlet Tahvili (DİBS)',
    shortLabel: 'Bono / Tahvil',
    iconName: 'FileText',
    color: '#0284c7',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-400',
    borderColor: 'border-sky-200 dark:border-sky-800',
    description: 'Hazine bonoları, devlet iç borçlanma senetleri ve özel sektör tahvilleri',
    unitLabel: 'Nominal / Adet'
  },
  {
    id: 'eurobond',
    label: 'Eurobond (Döviz Cinsi Tahvil)',
    shortLabel: 'Eurobond',
    iconName: 'Globe',
    color: '#0d9488',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60',
    badgeText: 'text-teal-700 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800',
    description: 'T.C. Hazine ve kurumsal USD/EUR cinsi Eurobond kuponlu tahviller',
    unitLabel: 'Nominal ($ / €)'
  },
  {
    id: 'crypto',
    label: 'Kripto Varlıklar',
    shortLabel: 'Kripto',
    iconName: 'Coins',
    color: '#f59e0b',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Bitcoin, Ethereum ve dijital kripto varlıklar',
    unitLabel: 'Adet'
  },
  {
    id: 'deposit',
    label: 'Vadeli Mevduat & Faiz',
    shortLabel: 'Mevduat',
    iconName: 'Landmark',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60',
    badgeText: 'text-cyan-700 dark:text-cyan-400',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'TL / Döviz vadeli mevduat, gecelik repo ve faiz getirisi',
    unitLabel: 'TL Ana Para'
  },
  {
    id: 'gold_fx',
    label: 'Altın & Döviz / Emtia',
    shortLabel: 'Altın & Döviz',
    iconName: 'Sparkles',
    color: '#eab308',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/60',
    badgeText: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Fiziki veya banka gram altın, gümüş, USD ve EUR',
    unitLabel: 'Gram / Birim'
  },
  {
    id: 'other',
    label: 'Diğer Varlıklar',
    shortLabel: 'Diğer',
    iconName: 'HelpCircle',
    color: '#64748b',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
    description: 'Gayrimenkul, özel fon veya diğer alternatif yatırımlar',
    unitLabel: 'Adet'
  }
];

export interface PresetAsset {
  code: string;
  name: string;
  category: PortfolioCategory;
  defaultPrice: number;
  defaultCost?: number;
  unit: string;
  interestRate?: number;
  currency?: string;
  nominalCurrency?: 'USD' | 'EUR' | 'TL';
  couponRateAnnual?: number;
  couponFrequency?: number;
  priceInCurrency?: number; // % of nominal e.g. 100.25
  maturityDate?: string;
}

export const PRESET_CUSTOM_ASSETS: PresetAsset[] = [
  // BES / BEFAS Emeklilik Fonları
  {
    code: 'AEA',
    name: 'Anadolu Hayat Emeklilik Altın Emeklilik Yatırım Fonu',
    category: 'bes',
    defaultPrice: 0.3842,
    unit: 'Pay'
  },
  {
    code: 'HEF',
    name: 'Halk Hayat ve Emeklilik BIST 30 Endeksi Emeklilik Fonu',
    category: 'bes',
    defaultPrice: 1.1245,
    unit: 'Pay'
  },
  {
    code: 'VEF',
    name: 'Vakıf Emeklilik Değişken Emeklilik Yatırım Fonu',
    category: 'bes',
    defaultPrice: 0.8920,
    unit: 'Pay'
  },
  {
    code: 'AGB',
    name: 'AgeSA Hayat ve Emeklilik Para Piyasası Emeklilik Fonu',
    category: 'bes',
    defaultPrice: 0.4512,
    unit: 'Pay'
  },
  {
    code: 'CHH',
    name: 'Cigna Sağlık Hayat Hisse Senedi Emeklilik Fonu',
    category: 'bes',
    defaultPrice: 2.1450,
    unit: 'Pay'
  },
  {
    code: 'GEA',
    name: 'Garanti Emeklilik ve Hayat Altın Emeklilik Fonu',
    category: 'bes',
    defaultPrice: 0.5120,
    unit: 'Pay'
  },
  {
    code: 'OKS-STD',
    name: 'Otomatik Katılım Standart Emeklilik Fonu (OKS)',
    category: 'bes',
    defaultPrice: 0.2850,
    unit: 'Pay'
  },

  // Kripto Varlıklar
  {
    code: 'BTC',
    name: 'Bitcoin (BTC / TRY)',
    category: 'crypto',
    defaultPrice: 3280000,
    unit: 'BTC',
    currency: 'TL'
  },
  {
    code: 'ETH',
    name: 'Ethereum (ETH / TRY)',
    category: 'crypto',
    defaultPrice: 94500,
    unit: 'ETH',
    currency: 'TL'
  },
  {
    code: 'SOL',
    name: 'Solana (SOL / TRY)',
    category: 'crypto',
    defaultPrice: 6520,
    unit: 'SOL',
    currency: 'TL'
  },
  {
    code: 'AVAX',
    name: 'Avalanche (AVAX / TRY)',
    category: 'crypto',
    defaultPrice: 990,
    unit: 'AVAX',
    currency: 'TL'
  },
  {
    code: 'USDT',
    name: 'Tether USD (USDT / TRY)',
    category: 'crypto',
    defaultPrice: 34.25,
    unit: 'USDT',
    currency: 'TL'
  },
  {
    code: 'XRP',
    name: 'Ripple (XRP / TRY)',
    category: 'crypto',
    defaultPrice: 21.80,
    unit: 'XRP',
    currency: 'TL'
  },

  // Mevduat & Faiz
  {
    code: 'TL-MEVDUAT',
    name: 'TL Vadeli Mevduat Hesabı (32 Günlük %48.50 Faiz)',
    category: 'deposit',
    defaultPrice: 1.0,
    interestRate: 48.5,
    unit: 'TL'
  },
  {
    code: 'GECELIK-FAIZ',
    name: 'Günlük Gecelik Faiz / N Kolay / Marifetli Hesap (%47)',
    category: 'deposit',
    defaultPrice: 1.0,
    interestRate: 47.0,
    unit: 'TL'
  },
  {
    code: 'USD-MEVDUAT',
    name: 'Döviz Tevdiat Hesabı (USD Vadeli %3.5 Faiz)',
    category: 'deposit',
    defaultPrice: 34.25,
    interestRate: 3.5,
    unit: 'USD',
    currency: 'USD'
  },

  // Altın & Döviz
  {
    code: 'GRAM-ALTIN',
    name: 'Gram Altın (24 Ayar Has Altın TL)',
    category: 'gold_fx',
    defaultPrice: 2985.50,
    unit: 'Gram'
  },
  {
    code: 'CEYREK',
    name: 'Çeyrek Altın (Yeni Tarihli)',
    category: 'gold_fx',
    defaultPrice: 4880.00,
    unit: 'Adet'
  },
  {
    code: 'USDTRY',
    name: 'Amerikan Doları (USD / TRY)',
    category: 'gold_fx',
    defaultPrice: 34.25,
    unit: 'USD'
  },
  {
    code: 'EURTRY',
    name: 'Euro (EUR / TRY)',
    category: 'gold_fx',
    defaultPrice: 37.15,
    unit: 'EUR'
  },
  {
    code: 'GUMUS',
    name: 'Gram Gümüş (GUMUS / TRY)',
    category: 'gold_fx',
    defaultPrice: 34.80,
    unit: 'Gram'
  },

  // Bono & Devlet Tahvili (DİBS)
  {
    code: 'TRT-TAHVIL',
    name: 'T.C. Hazine 2 Yıllık Gösterge Devlet Tahvili (%42.50 Yıllık Bileşik Faiz)',
    category: 'bond',
    defaultPrice: 100.0,
    interestRate: 42.5,
    unit: 'Nominal'
  },
  {
    code: 'TRT-BONO',
    name: 'T.C. Hazine 6 Aylık Hazine Bonosu (%44.00 Yıllık Basit Faiz)',
    category: 'bond',
    defaultPrice: 95.0,
    interestRate: 44.0,
    unit: 'Nominal'
  },
  {
    code: 'OST-TAHVIL',
    name: 'Özel Sektör Şirket Tahvili (%49.50 Yıllık Kuponlu)',
    category: 'bond',
    defaultPrice: 100.0,
    interestRate: 49.5,
    unit: 'Nominal'
  },

  // Eurobond (Döviz Cinsi Tahviller)
  {
    code: 'TR-EUROBOND-2030',
    name: 'T.C. Hazine USD Eurobond 2030 (%7.625 Yıllık Kupon Getirisi)',
    category: 'eurobond',
    defaultPrice: 3682.0, // approx in TL
    priceInCurrency: 100.25, // %100.25 of nominal
    interestRate: 7.625,
    couponRateAnnual: 7.625,
    couponFrequency: 2, // 6 Aylık (Yılda 2 kupon)
    unit: 'Nominal ($)',
    currency: 'USD',
    nominalCurrency: 'USD',
    maturityDate: '2030-03-25'
  },
  {
    code: 'TR-EUROBOND-2034',
    name: 'T.C. Hazine USD Eurobond 2034 (%8.125 Yıllık Kupon Getirisi)',
    category: 'eurobond',
    defaultPrice: 3720.0,
    priceInCurrency: 101.50,
    interestRate: 8.125,
    couponRateAnnual: 8.125,
    couponFrequency: 2, // 6 Aylık
    unit: 'Nominal ($)',
    currency: 'USD',
    nominalCurrency: 'USD',
    maturityDate: '2034-01-15'
  },
  {
    code: 'TR-EUROBOND-EUR',
    name: 'T.C. Hazine EUR Eurobond 2028 (%4.750 Yıllık Kupon Getirisi)',
    category: 'eurobond',
    defaultPrice: 3865.0,
    priceInCurrency: 99.80,
    interestRate: 4.75,
    couponRateAnnual: 4.75,
    couponFrequency: 1, // Yıllık
    unit: 'Nominal (€)',
    currency: 'EUR',
    nominalCurrency: 'EUR',
    maturityDate: '2028-04-18'
  },
  {
    code: 'TR-EUROBOND-2027',
    name: 'T.C. Hazine USD Eurobond 2027 (%9.875 Yıllık Kupon Getirisi)',
    category: 'eurobond',
    defaultPrice: 3850.0,
    priceInCurrency: 104.50,
    interestRate: 9.875,
    couponRateAnnual: 9.875,
    couponFrequency: 2,
    unit: 'Nominal ($)',
    currency: 'USD',
    nominalCurrency: 'USD',
    maturityDate: '2027-11-14'
  },
  {
    code: 'TR-EUROBOND-EUR-2030',
    name: 'T.C. Hazine EUR Eurobond 2030 (%5.875 Yıllık Kupon Getirisi)',
    category: 'eurobond',
    defaultPrice: 3910.0,
    priceInCurrency: 101.20,
    interestRate: 5.875,
    couponRateAnnual: 5.875,
    couponFrequency: 1,
    unit: 'Nominal (€)',
    currency: 'EUR',
    nominalCurrency: 'EUR',
    maturityDate: '2030-06-26'
  }
];

export function getCategoryMeta(category?: PortfolioCategory): CategoryMeta {
  const cat = PORTFOLIO_CATEGORIES.find(c => c.id === category);
  return cat || PORTFOLIO_CATEGORIES[0];
}

// Calculate accrued interest for deposit / vadeli hesap based on days elapsed
export function calculateDepositCurrentValue(
  principal: number,
  interestRateAnnual: number,
  daysElapsed: number
): { currentValue: number; accruedInterest: number } {
  if (!principal || !interestRateAnnual || daysElapsed <= 0) {
    return { currentValue: principal || 0, accruedInterest: 0 };
  }
  // Standard simple interest: Principal * (Rate / 100) * (Days / 365)
  // Minus ~%7.5 stopaj for TL deposit
  const grossInterest = principal * (interestRateAnnual / 100) * (daysElapsed / 365);
  const netInterest = grossInterest * 0.925; // 7.5% withholding tax
  return {
    currentValue: principal + netInterest,
    accruedInterest: netInterest
  };
}

export interface EurobondCalculationResult {
  currency: 'USD' | 'EUR';
  currencySymbol: string;
  nominalAmount: number;
  priceInCurrencyPercent: number;
  currentFxRate: number;
  buyFxRate: number;
  couponRateAnnual: number;
  couponFrequency: number;
  frequencyLabel: string;
  costInCurrency: number;
  costInTRY: number;
  currentValueInCurrency: number;
  currentValueInTRY: number;
  netProfitLossTRY: number;
  netProfitLossPercent: number;
  fxGainTRY: number; // Kur farkı getirisi TL
  capitalGainCurrency: number; // Fiyat farkı getirisi FX
  capitalGainTRY: number; // Fiyat farkı getirisi TL
  periodCouponCurrency: number; // Tek dönemlik kupon tutarı FX
  periodCouponTRY: number; // Tek dönemlik kupon tutarı TL
  annualCouponCurrency: number; // Yıllık toplam kupon FX
  annualCouponTRY: number; // Yıllık toplam kupon TL
  totalCollectedCouponCurrency: number; // Tahsil edilen kuponlar FX
  totalCollectedCouponTRY: number; // Tahsil edilen kuponlar TL
  accruedInterestCurrency: number; // Birikmiş kupon faizi FX
  accruedInterestTRY: number; // Birikmiş kupon faizi TL
  dirtyPricePercent: number; // Kirli Fiyat (Temiz Fiyat + Birikmiş Faiz %)
  totalOverallReturnTRY: number; // (Piyasa Değeri + Tahsil Edilen Kuponlar) - Toplam Maliyet
  totalOverallReturnPercent: number;
}

export function calculateEurobondDetails(
  item: {
    nominalCurrency?: string;
    currency?: string;
    nominalAmount?: number;
    quantity?: number;
    priceInCurrency?: number;
    currentPrice?: number;
    averageCost?: number;
    buyExchangeRate?: number;
    couponRateAnnual?: number;
    interestRate?: number;
    couponFrequency?: number;
    addedDate?: string;
    couponPayments?: { isPaid?: boolean; amountInCurrency: number; amountInTRY: number }[];
    totalCollectedCouponCurrency?: number;
    totalCollectedCouponTRY?: number;
    code?: string;
  },
  usdRate: number = 36.82,
  eurRate: number = 38.65
): EurobondCalculationResult {
  // Determine currency
  const rawCurr = (item.nominalCurrency || item.currency || (item.code?.toUpperCase().includes('EUR') ? 'EUR' : 'USD')).toUpperCase();
  const currency: 'USD' | 'EUR' = rawCurr === 'EUR' ? 'EUR' : 'USD';
  const currencySymbol = currency === 'EUR' ? '€' : '$';
  const currentFxRate = currency === 'EUR' ? eurRate : usdRate;

  // Nominal amount ($ or €)
  const nominalAmount = Number(item.nominalAmount || item.quantity || 1000);

  // Clean Price (% of nominal, e.g. 100.25)
  const priceInCurrencyPercent = Number(
    item.priceInCurrency !== undefined && item.priceInCurrency > 0
      ? item.priceInCurrency
      : (item.currentPrice && item.currentPrice > 50 && item.currentPrice < 200 ? item.currentPrice : 100)
  );

  // Buy FX Rate
  const buyFxRate = Number(item.buyExchangeRate && item.buyExchangeRate > 0 ? item.buyExchangeRate : currentFxRate);

  // Annual Coupon Rate %
  const couponRateAnnual = Number(item.couponRateAnnual ?? item.interestRate ?? 7.625);

  // Coupon Frequency: 2 = 6 Aylık (Yarıyıl), 1 = Yıllık, 4 = 3 Aylık
  const couponFrequency = Number(item.couponFrequency || 2);
  const frequencyLabel = couponFrequency === 1 ? 'Yıllık (1 Kez)' : couponFrequency === 4 ? '3 Aylık (4 Kez)' : '6 Aylık (2 Kez)';

  // Valuations in FX
  const costInCurrency = nominalAmount * (priceInCurrencyPercent / 100);
  const currentValueInCurrency = nominalAmount * (priceInCurrencyPercent / 100);

  // Valuations in TRY
  const costInTRY = costInCurrency * buyFxRate;
  const currentValueInTRY = currentValueInCurrency * currentFxRate;

  // Returns
  const netProfitLossTRY = currentValueInTRY - costInTRY;
  const netProfitLossPercent = costInTRY > 0 ? (netProfitLossTRY / costInTRY) * 100 : 0;

  // Return Decomposition
  const fxGainTRY = costInCurrency * (currentFxRate - buyFxRate);
  const capitalGainCurrency = currentValueInCurrency - costInCurrency;
  const capitalGainTRY = capitalGainCurrency * currentFxRate;

  // Coupon Cashflows
  const periodCouponCurrency = nominalAmount * (couponRateAnnual / 100) / couponFrequency;
  const periodCouponTRY = periodCouponCurrency * currentFxRate;
  const annualCouponCurrency = nominalAmount * (couponRateAnnual / 100);
  const annualCouponTRY = annualCouponCurrency * currentFxRate;

  // Collected Coupons
  let totalCollectedCouponCurrency = item.totalCollectedCouponCurrency || 0;
  let totalCollectedCouponTRY = item.totalCollectedCouponTRY || 0;

  if (item.couponPayments && item.couponPayments.length > 0) {
    const paidList = item.couponPayments.filter(c => c.isPaid);
    if (paidList.length > 0) {
      totalCollectedCouponCurrency = paidList.reduce((sum, c) => sum + (c.amountInCurrency || 0), 0);
      totalCollectedCouponTRY = paidList.reduce((sum, c) => sum + (c.amountInTRY || (c.amountInCurrency * currentFxRate)), 0);
    }
  }

  // Accrued Interest (Birikmiş Kupon Faizi)
  let daysSinceLastCoupon = 0;
  if (item.addedDate) {
    const addedTime = new Date(item.addedDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.max(0, Math.floor((nowTime - addedTime) / (1000 * 60 * 60 * 24)));
    const periodDays = Math.round(365 / couponFrequency);
    daysSinceLastCoupon = diffDays % periodDays;
    if (daysSinceLastCoupon === 0 && diffDays > 0) daysSinceLastCoupon = periodDays;
  }
  const accruedInterestCurrency = nominalAmount * (couponRateAnnual / 100) * (daysSinceLastCoupon / 365);
  const accruedInterestTRY = accruedInterestCurrency * currentFxRate;
  const dirtyPricePercent = priceInCurrencyPercent + (nominalAmount > 0 ? (accruedInterestCurrency / nominalAmount) * 100 : 0);

  // Overall Total Return (Capital + FX + Coupons)
  const totalOverallReturnTRY = (currentValueInTRY + totalCollectedCouponTRY) - costInTRY;
  const totalOverallReturnPercent = costInTRY > 0 ? (totalOverallReturnTRY / costInTRY) * 100 : 0;

  return {
    currency,
    currencySymbol,
    nominalAmount,
    priceInCurrencyPercent,
    currentFxRate,
    buyFxRate,
    couponRateAnnual,
    couponFrequency,
    frequencyLabel,
    costInCurrency,
    costInTRY,
    currentValueInCurrency,
    currentValueInTRY,
    netProfitLossTRY,
    netProfitLossPercent,
    fxGainTRY,
    capitalGainCurrency,
    capitalGainTRY,
    periodCouponCurrency,
    periodCouponTRY,
    annualCouponCurrency,
    annualCouponTRY,
    totalCollectedCouponCurrency,
    totalCollectedCouponTRY,
    accruedInterestCurrency,
    accruedInterestTRY,
    dirtyPricePercent,
    totalOverallReturnTRY,
    totalOverallReturnPercent
  };
}

// Generate automatic schedule of coupons until maturity date
export function generateEurobondCouponSchedule(
  nominalAmount: number,
  currency: 'USD' | 'EUR',
  couponRateAnnual: number,
  couponFrequency: number,
  startDateStr: string,
  maturityDateStr: string,
  currentFxRate: number
) {
  const schedule: {
    id: string;
    paymentDate: string;
    amountInCurrency: number;
    currency: 'USD' | 'EUR';
    amountInTRY: number;
    isPaid: boolean;
    periodLabel: string;
  }[] = [];

  const start = new Date(startDateStr || '2024-01-01');
  const maturity = new Date(maturityDateStr || '2030-01-01');
  const now = new Date();

  const monthsStep = Math.round(12 / (couponFrequency || 2));
  const periodAmountFX = nominalAmount * (couponRateAnnual / 100) / (couponFrequency || 2);

  let current = new Date(start);
  current.setMonth(current.getMonth() + monthsStep);

  let counter = 1;
  while (current <= maturity && counter <= 40) {
    const isPast = current < now;
    const dateStr = current.toISOString().split('T')[0];
    const year = current.getFullYear();
    const periodNumber = ((counter - 1) % couponFrequency) + 1;

    schedule.push({
      id: `cp-${dateStr}-${counter}`,
      paymentDate: dateStr,
      amountInCurrency: Number(periodAmountFX.toFixed(2)),
      currency,
      amountInTRY: Number((periodAmountFX * currentFxRate).toFixed(2)),
      isPaid: isPast,
      periodLabel: `${year} / ${periodNumber}. Kupon (${monthsStep} Aylık)`
    });

    current.setMonth(current.getMonth() + monthsStep);
    counter++;
  }

  return schedule;
}
