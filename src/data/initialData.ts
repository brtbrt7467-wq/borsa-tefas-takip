import { Stock, Fund, MarketIndex } from '../types';
import { generateHistory } from './historyHelper';
import { INITIAL_STOCKS } from './stocksData';
import { INITIAL_FUNDS } from './fundsData';

export { generateHistory, INITIAL_STOCKS, INITIAL_FUNDS };

export const INITIAL_MARKET_INDICES: MarketIndex[] = [
  {
    code: 'XU100',
    name: 'BIST 100',
    value: 9942.50,
    change: 142.30,
    changePercent: 1.45,
    high: 9988.40,
    low: 9812.10,
    volume: '94.2 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XU030',
    name: 'BIST 30',
    value: 10875.20,
    change: 178.60,
    changePercent: 1.67,
    high: 10920.00,
    low: 10730.50,
    volume: '71.5 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XBANK',
    name: 'BIST Banka',
    value: 14250.80,
    change: 365.10,
    changePercent: 2.63,
    high: 14380.00,
    low: 13950.00,
    volume: '28.4 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XUSIN',
    name: 'BIST Sınai',
    value: 13890.40,
    change: 85.20,
    changePercent: 0.62,
    high: 13950.00,
    low: 13780.00,
    volume: '36.8 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'USDTRY',
    name: 'Dolar / TL',
    value: 36.82,
    change: 0.04,
    changePercent: 0.11,
    high: 36.88,
    low: 36.75,
    lastUpdated: '18:15:00'
  },
  {
    code: 'EURTRY',
    name: 'Euro / TL',
    value: 38.65,
    change: 0.08,
    changePercent: 0.21,
    high: 38.74,
    low: 38.52,
    lastUpdated: '18:15:00'
  },
  {
    code: 'GAU_TRY',
    name: 'Gram Altın',
    value: 3410.50,
    change: 28.50,
    changePercent: 0.84,
    high: 3425.00,
    low: 3380.00,
    lastUpdated: '18:15:00'
  },
  {
    code: 'REPO',
    name: 'TCMB Politika Faizi',
    value: 37.00,
    change: 0.00,
    changePercent: 0.00,
    lastUpdated: 'Güncel'
  }
];
