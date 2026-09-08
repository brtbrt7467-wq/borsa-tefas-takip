import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  Loader2, 
  X, 
  Download, 
  Upload, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  Database,
  UserCheck,
  LogOut,
  RefreshCw,
  Clock,
  FileText,
  HelpCircle,
  FileJson,
  FolderOpen,
  PlusCircle,
  RotateCcw,
  Clipboard,
  ClipboardCheck,
  Smartphone,
  Share2
} from 'lucide-react';
import { PortfolioItem, Stock, Fund, WatchlistItem, PortfolioCategory, PriceAlert } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { googleSignIn, getCachedAccessToken, googleSignOut, initAuth, isSafariPWA, isIOSDevice } from '../lib/googleAuth';
import { User } from 'firebase/auth';

interface GoogleSheetsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioItem[];
  stocks: Stock[];
  funds: Fund[];
  watchlist?: WatchlistItem[];
  alerts?: PriceAlert[];
  onRestorePortfolio: (newPortfolio: PortfolioItem[], newWatchlist?: WatchlistItem[], mode?: 'replace' | 'merge', newAlerts?: PriceAlert[]) => void;
}

interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface ParsedRestoreData {
  portfolioItems: PortfolioItem[];
  watchlist: WatchlistItem[];
  alerts?: PriceAlert[];
  sourceName: string;
}

