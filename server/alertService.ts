import fs from 'fs';
import path from 'path';
import { PriceAlert, Stock, Fund, MarketIndex } from '../src/types';
import { getLiveStocks, getLiveFunds, getLiveIndices, findOrFetchStock, findOrFetchFund } from './liveMarketService';
import { sendAlertEmail, sendTestEmail } from './emailService';

interface AlertSettings {
  recipientEmail: string;
  emailNotificationsEnabled: boolean;
  lastCheckedAt?: string;
}

interface AlertStore {
  alerts: PriceAlert[];
  settings: AlertSettings;
  history: Array<{
    id: string;
    alertId: string;
    code: string;
    name: string;
    targetPrice: number;
    triggeredPrice: number;
    condition: 'above' | 'below';
    triggeredAt: string;
    emailSentTo?: string;
  }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

let store: AlertStore = {
  alerts: [],
  settings: {
    recipientEmail: 'ykefal@gmail.com',
    emailNotificationsEnabled: true
  },
  history: []
};

// Ensure data directory exists and load store from disk
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ALERTS_FILE)) {
      const data = fs.readFileSync(ALERTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      store = {
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        settings: {
          recipientEmail: parsed.settings?.recipientEmail || 'ykefal@gmail.com',
          emailNotificationsEnabled: parsed.settings?.emailNotificationsEnabled !== false
        },
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
      console.log(`[AlertService] Loaded ${store.alerts.length} alerts from disk. Recipient: ${store.settings.recipientEmail}`);
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('[AlertService] Error initializing alert store:', err);
  }
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AlertService] Failed to save alert store:', err);
  }
}

// Initial baseline calibration tracker
let isBaselineCalibrated = false;

/**
 * Resolves current market price for any asset code
 */
async function resolveCurrentPrice(code: string): Promise<{ price: number; name?: string; type?: string } | null> {
  const uCode = (code || '').toUpperCase().trim();
  if (!uCode) return null;

  // 1. Check stocks
  const stocks = getLiveStocks();
  const foundStock = stocks.find(s => s.code.toUpperCase() === uCode);
  if (foundStock && typeof foundStock.price === 'number' && foundStock.price > 0) {
    return { price: foundStock.price, name: foundStock.name, type: 'stock' };
  }

  // 2. Check funds
  const funds = getLiveFunds();
  const foundFund = funds.find(f => f.code.toUpperCase() === uCode);
  if (foundFund && typeof foundFund.price === 'number' && foundFund.price > 0) {
    return { price: foundFund.price, name: foundFund.name, type: 'fund' };
  }

  // 3. Check indices (Gold, USD, EUR, BTC, etc.)
  const indices = getLiveIndices();
  const foundIndex = indices.find(i => i.code.toUpperCase() === uCode);
  if (foundIndex && typeof foundIndex.value === 'number' && foundIndex.value > 0) {
    return { price: foundIndex.value, name: foundIndex.name, type: 'index' };
  }

  // Common aliases
  if (uCode === 'GRAM-ALTIN' || uCode === 'ALTIN') {
    const gold = indices.find(i => i.code === 'ALTIN');
    if (gold) return { price: gold.value, name: 'Gram Altın (24 Ayar)', type: 'gold_fx' };
  }
  if (uCode === 'USDTRY' || uCode === 'USD') {
    const usd = indices.find(i => i.code === 'USDTRY');
    if (usd) return { price: usd.value, name: 'Dolar / TL (USD)', type: 'gold_fx' };
  }
  if (uCode === 'EURTRY' || uCode === 'EUR') {
    const eur = indices.find(i => i.code === 'EURTRY');
    if (eur) return { price: eur.value, name: 'Euro / TL (EUR)', type: 'gold_fx' };
  }
  if (uCode === 'BTC' || uCode === 'BTC-TRY') {
    const btc = indices.find(i => i.code === 'BTC');
    if (btc) return { price: btc.value, name: 'Bitcoin (BTC / TRY)', type: 'crypto' };
  }

  // 4. Try live fetching
  try {
    const fetchedStock = await findOrFetchStock(uCode);
    if (fetchedStock && typeof fetchedStock.price === 'number' && fetchedStock.price > 0) {
      return { price: fetchedStock.price, name: fetchedStock.name, type: 'stock' };
    }
    const fetchedFund = await findOrFetchFund(uCode);
    if (fetchedFund && typeof fetchedFund.price === 'number' && fetchedFund.price > 0) {
      return { price: fetchedFund.price, name: fetchedFund.name, type: 'fund' };
    }
  } catch (err) {
    // Ignore fetch error
  }

  return null;
}

