import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { MarketTicker } from './components/MarketTicker';
import { StockList } from './components/StockList';
import { FundList } from './components/FundList';
import { AssetDetailModal } from './components/AssetDetailModal';
import { PortfolioView } from './components/PortfolioView';
import { DashboardOverview } from './components/DashboardOverview';
import { AdvancedAnalyticsView } from './components/AdvancedAnalyticsView';
import { AIAnalystView } from './components/AIAnalystView';
import { CompareView } from './components/CompareView';
import { CalculatorView } from './components/CalculatorView';
import { GoogleSheetsBackupModal } from './components/GoogleSheetsBackupModal';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { 
  Stock, 
  Fund, 
  MarketIndex, 
  PortfolioItem, 
  WatchlistItem, 
  AssetType,
  PriceAlert 
} from './types';
import { 
  INITIAL_MARKET_INDICES, 
  INITIAL_STOCKS, 
  INITIAL_FUNDS 
} from './data/initialData';
import { playAlertSound, sendBrowserNotification } from './utils/sound';
import { calculateWeightedTransactions } from './utils/portfolioCalculations';
import { 
  ShieldAlert, 
  TrendingUp, 
  Layers, 
  PieChart, 
  Bot, 
  Calculator, 
  Scale, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';

const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'p-tursg',
    type: 'stock',
    category: 'stock',
    code: 'TURSG',
    name: 'Türkiye Sigorta A.Ş.',
    quantity: 700,
    averageCost: 12.35,
    currentPrice: 14.20,
    addedDate: '2026-01-10',
    notes: 'Kademeli alım ve kâr realizasyonu işlemleri (4 hareket)',
    transactions: [
      {
        id: 'tx-tursg-1',
        type: 'buy',
        date: '2026-01-10',
        quantity: 400,
        price: 11.50,
        totalAmount: 4600,
        notes: '1. Kademeli dip alımı (400 lot @ 11,50₺)'
      },
      {
        id: 'tx-tursg-2',
        type: 'buy',
        date: '2026-02-18',
        quantity: 300,
        price: 12.80,
        totalAmount: 3840,
        notes: '2. Kademeli ek alım (300 lot @ 12,80₺)'
      },
      {
        id: 'tx-tursg-3',
        type: 'sell',
        date: '2026-03-25',
        quantity: 150,
        price: 14.90,
        totalAmount: 2235,
        notes: 'Direnç seviyesinde kısmi kâr satışı (150 lot @ 14,90₺)'
      },
      {
        id: 'tx-tursg-4',
        type: 'buy',
        date: '2026-04-20',
        quantity: 150,
        price: 13.40,
        totalAmount: 2010,
        notes: 'Düzeltmede geri alım (150 lot @ 13,40₺)'
      }
    ]
  },
  {
    id: 'p-mgros',
    type: 'stock',
    category: 'stock',
    code: 'MGROS',
    name: 'Migros Ticaret A.Ş.',
    quantity: 503,
    averageCost: 625.10,
    currentPrice: 688.50,
    addedDate: '2026-01-15',
    notes: 'Kademeli alım örneği (500 adet @ 624,72₺ + 3 adet @ 688,50₺)',
    transactions: [
      {
        id: 'tx-mgros-1',
        type: 'buy',
        date: '2026-01-15',
        quantity: 500,
        price: 624.72,
        totalAmount: 312360,
        notes: '1. Kademeli alım'
      },
      {
        id: 'tx-mgros-2',
        type: 'buy',
        date: '2026-05-15',
        quantity: 3,
        price: 688.50,
        totalAmount: 2065.50,
        notes: '2. Kademeli alım'
      }
    ]
  },
  {
    id: 'p1',
    type: 'stock',
    category: 'stock',
    code: 'AKBNK',
    name: 'Akbank T.A.Ş.',
    quantity: 500,
    averageCost: 56.40,
    addedDate: '2024-03-15',
    notes: 'Banka sektörü pozisyonu'
  },
  {
    id: 'p2',
    type: 'fund',
    category: 'fund',
    code: 'YLB',
    name: 'Yapı Kredi Portföy Para Piyasası TL Fonu',
    quantity: 25000,
    averageCost: 1.4250,
    addedDate: '2024-02-10',
    notes: 'Nakit ve likit getiri'
  },
  {
    id: 'p3',
    type: 'fund',
    category: 'fund',
    code: 'AD4',
    name: 'Ak Portföy BIST Banka Endeksi Hisse Senedi (TL) Fonu',
    quantity: 8000,
    averageCost: 3.1020,
    addedDate: '2024-03-01',
    notes: 'Sektörel hisse fonu'
  },
  {
    id: 'p4',
    type: 'fund',
    category: 'bes',
    code: 'AEA',
    name: 'Anadolu Hayat Emeklilik Altın Emeklilik Yatırım Fonu (BES)',
    quantity: 35000,
    averageCost: 0.3120,
    currentPrice: 0.3842,
    addedDate: '2023-11-20',
    notes: 'Devlet katkılı BES birikimi'
  },
  {
    id: 'p5',
    type: 'stock',
    category: 'crypto',
    code: 'BTC',
    name: 'Bitcoin (BTC / TRY)',
    quantity: 0.045,
    averageCost: 2450000,
    currentPrice: 3280000,
    addedDate: '2024-01-10',
    notes: 'Kripto büyüme sepeti'
  },
  {
    id: 'p6',
    type: 'fund',
    category: 'deposit',
    code: 'TL-MEVDUAT',
    name: 'TL Vadeli Mevduat Hesabı (%48.50 Yıllık Faiz)',
    quantity: 50000,
    averageCost: 1.0,
    currentPrice: 1.074,
    interestRate: 48.5,
    addedDate: '2024-04-01',
    maturityDate: '2024-06-01',
    notes: '32 günlük vadeli mevduat'
  },
  {
    id: 'p-eurobond-1',
    type: 'fund',
    category: 'eurobond',
    code: 'TR-USD-2030',
    name: 'T.C. Hazine $ Eurobond (25.03.2030 %7.625)',
    quantity: 10000,
    nominalCurrency: 'USD',
    currency: 'USD',
    nominalAmount: 10000,
    priceInCurrency: 100.25,
    buyExchangeRate: 34.20,
    averageCost: 34.2855,
    currentPrice: 36.9120,
    couponRateAnnual: 7.625,
    interestRate: 7.625,
    couponFrequency: 2,
    addedDate: '2024-03-25',
    maturityDate: '2030-03-25',
    notes: '6 Aylık kupon ödemeli Hazine Eurobondu ($10,000 Nominal)',
    totalCollectedCouponCurrency: 762.50,
    totalCollectedCouponTRY: 27500.0,
    couponPayments: [
      {
        id: 'cp-init-1',
        paymentDate: '2024-09-25',
        couponRateAnnual: 7.625,
        amountInCurrency: 381.25,
        currency: 'USD',
        exchangeRate: 34.80,
        amountInTRY: 13267.50,
        isPaid: true,
        periodLabel: '2024 / 2. Kupon Ödemesi'
      },
      {
        id: 'cp-init-2',
        paymentDate: '2025-03-25',
        couponRateAnnual: 7.625,
        amountInCurrency: 381.25,
        currency: 'USD',
        exchangeRate: 36.20,
        amountInTRY: 13801.25,
        isPaid: true,
        periodLabel: '2025 / 1. Kupon Ödemesi'
      },
      {
        id: 'cp-init-3',
        paymentDate: '2025-09-25',
        couponRateAnnual: 7.625,
        amountInCurrency: 381.25,
        currency: 'USD',
        exchangeRate: 36.82,
        amountInTRY: 14037.63,
        isPaid: false,
        periodLabel: '2025 / 2. Kupon Ödemesi'
      },
      {
        id: 'cp-init-4',
        paymentDate: '2026-03-25',
        couponRateAnnual: 7.625,
        amountInCurrency: 381.25,
        currency: 'USD',
        exchangeRate: 36.82,
        amountInTRY: 14037.63,
        isPaid: false,
        periodLabel: '2026 / 1. Kupon Ödemesi'
      }
    ]
  },
  {
    id: 'p7',
    type: 'stock',
    category: 'gold_fx',
    code: 'GRAM-ALTIN',
    name: 'Gram Altın (24 Ayar Has Altın TL)',
    quantity: 25,
    averageCost: 2450.0,
    currentPrice: 2985.50,
    addedDate: '2023-12-15',
    notes: 'Fiziki altın güvencesi'
  },
  {
    id: 'p-asels-closed',
    type: 'stock',
    category: 'stock',
    code: 'ASELS',
    name: 'Aselsan Elektronik Sanayi',
    quantity: 0,
    averageCost: 54.20,
    currentPrice: 62.80,
    addedDate: '2025-11-10',
    status: 'passive',
    isPassive: true,
    realizedProfitLoss: 2150.0,
    notes: 'Kâr satışı tamamlandı (Kapatılan Pasif Pozisyon)',
    transactions: [
      {
        id: 'tx-asels-1',
        type: 'buy',
        date: '2025-11-10',
        quantity: 200,
        price: 54.20,
        totalAmount: 10840,
        notes: '1. Kademeli alım (200 lot @ 54,20₺)'
      },
      {
        id: 'tx-asels-2',
        type: 'sell',
        date: '2026-01-20',
        quantity: 200,
        price: 64.95,
        totalAmount: 12990,
        notes: 'Tüm lotlar kârla satıldı (+2.150₺ Realize Kâr)'
      }
    ]
  }
];