export const GoogleSheetsBackupModal: React.FC<GoogleSheetsBackupModalProps> = ({
  isOpen,
  onClose,
  portfolio,
  stocks,
  funds,
  watchlist = [],
  alerts = [],
  onRestorePortfolio
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupStep, setBackupStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [backupDate, setBackupDate] = useState<string | null>(null);

  // Restore states
  const [restoreSubTab, setRestoreSubTab] = useState<'url' | 'paste' | 'file' | 'drive'>('url');
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [customSheetUrl, setCustomSheetUrl] = useState<string>('');
  const [pastedContent, setPastedContent] = useState<string>('');
  const [isParsingRestore, setIsParsingRestore] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedRestoreData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setAccessToken(token);
      },
      () => {
        // Not signed in or no token cached
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch Drive backups when entering restore tab with an access token
  useEffect(() => {
    if (activeTab === 'restore' && accessToken) {
      loadDriveBackups(accessToken);
    }
  }, [activeTab, accessToken]);

  const loadDriveBackups = async (token: string) => {
    setIsLoadingDriveFiles(true);
    try {
      const res = await fetch('/api/backup/sheets/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriveBackups(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load drive backups:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  if (!isOpen) return null;

  // Prepare Payload
  const preparePayload = () => {
    let totalValue = 0;
    let totalCost = 0;
    let stockValue = 0;
    let fundValue = 0;
    let besValue = 0;
    let bondValue = 0;
    let eurobondValue = 0;
    let goldFxValue = 0;
    let cryptoValue = 0;
    let depositValue = 0;
    let otherValue = 0;
    let totalDailyNominal = 0;

    const itemsWithLive = portfolio.map(item => {
      const liveAsset = item.type === 'stock' 
        ? stocks.find(s => s.code.toUpperCase() === item.code.toUpperCase())
        : funds.find(f => f.code.toUpperCase() === item.code.toUpperCase());

      const curPrice = item.currentPrice || (liveAsset ? liveAsset.price : item.averageCost);
      const costVal = item.quantity * item.averageCost;
      const curVal = item.quantity * curPrice;
      const profitLoss = curVal - costVal;
      const profitLossPercent = costVal > 0 ? (profitLoss / costVal) * 100 : 0;
      const changePercent = liveAsset?.changePercent || 0;

      const cat = item.category || (item.type === 'stock' ? 'stock' : 'fund');

      if (cat === 'stock') {
        stockValue += curVal;
      } else if (cat === 'fund') {
        fundValue += curVal;
      } else if (cat === 'bes') {
        besValue += curVal;
      } else if (cat === 'bond') {
        bondValue += curVal;
      } else if (cat === 'eurobond') {
        eurobondValue += curVal;
      } else if (cat === 'gold_fx') {
        goldFxValue += curVal;
      } else if (cat === 'crypto') {
        cryptoValue += curVal;
      } else if (cat === 'deposit') {
        depositValue += curVal;
      } else {
        otherValue += curVal;
      }

      totalValue += curVal;
      totalCost += costVal;

      if (liveAsset && 'change' in liveAsset && typeof (liveAsset as any).change === 'number') {
        totalDailyNominal += item.quantity * (liveAsset as any).change;
      } else if (changePercent !== -100) {
        totalDailyNominal += (curVal * changePercent) / (100 + changePercent);
      }

      const isItemPassive = item.status === 'passive' || item.isPassive || item.quantity <= 0.00001;

      return {
        id: item.id,
        code: item.code,
        name: liveAsset?.name || item.name,
        type: item.type,
        category: cat,
        quantity: isItemPassive ? 0 : item.quantity,
        averageCost: item.averageCost,
        currentPrice: curPrice,
        costValue: costVal,
        currentValue: curVal,
        profitLoss,
        profitLossPercent,
        changePercent,
        portfolioShare: 0,
        status: isItemPassive ? 'passive' : 'active',
        isPassive: isItemPassive,
        realizedProfitLoss: item.realizedProfitLoss || 0,
        transactions: item.transactions || [],
        nominalAmount: item.nominalAmount,
        nominalCurrency: item.nominalCurrency,
        priceInCurrency: item.priceInCurrency,
        buyExchangeRate: item.buyExchangeRate,
        couponRateAnnual: item.couponRateAnnual,
        couponFrequency: item.couponFrequency,
        interestRate: item.interestRate,
        maturityDate: item.maturityDate,
        addedDate: item.addedDate,
        notes: item.notes
      };
    });

    const netProfitLoss = totalValue - totalCost;
    const netProfitLossPercent = totalCost > 0 ? (netProfitLoss / totalCost) * 100 : 0;
    const prevDayPortfolioValue = totalValue - totalDailyNominal;
    const totalDailyChangePercent = prevDayPortfolioValue > 0 ? (totalDailyNominal / prevDayPortfolioValue) * 100 : 0;

    const formattedItems = itemsWithLive.map(i => ({
      ...i,
      portfolioShare: totalValue > 0 ? (i.currentValue / totalValue) * 100 : 0
    }));

    const formattedWatchlist = watchlist.map(w => {
      const live = w.type === 'stock'
        ? stocks.find(s => s.code.toUpperCase() === w.code.toUpperCase())
        : funds.find(f => f.code.toUpperCase() === w.code.toUpperCase());
      return {
        code: w.code,
        name: live?.name || w.name,
        type: w.type,
        price: live?.price || w.price,
        changePercent: live?.changePercent,
        sector: (live as any)?.sector || (live as any)?.fundCategory
      };
    });

    return {
      summary: {
        totalValue,
        totalCost,
        netProfitLoss,
        netProfitLossPercent,
        totalDailyChange: totalDailyNominal,
        totalDailyChangePercent,
        stockValue,
        fundValue,
        besValue,
        bondValue,
        eurobondValue,
        goldFxValue,
        cryptoValue,
        depositValue,
        otherValue,
        itemCount: portfolio.length
      },
      portfolioItems: formattedItems,
      watchlist: formattedWatchlist,
      alerts: alerts || [],
      timestamp: new Date().toISOString()
    };
  };

  const handleSignInAndBackup = async () => {
    setErrorMsg(null);
    setIsAuthenticating(true);
    try {
      let token = accessToken;
      if (!token) {
        setBackupStep('Google hesabı ile yetkilendiriliyor...');
        const authRes = await googleSignIn();
        setCurrentUser(authRes.user);
        setAccessToken(authRes.accessToken);
        token = authRes.accessToken;
      }
      if (token) {
        await executeSheetsBackup(token);
      }
    } catch (err: any) {
      console.error('Sign-in/Backup error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google yetkilendirme penceresi kapatıldı. Lütfen tekrar deneyin.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Yetkilendirme isteği iptal edildi.');
      } else {
        setErrorMsg(err.message || 'Google yetkilendirmesi sırasında bir hata oluştu.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const executeSheetsBackup = async (token: string) => {
    setIsBackingUp(true);
    setErrorMsg(null);
    setBackupStep('Portföy ve Fiyat Alarmları hazırlanıyor, Google Sheets tablosu oluşturuluyor...');
    try {
      const payload = preparePayload();
      const res = await fetch('/api/backup/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google Sheets yedeği alınamadı.');
      }

      setSuccessUrl(data.spreadsheetUrl);
      setBackupDate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' }));
      setBackupStep('');
      // Refresh drive backups list
      loadDriveBackups(token);
    } catch (err: any) {
      console.error('Backup request failed:', err);
      setErrorMsg(err.message || 'Yedek oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Google Sheets'ten Geri Yükleme çağrısı (Token isteğe bağlı)
  const handleRestoreFromGoogleSpreadsheet = async (sheetIdOrUrl: string, title?: string) => {
    setErrorMsg(null);
    setRestoreSuccessMsg(null);
    setIsParsingRestore(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/backup/sheets/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ spreadsheetIdOrUrl: sheetIdOrUrl })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Google Sheets yedeği okunamadı.');
      }

      const rawItems = result.data.portfolioItems || [];
      const rawWatch = result.data.watchlist || [];
      const rawAlerts = result.data.alerts || [];

      // Map to PortfolioItem format
      const mappedPortfolio: PortfolioItem[] = rawItems.map((item: any, idx: number) => {
        const rawQty = typeof item.quantity === 'number' ? item.quantity : (parseFloat(String(item.quantity).replace(',', '.')) || 0);
        const isPassive = rawQty <= 0.00001 || item.status === 'passive' || item.isPassive === true;
        return {
          id: item.id || `p-restored-${item.code}-${idx}`,
          type: item.type === 'fund' ? 'fund' : 'stock',
          category: item.category || (item.type === 'fund' ? 'fund' : 'stock'),
          code: item.code,
          name: item.name || item.code,
          quantity: isPassive ? 0 : rawQty,
          averageCost: item.averageCost || 0,
          currentPrice: item.currentPrice || item.averageCost,
          status: isPassive ? 'passive' : 'active',
          isPassive,
          realizedProfitLoss: item.realizedProfitLoss || 0,
          transactions: item.transactions || [],
          nominalAmount: item.nominalAmount,
          nominalCurrency: item.nominalCurrency,
          priceInCurrency: item.priceInCurrency,
          buyExchangeRate: item.buyExchangeRate,
          couponRateAnnual: item.couponRateAnnual,
          couponFrequency: item.couponFrequency,
          interestRate: item.interestRate,
          maturityDate: item.maturityDate,
          addedDate: item.addedDate || new Date().toISOString().split('T')[0],
          notes: item.notes || (isPassive ? 'Kapatılan Pozisyon (Yedekten)' : 'Google Sheets Yedeğinden Geri Yüklendi')
        };
      });

      const mappedWatchlist: WatchlistItem[] = rawWatch.map((w: any, idx: number) => ({
        id: w.id || `w-restored-${w.code}-${idx}`,
        type: w.type === 'fund' ? 'fund' : 'stock',
        code: w.code,
        name: w.name || w.code,
        price: w.price || 0,
        changePercent: w.changePercent,
        sector: w.sector,
        addedDate: new Date().toISOString().split('T')[0]
      }));

      setParsedData({
        portfolioItems: mappedPortfolio,
        watchlist: mappedWatchlist,
        alerts: rawAlerts,
        sourceName: title || result.data.summaryTitle || 'Google Sheets Yedeği'
      });
    } catch (err: any) {
      console.error('Restore error:', err);
      setErrorMsg(err.message || 'E-Tablodan geri yükleme yapılırken hata oluştu.');
    } finally {
      setIsParsingRestore(false);
    }
  };

  // Direct Paste Parser (Google Sheets copied cells, CSV, or JSON)
  const handleParsePastedContent = (text: string) => {
    setErrorMsg(null);
    setRestoreSuccessMsg(null);
    if (!text || !text.trim()) {
      setErrorMsg('Lütfen yapıştırılacak metin veya tablo verisi girin.');
      return;
    }

    const trimmed = text.trim();

    // 1. Try JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const rawItems = parsed.portfolioItems || (Array.isArray(parsed) ? parsed : []);
        const rawWatch = parsed.watchlist || [];
        const rawAlerts = parsed.alerts || [];

        const items: PortfolioItem[] = rawItems.map((p: any, idx: number) => {
          const rawQty = typeof p.quantity === 'number' ? p.quantity : (parseFloat(String(p.quantity).replace(',', '.')) || 0);
          const isPassive = rawQty <= 0.00001 || p.status === 'passive' || p.isPassive === true;
          return {
            id: p.id || `p-pasted-${p.code}-${idx}`,
            type: p.type === 'fund' ? 'fund' : 'stock',
            category: p.category || (p.type === 'fund' ? 'fund' : 'stock'),
            code: String(p.code || '').toUpperCase().trim(),
            name: p.name || p.code,
            quantity: isPassive ? 0 : rawQty,
            averageCost: Number(p.averageCost) || 0,
            currentPrice: Number(p.currentPrice) || Number(p.averageCost),
            status: isPassive ? 'passive' : 'active',
            isPassive,
            realizedProfitLoss: p.realizedProfitLoss || 0,
            transactions: p.transactions || [],
            nominalAmount: p.nominalAmount,
            nominalCurrency: p.nominalCurrency,
            priceInCurrency: p.priceInCurrency,
            buyExchangeRate: p.buyExchangeRate,
            couponRateAnnual: p.couponRateAnnual,
            couponFrequency: p.couponFrequency,
            interestRate: p.interestRate ? Number(p.interestRate) : undefined,
            maturityDate: p.maturityDate,
            addedDate: p.addedDate || new Date().toISOString().split('T')[0],
            notes: p.notes || (isPassive ? 'Kapatılan Pozisyon' : 'Yapıştırılan Veriden Yüklendi')
          };
        }).filter((i: PortfolioItem) => i.code.length > 0);

        if (items.length > 0 || rawWatch.length > 0 || rawAlerts.length > 0) {
          setParsedData({
            portfolioItems: items,
            watchlist: rawWatch,
            alerts: rawAlerts,
            sourceName: 'Yapıştırılan JSON Verisi'
          });
          return;
        }
      } catch (jsonErr) {
        // Continue to table/csv parsing
      }
    }

    // 2. Try Table / TSV / CSV parsing
    try {
      const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('Geçerli satır bulunamadı.');
      }

      const items: PortfolioItem[] = [];
      const cleanNum = (val: any, fallback = 0): number => {
        if (typeof val === 'number') return isNaN(val) ? fallback : val;
        if (val === undefined || val === null || val === '') return fallback;
        const str = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? fallback : num;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) continue;

        const firstCol = cols[0].toLowerCase();
        if (firstCol.includes('kod') || firstCol.includes('sembol') || firstCol.includes('varlık') || firstCol.includes('kategori') || firstCol.includes('metrik') || firstCol.includes('hisse')) {
          continue;
        }

        let code = '';
        let name = '';
        let qty = 0;
        let cost = 0;
        let price = 0;
        let category: PortfolioCategory = 'stock';

        // Format A: Kategori | Tip | Kod | Ad | Adet | Maliyet | Fiyat ...
        if (cols.length >= 5 && cols[2] && cols[2].length <= 10 && !/\d{4,}/.test(cols[2])) {
          code = cols[2].toUpperCase();
          name = cols[3] || code;
          qty = cleanNum(cols[4], 0);
          cost = cleanNum(cols[5], 0);
          price = cleanNum(cols[6], cost);
          const catStr = (cols[0] + ' ' + cols[1]).toLowerCase();
          if (catStr.includes('bes')) category = 'bes';
          else if (catStr.includes('fon') || catStr.includes('tefas')) category = 'fund';
          else if (catStr.includes('eurobond')) category = 'eurobond';
          else if (catStr.includes('bono') || catStr.includes('tahvil')) category = 'bond';
          else if (catStr.includes('altın') || catStr.includes('döviz') || catStr.includes('fx')) category = 'gold_fx';
          else if (catStr.includes('kripto')) category = 'crypto';
          else if (catStr.includes('mevduat')) category = 'deposit';
        } else {
          // Format B: Kod | Ad (opsiyonel) | Adet | Maliyet | Güncel Fiyat
          code = (cols[0] || '').toUpperCase().trim();
          if (cols.length >= 4 && isNaN(parseFloat(cols[1].replace(',', '.')))) {
            name = cols[1];
            qty = cleanNum(cols[2], 0);
            cost = cleanNum(cols[3], 0);
            price = cleanNum(cols[4], cost);
          } else {
            name = code;
            qty = cleanNum(cols[1], 0);
            cost = cleanNum(cols[2], 0);
            price = cleanNum(cols[3], cost);
          }

          if (code.length === 3 && !code.endsWith('.IS')) {
            category = 'fund';
          }
        }

        if (code && code.length >= 2 && code !== 'TOPLAM') {
          const isPassive = qty <= 0.00001;
          items.push({
            id: `p-pasted-${code}-${i}`,
            type: category === 'fund' || category === 'bes' ? 'fund' : 'stock',
            category,
            code,
            name: name || code,
            quantity: isPassive ? 0 : qty,
            averageCost: cost,
            currentPrice: price > 0 ? price : cost,
            status: isPassive ? 'passive' : 'active',
            isPassive,
            addedDate: new Date().toISOString().split('T')[0],
            notes: isPassive ? 'Kapatılan Pozisyon (Tablodan)' : 'Tablodan Kopyalanarak Eklendi'
          });
        }
      }

      if (items.length === 0) {
        throw new Error('Yapıştırılan metinden hisse/fon kodu ve adet bilgisi çıkarılamadı. Lütfen satırları kontrol edin.');
      }

      setParsedData({
        portfolioItems: items,
        watchlist: [],
        sourceName: `Yapıştırılan ${items.length} Kalem Tablo Verisi`
      });
    } catch (e: any) {
      setErrorMsg(`Ayrıştırma hatası: ${e.message}`);
    }
  };

  // Local JSON & CSV File Restore
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setRestoreSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          let items: PortfolioItem[] = [];
          let watch: WatchlistItem[] = [];

          if (parsed.portfolioItems && Array.isArray(parsed.portfolioItems)) {
            items = parsed.portfolioItems.map((p: any, idx: number) => {
              const rawQty = typeof p.quantity === 'number' ? p.quantity : (parseFloat(String(p.quantity).replace(',', '.')) || 0);
              const isPassive = rawQty <= 0.00001 || p.status === 'passive' || p.isPassive === true;
              return {
                id: p.id || `p-json-${p.code}-${idx}`,
                type: p.type === 'fund' ? 'fund' : 'stock',
                category: p.category || (p.type === 'fund' ? 'fund' : 'stock'),
                code: p.code,
                name: p.name || p.code,
                quantity: isPassive ? 0 : rawQty,
                averageCost: Number(p.averageCost) || 0,
                currentPrice: Number(p.currentPrice) || Number(p.averageCost),
                status: isPassive ? 'passive' : 'active',
                isPassive,
                realizedProfitLoss: p.realizedProfitLoss || 0,
                transactions: p.transactions || [],
                nominalAmount: p.nominalAmount,
                nominalCurrency: p.nominalCurrency,
                priceInCurrency: p.priceInCurrency,
                buyExchangeRate: p.buyExchangeRate,
                couponRateAnnual: p.couponRateAnnual,
                couponFrequency: p.couponFrequency,
                interestRate: p.interestRate ? Number(p.interestRate) : undefined,
                maturityDate: p.maturityDate,
                addedDate: p.addedDate || new Date().toISOString().split('T')[0],
                notes: p.notes || (isPassive ? 'Kapatılan Pozisyon (JSON)' : 'JSON Yedeğinden Yüklendi')
              };
            });
          }

          let parsedAlerts: PriceAlert[] = [];
          if (parsed.alerts && Array.isArray(parsed.alerts)) {
            parsedAlerts = parsed.alerts.map((a: any, idx: number) => ({
              id: a.id || `alt_json_${Date.now()}_${idx}`,
              code: String(a.code || '').toUpperCase().trim(),
              name: a.name || a.code,
              type: a.type || 'stock',
              targetPrice: Number(a.targetPrice) || 0,
              condition: a.condition === 'below' ? 'below' : 'above',
              active: a.active !== false,
              triggered: !!a.triggered,
              frequency: a.frequency === 'persistent' ? 'persistent' : 'once',
              createdAt: a.createdAt || new Date().toISOString(),
              triggeredAt: a.triggeredAt,
              triggeredPrice: a.triggeredPrice ? Number(a.triggeredPrice) : undefined,
              initialPrice: a.initialPrice ? Number(a.initialPrice) : undefined,
              currentPrice: a.currentPrice ? Number(a.currentPrice) : undefined,
              lastEvaluatedPrice: a.lastEvaluatedPrice ? Number(a.lastEvaluatedPrice) : undefined,
              notifyEmail: a.notifyEmail,
              notes: a.notes
            }));
          }

          if (parsed.watchlist && Array.isArray(parsed.watchlist)) {
            watch = parsed.watchlist.map((w: any, idx: number) => ({
              id: w.id || `w-json-${w.code}-${idx}`,
              type: w.type === 'fund' ? 'fund' : 'stock',
              code: w.code,
              name: w.name || w.code,
              price: Number(w.price) || 0,
              changePercent: Number(w.changePercent) || 0,
              sector: w.sector,
              addedDate: new Date().toISOString().split('T')[0]
            }));
          }

          if (items.length === 0 && watch.length === 0 && parsedAlerts.length === 0) {
            throw new Error('Dosyada geçerli portföy veya alarm verisi bulunamadı.');
          }

          setParsedData({
            portfolioItems: items,
            watchlist: watch,
            alerts: parsedAlerts,
            sourceName: file.name
          });
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          const items: PortfolioItem[] = [];

          const cleanNum = (val: any, fallback = 0): number => {
            if (typeof val === 'number') return isNaN(val) ? fallback : val;
            if (val === undefined || val === null || val === '') return fallback;
            const str = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
            const num = parseFloat(str);
            return isNaN(num) ? fallback : num;
          };

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 4) continue;

            const categoryRaw = cols[0].toLowerCase();
            let category: PortfolioCategory = 'stock';
            let type: 'stock' | 'fund' = 'stock';

            if (categoryRaw.includes('eurobond') || categoryRaw.includes('euro-bond')) {
              category = 'eurobond';
              type = 'fund';
            } else if (categoryRaw.includes('bono') || categoryRaw.includes('tahvil') || categoryRaw.includes('dibs')) {
              category = 'bond';
              type = 'fund';
            } else if (categoryRaw.includes('bes')) {
              category = 'bes';
              type = 'fund';
            } else if (categoryRaw.includes('tefas') || categoryRaw.includes('fon')) {
              category = 'fund';
              type = 'fund';
            } else if (categoryRaw.includes('kripto') || categoryRaw.includes('crypto')) {
              category = 'crypto';
              type = 'stock';
            } else if (categoryRaw.includes('altın') || categoryRaw.includes('altin') || categoryRaw.includes('döviz') || categoryRaw.includes('doviz')) {
              category = 'gold_fx';
              type = 'stock';
            } else if (categoryRaw.includes('mevduat') || categoryRaw.includes('faiz')) {
              category = 'deposit';
              type = 'fund';
            } else if (categoryRaw.includes('diğer') || categoryRaw.includes('diger')) {
              category = 'other';
              type = 'stock';
            } else {
              category = 'stock';
              type = 'stock';
            }

            const code = (cols[1] || cols[0]).toUpperCase();
            const name = cols[2] || code;
            const qty = cleanNum(cols[3], 0);
            const cost = cleanNum(cols[4], 0);
            const price = cleanNum(cols[5], cost);
            const interestRate = cols[10] ? cleanNum(cols[10], undefined as any) : undefined;
            const maturityDate = cols[11] && cols[11] !== '-' ? cols[11] : undefined;
            const notes = cols[12] || '';
            const isPassive = qty <= 0.00001;

            if (!code || code.length < 2) continue;

            items.push({
              id: `p-csv-${code}-${i}`,
              type,
              category,
              code,
              name,
              quantity: isPassive ? 0 : qty,
              averageCost: cost,
              currentPrice: price,
              status: isPassive ? 'passive' : 'active',
              isPassive,
              interestRate: typeof interestRate === 'number' && !isNaN(interestRate) ? interestRate : undefined,
              maturityDate,
              addedDate: new Date().toISOString().split('T')[0],
              notes: notes || (isPassive ? 'Kapatılan Pozisyon (CSV Yedeği)' : 'CSV Yedeğinden Yüklendi')
            });
          }

          if (items.length === 0) {
            throw new Error('CSV dosyasında geçerli hisse, fon veya varlık verisi okunamadı.');
          }

          setParsedData({
            portfolioItems: items,
            watchlist: [],
            sourceName: file.name
          });
        } else {
          throw new Error('Desteklenmeyen dosya formatı. Lütfen .json veya .csv dosyası seçin.');
        }
      } catch (err: any) {
        setErrorMsg(`Dosya okuma hatası: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Finalize Restore to App
  const handleConfirmApplyRestore = () => {
    if (!parsedData) return;

    onRestorePortfolio(parsedData.portfolioItems, parsedData.watchlist, restoreMode, parsedData.alerts);
    const alertCountText = parsedData.alerts && parsedData.alerts.length > 0 ? ` ve ${parsedData.alerts.length} fiyat alarmı` : '';
    setRestoreSuccessMsg(
      `${parsedData.portfolioItems.length} portföy varlığı${alertCountText} ${restoreMode === 'replace' ? 'başarıyla geri yüklendi (üzerine yazıldı)' : 'mevcut portföye eklendi'}.`
    );
    setParsedData(null);
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setCurrentUser(null);
    setAccessToken(null);
    setSuccessUrl(null);
    setDriveBackups([]);
  };

  // Local JSON download fallback
  const downloadLocalJSON = () => {
    const payload = preparePayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfoy_yedegi_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Local CSV export fallback
  const downloadLocalCSV = () => {
    const payload = preparePayload();
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Kategori,Tip,Kod,Varlık Adı,Adet/Miktar,Maliyet (TL),Güncel Fiyat (TL),Toplam Değer (TL),Kâr/Zarar (TL),Getiri (%),Faiz Oranı (%),Vade Sonu,Notlar\r\n';
    
    payload.portfolioItems.forEach(item => {
      const catLabel = item.category === 'bes' ? 'BES Fonu'
        : item.category === 'bond' ? 'Bono / Tahvil'
        : item.category === 'eurobond' ? 'Eurobond'
        : item.category === 'gold_fx' ? 'Altın/Döviz'
        : item.category === 'crypto' ? 'Kripto'
        : item.category === 'deposit' ? 'Mevduat'
        : item.category === 'other' ? 'Diğer'
        : item.type === 'stock' ? 'Hisse' : 'TEFAS Fonu';

      const row = [
        catLabel,
        item.type === 'stock' ? 'Hisse' : 'Fon',
        item.code,
        `"${item.name.replace(/"/g, '""')}"`,
        item.quantity,
        item.averageCost,
        item.currentPrice,
        item.currentValue.toFixed(2),
        item.profitLoss.toFixed(2),
        `%${item.profitLossPercent.toFixed(2)}`,
        item.interestRate ? `%${item.interestRate}` : '-',
        item.maturityDate || '-',
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portfoy_tablosu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const payloadPreview = preparePayload();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Google Sheets Portföy Merkezi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Portföyünüzü Google E-Tablolar'a yedekleyin veya eski bir yedekten anında geri yükleyin.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Yedek Al vs Geri Yükle) */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => { setActiveTab('backup'); setErrorMsg(null); setRestoreSuccessMsg(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Yedek Al (Google Sheets'e Aktar)</span>
          </button>

          <button
            onClick={() => { setActiveTab('restore'); setErrorMsg(null); setRestoreSuccessMsg(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'restore'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yedekten Geri Yükle</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Active User Banner if Signed In */}
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-emerald-300 dark:border-emerald-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {currentUser.displayName || 'Google Kullanıcısı'}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Hesap Değiştir / Çıkış"
                className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors text-xs flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış</span>
              </button>
            </div>
          )}

          {/* Safari PWA / iOS standalone helper banner */}
          {isSafariPWA() && !currentUser && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Safari Ana Ekran (PWA) Modu Algılandı</span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    Apple WebKit güvenlik kısıtlamaları nedeniyle pop-up girişleri engellenebilir. Google hesabınızı tarayıcıda bir kez bağlayabilir veya aşağıdaki kesintisiz <strong>JSON/CSV Yedek</strong> seçeneklerini kullanabilirsiniz.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Safari Tarayıcısında Aç</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {restoreSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="font-semibold">{restoreSuccessMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 pl-6">
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-[11px] flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Safari'de Aç</span>
                </button>
                <button
                  type="button"
                  onClick={downloadLocalJSON}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON Yedeği İndir</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Summary Mini Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Portföy Varlığı</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {payloadPreview.summary.itemCount} Kalem
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Toplam Değer</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                    {formatCurrency(payloadPreview.summary.totalValue, 'TL')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[11px] font-medium text-slate-500 block">Net Kâr / Getiri</span>
                  <span className={`text-lg font-bold font-mono mt-0.5 block truncate ${payloadPreview.summary.netProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatPercent(payloadPreview.summary.netProfitLossPercent)}
                  </span>
                </div>
              </div>

              {/* Backup Structure Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  Ayrı Ayrı Oluşturulacak E-Tablo Sayfaları
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Portföy Özeti:</strong> Genel metrikler & varlık dağılımı</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Hisse Senetleri:</strong> BIST hisseleri, lot, maliyet, kâr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>TEFAS Fonları:</strong> Yatırım fonları & birim paylar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>BES Fonları:</strong> Emeklilik plan & BEFAS fonları</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Bono ve Tahviller:</strong> DİBS, devlet & özel sektör tahvilleri</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Eurobond:</strong> USD/EUR cinsi dış borçlanma senetleri</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Altın ve Döviz:</strong> Gram altın, döviz & emtialar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Kripto Varlıklar:</strong> BTC, ETH & coin pozisyonları</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Mevduat:</strong> Vadeli hesaplar, faiz oranı, vade sonu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Takip Listesi:</strong> İzleme listesindeki fiyatlar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Fiyat Alarmları:</strong> Kurulu alarmlar ({alerts.length} adet), koşullar, hedefler</span>
                  </div>
                </div>
              </div>

              {/* Success State */}
              {successUrl && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                      Google E-Tablo Yedeği Başarıyla Oluşturuldu!
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Yedekleme saati: {backupDate}. Tablonuz Google Drive hesabınızda hazır.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={successUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all"
                    >
                      <span>Google Sheets'te Aç</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => accessToken && executeSheetsBackup(accessToken)}
                      disabled={isBackingUp}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all border border-slate-200 dark:border-slate-700"
                    >
                      {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      <span>Yeniden Güncelle</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Backup Action Button */}
              {!successUrl && (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleSignInAndBackup}
                    disabled={isAuthenticating || isBackingUp}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-sm sm:text-base shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating || isBackingUp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                        <span>{backupStep || 'İşlem yapılıyor...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>{currentUser ? "Google Sheets'e Yedekle" : "Google ile Bağlan ve Sheets'e Yedekle"}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Google Drive ve E-Tablolar resmi API güvenlik standartları kullanılır.</span>
                  </div>
                </div>
              )}

              {/* Alternative Local Downloads (JSON & CSV) */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Alternatif Yerel Yedekleme:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadLocalCSV}
                    title="Excel CSV İndir"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.csv)</span>
                  </button>

                  <button
                    onClick={downloadLocalJSON}
                    title="JSON Veri İndir"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'restore' && (
            <div className="space-y-6">
              
              {/* If preview ready */}
              {parsedData ? (
                <div className="space-y-5 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Yedek Dosyası Ayrıştırıldı</h4>
                        <p className="text-xs text-slate-500">{parsedData.sourceName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setParsedData(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                    >
                      Vazgeç
                    </button>
                  </div>

                  {/* Summary of parsed content by category */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Hisseler</span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {parsedData.portfolioItems.filter(i => i.category === 'stock' || (!i.category && i.type === 'stock')).length} Adet
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">TEFAS Fonları</span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {parsedData.portfolioItems.filter(i => i.category === 'fund' || (!i.category && i.type === 'fund')).length} Adet
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">BES Fonları</span>
                      <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'bes').length} Adet
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Bono & Tahvil</span>
                      <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'bond').length} Adet
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Eurobond</span>
                      <span className="text-sm font-bold font-mono text-teal-600 dark:text-teal-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'eurobond').length} Adet
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Altın & Döviz</span>
                      <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'gold_fx').length} Kalem
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Kripto</span>
                      <span className="text-sm font-bold font-mono text-orange-600 dark:text-orange-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'crypto').length} Kalem
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Mevduat</span>
                      <span className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                        {parsedData.portfolioItems.filter(i => i.category === 'deposit').length} Hesap
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Diğer</span>
                      <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                        {parsedData.portfolioItems.filter(i => i.category === 'other').length} Kalem
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Takip Listesi</span>
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {parsedData.watchlist.length} Kalem
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Fiyat Alarmları</span>
                      <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                        {parsedData.alerts?.length || 0} Alarm
                      </span>
                    </div>
                  </div>

                  {/* Varlık listesi önizlemesi */}
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-1.5">
                    {parsedData.portfolioItems.map((item, idx) => {
                      const cat = item.category || (item.type === 'fund' ? 'fund' : 'stock');
                      const badgeLabel = cat === 'bes' ? 'BES'
                        : cat === 'bond' ? 'Bono/Tahvil'
                        : cat === 'eurobond' ? 'Eurobond'
                        : cat === 'gold_fx' ? 'Altın/Döviz'
                        : cat === 'crypto' ? 'Kripto'
                        : cat === 'deposit' ? 'Mevduat'
                        : cat === 'other' ? 'Diğer'
                        : cat === 'fund' ? 'TEFAS' : 'Hisse';

                      const badgeColor = cat === 'bes' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : cat === 'bond' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : cat === 'eurobond' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                        : cat === 'gold_fx' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : cat === 'crypto' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        : cat === 'deposit' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                        : cat === 'other' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : cat === 'fund' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';

                      return (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badgeColor} shrink-0`}>
                              {badgeLabel}
                            </span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white shrink-0">{item.code}</span>
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[220px]">{item.name}</span>
                          </div>
                          <div className="font-mono text-slate-600 dark:text-slate-400 text-right shrink-0 text-[11px]">
                            {cat === 'deposit' ? (
                              <span>{formatCurrency(item.quantity, 'TL')} {item.interestRate ? `• %${item.interestRate}` : ''}</span>
                            ) : (
                              <span>{item.quantity} Adet • {formatCurrency(item.averageCost, 'TL')}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Restore Mode Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Geri Yükleme Yöntemi:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          restoreMode === 'replace'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold">Üzerine Yaz (Replace)</div>
                          <div className="text-[11px] text-slate-500">Mevcut portföyü silip bu yedek ile değiştirir.</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          restoreMode === 'merge'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold">Portföye Ekle (Merge)</div>
                          <div className="text-[11px] text-slate-500">Mevcut varlıklarınızı koruyarak birleştirir.</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Restore Button */}
                  <button
                    onClick={handleConfirmApplyRestore}
                    className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yedeği Portföye Uygula</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Restore Sub-Tab Navigation */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRestoreSubTab('url')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        restoreSubTab === 'url'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>E-Tablo Linki</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreSubTab('paste')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        restoreSubTab === 'paste'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Kopyala-Yapıştır</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreSubTab('file')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        restoreSubTab === 'file'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Dosyadan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreSubTab('drive')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        restoreSubTab === 'drive'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </button>
                  </div>

                  {/* Sub-Tab 1: Link or ID Restore */}
                  {restoreSubTab === 'url' && (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Google E-Tablo Bağlantısı veya Kimliği
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Google Sheets uygulamasından tablonun linkini kopyalayıp buraya yapıştırın.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customSheetUrl}
                          onChange={(e) => setCustomSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleRestoreFromGoogleSpreadsheet(customSheetUrl)}
                          disabled={isParsingRestore || !customSheetUrl.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          {isParsingRestore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          <span>E-Tablodan Portföyü Oku ve Geri Yükle</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        💡 <strong>İpucu:</strong> Safari PWA modundaysanız tablonun paylaşım ayarlarını <em>"Bağlantıya sahip olan herkes"</em> olarak ayarlamanız durumunda doğrudan ve sıfır hata ile içeri aktarılır.
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 2: Paste from Google Sheets or Excel */}
                  {restoreSubTab === 'paste' && (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Google E-Tablodan Kopyaladığınız Hücreleri Yapıştırın
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          E-Tablonuzdaki satırları (Hisse Senetleri, Fonlar vb.) seçip kopyalayın ve aşağıdaki alana yapıştırın.
                        </p>
                      </div>

                      <textarea
                        value={pastedContent}
                        onChange={(e) => setPastedContent(e.target.value)}
                        placeholder={`Örnek:\nTHYAO\tTürk Hava Yolları\t100\t280.50\t310.00\nTUPRS\tTüpraş\t50\t160.00\t175.50\nMAC\tMarmara Capital Fonu\t500\t12.50\t14.20`}
                        rows={5}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />

                      <button
                        onClick={() => handleParsePastedContent(pastedContent)}
                        disabled={!pastedContent.trim()}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Yapıştırılan Tabloyu Ayrıştır ve İncele</span>
                      </button>
                    </div>
                  )}

                  {/* Sub-Tab 3: File Upload (JSON / CSV) */}
                  {restoreSubTab === 'file' && (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv"
                        onChange={handleLocalFileUpload}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            JSON veya CSV Dosyası Seçin
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Telefonunuzun Dosyalar uygulamasından veya bilgisayardan yükleyin
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 4: Google Drive Account */}
                  {restoreSubTab === 'drive' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          Google Drive'daki Son Yedekleriniz
                        </h4>
                        {accessToken && (
                          <button
                            onClick={() => loadDriveBackups(accessToken)}
                            disabled={isLoadingDriveFiles}
                            className="text-[11px] text-slate-500 hover:text-emerald-600 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                            <span>Yenile</span>
                          </button>
                        )}
                      </div>

                      {!accessToken ? (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2.5">
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Google Drive'ınızdaki yedek tabloları listelemek için Google ile bağlanın.
                          </p>
                          <button
                            onClick={handleSignInAndBackup}
                            disabled={isAuthenticating}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow transition-all"
                          >
                            {isAuthenticating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span>Google ile Bağlan</span>
                          </button>
                        </div>
                      ) : isLoadingDriveFiles ? (
                        <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                          <span>Google Drive yedekleri taranıyor...</span>
                        </div>
                      ) : driveBackups.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {driveBackups.map((file) => (
                            <div
                              key={file.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="truncate">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {file.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(file.modifiedTime).toLocaleString('tr-TR')}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleRestoreFromGoogleSpreadsheet(file.id, file.name)}
                                disabled={isParsingRestore}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                              >
                                {isParsingRestore ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                <span>Yükle</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                          Google Drive'ınızda henüz bir portföy yedek tablosu bulunamadı.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
