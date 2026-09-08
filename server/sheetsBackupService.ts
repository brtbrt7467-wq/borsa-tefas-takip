import { PriceAlert } from '../src/types';

interface SheetRow {
  values: (string | number)[];
}

export interface BackupPayload {
  summary: {
    totalValue: number;
    totalCost: number;
    netProfitLoss: number;
    netProfitLossPercent: number;
    totalDailyChange: number;
    totalDailyChangePercent: number;
    stockValue: number;
    fundValue: number;
    besValue?: number;
    bondValue?: number;
    eurobondValue?: number;
    goldFxValue?: number;
    cryptoValue?: number;
    depositValue?: number;
    otherValue: number;
    itemCount: number;
  };
  portfolioItems: Array<{
    code: string;
    name: string;
    type: string;
    category?: string;
    quantity: number;
    averageCost: number;
    currentPrice: number;
    costValue: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number;
    changePercent?: number;
    portfolioShare: number;
    interestRate?: number;
    maturityDate?: string;
    addedDate?: string;
    notes?: string;
  }>;
  watchlist?: Array<{
    code: string;
    name: string;
    type: string;
    price: number;
    changePercent?: number;
    sector?: string;
  }>;
  alerts?: PriceAlert[];
  timestamp?: string;
}

export interface RestoredData {
  portfolioItems: Array<{
    id: string;
    code: string;
    name: string;
    type: 'stock' | 'fund';
    category: string;
    quantity: number;
    averageCost: number;
    currentPrice?: number;
    interestRate?: number;
    maturityDate?: string;
    addedDate?: string;
    notes?: string;
  }>;
  watchlist: Array<{
    id: string;
    code: string;
    name: string;
    type: 'stock' | 'fund';
    price: number;
    changePercent?: number;
    sector?: string;
    addedDate?: string;
  }>;
  alerts?: PriceAlert[];
  summaryTitle?: string;
}

/**
 * Creates and populates a complete Google Spreadsheet with category-separated portfolio backup
 */
