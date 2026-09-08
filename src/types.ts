export type AssetType = 'stock' | 'fund';

export interface MarketIndex {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: string;
  lastUpdated: string;
}

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

export interface KapNewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: 'Finansal Rapor' | 'Özel Durum' | 'Temettü' | 'Pay Alımı' | 'Genel Kurul' | 'Fon Portföy';
  impact?: 'positive' | 'neutral' | 'negative';
}

export interface Stock {
  type: 'stock';
  code: string;
  name: string;
  sector: string;
  subSector?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number; // lot
  volumeTry: number; // TL
  marketCap: number; // TL
  pe: number; // F/K
  pb: number; // PD/DD
  dividendYield: number; // Temettü verimi %
  week52High: number;
  week52Low: number;
  beta?: number;
  rsi?: number; // 14-period RSI
  adx?: number; // 14-period ADX (Trend Strength > 25 = Strong)
  distanceTo52wHigh?: number; // % distance to 52 week high (e.g. -2.5%)
  breakout52w?: boolean; // Within 5% of 52W High or breaking out
  smartMoneyFlow?: 'high' | 'moderate' | 'neutral' | 'outflow'; // Akıllı para girişi
  volumeRatio?: number; // Güncel Hacim / 20 Günlük Ort. Hacim (e.g. 1.8x)
  trendStatus?: 'strong_bull' | 'bullish' | 'neutral' | 'bearish'; // Minervini Trend Yapısı
  minerviniScore?: number; // 0-100 Minervini Trend Template Skoru
  macdSignal?: 'AL' | 'NÖTR' | 'SAT';
  description: string;
  history: Record<string, PricePoint[]>; // '1D', '1W', '1M', '3M', '1Y', '5Y'
  kapNews: KapNewsItem[];
  currency: string;
}

export interface FundAllocation {
  name: string;
  percentage: number;
  color: string;
}

export interface Fund {
  type: 'fund';
  code: string;
  name: string;
  issuer: string; // Ak Portföy, Yapı Kredi, vb.
  fundType: string; // Hisse Senedi Yoğun, Para Piyasası, Serbest, Değişken, Altın, vb.
  fundCategory: 'Para Piyasası' | 'Hisse Senedi' | 'Değişken' | 'Altın / Emtia' | 'Yabancı Hisse / Teknoloji' | 'Borçlanma Araçları' | 'Katılım / Faizsiz' | 'Fon Sepeti' | 'BES Emeklilik';
  price: number; // Birim Pay Fiyatı (TL)
  changePercent: number; // Günlük Getiri %
  return1M: number; // 1 Aylık %
  return3M: number; // 3 Aylık %
  return6M: number; // 6 Aylık %
  returnYtd: number; // Yılbaşından Bugüne %
  return1Y: number; // 1 Yıllık %
  return3Y?: number; // 3 Yıllık %
  return5Y?: number; // 5 Yıllık %
  aum: number; // Fon Toplam Değeri (Portföy Büyüklüğü TL)
  investorsCount: number; // Yatırımcı Sayısı
  sharesCount: number; // Tedavüldeki Pay Sayısı
  riskValue: number; // 1 - 7 arası risk değeri
  managementFee: number; // Yıllık yönetim ücreti %
  sharpeRatio?: number; // Sharpe Oranı (Getiri / Volatilite)
  tefasTradeable: boolean; // TEFAS'ta işlem görüyor mu
  valeurBuy: number; // Alış Valörü (gün)
  valeurSell: number; // Satış Valörü (gün)
  description: string;
  allocations: FundAllocation[];
  history: Record<string, PricePoint[]>; // '1D', '1W', '1M', '3M', '1Y', '5Y'
  kapNews: KapNewsItem[];
  currency: string;
}

export interface StockScreenerCriteria {
  preset?: string;
  // Fundamental
  maxPe?: number; // Max F/K
  minPe?: number;
  maxPb?: number; // Max PD/DD
  minPb?: number;
  minDividendYield?: number;
  // Technical & Momentum
  minRsi?: number;
  maxRsi?: number;
  minAdx?: number;
  near52wHighOnly?: boolean; // %5 içinde veya kırılım
  smartMoneyOnly?: boolean; // high or moderate
  minerviniOnly?: boolean; // strong_bull or bullish
  minVolumeRatio?: number;
  macdSignal?: 'AL' | 'NÖTR' | 'SAT' | 'ALL';
  sector?: string;
}

