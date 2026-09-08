export function normalizeTurkishText(text: string): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function matchesSearch(itemText: string, query: string): boolean {
  if (!query) return true;
  const q = query.trim();
  if (!q) return true;
  
  // Direct match or normalized match
  if (itemText.toLowerCase().includes(q.toLowerCase())) return true;
  
  const normQuery = normalizeTurkishText(q);
  if (!normQuery) return true;
  const normItem = normalizeTurkishText(itemText);
  return normItem.includes(normQuery);
}

export function formatCurrency(value: number, currency: string = 'TL', decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00 TL';
  
  // For small fund prices (e.g. 0.842150 TL or 1.482930 TL), show more decimals
  const effDecimals = value < 10 && value > 0 && Math.floor(value) !== value ? (value < 1 ? 6 : (decimals > 2 ? decimals : 4)) : decimals;
  
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: effDecimals,
    maximumFractionDigits: effDecimals
  }).format(value) + (currency ? ` ${currency}` : '');
}

export function formatPercent(value: number, includeSign: boolean = true, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '%0,00';
  
  const absFormatted = Math.abs(value).toLocaleString('tr-TR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });

  if (value > 0) {
    return `${includeSign ? '+' : ''}%${absFormatted}`;
  } else if (value < 0) {
    return `-%${absFormatted}`;
  } else {
    return `%${absFormatted}`;
  }
}

export function formatCompactNumber(value: number, suffix: string = 'TL'): string {
  if (!value || isNaN(value)) return `0 ${suffix}`;
  
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Trilyon ${suffix}`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Milyar ${suffix}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Milyon ${suffix}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Bin ${suffix}`;
  }
  return `${value.toLocaleString('tr-TR')} ${suffix}`;
}

export function getRiskColor(risk: number): { bg: string; text: string; border: string } {
  switch (risk) {
    case 1:
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 2:
      return { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' };
    case 3:
      return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 4:
      return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 5:
      return { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' };
    case 6:
      return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
    case 7:
      return { bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-800 dark:text-red-400', border: 'border-red-300 dark:border-red-700' };
    default:
      return { bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

export function getDaysDifference(fromDateStr: string): number {
  if (!fromDateStr) return 0;
  const from = new Date(fromDateStr);
  const now = new Date();
  // Strip time parts for accurate day diff
  const utc1 = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utc2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.max(0, Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24)));
  return diffDays;
}

export function formatHoldingDuration(fromDateStr: string): string {
  const days = getDaysDifference(fromDateStr);
  if (days === 0) return 'Bugün';
  if (days === 1) return '1 gün';
  if (days < 30) return `${days} gün`;
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months < 12) {
    if (remainingDays === 0) return `${months} ay`;
    return `${months} ay ${remainingDays} gün`;
  }
  
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years} yıl`;
  return `${years} yıl ${remainingMonths} ay`;
}

export function formatDateTurkish(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function calculateAnnualizedReturn(returnPercent: number, days: number): number | null {
  if (days < 7) return null; // Avoid extreme distortion for 1-6 days holding
  const r = returnPercent / 100;
  if (r <= -1) return -100;
  
  const factor = 365 / days;
  const annualized = (Math.pow(1 + r, factor) - 1) * 100;
  
  // Cap absurd mathematical extrapolations for safety
  if (annualized > 9999) return 9999;
  if (annualized < -99.9) return -99.9;
  return annualized;
}