/**
 * 24/7 Background Alert Evaluation Loop
 * Evaluates active alerts and sends emails to ykefal@gmail.com upon threshold crossover
 */
export async function evaluateServerAlerts(): Promise<{ triggeredCount: number }> {
  store.settings.lastCheckedAt = new Date().toISOString();
  let triggeredCount = 0;
  let hasStoreUpdates = false;

  const activeAlerts = store.alerts.filter(a => a.active && !a.triggered);
  if (activeAlerts.length === 0) {
    return { triggeredCount: 0 };
  }

  // Initial calibration pass so existing alerts don't trigger immediately without a real crossover
  if (!isBaselineCalibrated) {
    isBaselineCalibrated = true;
    for (const alert of store.alerts) {
      const live = await resolveCurrentPrice(alert.code);
      if (live) {
        alert.currentPrice = live.price;
        alert.lastEvaluatedPrice = live.price;
        if (!alert.initialPrice) alert.initialPrice = live.price;
        hasStoreUpdates = true;
      }
    }
    if (hasStoreUpdates) saveStore();
    return { triggeredCount: 0 };
  }

  for (const alert of store.alerts) {
    if (!alert.active || alert.triggered) continue;

    const live = await resolveCurrentPrice(alert.code);
    if (!live || live.price <= 0) continue;

    const currentPrice = live.price;
    const prevPrice = alert.lastEvaluatedPrice !== undefined ? alert.lastEvaluatedPrice : (alert.currentPrice || currentPrice);

    let isTriggered = false;

    if (alert.condition === 'above') {
      if (currentPrice >= alert.targetPrice && prevPrice < alert.targetPrice) {
        isTriggered = true;
      }
    } else if (alert.condition === 'below') {
      if (currentPrice <= alert.targetPrice && prevPrice > alert.targetPrice) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      triggeredCount++;
      hasStoreUpdates = true;

      const triggeredTime = new Date().toISOString();
      alert.triggered = true;
      alert.triggeredAt = triggeredTime;
      alert.triggeredPrice = currentPrice;
      alert.lastEvaluatedPrice = currentPrice;
      alert.currentPrice = currentPrice;
      alert.active = alert.frequency === 'persistent';

      const emailRecipient = store.settings.recipientEmail || 'ykefal@gmail.com';

      // Log trigger event
      store.history.unshift({
        id: `th-${Date.now()}-${alert.code}`,
        alertId: alert.id,
        code: alert.code,
        name: alert.name || live.name || alert.code,
        targetPrice: alert.targetPrice,
        triggeredPrice: currentPrice,
        condition: alert.condition,
        triggeredAt: triggeredTime,
        emailSentTo: store.settings.emailNotificationsEnabled ? emailRecipient : undefined
      });

      // Send Email Notification if enabled
      if (store.settings.emailNotificationsEnabled) {
        console.log(`[AlertService] 🚨 Triggered alert for ${alert.code}! Sending email to ${emailRecipient}...`);
        sendAlertEmail(emailRecipient, {
          code: alert.code,
          name: alert.name || live.name || alert.code,
          type: alert.type || live.type || 'stock',
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: currentPrice,
          initialPrice: alert.initialPrice,
          triggeredAt: triggeredTime,
          note: alert.note
        }).catch(err => {
          console.error('[AlertService] Failed to send email:', err);
        });
      }
    } else {
      // Smoothly update price without trigger
      if (alert.lastEvaluatedPrice !== currentPrice || alert.currentPrice !== currentPrice) {
        alert.lastEvaluatedPrice = currentPrice;
        alert.currentPrice = currentPrice;
        hasStoreUpdates = true;
      }
    }
  }

  if (hasStoreUpdates) {
    saveStore();
  }

  return { triggeredCount };
}

