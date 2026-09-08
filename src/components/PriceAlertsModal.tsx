import React, { useState, useMemo, useEffect } from 'react';
import { Stock, Fund, MarketIndex, PriceAlert } from '../types';
import { formatCurrency, formatPercent, matchesSearch } from '../utils/formatters';
import { playAlertSound, requestNotificationPermission } from '../utils/sound';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Volume2, 
  SlidersHorizontal, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ExternalLink,
  Edit2,
  RotateCcw,
  Zap,
  Target,
  Mail,
  Send,
  Smartphone
} from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onUpdateAlert: (alert: PriceAlert) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  preselectedAsset?: Stock | Fund | { code: string; name: string; price: number; type: any } | null;
  stocks: Stock[];
  funds: Fund[];
  indices?: MarketIndex[];
  onSelectAsset?: (asset: Stock | Fund) => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onAddAlert,
  onUpdateAlert,
  onDeleteAlert,
  onToggleAlert,
  onResetAlert,
  preselectedAsset,
  stocks,
  funds,
  indices = [],
  onSelectAsset
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'triggered'>('all');
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'denied';
  });

  // Email notification state & testing
  const [testEmailLoading, setTestEmailLoading] = useState<boolean>(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ success: boolean; msg: string } | null>(null);

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/alerts/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ykefal@gmail.com' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailStatus({
          success: true,
          msg: data.simulated 
            ? 'Sunucu hazır: SMTP ayarları .env dosyasında yapılandırıldığında e-posta doğrudan iletilir.'
            : 'Test e-postası ykefal@gmail.com adresine başarıyla gönderildi!'
        });
      } else {
        setTestEmailStatus({
          success: false,
          msg: data.error || 'Test e-postası gönderilemedi.'
        });
      }
    } catch (err: any) {
      setTestEmailStatus({
        success: false,
        msg: err.message || 'Sunucu bağlantı hatası.'
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Form states for creating/editing alert
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>('AKBNK');
  const [searchAssetQuery, setSearchAssetQuery] = useState<string>('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState<boolean>(false);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [frequency, setFrequency] = useState<'once' | 'persistent'>('once');
  const [note, setNote] = useState<string>('');

  // Combine all selectable assets (Stocks, Funds, Indices/Crypto/Gold)
  const allSelectableAssets = useMemo(() => {
    const list: { code: string; name: string; price: number; type: any; changePercent?: number; categoryName?: string }[] = [];

    stocks.forEach(s => {
      list.push({
        code: s.code,
        name: s.name,
        price: s.price,
        type: 'stock',
        changePercent: s.changePercent,
        categoryName: `Hisse (${s.sector})`
      });
    });

    funds.forEach(f => {
      list.push({
        code: f.code,
        name: f.name,
        price: f.price,
        type: 'fund',
        changePercent: f.changePercent,
        categoryName: `Fon (${f.fundCategory})`
      });
    });

    // Add crypto / gold / currency from indices or presets
    const btcIndex = indices.find(i => i.code === 'BTC') || { code: 'BTC', name: 'Bitcoin (BTC / TRY)', value: 3280000, changePercent: 1.2 };
    const goldIndex = indices.find(i => i.code === 'ALTIN') || { code: 'GRAM-ALTIN', name: 'Gram Altın (24 Ayar)', value: 2985.50, changePercent: 0.45 };
    const usdIndex = indices.find(i => i.code === 'USDTRY') || { code: 'USDTRY', name: 'Dolar / TL (USD)', value: 36.82, changePercent: 0.12 };
    const eurIndex = indices.find(i => i.code === 'EURTRY') || { code: 'EURTRY', name: 'Euro / TL (EUR)', value: 38.65, changePercent: -0.18 };

    list.push({ code: 'GRAM-ALTIN', name: 'Gram Altın (24 Ayar)', price: goldIndex.value || 2985.50, type: 'gold_fx', changePercent: goldIndex.changePercent, categoryName: 'Emtia' });
    list.push({ code: 'USDTRY', name: 'Dolar / TL', price: usdIndex.value || 36.82, type: 'gold_fx', changePercent: usdIndex.changePercent, categoryName: 'Döviz' });
    list.push({ code: 'EURTRY', name: 'Euro / TL', price: eurIndex.value || 38.65, type: 'gold_fx', changePercent: eurIndex.changePercent, categoryName: 'Döviz' });
    list.push({ code: 'BTC', name: 'Bitcoin (TRY)', price: btcIndex.value || 3280000, type: 'crypto', changePercent: btcIndex.changePercent, categoryName: 'Kripto' });

    return list;
  }, [stocks, funds, indices]);

  // Active selected asset details
  const currentSelectedAsset = useMemo(() => {
    return allSelectableAssets.find(a => a.code.toUpperCase() === selectedAssetCode.toUpperCase()) || allSelectableAssets[0];
  }, [allSelectableAssets, selectedAssetCode]);

  // Set initial form values when preselectedAsset changes or modal opens
  useEffect(() => {
    if (preselectedAsset) {
      setSelectedAssetCode(preselectedAsset.code);
      const defaultTarget = preselectedAsset.price ? Number((preselectedAsset.price * 1.05).toFixed(2)) : 0;
      setTargetPrice(defaultTarget);
      setTargetPriceInput(defaultTarget ? String(defaultTarget) : '');
      setCondition('above');
      setActiveTab('create');
    } else if (currentSelectedAsset && targetPrice === 0) {
      const defaultTarget = Number((currentSelectedAsset.price * 1.05).toFixed(2));
      setTargetPrice(defaultTarget);
      setTargetPriceInput(String(defaultTarget));
    }
  }, [preselectedAsset, isOpen]);

  // Update target price default when user selects a different asset if not explicitly changed
  const handleSelectAsset = (asset: { code: string; price: number; name: string; type: any }) => {
    setSelectedAssetCode(asset.code);
    setIsAssetDropdownOpen(false);
    setSearchAssetQuery('');
    // Suggest 5% higher as default
    const suggested = condition === 'above' ? asset.price * 1.05 : asset.price * 0.95;
    const rounded = Number(suggested.toFixed(2));
    setTargetPrice(rounded);
    setTargetPriceInput(String(rounded));
  };

  // Helper for quick percentage delta buttons
  const applyDeltaPercent = (pct: number) => {
    if (!currentSelectedAsset) return;
    const basePrice = currentSelectedAsset.price;
    const calculated = basePrice * (1 + pct / 100);
    const rounded = Number(calculated.toFixed(2));
    setTargetPrice(rounded);
    setTargetPriceInput(String(rounded));
    if (pct >= 0) {
      setCondition('above');
    } else {
      setCondition('below');
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    playAlertSound('test');
  };

  const handleTestSound = () => {
    playAlertSound('trigger');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedAsset || targetPrice <= 0) return;

    if (editingAlertId) {
      const existing = alerts.find(a => a.id === editingAlertId);
      if (existing) {
        onUpdateAlert({
          ...existing,
          code: currentSelectedAsset.code,
          name: currentSelectedAsset.name,
          type: currentSelectedAsset.type,
          targetPrice: targetPrice,
          condition: condition,
          frequency: frequency,
          initialPrice: currentSelectedAsset.price,
          lastEvaluatedPrice: currentSelectedAsset.price,
          currentPrice: currentSelectedAsset.price,
          note: note,
          triggered: false,
          active: true
        });
      }
      setEditingAlertId(null);
    } else {
      onAddAlert({
        code: currentSelectedAsset.code,
        name: currentSelectedAsset.name,
        type: currentSelectedAsset.type,
        targetPrice: targetPrice,
        condition: condition,
        initialPrice: currentSelectedAsset.price,
        lastEvaluatedPrice: currentSelectedAsset.price,
        currentPrice: currentSelectedAsset.price,
        active: true,
        frequency: frequency,
        note: note
      });
    }

    playAlertSound('success');
    setActiveTab('list');
    setNote('');
  };

  const handleEditClick = (alert: PriceAlert) => {
    setEditingAlertId(alert.id);
    setSelectedAssetCode(alert.code);
    setTargetPrice(alert.targetPrice);
    setTargetPriceInput(String(alert.targetPrice));
    setCondition(alert.condition);
    setFrequency(alert.frequency);
    setNote(alert.note || '');
    setActiveTab('create');
  };

  // Filter alerts for the list view
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (filterMode === 'active') return alert.active && !alert.triggered;
      if (filterMode === 'triggered') return alert.triggered;
      return true;
    });
  }, [alerts, filterMode]);

  // Statistics
  const activeCount = alerts.filter(a => a.active && !a.triggered).length;
  const triggeredCount = alerts.filter(a => a.triggered).length;

  if (!isOpen) return null;

  // Filter dropdown items
  const matchedDropdownAssets = allSelectableAssets.filter(a => 
    !searchAssetQuery || 
    matchesSearch(a.code, searchAssetQuery) || 
    matchesSearch(a.name, searchAssetQuery)
  ).slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[96vh] sm:max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5 animate-wiggle" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Fiyat Alarmları & Fırsat Takipçisi
                </h2>
                {triggeredCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-rose-500 text-white animate-pulse">
                    {triggeredCount} Tetiklendi!
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Hedef seviyeler aşıldığında veya destek kırıldığında anında uyarı alın
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleTestSound}
              title="Alarm Sesini Test Et"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 hidden md:flex items-center gap-1.5 text-xs font-semibold"
            >
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Test Sesi</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP TAB TOGGLES & FILTERS */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => { setActiveTab('list'); setEditingAlertId(null); }}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alarmlarım ({alerts.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('create'); }}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{editingAlertId ? 'Alarmı Düzenle' : 'Yeni Alarm Kur'}</span>
            </button>
          </div>

          {activeTab === 'list' && alerts.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilterMode('active')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'active'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                onClick={() => setFilterMode('triggered')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'triggered'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tetiklenen ({triggeredCount})
              </button>
            </div>
          )}
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'create' ? (
            /* CREATE / EDIT ALERT FORM */
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              {/* Asset Selection Section */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  1. Takip Edilecek Varlık / Ürün
                </label>

                <div className="relative">
                  <div 
                    onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/30">
                        {currentSelectedAsset?.code.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-base">
                            {currentSelectedAsset?.code}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            {currentSelectedAsset?.categoryName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                          {currentSelectedAsset?.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatCurrency(currentSelectedAsset?.price || 0, 'TL')}
                      </div>
                      <div className={`text-[11px] font-bold ${
                        (currentSelectedAsset?.changePercent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {formatPercent(currentSelectedAsset?.changePercent || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isAssetDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-30 p-3 space-y-2 max-h-72 overflow-y-auto">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Hisse, Fon veya Varlık Ara (AKBNK, YLB, THYAO...)"
                          value={searchAssetQuery}
                          onChange={(e) => setSearchAssetQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1">
                        {matchedDropdownAssets.map(asset => (
                          <div
                            key={asset.code}
                            onClick={() => handleSelectAsset(asset)}
                            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {asset.code}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {asset.name}
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(asset.price, 'TL')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Condition Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  2. Alarm Koşulu (Tetiklenme Yönü)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setCondition('above');
                      if (currentSelectedAsset && targetPrice < currentSelectedAsset.price) {
                        setTargetPrice(Number((currentSelectedAsset.price * 1.05).toFixed(2)));
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      condition === 'above'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-white ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">Üzerine Çıkarsa (≥)</span>
                      </div>
                      {condition === 'above' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Fiyat hedef seviyenin <strong>üzerine</strong> çıktığında uyar (Direnç kırılımı, kâr al hedefi)
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setCondition('below');
                      if (currentSelectedAsset && targetPrice > currentSelectedAsset.price) {
                        setTargetPrice(Number((currentSelectedAsset.price * 0.95).toFixed(2)));
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      condition === 'below'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-white ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-600 text-white">
                          <ArrowDownRight className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm">Altına Düşerse (≤)</span>
                      </div>
                      {condition === 'below' && <CheckCircle2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Fiyat hedef seviyenin <strong>altına</strong> indiğinde uyar (Destek kırılımı, dip alım fırsatı, stop-loss)
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Price & Quick Delta Calculation Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    3. Hedef Tetiklenme Fiyatı (TL)
                  </label>
                  {currentSelectedAsset && (
                    <span className="text-xs text-slate-500">
                      Anlık Fiyat: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(currentSelectedAsset.price, 'TL')}</strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={targetPriceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetPriceInput(val);
                      const normalized = val.replace(',', '.');
                      const parsed = parseFloat(normalized);
                      setTargetPrice(isNaN(parsed) ? 0 : parsed);
                    }}
                    placeholder="Örn: 65.50 veya 513,95"
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-lg font-bold focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <span className="absolute right-4 top-4 font-bold text-xs text-slate-400">
                    TL
                  </span>
                </div>

                {/* Quick Percentage Chips */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Hızlı Yüzde Hesapla:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(-10)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-mono font-bold"
                    >
                      -%10 Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(-5)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-mono font-bold"
                    >
                      -%5 Dip
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(-2)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-mono font-bold"
                    >
                      -%2 Destek
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(2)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-mono font-bold"
                    >
                      +%2 Direnç
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(5)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-mono font-bold"
                    >
                      +%5 Hedef
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(10)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-mono font-bold"
                    >
                      +%10 Ralli
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDeltaPercent(20)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-mono font-bold"
                    >
                      +%20 Zirve
                    </button>
                  </div>
                </div>

                {/* Difference Summary & Crossover Notice */}
                {currentSelectedAsset && targetPrice > 0 && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Mevcut Fiyata Göre Fark:
                      </span>
                      <span className="font-bold font-mono">
                        {(() => {
                          const diffPct = ((targetPrice - currentSelectedAsset.price) / currentSelectedAsset.price) * 100;
                          const isPos = diffPct >= 0;
                          return (
                            <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isPos ? '+' : ''}{diffPct.toFixed(2)}% ({formatCurrency(targetPrice - currentSelectedAsset.price, 'TL')})
                            </span>
                          );
                        })()}
                      </span>
                    </div>

                    {/* Mismatch Warning & Explanation */}
                    {condition === 'above' && targetPrice <= currentSelectedAsset.price && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Kesişim Kuralı: Mevcut Fiyat Hedefin Üzerinde</span>
                        </div>
                        <p className="opacity-90">
                          Seçilen hedef ({formatCurrency(targetPrice, 'TL')}) anlık fiyattan ({formatCurrency(currentSelectedAsset.price, 'TL')}) küçüktür. Alarmın anında tetiklenmemesi için sistem, fiyatın önce hedefin altına inmesini ve sonrasında tekrar {formatCurrency(targetPrice, 'TL')} üzerine çıkmasını bekleyecektir.
                        </p>
                      </div>
                    )}

                    {condition === 'below' && targetPrice >= currentSelectedAsset.price && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Kesişim Kuralı: Mevcut Fiyat Hedefin Altında</span>
                        </div>
                        <p className="opacity-90">
                          Seçilen hedef ({formatCurrency(targetPrice, 'TL')}) anlık fiyattan ({formatCurrency(currentSelectedAsset.price, 'TL')}) büyüktür. Alarmın anında tetiklenmemesi için sistem, fiyatın önce hedefin üzerine çıkmasını ve sonrasında tekrar {formatCurrency(targetPrice, 'TL')} altına inmesini bekleyecektir.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Frequency & Custom Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tetiklenme Sıklığı
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="once">Tek Seferlik (Tetiklenince Durdur)</option>
                    <option value="persistent">Sürekli Alarm (Her Fiyat Geçişinde Uyar)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kişisel Not (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Örn: 200 lot alım gir, kâr realizasyonu yap"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); setEditingAlertId(null); }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors text-center"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>{editingAlertId ? 'Değişiklikleri Kaydet' : 'Alarmı Kur ve Takibi Başlat'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ALERTS LIST VIEW */
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800/60">
                    <Bell className="w-8 h-8 opacity-70" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {filterMode === 'triggered' ? 'Henüz tetiklenen alarm bulunmuyor' : 'Kayıtlı Alarm Bulunmuyor'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Hisseler ve fonlar belirlediğiniz kritik seviyelere geldiğinde işlem fırsatlarını kaçırmamak için hemen alarm kurabilirsiniz.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>İlk Alarmınızı Kurun</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredAlerts.map(alert => {
                    const assetObj = allSelectableAssets.find(a => a.code.toUpperCase() === alert.code.toUpperCase());
                    const currentPrice = assetObj?.price || alert.currentPrice || alert.initialPrice;
                    const diffPct = ((alert.targetPrice - currentPrice) / currentPrice) * 100;
                    const isAboveCondition = alert.condition === 'above';

                    return (
                      <div
                        key={alert.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all relative ${
                          alert.triggered
                            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs'
                            : !alert.active
                            ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Asset Info & Condition */}
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              alert.triggered
                                ? 'bg-rose-500 text-white shadow-md'
                                : isAboveCondition
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300'
                            }`}>
                              {alert.triggered ? <BellRing className="w-5 h-5 animate-wiggle" /> : (
                                isAboveCondition ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {alert.code}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isAboveCondition
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {isAboveCondition ? '≥ Üzerine Çıkarsa' : '≤ Altına Düşerse'}
                                </span>
                                {alert.triggered ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                                    TETİKLENDİ!
                                  </span>
                                ) : alert.active ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                                    Aktif Takipte
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    Pasif
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {alert.name} {alert.note ? `• 📝 "${alert.note}"` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Price Comparison Block */}
                          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 sm:gap-4 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100 dark:border-slate-800 font-mono">
                            <div className="text-left sm:text-right">
                              <div className="text-[10px] text-slate-400">Güncel Fiyat</div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {formatCurrency(currentPrice, 'TL')}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] text-slate-400">Hedef Seviye</div>
                              <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                                {formatCurrency(alert.targetPrice, 'TL')}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-auto lg:ml-0">
                              {alert.triggered && (
                                <button
                                  onClick={() => onResetAlert(alert.id)}
                                  title="Alarmı Sıfırla ve Tekrar Kur"
                                  className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => onToggleAlert(alert.id)}
                                title={alert.active ? "Alarmı Kapat" : "Alarmı Aç"}
                                className={`p-2 rounded-xl border transition-colors ${
                                  alert.active 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {alert.active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                              </button>

                              <button
                                onClick={() => handleEditClick(alert)}
                                title="Alarmı Düzenle"
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onDeleteAlert(alert.id)}
                                title="Alarmı Sil"
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors border border-slate-200 dark:border-slate-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Distance Progress & Status Bar */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px]">
                          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            {alert.triggered ? (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                🔔 {alert.triggeredAt ? `${alert.triggeredAt} tarihinde tetiklendi` : 'Hedef fiyat aşıldı!'} (Fiyat: {formatCurrency(alert.triggeredPrice || currentPrice, 'TL')})
                              </span>
                            ) : (
                              <span>
                                Hedefe Kalan: <strong className="font-mono text-slate-800 dark:text-slate-200">
                                  {Math.abs(diffPct).toFixed(2)}% ({formatCurrency(Math.abs(alert.targetPrice - currentPrice), 'TL')})
                                </strong>
                              </span>
                            )}
                          </div>

                          {onSelectAsset && (
                            <button
                              onClick={() => {
                                const matched = stocks.find(s => s.code === alert.code) || funds.find(f => f.code === alert.code);
                                if (matched) {
                                  onClose();
                                  onSelectAsset(matched);
                                }
                              }}
                              className="text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 text-[11px] self-end sm:self-auto"
                            >
                              <span>Detay & Grafik</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