const INITIAL_WATCHLIST: WatchlistItem[] = [
  { code: 'AKBNK', type: 'stock', addedDate: '2024-01-01' },
  { code: 'YLB', type: 'fund', addedDate: '2024-01-01' },
  { code: 'AD4', type: 'fund', addedDate: '2024-01-01' },
  { code: 'THYAO', type: 'stock', addedDate: '2024-01-01' },
  { code: 'MAC', type: 'fund', addedDate: '2024-01-01' }
];

const INITIAL_ALERTS: PriceAlert[] = [
  {
    id: 'alt-thyao-1',
    code: 'THYAO',
    name: 'Türk Hava Yolları A.O.',
    type: 'stock',
    targetPrice: 360.00,
    condition: 'above',
    initialPrice: 322.50,
    lastEvaluatedPrice: 322.50,
    active: true,
    frequency: 'once',
    createdAt: '2026-01-01T10:00:00.000Z',
    triggered: false,
    note: 'Zirve kırılımı ve momentum alım hedefi'
  },
  {
    id: 'alt-akbnk-2',
    code: 'AKBNK',
    name: 'Akbank T.A.Ş.',
    type: 'stock',
    targetPrice: 85.00,
    condition: 'above',
    initialPrice: 73.15,
    lastEvaluatedPrice: 73.15,
    active: true,
    frequency: 'once',
    createdAt: '2026-01-01T10:00:00.000Z',
    triggered: false,
    note: 'Direnç kırılımı ve hedef fiyat seviyesi'
  },
  {
    id: 'alt-mgros-3',
    code: 'MGROS',
    name: 'Migros Ticaret A.Ş.',
    type: 'stock',
    targetPrice: 750.00,
    condition: 'above',
    initialPrice: 560.50,
    lastEvaluatedPrice: 560.50,
    active: true,
    frequency: 'once',
    createdAt: '2026-01-01T10:00:00.000Z',
    triggered: false,
    note: 'Hedef direnç seviyesi alarmı'
  },
  {
    id: 'alt-altin-4',
    code: 'GRAM-ALTIN',
    name: 'Gram Altın (24 Ayar Has)',
    type: 'gold_fx',
    targetPrice: 3500.00,
    condition: 'above',
    initialPrice: 3320.00,
    lastEvaluatedPrice: 3320.00,
    active: true,
    frequency: 'persistent',
    createdAt: '2026-01-01T10:00:00.000Z',
    triggered: false,
    note: 'Yeni zirve direnç seviyesi alarmı'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('borsa_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [funds, setFunds] = useState<Fund[]>(INITIAL_FUNDS);
  const [indices, setIndices] = useState<MarketIndex[]>(INITIAL_MARKET_INDICES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Portfolio & Watchlist state with localStorage
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('borsa_tefas_portfolio');
    return saved ? JSON.parse(saved) : INITIAL_PORTFOLIO;
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem('borsa_tefas_watchlist');
    return saved ? JSON.parse(saved) : INITIAL_WATCHLIST;
  });

  // Price Alerts State with localStorage
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('borsa_tefas_price_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [alertPreselectedAsset, setAlertPreselectedAsset] = useState<any>(null);

  // Modal and AI trigger states
  const [selectedAsset, setSelectedAsset] = useState<Stock | Fund | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [aiTargetCode, setAiTargetCode] = useState<string>('AKBNK');
  const [aiTargetType, setAiTargetType] = useState<AssetType>('stock');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync dark mode class with HTML element & persist preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('borsa_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('borsa_theme', 'light');
    }
  }, [isDarkMode]);

  // Persist portfolio, watchlist & alerts
  useEffect(() => {
    localStorage.setItem('borsa_tefas_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('borsa_tefas_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('borsa_tefas_price_alerts', JSON.stringify(alerts));
    // Also sync with server background monitor (24/7 email notifications to ykefal@gmail.com)
    const timeout = setTimeout(() => {
      fetch('/api/alerts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts, email: 'ykefal@gmail.com', emailEnabled: true })
      }).catch(err => console.debug('Server alert sync background ping:', err));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [alerts]);

  const isInitialBaselineCalibrated = useRef<boolean>(false);

  // Alert Trigger Evaluation Engine (Runs on live market data updates)
  useEffect(() => {
    if (!isDataLoaded) return; // Prevent triggering on initial unhydrated state
    if (!alerts || alerts.length === 0) return;

    // Helper to get current market price for an asset
    const getAssetCurrentPrice = (code: string): number | undefined => {
      const uCode = (code || '').toUpperCase().trim();
      const foundStock = stocks.find(s => s.code.toUpperCase() === uCode);
      if (foundStock && typeof foundStock.price === 'number' && foundStock.price > 0) return foundStock.price;
      const foundFund = funds.find(f => f.code.toUpperCase() === uCode);
      if (foundFund && typeof foundFund.price === 'number' && foundFund.price > 0) return foundFund.price;
      const foundIndex = indices.find(i => i.code.toUpperCase() === uCode);
      if (foundIndex && typeof foundIndex.value === 'number' && foundIndex.value > 0) return foundIndex.value;
      return undefined;
    };

    // First time data is loaded: calibrate all alerts' lastEvaluatedPrice and currentPrice without firing crossover alarms
    if (!isInitialBaselineCalibrated.current) {
      isInitialBaselineCalibrated.current = true;
      let calibrated = false;
      const calibratedAlerts = alerts.map(alert => {
        const currentPrice = getAssetCurrentPrice(alert.code);
        if (currentPrice !== undefined && currentPrice > 0) {
          if (alert.currentPrice !== currentPrice || alert.lastEvaluatedPrice !== currentPrice) {
            calibrated = true;
            return {
              ...alert,
              currentPrice: currentPrice,
              lastEvaluatedPrice: currentPrice,
              initialPrice: alert.initialPrice || currentPrice
            };
          }
        }
        return alert;
      });
      if (calibrated) {
        setAlerts(calibratedAlerts);
      }
      return;
    }

    const activeAlerts = alerts.filter(a => a.active && !a.triggered);
    if (activeAlerts.length === 0) return;

    let hasUpdates = false;
    const updatedAlerts = alerts.map(alert => {
      if (!alert.active || alert.triggered) return alert;

      // Find current market price for this asset
      const currentPrice = getAssetCurrentPrice(alert.code);
      if (currentPrice === undefined || currentPrice <= 0) return alert;

      // Previous benchmark price (last evaluated price or currentPrice)
      const prevPrice = alert.lastEvaluatedPrice !== undefined ? alert.lastEvaluatedPrice : currentPrice;

      // Authentic threshold crossover detection:
      // 'above': triggers ONLY when currentPrice >= targetPrice AND the price was previously strictly below target
      // 'below': triggers ONLY when currentPrice <= targetPrice AND the price was previously strictly above target
      let isCrossoverTriggered = false;

      if (alert.condition === 'above') {
        if (currentPrice >= alert.targetPrice && prevPrice < alert.targetPrice) {
          isCrossoverTriggered = true;
        }
      } else if (alert.condition === 'below') {
        if (currentPrice <= alert.targetPrice && prevPrice > alert.targetPrice) {
          isCrossoverTriggered = true;
        }
      }

      if (isCrossoverTriggered) {
        hasUpdates = true;
        const isTargetAbove = alert.condition === 'above';
        
        // Sound & Browser Notification
        playAlertSound('trigger');
        sendBrowserNotification(
          `🚨 ${alert.code} Fiyat Alarmı Tetiklendi!`,
          `${alert.name} fiyatı ${isTargetAbove ? 'hedefin üzerine çıktı' : 'hedefin altına indi'}: ₺${currentPrice.toLocaleString('tr-TR')} (Hedef: ₺${alert.targetPrice.toLocaleString('tr-TR')})`
        );

        showToast(`🚨 FIRSAT ALARMI: ${alert.code} ${isTargetAbove ? 'hedefi aştı (▲' : 'hedefin altına indi (▼'}₺${currentPrice.toLocaleString('tr-TR')}) 🔔`);

        // Send email alert via backend
        fetch('/api/alerts/notify-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert,
            currentPrice,
            email: 'ykefal@gmail.com'
          })
        }).catch(err => console.debug('Email notification dispatch error:', err));

        return {
          ...alert,
          triggered: true,
          triggeredAt: new Date().toISOString(),
          triggeredPrice: currentPrice,
          lastEvaluatedPrice: currentPrice,
          currentPrice: currentPrice,
          active: alert.frequency === 'persistent' ? true : false
        };
      }

      // Update currentPrice & lastEvaluatedPrice smoothly without triggering
      if (alert.lastEvaluatedPrice !== currentPrice || alert.currentPrice !== currentPrice) {
        hasUpdates = true;
        return {
          ...alert,
          lastEvaluatedPrice: currentPrice,
          currentPrice: currentPrice
        };
      }

      return alert;
    });

    if (hasUpdates) {
      setAlerts(updatedAlerts);
    }
  }, [stocks, funds, indices, isDataLoaded]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Safe data fetching helper
  const safeFetchJson = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // Data fetching
  const fetchData = async () => {
    try {
      // Collect all portfolio & watchlist asset symbols to sync with server
      const userStockCodes = Array.from(new Set([
        ...portfolio.filter(p => p.type === 'stock' || p.category === 'stock').map(p => p.code),
        ...watchlist.filter(w => w.type === 'stock').map(w => w.code)
      ]));
      const userFundCodes = Array.from(new Set([
        ...portfolio.filter(p => p.type === 'fund' || p.category === 'fund').map(p => p.code),
        ...watchlist.filter(w => w.type === 'fund').map(w => w.code)
      ]));

      const [stocksData, fundsData, indicesData] = await Promise.all([
        safeFetchJson('/api/stocks'),
        safeFetchJson('/api/funds'),
        safeFetchJson('/api/indices')
      ]);

      let nextStocks = stocks;
      let nextFunds = funds;

      if (stocksData) {
        if (Array.isArray(stocksData)) {
          nextStocks = stocksData;
          setStocks(stocksData);
        } else if (Array.isArray(stocksData.stocks)) {
          nextStocks = stocksData.stocks;
          setStocks(stocksData.stocks);
        }
      }

      if (fundsData) {
        if (Array.isArray(fundsData)) {
          nextFunds = fundsData;
          setFunds(fundsData);
        } else if (Array.isArray(fundsData.funds)) {
          nextFunds = fundsData.funds;
          setFunds(fundsData.funds);
        }
      }

      if (indicesData) {
        if (Array.isArray(indicesData)) {
          setIndices(indicesData);
        } else if (Array.isArray(indicesData.indices)) {
          setIndices(indicesData.indices);
        }
      }

      // If user has specific assets in portfolio/watchlist, ensure they are also synced
      if (userStockCodes.length > 0 || userFundCodes.length > 0) {
        try {
          const syncRes = await fetch('/api/market/sync-assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stocks: userStockCodes, funds: userFundCodes })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.stocks && syncData.stocks.length > 0) {
              setStocks(prev => {
                const map = new Map(prev.map(s => [s.code.toUpperCase(), s]));
                for (const s of syncData.stocks) {
                  map.set(s.code.toUpperCase(), s);
                }
                return Array.from(map.values());
              });
            }
            if (syncData.funds && syncData.funds.length > 0) {
              setFunds(prev => {
                const map = new Map(prev.map(f => [f.code.toUpperCase(), f]));
                for (const f of syncData.funds) {
                  map.set(f.code.toUpperCase(), f);
                }
                return Array.from(map.values());
              });
            }
          }
        } catch {
          // ignore background sync errors
        }
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Veri güncelleme uyarısı:', err);
    } finally {
      setIsLoading(false);
      setIsDataLoaded(true);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/market/refresh', { method: 'POST' });
      await fetchData();
      showToast('BIST ve TEFAS piyasa verileri canlı güncellendi! 🚀');
    } catch {
      await fetchData();
      showToast('Veriler yenilendi.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch and 15s polling for realistic real-time sync
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleOpenAIForAsset = (asset: Stock | Fund) => {
    setAiTargetCode(asset.code);
    setAiTargetType(asset.type);
    setActiveTab('ai');
  };

  const handleOpenAIForPortfolio = () => {
    setActiveTab('ai');
  };

  const handleOpenAIForCompare = (codes: string[]) => {
    setActiveTab('ai');
  };

  const handleAddToPortfolio = (asset: Stock | Fund) => {
    const isFund = asset.type === 'fund';
    const defaultQty = isFund ? 1000 : 100;
    const nowStr = new Date().toISOString().split('T')[0];

    setPortfolio(prev => {
      const existingIdx = prev.findIndex(
        p => p.code.toUpperCase() === asset.code.toUpperCase() && p.type === asset.type
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const existingTxs = existing.transactions && existing.transactions.length > 0
          ? [...existing.transactions]
          : [{
              id: `tx_${existing.id}_init`,
              code: existing.code,
              type: 'buy' as const,
              date: existing.addedDate || nowStr,
              quantity: existing.quantity,
              price: existing.averageCost,
              totalAmount: existing.quantity * existing.averageCost,
              notes: existing.notes || 'Başlangıç Alımı'
            }];

        const newTx = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          code: asset.code,
          type: 'buy' as const,
          date: nowStr,
          quantity: defaultQty,
          price: asset.price,
          totalAmount: Number((defaultQty * asset.price).toFixed(2)),
          notes: 'Ek Kademeli Alım',
          createdAt: new Date().toISOString()
        };

        const allTxs = [...existingTxs, newTx];
        const calc = calculateWeightedTransactions(
          allTxs,
          existing.quantity + defaultQty,
          existing.averageCost,
          existing.addedDate,
          existing.code
        );

        const updatedItem: PortfolioItem = {
          ...existing,
          quantity: calc.currentQuantity,
          averageCost: calc.averageCost,
          realizedProfitLoss: (existing.realizedProfitLoss || 0) + calc.totalRealizedProfitLoss,
          addedDate: calc.firstBuyDate || existing.addedDate,
          transactions: calc.enrichedTransactions
        };

        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      }

      const newItem: PortfolioItem = {
        id: `p_${Date.now()}`,
        type: asset.type,
        code: asset.code,
        name: asset.name,
        quantity: defaultQty,
        averageCost: asset.price,
        addedDate: nowStr,
        notes: 'İlk Alım',
        transactions: [
          {
            id: `tx_${Date.now()}_init`,
            code: asset.code,
            type: 'buy',
            date: nowStr,
            quantity: defaultQty,
            price: asset.price,
            totalAmount: Number((defaultQty * asset.price).toFixed(2)),
            notes: 'İlk Alım',
            createdAt: new Date().toISOString()
          }
        ]
      };
      return [newItem, ...prev];
    });

    showToast(`${asset.code} portföyünüze eklendi! 📊`);
  };

  const handleAddCustomPortfolioItem = (item: Omit<PortfolioItem, 'id'>) => {
    setPortfolio(prev => {
      const existingIdx = prev.findIndex(
        p => p.code.toUpperCase() === item.code.toUpperCase() && 
             (p.category || p.type) === (item.category || item.type)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const existingTxs = existing.transactions && existing.transactions.length > 0
          ? [...existing.transactions]
          : [{
              id: `tx_${existing.id}_init`,
              code: existing.code,
              type: 'buy' as const,
              date: existing.addedDate || new Date().toISOString().split('T')[0],
              quantity: existing.quantity,
              price: existing.averageCost,
              totalAmount: existing.quantity * existing.averageCost,
              notes: existing.notes || 'Başlangıç Alımı'
            }];

        const newTxs = item.transactions && item.transactions.length > 0
          ? item.transactions
          : [{
              id: `tx_${Date.now()}_init`,
              code: item.code,
              type: 'buy' as const,
              date: item.addedDate || new Date().toISOString().split('T')[0],
              quantity: item.quantity,
              price: item.averageCost,
              totalAmount: Number((item.quantity * item.averageCost).toFixed(2)),
              notes: item.notes || 'Yeni Giriş'
            }];

        const allTxs = [...existingTxs, ...newTxs];
        const calc = calculateWeightedTransactions(
          allTxs,
          existing.quantity + item.quantity,
          existing.averageCost,
          existing.addedDate,
          existing.code
        );

        const updatedItem: PortfolioItem = {
          ...existing,
          ...item,
          id: existing.id,
          quantity: calc.currentQuantity,
          averageCost: calc.averageCost,
          realizedProfitLoss: (existing.realizedProfitLoss || 0) + (item.realizedProfitLoss || 0) + calc.totalRealizedProfitLoss,
          addedDate: calc.firstBuyDate || existing.addedDate,
          transactions: calc.enrichedTransactions
        };

        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      }

      const newItem: PortfolioItem = {
        ...item,
        id: `p_${Date.now()}`,
        transactions: item.transactions && item.transactions.length > 0 ? item.transactions : [
          {
            id: `tx_${Date.now()}_init`,
            code: item.code,
            type: 'buy',
            date: item.addedDate || new Date().toISOString().split('T')[0],
            quantity: item.quantity,
            price: item.averageCost,
            totalAmount: Number((item.quantity * item.averageCost).toFixed(2)),
            notes: item.notes || 'İlk Alım',
            createdAt: new Date().toISOString()
          }
        ]
      };
      return [newItem, ...prev];
    });

    showToast(`${item.code} başarıyla eklendi! ➕`);
  };

  const handleUpdatePortfolioItem = (updated: PortfolioItem) => {
    setPortfolio(prev => {
      const matchKey = (p: PortfolioItem) => `${(p.code || '').toUpperCase()}_${p.category || p.type || ''}`;
      const targetKey = matchKey(updated);
      
      let replaced = false;
      const nextPortfolio: PortfolioItem[] = [];

      prev.forEach(item => {
        if (item.id === updated.id || (targetKey && matchKey(item) === targetKey)) {
          if (!replaced) {
            nextPortfolio.push(updated);
            replaced = true;
          }
        } else {
          nextPortfolio.push(item);
        }
      });

      if (!replaced) {
        nextPortfolio.push(updated);
      }

      return nextPortfolio;
    });
    showToast(`${updated.code} pozisyonu güncellendi! ✍️`);
  };

  const handleRemovePortfolioItem = (id: string) => {
    setPortfolio(prev => {
      const target = prev.find(p => p.id === id);
      if (!target) return prev.filter(p => p.id !== id);
      const matchKey = (p: PortfolioItem) => `${(p.code || '').toUpperCase()}_${p.category || p.type || ''}`;
      const targetKey = matchKey(target);
      return prev.filter(p => p.id !== id && matchKey(p) !== targetKey);
    });
    showToast('Varlık portföyden çıkarıldı.');
  };

  const handleRestorePortfolio = (
    newItems: PortfolioItem[],
    newWatchlist?: WatchlistItem[],
    mode: 'replace' | 'merge' = 'replace',
    newAlerts?: PriceAlert[]
  ) => {
    // Sanitize incoming items: ensure quantity 0 stays 0 and is marked passive
    const sanitizedItems: PortfolioItem[] = newItems.map(item => {
      const rawQty = typeof item.quantity === 'number' ? item.quantity : (parseFloat(String(item.quantity).replace(',', '.')) || 0);
      const isPassive = rawQty <= 0.00001 || item.status === 'passive' || item.isPassive === true;
      return {
        ...item,
        quantity: isPassive ? 0 : rawQty,
        status: isPassive ? 'passive' : 'active',
        isPassive: isPassive
      };
    });

    if (mode === 'replace') {
      setPortfolio(sanitizedItems);
      if (newWatchlist && newWatchlist.length > 0) {
        setWatchlist(newWatchlist);
      }
      if (newAlerts && newAlerts.length > 0) {
        setAlerts(newAlerts);
        fetch('/api/alerts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts: newAlerts, email: 'ykefal@gmail.com', emailEnabled: true })
        }).catch(err => console.error('Alerts sync failed', err));
      }
      const alertMsg = newAlerts && newAlerts.length > 0 ? ` ve ${newAlerts.length} fiyat alarmı` : '';
      showToast(`Portföy sıfırlanıp ${sanitizedItems.length} yeni varlık${alertMsg} yüklendi! 🔄`);
    } else {
      // Merge mode
      setPortfolio(prev => {
        const merged = [...prev];
        sanitizedItems.forEach(newItem => {
          const existingIdx = merged.findIndex(
            m => m.code.toUpperCase() === newItem.code.toUpperCase() && (m.category || m.type) === (newItem.category || newItem.type)
          );
          if (existingIdx >= 0) {
            // Update existing or add quantity
            const totalQty = merged[existingIdx].quantity + newItem.quantity;
            const isPassive = totalQty <= 0.00001 || (merged[existingIdx].isPassive && newItem.isPassive);
            const avgCost = totalQty > 0 
              ? (merged[existingIdx].averageCost * merged[existingIdx].quantity + newItem.averageCost * newItem.quantity) / (merged[existingIdx].quantity + newItem.quantity || 1)
              : merged[existingIdx].averageCost;

            merged[existingIdx] = {
              ...merged[existingIdx],
              quantity: isPassive ? 0 : totalQty,
              averageCost: avgCost,
              status: isPassive ? 'passive' : 'active',
              isPassive: isPassive,
              realizedProfitLoss: (merged[existingIdx].realizedProfitLoss || 0) + (newItem.realizedProfitLoss || 0),
              transactions: [
                ...(merged[existingIdx].transactions || []),
                ...(newItem.transactions || [])
              ]
            };
          } else {
            merged.push(newItem);
          }
        });
        return merged;
      });

      if (newWatchlist && newWatchlist.length > 0) {
        setWatchlist(prev => {
          const mergedWatch = [...prev];
          newWatchlist.forEach(nw => {
            if (!mergedWatch.some(w => w.code.toUpperCase() === nw.code.toUpperCase())) {
              mergedWatch.push(nw);
            }
          });
          return mergedWatch;
        });
      }

      if (newAlerts && newAlerts.length > 0) {
        setAlerts(prev => {
          const mergedAlerts = [...prev];
          newAlerts.forEach(na => {
            if (!mergedAlerts.some(a => a.code.toUpperCase() === na.code.toUpperCase() && a.targetPrice === na.targetPrice && a.condition === na.condition)) {
              mergedAlerts.push(na);
            }
          });
          fetch('/api/alerts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alerts: mergedAlerts, email: 'ykefal@gmail.com', emailEnabled: true })
          }).catch(err => console.error('Alerts sync failed', err));
          return mergedAlerts;
        });
      }

      const alertMsg = newAlerts && newAlerts.length > 0 ? ` ve ${newAlerts.length} fiyat alarmı` : '';
      showToast(`${sanitizedItems.length} varlık${alertMsg} mevcut portföye eklendi! ➕`);
    }
  };

  const handleToggleWatchlist = (asset: Stock | Fund) => {
    const exists = watchlist.some(w => w.code === asset.code && w.type === asset.type);
    if (exists) {
      setWatchlist(prev => prev.filter(w => !(w.code === asset.code && w.type === asset.type)));
      showToast(`${asset.code} takip listesinden çıkarıldı.`);
    } else {
      setWatchlist(prev => [...prev, { code: asset.code, type: asset.type, addedDate: new Date().toISOString().split('T')[0] }]);
      showToast(`${asset.code} takip listesine eklendi! ⭐`);
    }
  };

  // Alert Handlers
  const handleAddAlert = (newAlertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: PriceAlert = {
      ...newAlertData,
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      lastEvaluatedPrice: newAlertData.initialPrice,
      createdAt: new Date().toISOString(),
      triggered: false
    };
    setAlerts(prev => [newAlert, ...prev]);
    showToast(`🔔 ${newAlert.code} için ${newAlert.condition === 'above' ? 'yükseliş (≥ ' : 'düşüş (≤ '}${newAlert.targetPrice} TL) alarmı kuruldu!`);
  };

  const handleUpdateAlert = (updatedAlert: PriceAlert) => {
    setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
    showToast(`🔔 ${updatedAlert.code} alarmı güncellendi.`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    showToast('Alarm silindi.');
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        const newActive = !a.active;
        showToast(newActive ? `🔔 ${a.code} alarmı aktifleştirildi.` : `🔕 ${a.code} alarmı duraklatıldı.`);
        return { ...a, active: newActive };
      }
      return a;
    }));
  };

  const handleResetAlert = (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        // Find current price to set as new reference
        let curr = a.currentPrice || a.initialPrice;
        const s = stocks.find(st => st.code.toUpperCase() === a.code.toUpperCase());
        if (s) curr = s.price;
        const f = funds.find(fn => fn.code.toUpperCase() === a.code.toUpperCase());
        if (f) curr = f.price;
        const idx = indices.find(i => i.code.toUpperCase() === a.code.toUpperCase());
        if (idx) curr = idx.value;

        showToast(`🔄 ${a.code} alarmı sıfırlandı ve yeniden aktif edildi.`);
        return {
          ...a,
          triggered: false,
          triggeredAt: undefined,
          triggeredPrice: undefined,
          initialPrice: curr,
          lastEvaluatedPrice: curr,
          active: true
        };
      }
      return a;
    }));
  };

  const handleOpenSetAlertForAsset = (asset: Stock | Fund | any) => {
    setAlertPreselectedAsset(asset);
    setIsAlertsModalOpen(true);
  };

  const isAssetWatchlisted = (asset: Stock | Fund | null) => {
    if (!asset) return false;
    return watchlist.some(w => w.code === asset.code && w.type === asset.type);
  };

  const activeAlertsCount = alerts.filter(a => a.active).length;
  const triggeredAlertsCount = alerts.filter(a => a.triggered).length;

  const uniquePortfolioCount = useMemo(() => {
    const keys = new Set(portfolio.map(p => `${(p.code || '').toUpperCase()}_${p.category || p.type || ''}`));
    return keys.size;
  }, [portfolio]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Real-time Ticker */}
      <MarketTicker indices={indices} />

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stocks={stocks}
        funds={funds}
        onSelectAsset={setSelectedAsset}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        portfolioCount={uniquePortfolioCount}
        watchlistCount={watchlist.length}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        alertsCount={activeAlertsCount}
        triggeredAlertsCount={triggeredAlertsCount}
        onOpenAlertsModal={() => {
          setAlertPreselectedAsset(null);
          setIsAlertsModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8 space-y-6">
        {/* Toast alert */}
        {toastMessage && (
          <div className="fixed bottom-20 sm:bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab View Router */}
        {activeTab === 'overview' && (
          <DashboardOverview
            portfolio={portfolio}
            stocks={stocks}
            funds={funds}
            indices={indices}
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => setActiveTab('portfolio')}
            onSelectAsset={setSelectedAsset}
          />
        )}

        {activeTab === 'analytics' && (
          <AdvancedAnalyticsView
            portfolio={portfolio}
            stocks={stocks}
            funds={funds}
            indices={indices}
            onOpenAddModal={() => setActiveTab('portfolio')}
          />
        )}

        {activeTab === 'stocks' && (
          <StockList
            stocks={stocks}
            onSelectStock={setSelectedAsset}
            onOpenAI={handleOpenAIForAsset}
            onAddToPortfolio={handleAddToPortfolio}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
            portfolio={portfolio}
            onOpenSetAlert={handleOpenSetAlertForAsset}
          />
        )}

        {activeTab === 'funds' && (
          <FundList
            funds={funds}
            onSelectFund={setSelectedAsset}
            onOpenAI={handleOpenAIForAsset}
            onAddToPortfolio={handleAddToPortfolio}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
            portfolio={portfolio}
            onOpenSetAlert={handleOpenSetAlertForAsset}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            portfolio={portfolio}
            watchlist={watchlist}
            stocks={stocks}
            funds={funds}
            indices={indices}
            onAddPortfolioItem={handleAddCustomPortfolioItem}
            onUpdatePortfolioItem={handleUpdatePortfolioItem}
            onRemovePortfolioItem={handleRemovePortfolioItem}
            onSelectAsset={setSelectedAsset}
            onOpenAIForPortfolio={handleOpenAIForPortfolio}
            onToggleWatchlist={handleToggleWatchlist}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenSetAlert={handleOpenSetAlertForAsset}
          />
        )}

        {activeTab === 'ai' && (
          <AIAnalystView
            stocks={stocks}
            funds={funds}
            portfolio={portfolio}
            preselectedCode={aiTargetCode}
            preselectedType={aiTargetType}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            stocks={stocks}
            funds={funds}
            onOpenAIForCompare={handleOpenAIForCompare}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorView />
        )}
      </main>

      {/* Asset Detail & Chart Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onOpenAI={handleOpenAIForAsset}
          onAddToPortfolio={handleAddToPortfolio}
          onToggleWatchlist={handleToggleWatchlist}
          isWatchlisted={isAssetWatchlisted(selectedAsset)}
          onOpenSetAlert={handleOpenSetAlertForAsset}
        />
      )}

      {/* Manual Price Alerts & Opportunities Modal */}
      <PriceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onUpdateAlert={handleUpdateAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlert={handleToggleAlert}
        onResetAlert={handleResetAlert}
        preselectedAsset={alertPreselectedAsset}
        stocks={stocks}
        funds={funds}
        indices={indices}
        onSelectAsset={setSelectedAsset}
      />

      {/* Google Sheets Backup & Restore Modal */}
      {isBackupModalOpen && (
        <GoogleSheetsBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          portfolio={portfolio}
          stocks={stocks}
          funds={funds}
          watchlist={watchlist}
          alerts={alerts}
          onRestorePortfolio={handleRestorePortfolio}
        />
      )}

      {/* Mandatory SPK Disclaimer Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                BIST (Yahoo Finance) & TEFAS (Takasbank) Canlı Veri Akışı Aktif
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                (Son Güncelleme: {lastRefreshed.toLocaleTimeString('tr-TR')})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono text-[11px] font-semibold">
                ● CANLI PİYASA BAĞLANTISI
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                BIST 100 • TEFAS • BEFAS • KAP
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>SPK Yasal Uyarı:</span>
            </div>
            <p className="leading-relaxed">
              Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. Burada yer alan yapay zeka analizleri ve veriler genel nitelikte olup, herhangi bir yatırım aracının alım-satım önerisi veya getiri vaadi olarak yorumlanamaz.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