// Background Worker Timer
let backgroundTimer: NodeJS.Timeout | null = null;

export function startAlertBackgroundWorker() {
  initStore();
  if (backgroundTimer) clearInterval(backgroundTimer);

  console.log('[AlertService] 🚀 Starting 24/7 background price monitoring worker (interval: 45s)...');
  
  // Initial run after 5 seconds to allow market service to warm up
  setTimeout(() => {
    evaluateServerAlerts().catch(console.error);
  }, 5000);

  // Periodic interval every 45 seconds
  backgroundTimer = setInterval(() => {
    evaluateServerAlerts().catch(console.error);
  }, 45000);
}

// Service APIs

export function getAlertsData() {
  return {
    alerts: store.alerts,
    settings: store.settings,
    history: store.history.slice(0, 50)
  };
}

export function syncClientAlerts(clientAlerts: PriceAlert[], email?: string, emailEnabled?: boolean) {
  if (email) {
    store.settings.recipientEmail = email;
  }
  if (emailEnabled !== undefined) {
    store.settings.emailNotificationsEnabled = emailEnabled;
  }

  if (Array.isArray(clientAlerts)) {
    // Merge or replace
    const alertMap = new Map<string, PriceAlert>();
    
    // Existing server alerts
    for (const a of store.alerts) {
      alertMap.set(a.id, a);
    }

    // Upsert client alerts
    for (const ca of clientAlerts) {
      const existing = alertMap.get(ca.id);
      if (existing) {
        alertMap.set(ca.id, {
          ...existing,
          ...ca,
          // Retain server's triggered status if triggered in background
          triggered: existing.triggered || ca.triggered,
          triggeredAt: existing.triggeredAt || ca.triggeredAt,
          triggeredPrice: existing.triggeredPrice || ca.triggeredPrice
        });
      } else {
        alertMap.set(ca.id, ca);
      }
    }

    store.alerts = Array.from(alertMap.values());
  }

  saveStore();
  return getAlertsData();
}

export function saveAlert(alertData: Partial<PriceAlert>): PriceAlert {
  const id = alertData.id || `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newAlert: PriceAlert = {
    id,
    code: (alertData.code || '').toUpperCase().trim(),
    name: alertData.name || alertData.code || '',
    type: alertData.type || 'stock',
    targetPrice: Number(alertData.targetPrice) || 0,
    condition: alertData.condition || 'above',
    initialPrice: Number(alertData.initialPrice) || Number(alertData.targetPrice) || 0,
    lastEvaluatedPrice: alertData.lastEvaluatedPrice,
    currentPrice: alertData.currentPrice,
    active: alertData.active !== false,
    frequency: alertData.frequency || 'once',
    createdAt: alertData.createdAt || new Date().toISOString(),
    triggered: alertData.triggered || false,
    triggeredAt: alertData.triggeredAt,
    triggeredPrice: alertData.triggeredPrice,
    note: alertData.note
  };

  const existingIndex = store.alerts.findIndex(a => a.id === id);
  if (existingIndex >= 0) {
    store.alerts[existingIndex] = { ...store.alerts[existingIndex], ...newAlert };
  } else {
    store.alerts.push(newAlert);
  }

  saveStore();
  return newAlert;
}

export function deleteAlert(id: string): boolean {
  const initialLen = store.alerts.length;
  store.alerts = store.alerts.filter(a => a.id !== id);
  if (store.alerts.length !== initialLen) {
    saveStore();
    return true;
  }
  return false;
}

export function updateSettings(settings: Partial<AlertSettings>): AlertSettings {
  store.settings = { ...store.settings, ...settings };
  saveStore();
  return store.settings;
}