export async function createGoogleSheetsBackup(
  accessToken: string,
  payload: BackupPayload
): Promise<{ success: boolean; spreadsheetId?: string; spreadsheetUrl?: string; error?: string }> {
  try {
    const authHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
    const now = payload.timestamp ? new Date(payload.timestamp) : new Date();
    // Use Europe/Istanbul timezone for accurate Turkish time (TSİ)
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' });
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    const title = `Portföy Yedeği - ${dateStr} ${timeStr}`;

    // Separate items by their specific category
    const stocks = payload.portfolioItems.filter(i => i.category === 'stock' || (!i.category && i.type === 'stock'));
    const tefasFunds = payload.portfolioItems.filter(i => i.category === 'fund' || (!i.category && i.type === 'fund'));
    const besFunds = payload.portfolioItems.filter(i => i.category === 'bes');
    const bonds = payload.portfolioItems.filter(i => i.category === 'bond');
    const eurobonds = payload.portfolioItems.filter(i => i.category === 'eurobond');
    const goldFx = payload.portfolioItems.filter(i => i.category === 'gold_fx');
    const crypto = payload.portfolioItems.filter(i => i.category === 'crypto');
    const deposits = payload.portfolioItems.filter(i => i.category === 'deposit');
    const otherAssets = payload.portfolioItems.filter(i => i.category === 'other');

    // 1. Create Spreadsheet with separate sheets for all asset categories
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title,
          locale: 'tr_TR',
          autoRecalc: 'ON_CHANGE'
        },
        sheets: [
          { properties: { title: 'Portföy Özeti', gridProperties: { rowCount: 60, columnCount: 15 } } },
          { properties: { title: 'Hisse Senetleri', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'TEFAS Fonları', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'BES Fonları', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Bono ve Tahviller', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Eurobond', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Altın ve Döviz', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Kripto Varlıklar', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Mevduat', gridProperties: { rowCount: 100, columnCount: 15 } } },
          { properties: { title: 'Diğer Varlıklar', gridProperties: { rowCount: 50, columnCount: 15 } } },
          { properties: { title: 'Takip Listesi', gridProperties: { rowCount: 100, columnCount: 10 } } },
          { properties: { title: 'Fiyat Alarmları', gridProperties: { rowCount: 100, columnCount: 12 } } }
        ]
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('[GoogleSheets] Create error:', createRes.status, errText);
      if (createRes.status === 401 || createRes.status === 403) {
        return { 
          success: false, 
          error: `Google yetkilendirme hatası (${createRes.status}). Seçili hesabın Google Sheets izni yetersiz veya farklı bir hesap seçilmiş olabilir. Lütfen 'Hesap Değiştir' butonuna basarak ykefal@gmail.com ile tekrar oturum açın.` 
        };
      }
      return { success: false, error: `Google Sheets oluşturulamadı: ${createRes.status} ${errText}` };
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const totalVal = payload.summary.totalValue || 1;

    // 2. Prepare Data for Each Sheet

    // Summary Sheet Values
    const summaryData: (string | number)[][] = [
      ['DETAYLI PORTFÖY YEDEK VE PERFORMANS RAPORU', ''],
      ['Oluşturulma Tarihi', `${dateStr} ${timeStr} (TSİ)`],
      ['Toplam Varlık Kalemi', payload.summary.itemCount],
      ['', ''],
      ['GENEL PORTFÖY METRİKLERİ', 'TUTAR (TL)', 'GETİRİ / ORAN'],
      ['Toplam Portföy Güncel Değeri', payload.summary.totalValue, ''],
      ['Toplam Yatırılan Maliyet', payload.summary.totalCost, ''],
      ['Toplam Net Kâr / Zarar', payload.summary.netProfitLoss, `%${payload.summary.netProfitLossPercent.toFixed(2)}`],
      ['Günlük Portföy Değişimi', payload.summary.totalDailyChange, `%${payload.summary.totalDailyChangePercent.toFixed(2)}`],
      ['', ''],
      ['KATEGORİ BAZINDA DAĞILIM', 'TUTAR (TL)', 'PORTFÖY PAYI (%)', 'VARLIK SAYISI'],
      ['Hisse Senetleri (BIST)', payload.summary.stockValue || 0, `%${(((payload.summary.stockValue || 0) / totalVal) * 100).toFixed(1)}`, stocks.length],
      ['TEFAS Yatırım Fonları', payload.summary.fundValue || 0, `%${(((payload.summary.fundValue || 0) / totalVal) * 100).toFixed(1)}`, tefasFunds.length],
      ['BES Emeklilik Fonları (BEFAS)', payload.summary.besValue || 0, `%${(((payload.summary.besValue || 0) / totalVal) * 100).toFixed(1)}`, besFunds.length],
      ['Bono & Devlet Tahvili (DİBS)', payload.summary.bondValue || 0, `%${(((payload.summary.bondValue || 0) / totalVal) * 100).toFixed(1)}`, bonds.length],
      ['Eurobond (Döviz Cinsi Tahvil)', payload.summary.eurobondValue || 0, `%${(((payload.summary.eurobondValue || 0) / totalVal) * 100).toFixed(1)}`, eurobonds.length],
      ['Altın & Döviz / Emtia', payload.summary.goldFxValue || 0, `%${(((payload.summary.goldFxValue || 0) / totalVal) * 100).toFixed(1)}`, goldFx.length],
      ['Kripto Varlıklar', payload.summary.cryptoValue || 0, `%${(((payload.summary.cryptoValue || 0) / totalVal) * 100).toFixed(1)}`, crypto.length],
      ['Vadeli Mevduat & Faiz', payload.summary.depositValue || 0, `%${(((payload.summary.depositValue || 0) / totalVal) * 100).toFixed(1)}`, deposits.length],
      ['Diğer Varlıklar', payload.summary.otherValue || 0, `%${(((payload.summary.otherValue || 0) / totalVal) * 100).toFixed(1)}`, otherAssets.length],
      ['', '']
    ];

    // Standard Asset Row Formatter
    const formatStandardRows = (items: typeof payload.portfolioItems, codeHeader: string, nameHeader: string, unitHeader: string) => [
      [
        codeHeader,
        nameHeader,
        unitHeader,
        'Birim Maliyet (TL)',
        'Güncel Fiyat (TL)',
        'Toplam Maliyet (TL)',
        'Güncel Değer (TL)',
        'Günlük Değişim (%)',
        'Net Kâr / Zarar (TL)',
        'Getiri (%)',
        'Portföy Payı (%)',
        'Eklenme Tarihi',
        'Notlar'
      ],
      ...items.map(s => [
        s.code,
        s.name,
        s.quantity,
        s.averageCost,
        s.currentPrice,
        Number((s.quantity * s.averageCost).toFixed(2)),
        Number((s.quantity * s.currentPrice).toFixed(2)),
        s.changePercent !== undefined ? `%${s.changePercent.toFixed(2)}` : '-',
        Number(s.profitLoss.toFixed(2)),
        `%${s.profitLossPercent.toFixed(2)}`,
        `%${s.portfolioShare.toFixed(1)}`,
        s.addedDate || '-',
        s.notes || ''
      ])
    ];

    // 1. Hisse Senetleri Sheet
    const stocksData = formatStandardRows(stocks, 'Hisse Kodu', 'Şirket Unvanı', 'Adet (Lot)');

    // 2. TEFAS Fonları Sheet
    const tefasData = formatStandardRows(tefasFunds, 'Fon Kodu', 'Fon Unvanı', 'Pay Adedi');

    // 3. BES Fonları Sheet
    const besData = formatStandardRows(besFunds, 'BES Fon Kodu', 'Emeklilik Fon Adı / Planı', 'Pay Adedi');

    // 4. Bono ve Tahviller Sheet
    const bondsData = formatStandardRows(bonds, 'Bono/Tahvil Kodu', 'Borçlanma Senedi Tanımı', 'Nominal / Adet');

    // 5. Eurobond Sheet
    const eurobondsData = formatStandardRows(eurobonds, 'Eurobond Kodu', 'Eurobond Tanımı / Vade', 'Nominal ($/€)');

    // 6. Altın ve Döviz Sheet
    const goldFxData = formatStandardRows(goldFx, 'Varlık Kodu', 'Varlık / Döviz Tanımı', 'Miktar (Gram/Birim)');

    // 7. Kripto Varlıklar Sheet
    const cryptoData = formatStandardRows(crypto, 'Kripto Kodu', 'Kripto Varlık Adı', 'Adet / Miktar');

    // 8. Mevduat Sheet
    const depositData: (string | number)[][] = [
      [
        'Hesap Kodu',
        'Banka / Hesap Tanımı',
        'Anapara (TL)',
        'Yıllık Faiz Oranı (%)',
        'Vade Sonu Tarihi',
        'Güncel Değer (TL)',
        'Tahmini Faiz Getirisi (TL)',
        'Portföy Payı (%)',
        'Açılış Tarihi',
        'Notlar'
      ],
      ...deposits.map(d => [
        d.code,
        d.name,
        d.quantity,
        d.interestRate !== undefined ? `%${d.interestRate}` : '%0',
        d.maturityDate || '-',
        Number((d.quantity * d.currentPrice).toFixed(2)),
        Number(d.profitLoss.toFixed(2)),
        `%${d.portfolioShare.toFixed(1)}`,
        d.addedDate || '-',
        d.notes || ''
      ])
    ];

    // 9. Diğer Varlıklar Sheet
    const otherData = formatStandardRows(otherAssets, 'Varlık Kodu', 'Varlık Tanımı', 'Miktar / Adet');

    // 10. Takip Listesi Sheet
    const watchlistData: (string | number)[][] = [
      ['Varlık Kodu', 'Varlık Adı', 'Türü', 'Fiyat (TL)', 'Günlük Değişim (%)', 'Sektör'],
      ...(payload.watchlist || []).map(w => [
        w.code,
        w.name,
        w.type === 'stock' ? 'Hisse Senedi' : w.type === 'fund' ? 'TEFAS Fonu' : 'Varlık',
        w.price,
        w.changePercent !== undefined ? `%${w.changePercent.toFixed(2)}` : '-',
        w.sector || '-'
      ])
    ];

    // 11. Fiyat Alarmları Sheet
    const alertsData: (string | number)[][] = [
      [
        'Varlık Kodu',
        'Varlık Adı',
        'Tür',
        'Koşul',
        'Hedef Fiyat (TL)',
        'Başlangıç Fiyatı (TL)',
        'Güncel / Tetiklenen (TL)',
        'Durum',
        'Tekrarlama',
        'Tetiklenme Tarihi',
        'Oluşturulma Tarihi',
        'Not'
      ],
      ...(payload.alerts || []).map(a => [
        a.code,
        a.name || a.code,
        a.type === 'stock' ? 'Hisse Senedi' : a.type === 'fund' ? 'TEFAS Fonu' : a.type || 'Varlık',
        a.condition === 'above' ? 'Üzeri (>=)' : 'Altı (<=)',
        a.targetPrice,
        a.initialPrice || a.targetPrice,
        a.currentPrice || a.triggeredPrice || '-',
        a.triggered ? 'Tetiklendi' : a.active ? 'Aktif' : 'Pasif',
        a.frequency === 'persistent' ? 'Sürekli' : 'Tek Seferlik',
        a.triggeredAt || '-',
        a.createdAt || '-',
        a.note || ''
      ])
    ];

    // 3. Write data to sheets via batchUpdate
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            { range: "'Portföy Özeti'!A1", values: summaryData },
            { range: "'Hisse Senetleri'!A1", values: stocksData },
            { range: "'TEFAS Fonları'!A1", values: tefasData },
            { range: "'BES Fonları'!A1", values: besData },
            { range: "'Bono ve Tahviller'!A1", values: bondsData },
            { range: "'Eurobond'!A1", values: eurobondsData },
            { range: "'Altın ve Döviz'!A1", values: goldFxData },
            { range: "'Kripto Varlıklar'!A1", values: cryptoData },
            { range: "'Mevduat'!A1", values: depositData },
            { range: "'Diğer Varlıklar'!A1", values: otherData },
            { range: "'Takip Listesi'!A1", values: watchlistData },
            { range: "'Fiyat Alarmları'!A1", values: alertsData }
          ]
        })
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.warn('[GoogleSheets] Value batch update error:', updateRes.status, errText);
    }

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl
    };
  } catch (err: any) {
    console.error('[GoogleSheets] createGoogleSheetsBackup error:', err);
    return { success: false, error: err.message || 'Yedekleme sırasında bir hata oluştu' };
  }
}