export interface FundScreenerCriteria {
  preset?: string;
  category?: string;
  issuer?: string;
  min1YReturn?: number;
  min1MReturn?: number;
  maxRiskValue?: number;
  minAum?: number;
  maxManagementFee?: number;
  minSharpeRatio?: number;
}

export type PortfolioCategory = 'stock' | 'fund' | 'bes' | 'bond' | 'eurobond' | 'crypto' | 'deposit' | 'gold_fx' | 'other';

export type TransactionType = 'buy' | 'sell';

export interface EurobondCouponPayment {
  id: string;
  portfolioItemId?: string;
  paymentDate: string; // YYYY-MM-DD
  couponRateAnnual?: number;
  amountInCurrency: number; // e.g. 381.25 $ / €
  currency: 'USD' | 'EUR';
  exchangeRate?: number; // USD/TRY or EUR/TRY at payment
  amountInTRY: number; // TL value
  isPaid: boolean;
  paidDate?: string;
  periodLabel?: string; // e.g. "2026 / 1. Kupon (6 Aylık)"
  notes?: string;
}

export interface PortfolioTransaction {
  id: string;
  portfolioItemId?: string;
  code?: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  quantity: number;
  price: number; // Execution unit price in TL
  totalAmount: number; // quantity * price
  costBasisAtSale?: number; // Average cost right before sell
  realizedProfitLoss?: number; // Realized PnL from sell
  realizedProfitLossPercent?: number;
  averageCostAfter?: number; // Running weighted average cost after this tx
  remainingQuantityAfter?: number; // Running balance after this tx
  notes?: string;
  createdAt?: string;
}

export interface PortfolioItem {
  id: string;
  type: AssetType;
  category?: PortfolioCategory;
  code: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  addedDate: string;
  notes?: string;
  interestRate?: number; // % annual interest (mevduat) or coupon rate
  maturityDate?: string; // Vade sonu tarihi
  currency?: string; // 'TL' | 'USD' | 'EUR'
  
  // Eurobond and Foreign Currency specific fields:
  nominalCurrency?: 'USD' | 'EUR' | 'TL';
  nominalAmount?: number; // e.g. 10000 $ or €
  priceInCurrency?: number; // % of nominal (e.g. 100.25) or unit price in currency
  buyExchangeRate?: number; // FX rate at buy date (e.g. 34.20)
  couponRateAnnual?: number; // % annual coupon rate (e.g. 7.625)
  couponFrequency?: number; // 1 (Yıllık), 2 (6 Aylık - Yarıyıl), 4 (3 Aylık - Çeyreklik)
  firstCouponDate?: string;
  nextCouponDate?: string;
  couponPayments?: EurobondCouponPayment[];
  totalCollectedCouponTRY?: number;
  totalCollectedCouponCurrency?: number;
  
  status?: 'active' | 'passive';
  isPassive?: boolean;
  transactions?: PortfolioTransaction[];
  realizedProfitLoss?: number;
}

export interface WatchlistItem {
  code: string;
  type: AssetType;
  name?: string;
  addedAt?: string;
  addedDate?: string;
  targetPrice?: number;
  alertCondition?: 'above' | 'below';
}

export interface PriceAlert {
  id: string;
  code: string;
  name: string;
  type: AssetType | 'crypto' | 'gold_fx' | 'index' | 'deposit';
  targetPrice: number;
  condition: 'above' | 'below'; // 'above': >= targetPrice, 'below': <= targetPrice
  initialPrice: number;
  lastEvaluatedPrice?: number;
  currentPrice?: number;
  active: boolean;
  frequency: 'once' | 'persistent'; // 'once': single trigger, 'persistent': repeatable
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  note?: string;
  notificationDismissed?: boolean;
}

export interface AIAnalysisRequest {
  code?: string;
  type?: AssetType;
  mode?: 'asset_detail' | 'portfolio' | 'market_digest' | 'compare';
  portfolioItems?: { code: string; type: AssetType; weight: number; cost: number; currentPrice: number; name: string }[];
  compareCodes?: string[];
  userQuery?: string;
}

export interface AIAnalysisResponse {
  title: string;
  summary: string;
  healthScore?: number; // 1 - 100
  sentiment: 'Bullish (Olumlu)' | 'Neutral (Nötr)' | 'Bearish (Temkinli)';
  keyStrengths: string[];
  keyRisks: string[];
  technicalOutlook?: string;
  fundamentalOutlook?: string;
  actionableInsights: string[];
  targetLevels?: { support: number[]; resistance: number[]; target1Y?: number };
  timestamp: string;
  sources?: { title: string; url?: string }[];
}
