import { PricePoint } from '../types';

export function generateHistory(basePrice: number, volatility: number = 0.015, trend: number = 0.0005): Record<string, PricePoint[]> {
  const now = new Date();
  
  // 1D: 30 intraday intervals
  const d1: PricePoint[] = [];
  let currentPrice = basePrice * (1 - (Math.random() * 0.02 - 0.01));
  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hourStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 0.4 - volatility * 0.2) + trend * 0.1);
    d1.push({ date: hourStr, price: Number(currentPrice.toFixed(2)) });
  }
  d1[d1.length - 1].price = basePrice;

  // 1W: 7 days
  const w1: PricePoint[] = [];
  currentPrice = basePrice * (1 - (Math.random() * 0.04 - 0.01));
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility - volatility * 0.48));
    w1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  w1[w1.length - 1].price = basePrice;

  // 1M: 30 days
  const m1: PricePoint[] = [];
  currentPrice = basePrice * 0.92;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 1.2 - volatility * 0.55));
    m1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  m1[m1.length - 1].price = basePrice;

  // 3M: 90 days (sampled every 3 days)
  const m3: PricePoint[] = [];
  currentPrice = basePrice * 0.85;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3 * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 1.5 - volatility * 0.7));
    m3.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  m3[m3.length - 1].price = basePrice;

  // 1Y: 12 months
  const y1: PricePoint[] = [];
  currentPrice = basePrice * 0.65;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
    currentPrice = currentPrice * (1 + (Math.random() * 0.08 - 0.02) + 0.03);
    y1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  y1[y1.length - 1].price = basePrice;

  // 5Y: 5 years
  const y5: PricePoint[] = [];
  currentPrice = basePrice * 0.18;
  for (let i = 4; i >= 0; i--) {
    const year = now.getFullYear() - i;
    currentPrice = currentPrice * (1.45 + (Math.random() * 0.3 - 0.15));
    y5.push({ date: year.toString(), price: Number(currentPrice.toFixed(2)) });
  }
  y5[y5.length - 1].price = basePrice;

  return { '1D': d1, '1W': w1, '1M': m1, '3M': m3, '1Y': y1, '5Y': y5 };
}