/**
 * Lists previous spreadsheet backups from user's Google Drive
 */
export async function listGoogleDriveBackups(accessToken: string): Promise<Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>> {
  try {
    const authHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=15&fields=files(id,name,modifiedTime,webViewLink)`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!res.ok) {
      console.error('[GoogleDrive] List backups error:', res.status);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('[GoogleDrive] listGoogleDriveBackups error:', err);
    return [];
  }
}

/**
 * Extracts spreadsheet ID from raw ID or Google Docs URL
 */
function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return input.trim();
}

/**
 * Categorizes an item based on sheet name, header text, and well-known asset codes
 */
function determineCategoryAndType(
  sheetTitle: string,
  headerRow: any[],
  code: string
): { category: string; type: 'stock' | 'fund' } {
  const lowerTitle = sheetTitle.toLowerCase();
  const cleanCode = code.toUpperCase().trim();

  // 1. Direct Sheet Title Checks
  if (lowerTitle.includes('eurobond') || lowerTitle.includes('euro-bond')) {
    return { category: 'eurobond', type: 'fund' };
  }
  if (lowerTitle.includes('bono') || lowerTitle.includes('tahvil') || lowerTitle.includes('dibs')) {
    return { category: 'bond', type: 'fund' };
  }
  if (lowerTitle.includes('bes') || lowerTitle.includes('emeklilik') || lowerTitle.includes('befas')) {
    return { category: 'bes', type: 'fund' };
  }
  if (lowerTitle.includes('kripto') || lowerTitle.includes('crypto')) {
    return { category: 'crypto', type: 'stock' };
  }
  if (lowerTitle.includes('altın') || lowerTitle.includes('altin') || lowerTitle.includes('döviz') || lowerTitle.includes('doviz') || lowerTitle.includes('emtia')) {
    return { category: 'gold_fx', type: 'stock' };
  }
  if (lowerTitle.includes('mevduat') || lowerTitle.includes('faiz') || lowerTitle.includes('deposit')) {
    return { category: 'deposit', type: 'fund' };
  }
  if (lowerTitle.includes('tefas') || lowerTitle.includes('fon')) {
    return { category: 'fund', type: 'fund' };
  }
  if (lowerTitle.includes('hisse') || lowerTitle.includes('bist') || lowerTitle.includes('hisseler')) {
    return { category: 'stock', type: 'stock' };
  }
  if (lowerTitle.includes('diğer') || lowerTitle.includes('diger')) {
    return { category: 'other', type: 'stock' };
  }

  // 2. Header Row Checks
  const headerStr = headerRow.join(' ').toLowerCase();
  if (headerStr.includes('eurobond')) {
    return { category: 'eurobond', type: 'fund' };
  }
  if (headerStr.includes('bono') || headerStr.includes('tahvil') || headerStr.includes('borçlanma senedi') || headerStr.includes('dibs')) {
    return { category: 'bond', type: 'fund' };
  }
  if (headerStr.includes('bes fon') || headerStr.includes('emeklilik fon')) {
    return { category: 'bes', type: 'fund' };
  }
  if (headerStr.includes('kripto')) {
    return { category: 'crypto', type: 'stock' };
  }
  if (headerStr.includes('anapara') || headerStr.includes('faiz oranı') || headerStr.includes('vade')) {
    return { category: 'deposit', type: 'fund' };
  }
  if (headerStr.includes('fon kodu') || headerStr.includes('pay adedi')) {
    return { category: 'fund', type: 'fund' };
  }
  if (headerStr.includes('hisse kodu') || headerStr.includes('şirket unvanı')) {
    return { category: 'stock', type: 'stock' };
  }

  // 3. Known Code heuristics fallback
  const eurobondCodes = ['TR-EUROBOND-2030', 'TR-EUROBOND-2034', 'TR-EUROBOND-EUR', 'US900123', 'XS'];
  if (eurobondCodes.some(c => cleanCode.startsWith(c)) || cleanCode.includes('EUROBOND')) {
    return { category: 'eurobond', type: 'fund' };
  }

  const bondCodes = ['TRT-TAHVIL', 'TRT-BONO', 'OST-TAHVIL', 'TRT', 'TRB'];
  if (bondCodes.some(c => cleanCode.startsWith(c)) || cleanCode.includes('TAHVIL') || cleanCode.includes('BONO')) {
    return { category: 'bond', type: 'fund' };
  }

  // 3. Known Code heuristics fallback
  const cryptoCodes = ['BTC', 'ETH', 'SOL', 'AVAX', 'USDT', 'XRP', 'BNB', 'DOGE', 'ADA', 'DOT'];
  if (cryptoCodes.includes(cleanCode)) {
    return { category: 'crypto', type: 'stock' };
  }

  const goldFxCodes = ['GRAM-ALTIN', 'ALTIN_GR', 'CEYREK', 'YARIM', 'TAM', 'USDTRY', 'EURTRY', 'GBPTRY', 'GUMUS'];
  if (goldFxCodes.includes(cleanCode)) {
    return { category: 'gold_fx', type: 'stock' };
  }

  const depositCodes = ['TL-MEVDUAT', 'USD-MEVDUAT', 'GECELIK-FAIZ', 'REPO'];
  if (depositCodes.includes(cleanCode) || cleanCode.includes('MEVDUAT') || cleanCode.includes('FAIZ')) {
    return { category: 'deposit', type: 'fund' };
  }

  const besCodes = ['AEA', 'HEF', 'VEF', 'AGB', 'CHH', 'GEA', 'OKS-STD', 'BHE', 'AGE', 'AH5', 'AVS'];
  if (besCodes.includes(cleanCode)) {
    return { category: 'bes', type: 'fund' };
  }

  // Default fallback: length 3 is often fund, 4-5 stock
  if (cleanCode.length === 3) {
    return { category: 'fund', type: 'fund' };
  }
  return { category: 'stock', type: 'stock' };
}

/**
 * Fetches and parses a Google Spreadsheet into portfolio and watchlist data with category precision
 */
export async function fetchSpreadsheetForRestore(
  accessToken: string,
  spreadsheetIdOrUrl: string
): Promise<{ success: boolean; data?: RestoredData; error?: string }> {
  try {
    const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) {
      return { success: false, error: 'Geçersiz Google E-Tablo kimliği veya bağlantısı.' };
    }

    const authHeader = accessToken ? (accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`) : '';
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCBPgC4tKp_WiGIS-g3f3B9BEndf6tzTIw';

    // 1. Try to get spreadsheet metadata
    let metaRes: Response | null = null;
    if (authHeader) {
      metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: { 'Authorization': authHeader }
      });
    }

    if (!metaRes || !metaRes.ok) {
      // Fallback with API Key for public/shared sheets
      metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&includeGridData=false`);
    }

    if (!metaRes.ok) {
      // Fallback 2: Try public Google Sheets CSV export directly
      try {
        const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          const parsedFromCsv = parseCsvText(csvText, spreadsheetId);
          if (parsedFromCsv && (parsedFromCsv.portfolioItems.length > 0 || parsedFromCsv.watchlist.length > 0)) {
            return { success: true, data: parsedFromCsv };
          }
        }
      } catch (csvErr) {
        console.warn('[GoogleSheets] CSV export fallback failed:', csvErr);
      }

      const errText = await metaRes.text();
      return { success: false, error: `Google E-Tablo açılamadı (${metaRes.status}). Lütfen E-Tablo paylaşım ayarlarını 'Bağlantıya sahip olan herkes görüntüleyebilir' olarak ayarladığınızdan veya Google ile giriş yaptığınızdan emin olun.` };
    }

    const meta = await metaRes.json();
    const sheetTitles = (meta.sheets || []).map((s: any) => s.properties?.title as string);

    // 2. Fetch all sheets values
    const ranges = sheetTitles.map((t: string) => encodeURIComponent(`'${t}'!A1:N100`)).join('&ranges=');
    let valuesRes: Response | null = null;
    
    if (authHeader) {
      valuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges}`,
        { headers: { 'Authorization': authHeader } }
      );
    }

    if (!valuesRes || !valuesRes.ok) {
      valuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges}&key=${apiKey}`
      );
    }

    if (!valuesRes.ok) {
      return { success: false, error: 'E-Tablo verileri okunamadı.' };
    }

    const valuesData = await valuesRes.json();
    const valueRanges = valuesData.valueRanges || [];


    const restoredPortfolio: RestoredData['portfolioItems'] = [];
    const restoredWatchlist: RestoredData['watchlist'] = [];
    const restoredAlerts: PriceAlert[] = [];

    // Helper to clean numbers safely (preserving 0)
    const cleanNum = (val: any, fallback = 0): number => {
      if (typeof val === 'number') return isNaN(val) ? fallback : val;
      if (val === undefined || val === null || val === '') return fallback;
      const str = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    valueRanges.forEach((rangeObj: any) => {
      const rawRange = rangeObj.range || '';
      // Extract sheet title from range, e.g., "'Hisse Senetleri'!A1:N100" -> "Hisse Senetleri"
      const match = rawRange.match(/^'?(.*?)'?!/);
      const sheetTitle = match ? match[1] : rawRange;
      const rows: any[][] = rangeObj.values || [];
      if (rows.length < 2) return;

      const lowerTitle = sheetTitle.toLowerCase();
      if (lowerTitle.includes('özet') || lowerTitle.includes('ozet') || lowerTitle.includes('summary')) {
        // Skip summary sheet as it doesn't contain item lists
        return;
      }

      const headerRow = rows[0] || [];
      const isAlertSheet = lowerTitle.includes('alarm') || headerRow.some((c: any) => String(c).toLowerCase().includes('hedef fiyat'));
      const isWatchSheet = !isAlertSheet && (lowerTitle.includes('takip') || lowerTitle.includes('izleme') || lowerTitle.includes('watch') ||
        headerRow.some((c: any) => String(c).toLowerCase().includes('izleme') || (String(c).toLowerCase().includes('varlık kodu') && rows[0].includes('Sektör'))));

      if (isAlertSheet) {
        // Parse alerts sheet: Code, Name, Type, Condition, TargetPrice, InitialPrice, CurrentPrice, Status, Frequency, TriggeredAt, CreatedAt, Note
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const code = String(row[0] || '').trim().toUpperCase();
          if (!code || code.length < 2 || code === 'TOPLAM') continue;

          const name = String(row[1] || code).trim();
          const typeStr = String(row[2] || '').toLowerCase();
          const type: any = typeStr.includes('fon') ? 'fund' : typeStr.includes('kripto') ? 'crypto' : typeStr.includes('altın') || typeStr.includes('döviz') ? 'gold_fx' : 'stock';
          const condStr = String(row[3] || '').toLowerCase();
          const condition: 'above' | 'below' = condStr.includes('alt') || condStr.includes('<=') ? 'below' : 'above';
          const targetPrice = cleanNum(row[4], 0);
          if (targetPrice <= 0) continue;

          const initialPrice = cleanNum(row[5], targetPrice);
          const currentPrice = cleanNum(row[6], targetPrice);
          const statusStr = String(row[7] || '').toLowerCase();
          const freqStr = String(row[8] || '').toLowerCase();
          const triggeredAt = String(row[9] || '').trim();
          const createdAt = String(row[10] || '').trim() || new Date().toISOString();
          const note = String(row[11] || '').trim();

          const triggered = statusStr.includes('tetik') || (triggeredAt && triggeredAt !== '-');
          const active = statusStr.includes('aktif') || (!triggered && !statusStr.includes('pasif'));
          const frequency: 'once' | 'persistent' = freqStr.includes('sürekli') || freqStr.includes('persistent') ? 'persistent' : 'once';

          restoredAlerts.push({
            id: `alert-restored-${code}-${Date.now()}-${i}`,
            code,
            name,
            type,
            condition,
            targetPrice,
            initialPrice,
            currentPrice: currentPrice > 0 ? currentPrice : undefined,
            active,
            frequency,
            createdAt,
            triggered,
            triggeredAt: triggeredAt !== '-' ? triggeredAt : undefined,
            note: note || undefined
          });
        }
      } else if (isWatchSheet) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const code = String(row[0] || '').trim().toUpperCase();
          if (!code || code.length < 2 || code === 'TOPLAM') continue;

          const name = String(row[1] || code).trim();
          const typeStr = String(row[2] || '').toLowerCase();
          const type: 'stock' | 'fund' = typeStr.includes('fon') ? 'fund' : 'stock';
          const price = cleanNum(row[3], 0);
          const changePercent = cleanNum(row[4], 0);
          const sector = String(row[5] || '').trim();

          restoredWatchlist.push({
            id: `watch-${code}-${Date.now()}-${i}`,
            code,
            name,
            type,
            price,
            changePercent,
            sector: sector !== '-' ? sector : undefined,
            addedDate: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        // Asset holdings sheet (Hisse, TEFAS, BES, Altın/Döviz, Kripto, Mevduat, Diğer)
        const isDepositSheet = lowerTitle.includes('mevduat') || lowerTitle.includes('faiz') || lowerTitle.includes('deposit') ||
          headerRow.some((c: any) => String(c).toLowerCase().includes('anapara') || String(c).toLowerCase().includes('faiz oranı'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const code = String(row[0] || '').trim().toUpperCase();
          if (!code || code === 'TOPLAM' || code === 'METRİK' || code.length < 2) continue;

          const name = String(row[1] || code).trim();

          if (isDepositSheet) {
            // Deposit schema: Code, Name, Principal, InterestRate, MaturityDate, CurrentVal, ProfitLoss, Share, OpenDate, Notes
            const quantity = cleanNum(row[2], 0); // Anapara
            const interestRate = cleanNum(row[3], 45.0); // Faiz Oranı
            const maturityDate = String(row[4] || '').trim();
            const currentPrice = quantity > 0 ? (cleanNum(row[5], quantity) / quantity) : 1.0;
            const addedDate = String(row[8] || '').trim() || new Date().toISOString().split('T')[0];
            const notes = String(row[9] || '').trim();
            const isPassive = quantity <= 0.00001;

            restoredPortfolio.push({
              id: `restored-dep-${code}-${Date.now()}-${i}`,
              code,
              name,
              type: 'fund',
              category: 'deposit',
              quantity: isPassive ? 0 : quantity,
              averageCost: 1.0,
              currentPrice: currentPrice > 0 ? currentPrice : 1.0,
              status: isPassive ? 'passive' : 'active',
              isPassive,
              interestRate: interestRate > 0 ? interestRate : undefined,
              maturityDate: maturityDate !== '-' ? maturityDate : undefined,
              addedDate: addedDate !== '-' ? addedDate : new Date().toISOString().split('T')[0],
              notes: notes || (isPassive ? 'Kapatılan Mevduat Hesabı' : undefined)
            });
          } else {
            // Standard asset schema
            const { category, type } = determineCategoryAndType(sheetTitle, headerRow, code);
            const quantity = cleanNum(row[2], 0);
            const averageCost = cleanNum(row[3], 0);
            const currentPrice = cleanNum(row[4], averageCost);
            const addedDate = String(row[11] || '').trim() || new Date().toISOString().split('T')[0];
            const notes = String(row[12] || '').trim();
            const isPassive = quantity <= 0.00001;

            restoredPortfolio.push({
              id: `restored-${category}-${code}-${Date.now()}-${i}`,
              code,
              name,
              type,
              category,
              quantity: isPassive ? 0 : quantity,
              averageCost,
              currentPrice,
              status: isPassive ? 'passive' : 'active',
              isPassive,
              addedDate: addedDate !== '-' ? addedDate : new Date().toISOString().split('T')[0],
              notes: notes || (isPassive ? 'Kapatılan Pozisyon (Yedekten)' : undefined)
            });
          }
        }
      }
    });

    if (restoredPortfolio.length === 0 && restoredWatchlist.length === 0 && restoredAlerts.length === 0) {
      return { success: false, error: 'E-Tabloda geçerli portföy, takip listesi veya alarm verisi bulunamadı.' };
    }

    return {
      success: true,
      data: {
        portfolioItems: restoredPortfolio,
        watchlist: restoredWatchlist,
        alerts: restoredAlerts,
        summaryTitle: meta.properties?.title || 'Google Sheets Yedeği'
      }
    };
  } catch (err: any) {
    console.error('[GoogleSheets] fetchSpreadsheetForRestore error:', err);
    return { success: false, error: err.message || 'Geri yükleme sırasında bir hata oluştu' };
  }
}

/**
 * Parses raw CSV text into RestoredData
 */
export function parseCsvText(csvText: string, title: string = 'CSV Yedeği'): RestoredData | null {
  try {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    const portfolioItems: RestoredData['portfolioItems'] = [];
    const watchlist: RestoredData['watchlist'] = [];

    const cleanNum = (val: any, fallback = 0): number => {
      if (typeof val === 'number') return isNaN(val) ? fallback : val;
      if (val === undefined || val === null || val === '') return fallback;
      const str = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const header = lines[0].toLowerCase();
    const isWatch = header.includes('takip') || header.includes('izleme');

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;

      const code = (cols[1] || cols[0]).toUpperCase().trim();
      if (!code || code.length < 2 || code === 'TOPLAM' || code === 'METRİK') continue;

      if (isWatch) {
        watchlist.push({
          id: `csv-watch-${code}-${i}`,
          code,
          name: cols[2] || code,
          type: (cols[3] || '').toLowerCase().includes('fon') ? 'fund' : 'stock',
          price: cleanNum(cols[4], 0),
          changePercent: cleanNum(cols[5], 0),
          sector: cols[6] || undefined,
          addedDate: new Date().toISOString().split('T')[0]
        });
      } else {
        const { category, type } = determineCategoryAndType('CSV', cols, code);
        const name = cols[2] || cols[1] || code;
        const quantity = cleanNum(cols[3] || cols[2], 0);
        const averageCost = cleanNum(cols[4] || cols[3], 0);
        const currentPrice = cleanNum(cols[5] || cols[4], averageCost);
        const isPassive = quantity <= 0.00001;

        portfolioItems.push({
          id: `csv-port-${category}-${code}-${i}`,
          code,
          name,
          type,
          category,
          quantity: isPassive ? 0 : quantity,
          averageCost,
          currentPrice,
          status: isPassive ? 'passive' : 'active',
          isPassive,
          addedDate: new Date().toISOString().split('T')[0],
          notes: isPassive ? 'Kapatılan Pozisyon (CSV Yedeği)' : 'CSV Yedeğinden Yüklendi'
        });
      }
    }

    return {
      portfolioItems,
      watchlist,
      summaryTitle: title
    };
  } catch (e) {
    console.error('[CSV Parse] Error:', e);
    return null;
  }
}

