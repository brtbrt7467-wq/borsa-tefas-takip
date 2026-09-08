import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { 
  getLiveStocks, 
  getLiveFunds, 
  getLiveIndices, 
  getLastUpdated, 
  syncLiveMarketData,
  findOrFetchStock,
  findOrFetchFund,
  searchYahooBistStocks,
  syncRequestedAssets
} from './server/liveMarketService';
import { analyzeWithGemini } from './server/gemini';
import { 
  createGoogleSheetsBackup, 
  listGoogleDriveBackups, 
  fetchSpreadsheetForRestore, 
  BackupPayload 
} from './server/sheetsBackupService';
import {
  startAlertBackgroundWorker,
  getAlertsData,
  syncClientAlerts,
  saveAlert,
  deleteAlert,
  updateSettings,
  evaluateServerAlerts
} from './server/alertService';
import { sendTestEmail } from './server/emailService';
import { Stock, Fund, MarketIndex, PriceAlert } from './src/types';

// Helper for Turkish search normalization
function norm(str: string): string {
  if (!str) return '';
  return str
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

function matches(text: string, query: string): boolean {
  if (!query) return true;
  if (text.toLowerCase().includes(query.toLowerCase())) return true;
  const nQuery = norm(query);
  if (!nQuery) return true;
  return norm(text).includes(nQuery);
}

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Market indices summary
  app.get('/api/market/summary', (req, res) => {
    res.json({
      indices: getLiveIndices(),
      lastUpdated: getLastUpdated(),
      dataSource: 'Yahoo Finance BIST & TEFAS'
    });
  });

  // Direct indices list
  app.get('/api/indices', (req, res) => {
    res.json(getLiveIndices());
  });

  // Manual refresh trigger
  app.post('/api/market/refresh', async (req, res) => {
    try {
      const result = await syncLiveMarketData();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Yenileme başarısız oldu' });
    }
  });

  // Batch sync specific portfolio / watchlist assets
  app.post('/api/market/sync-assets', async (req, res) => {
    try {
      const { stocks, funds } = req.body || {};
      const result = await syncRequestedAssets({ stocks, funds });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Varlık senkronizasyonu başarısız oldu' });
    }
  });

  // Stocks endpoint
  app.get('/api/stocks', (req, res) => {
    const { query, sector, sort, order } = req.query;
    const stocksList = getLiveStocks();
    let results = [...stocksList];

    if (query && typeof query === 'string') {
      const q = query.trim();
      results = results.filter(s => 
        matches(s.code, q) || 
        matches(s.name, q) || 
        matches(s.sector, q)
      );
    }

    if (sector && typeof sector === 'string' && sector !== 'Tümü') {
      results = results.filter(s => s.sector === sector);
    }

    if (sort && typeof sort === 'string') {
      const isAsc = order === 'asc';
      results.sort((a, b) => {
        let valA = (a as any)[sort];
        let valB = (b as any)[sort];
        if (typeof valA === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return isAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
    }

    res.json({
      stocks: results,
      totalCount: results.length,
      sectors: Array.from(new Set(stocksList.map(s => s.sector))),
      lastUpdated: getLastUpdated()
    });
  });

  // Single stock detail
  app.get('/api/stocks/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const stocksList = getLiveStocks();
    let stock = stocksList.find(s => s.code.toUpperCase() === code);
    if (!stock) {
      stock = await findOrFetchStock(code);
    }
    if (!stock) {
      return res.status(404).json({ error: `Hisse bulunamadı: ${code}` });
    }
    res.json(stock);
  });

  // TEFAS Funds endpoint
  app.get('/api/funds', (req, res) => {
    const { query, category, issuer, sort, order } = req.query;
    const fundsList = getLiveFunds();
    let results = [...fundsList];

    if (query && typeof query === 'string') {
      const q = query.trim();
      results = results.filter(f => 
        matches(f.code, q) || 
        matches(f.name, q) || 
        matches(f.issuer, q) ||
        matches(f.fundCategory, q)
      );
    }

    if (category && typeof category === 'string' && category !== 'Tümü') {
      results = results.filter(f => f.fundCategory === category);
    }

    if (issuer && typeof issuer === 'string' && issuer !== 'Tümü') {
      results = results.filter(f => f.issuer.includes(issuer));
    }

    if (sort && typeof sort === 'string') {
      const isAsc = order === 'asc';
      results.sort((a, b) => {
        let valA = (a as any)[sort];
        let valB = (b as any)[sort];
        if (typeof valA === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return isAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
    }

    res.json({
      funds: results,
      totalCount: results.length,
      categories: Array.from(new Set(fundsList.map(f => f.fundCategory))),
      issuers: Array.from(new Set(fundsList.map(f => f.issuer))),
      lastUpdated: getLastUpdated()
    });
  });

  // Single fund detail
  app.get('/api/funds/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const fundsList = getLiveFunds();
    let fund = fundsList.find(f => f.code.toUpperCase() === code);
    if (!fund) {
      fund = await findOrFetchFund(code);
    }
    if (!fund) {
      return res.status(404).json({ error: `Fon bulunamadı: ${code}` });
    }
    res.json(fund);
  });

  // Unified search endpoint
  app.get('/api/search', async (req, res) => {
    const q = ((req.query.q as string) || '').trim();
    const stocksList = getLiveStocks();
    const fundsList = getLiveFunds();

    if (!q) {
      return res.json({ stocks: stocksList.slice(0, 5), funds: fundsList.slice(0, 5) });
    }

    let matchedStocks = stocksList.filter(s => 
      matches(s.code, q) || matches(s.name, q) || matches(s.sector, q)
    );

    let matchedFunds = fundsList.filter(f => 
      matches(f.code, q) || matches(f.name, q) || matches(f.issuer, q) || matches(f.fundCategory, q)
    );

    // Live search on Yahoo Finance for ANY BIST stock if few results or query length >= 2
    if (q.length >= 2) {
      try {
        const liveBistStocks = await searchYahooBistStocks(q);
        for (const ls of liveBistStocks) {
          if (!matchedStocks.some(s => s.code.toUpperCase() === ls.code.toUpperCase())) {
            matchedStocks.push(ls);
          }
        }
      } catch (err) {
        // Continue
      }
    }

    // If query looks like a ticker code (2-6 chars), also try direct lookup for stock & fund
    const cleanTicker = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanTicker.length >= 2 && cleanTicker.length <= 6) {
      const hasExactStock = matchedStocks.some(s => s.code.toUpperCase() === cleanTicker);
      const hasExactFund = matchedFunds.some(f => f.code.toUpperCase() === cleanTicker);

      if (!hasExactStock) {
        const fetchedStock = await findOrFetchStock(cleanTicker);
        if (fetchedStock && !matchedStocks.some(s => s.code.toUpperCase() === fetchedStock.code.toUpperCase())) {
          matchedStocks = [fetchedStock, ...matchedStocks];
        }
      }

      if (!hasExactFund) {
        const fetchedFund = await findOrFetchFund(cleanTicker);
        if (fetchedFund && !matchedFunds.some(f => f.code.toUpperCase() === fetchedFund.code.toUpperCase())) {
          matchedFunds = [fetchedFund, ...matchedFunds];
        }
      }
    }

    res.json({
      stocks: matchedStocks,
      funds: matchedFunds
    });
  });

  // Google OAuth Client ID endpoint
  app.get('/api/auth/google/client-id', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    res.json({ clientId });
  });

  // Google Sheets Backup endpoint
  app.post('/api/backup/sheets', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Google yetkilendirme jetonu (Authorization header) gereklidir.' });
    }

    const payload: BackupPayload = req.body;
    if (!payload || !payload.summary || !payload.portfolioItems) {
      return res.status(400).json({ error: 'Geçersiz portföy yedekleme verisi.' });
    }

    try {
      const result = await createGoogleSheetsBackup(authHeader, payload);
      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Google Sheets yedeği oluşturulamadı.' });
      }
      res.json(result);
    } catch (err: any) {
      console.error('Sheets backup failed:', err);
      res.status(500).json({ error: err.message || 'Yedekleme sırasında beklenmeyen bir hata oluştu.' });
    }
  });

  // List user's Google Drive backups
  app.get('/api/backup/sheets/list', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Google yetkilendirme jetonu gereklidir.' });
    }

    try {
      const files = await listGoogleDriveBackups(authHeader);
      res.json({ files });
    } catch (err: any) {
      console.error('Drive files list failed:', err);
      res.status(500).json({ error: 'Drive dosyaları listelenemedi.' });
    }
  });

  // Restore from a Google Spreadsheet ID or URL
  app.post('/api/backup/sheets/restore', async (req, res) => {
    const authHeader = (req.headers.authorization as string) || '';

    const { spreadsheetIdOrUrl } = req.body;
    if (!spreadsheetIdOrUrl || typeof spreadsheetIdOrUrl !== 'string') {
      return res.status(400).json({ error: 'Geçerli bir Google E-Tablo kimliği veya bağlantısı giriniz.' });
    }

    try {
      const result = await fetchSpreadsheetForRestore(authHeader, spreadsheetIdOrUrl);
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'E-Tablodan veri okunamadı.' });
      }
      res.json(result);
    } catch (err: any) {
      console.error('Restore error:', err);
      res.status(500).json({ error: err.message || 'Geri yükleme sırasında bir hata oluştu.' });
    }
  });

  // AI Analysis endpoint (powered by server-side Gemini 3.7 Flash)
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const analysis = await analyzeWithGemini(req.body);
      res.json(analysis);
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      res.status(500).json({ error: 'Analiz oluşturulurken bir hata meydana geldi.' });
    }
  });

  // -------------------------------------------------------------
  // Price Alerts & 24/7 Email Notification Service Endpoints
  // -------------------------------------------------------------

  // Get alerts, settings, and history
  app.get('/api/alerts', (req, res) => {
    try {
      const data = getAlertsData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Alarmlar alınamadı' });
    }
  });

  // Sync client alerts with server
  app.post('/api/alerts/sync', (req, res) => {
    try {
      const { alerts, email, emailEnabled } = req.body || {};
      const result = syncClientAlerts(alerts, email, emailEnabled);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Alarmlar senkronize edilemedi' });
    }
  });

  // Create or update a single alert
  app.post('/api/alerts', (req, res) => {
    try {
      const alert = saveAlert(req.body);
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ error: 'Alarm kaydedilemedi' });
    }
  });

  // Delete an alert
  app.delete('/api/alerts/:id', (req, res) => {
    try {
      const deleted = deleteAlert(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: 'Alarm silinemedi' });
    }
  });

  // Update alert settings (recipient email, toggle notifications)
  app.post('/api/alerts/settings', (req, res) => {
    try {
      const settings = updateSettings(req.body || {});
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ error: 'Ayarlar güncellenemedi' });
    }
  });

  // Send a test email to verify delivery to ykefal@gmail.com
  app.post('/api/alerts/test-email', async (req, res) => {
    try {
      const email = req.body?.email || 'ykefal@gmail.com';
      const result = await sendTestEmail(email);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Test e-postası gönderilemedi' });
    }
  });

  // Client-notified instant trigger event
  app.post('/api/alerts/notify-trigger', async (req, res) => {
    try {
      const { alert, currentPrice, email } = req.body || {};
      if (!alert) {
        return res.status(400).json({ error: 'Alarm verisi eksik' });
      }
      const recipient = email || 'ykefal@gmail.com';
      const result = await sendAlertEmail(recipient, {
        code: alert.code,
        name: alert.name || alert.code,
        type: alert.type || 'stock',
        condition: alert.condition || 'above',
        targetPrice: alert.targetPrice,
        currentPrice: currentPrice || alert.currentPrice || alert.targetPrice,
        initialPrice: alert.initialPrice,
        triggeredAt: new Date().toISOString(),
        note: alert.note
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Bildirim iletilemedi' });
    }
  });

  // Trigger immediate alert check
  app.post('/api/alerts/check-now', async (req, res) => {
    try {
      const result = await evaluateServerAlerts();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: 'Alarm kontrolü başarısız' });
    }
  });

  // Start 24/7 background price monitoring worker
  startAlertBackgroundWorker();

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Borsa ve TEFAS Canlı Takip Sunucusu çalışıyor: http://0.0.0.0:${PORT}`);
  });
}

startServer();
