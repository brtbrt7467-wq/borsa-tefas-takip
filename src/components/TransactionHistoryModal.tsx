import React, { useState, useMemo } from 'react';
import { 
  PortfolioItem, 
  PortfolioTransaction, 
  TransactionType, 
  Stock, 
  Fund 
} from '../types';
import { 
  calculateWeightedTransactions, 
  simulateTransaction
} from '../utils/portfolioCalculations';
import { getCategoryMeta } from '../data/assetCategoriesData';
import { 
  History, 
  Plus, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Layers, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileSpreadsheet, 
  HelpCircle,
  Clock,
  Calculator
} from 'lucide-react';

interface TransactionHistoryModalProps {
  item: PortfolioItem;
  stocks: Stock[];
  funds: FundsProp[];
  onClose: () => void;
  onSaveTransactions: (updatedItem: PortfolioItem) => void;
}

type FundsProp = Fund;

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  item,
  stocks,
  funds,
  onClose,
  onSaveTransactions
}) => {
  const meta = getCategoryMeta(item.category || (item.type === 'fund' ? 'fund' : 'stock'));

  // Find live price if available
  const livePrice = useMemo(() => {
    if (item.type === 'stock') {
      const s = stocks.find(st => st.code.toUpperCase() === item.code.toUpperCase());
      return s ? s.price : item.currentPrice || item.averageCost;
    } else {
      const f = funds.find(fn => fn.code.toUpperCase() === item.code.toUpperCase());
      return f ? f.price : item.currentPrice || item.averageCost;
    }
  }, [item, stocks, funds]);

  // Working transaction list in local modal state
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>(() => {
    if (item.transactions && item.transactions.length > 0) {
      return [...item.transactions];
    }
    // Fallback: create initial buy from item summary
    return [
      {
        id: `tx_${Date.now()}_init`,
        code: item.code,
        type: 'buy',
        date: item.addedDate || new Date().toISOString().split('T')[0],
        quantity: item.quantity,
        price: item.averageCost,
        totalAmount: item.quantity * item.averageCost,
        notes: item.notes || 'Başlangıç Alımı',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // New Transaction Form State
  const [txType, setTxType] = useState<TransactionType>('buy');
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txQuantity, setTxQuantity] = useState<number | ''>('');
  const [txPrice, setTxPrice] = useState<number | ''>(livePrice);
  const [txNotes, setTxNotes] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Calculation Results
  const calcResult = useMemo(() => {
    return calculateWeightedTransactions(
      transactions,
      item.quantity,
      item.averageCost,
      item.addedDate,
      item.code
    );
  }, [transactions, item]);

  // Live Simulation based on current form inputs
  const simulation = useMemo(() => {
    const qty = typeof txQuantity === 'number' ? txQuantity : 0;
    const prc = typeof txPrice === 'number' ? txPrice : 0;
    if (qty <= 0 || prc <= 0) return null;

    return simulateTransaction(
      calcResult.currentQuantity,
      calcResult.averageCost,
      txType,
      qty,
      prc
    );
  }, [calcResult, txType, txQuantity, txPrice]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const qty = typeof txQuantity === 'number' ? txQuantity : Number(txQuantity);
    const prc = typeof txPrice === 'number' ? txPrice : Number(txPrice);

    if (!qty || qty <= 0) {
      setFormError('Lütfen geçerli bir miktar / adet giriniz.');
      return;
    }
    if (!prc || prc <= 0) {
      setFormError('Lütfen geçerli bir birim fiyat giriniz.');
      return;
    }
    if (txType === 'sell' && qty > calcResult.currentQuantity) {
      setFormError(`Satış miktarı (${qty}) eldeki mevcut miktardan (${calcResult.currentQuantity}) fazla olamaz!`);
      return;
    }

    const newTx: PortfolioTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      portfolioItemId: item.id,
      code: item.code,
      type: txType,
      date: txDate,
      quantity: qty,
      price: prc,
      totalAmount: qty * prc,
      notes: txNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [...prev, newTx]);
    setTxQuantity('');
    setTxNotes('');
  };

  const handleRemoveTransactionByIndex = (indexToDelete: number) => {
    if (transactions.length <= 1) {
      if (!window.confirm('Son işlemi silmek üzeresiniz. Devam edilsin mi?')) return;
    }
    setTransactions(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleQuickSellLot = (tx: PortfolioTransaction, index: number) => {
    setTxType('sell');
    setTxQuantity(Math.min(tx.quantity, calcResult.currentQuantity > 0 ? calcResult.currentQuantity : tx.quantity));
    setTxPrice(livePrice);
    setTxNotes(`${tx.quantity} lot alımından satış (#${index + 1})`);
    setFormError(null);
  };

  const handleSaveAndApply = () => {
    const updated: PortfolioItem = {
      ...item,
      quantity: calcResult.currentQuantity,
      averageCost: calcResult.averageCost,
      addedDate: calcResult.firstBuyDate || item.addedDate,
      transactions: calcResult.enrichedTransactions,
      realizedProfitLoss: calcResult.totalRealizedProfitLoss,
      currentPrice: livePrice
    };

    onSaveTransactions(updated);
    onClose();
  };

  // Preset example loader (specifically the user's MGROS example)
  const handleLoadMgrosExample = () => {
    const sampleTxs: PortfolioTransaction[] = [
      {
        id: `tx_sample_1`,
        portfolioItemId: item.id,
        code: item.code,
        type: 'buy',
        date: '2026-01-15',
        quantity: 500,
        price: 624.72,
        totalAmount: 500 * 624.72,
        notes: '1. Kademe Alım (15.01.2026)',
        createdAt: '2026-01-15T10:00:00.000Z'
      },
      {
        id: `tx_sample_2`,
        portfolioItemId: item.id,
        code: item.code,
        type: 'buy',
        date: '2026-05-15',
        quantity: 3,
        price: 688.50,
        totalAmount: 3 * 688.50,
        notes: '2. Kademe Alım (15.05.2026)',
        createdAt: '2026-05-15T10:00:00.000Z'
      }
    ];
    setTransactions(sampleTxs);
  };

  // Open Value & PnL
  const openValue = calcResult.currentQuantity * livePrice;
  const openPnL = openValue - calcResult.totalCost;
  const openPnLPercent = calcResult.totalCost > 0 ? (openPnL / calcResult.totalCost) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor} shadow-xs`}>
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {item.code}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                  {meta.shortLabel}
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Güncel: {livePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">{item.name}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* MODAL SCROLLABLE CONTENT */}
        <div className="px-5 sm:px-6 space-y-5 overflow-y-auto flex-1">

          {/* 4 SUMMARY METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Net Quantity */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                Eldeki Net Miktar
              </span>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                {calcResult.currentQuantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                <span className="text-xs font-sans text-slate-500 font-normal ml-1">{meta.unitLabel}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                {calcResult.totalBuyCount} Alış, {calcResult.totalSellCount} Satış
              </span>
            </div>

            {/* Weighted Average Cost */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex flex-col justify-between">
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold block">
                Ağırlıklı Ort. Maliyet
              </span>
              <div className="text-lg font-bold font-mono text-indigo-950 dark:text-indigo-200 mt-1">
                {calcResult.averageCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₺
              </div>
              <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-mono mt-1">
                Kalan Maliyet: {calcResult.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </div>

            {/* Open Value & Open PnL */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              openPnL >= 0 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}>
              <span className="text-[11px] font-medium block opacity-80">
                Açık Pozisyon K / Z
              </span>
              <div className="text-lg font-bold font-mono mt-1">
                {openPnL >= 0 ? '+' : ''}{openPnL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] font-mono font-semibold opacity-90 mt-1">
                {openPnL >= 0 ? '+' : ''}%{openPnLPercent.toFixed(2)} (Değer: {openValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺)
              </span>
            </div>

            {/* Realized PnL from partial sales */}
            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex flex-col justify-between">
              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold block">
                Gerçekleşen K / Z (Satışlar)
              </span>
              <div className={`text-lg font-bold font-mono mt-1 ${
                calcResult.totalRealizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {calcResult.totalRealizedProfitLoss >= 0 ? '+' : ''}
                {calcResult.totalRealizedProfitLoss.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400 font-mono mt-1">
                Realize Edilmiş Kâr
              </span>
            </div>
          </div>

          {/* QUICK PRESET HELPER (e.g. MGROS example) */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Kademeli Al-Sat Rehberi:</strong> Farklı tarihlerde yaptığınız her alım ağırlıklı ortalamayı günceller, satışlar ise kârınızı realize eder.
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadMgrosExample}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors shrink-0 shadow-xs flex items-center justify-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>MGROS Örneğini Yükle (500 + 3 Adet)</span>
            </button>
          </div>

          {/* NEW TRANSACTION FORM */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Yeni Parçalı İşlem Ekle (Alış / Satış)
                </h4>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTxType('buy')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    txType === 'buy'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Alış Yap (Ekle)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('sell')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    txType === 'sell'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Satış Yap (Çıkış)</span>
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Transaction Date */}
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    İşlem Tarihi *
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setTxDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      İşlem Miktarı ({meta.unitLabel}) *
                    </label>
                    {txType === 'sell' && calcResult.currentQuantity > 0 && (
                      <button
                        type="button"
                        onClick={() => setTxQuantity(calcResult.currentQuantity)}
                        className="text-[10px] text-rose-600 dark:text-rose-400 font-bold underline"
                      >
                        Tümü ({calcResult.currentQuantity})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="örn: 500 veya 3"
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Execution Price */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      Birim Fiyat (TL) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setTxPrice(livePrice)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold underline"
                    >
                      Piyasa ({livePrice.toFixed(2)} ₺)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="örn: 624.72 veya 688.50"
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes and Total Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                    İşlem Notu / Açıklama (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="örn: Maaş günü alımı, Kâr realizasyonu, Temettü eklemesi"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className={`w-full py-2 px-4 rounded-xl text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                      txType === 'buy'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {txType === 'buy' ? <Plus className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                    <span>{txType === 'buy' ? 'Alış İşlemini Kaydet' : 'Satış İşlemini Kaydet'}</span>
                  </button>
                </div>
              </div>

              {/* LIVE SIMULATION BOX */}
              {simulation && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  txType === 'buy'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                    : 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      {txType === 'buy' ? (
                        <>
                          Bu işlem sonrası yeni ortalama maliyetiniz: <strong>{simulation.simulatedAverageCost.toFixed(2)} ₺</strong>
                          {' '}(Toplam: {simulation.simulatedQuantity} {meta.unitLabel})
                        </>
                      ) : (
                        <>
                          Bu satıştan realize edilecek kâr: <strong>
                            {(simulation.simulatedRealizedPnL || 0) >= 0 ? '+' : ''}
                            {(simulation.simulatedRealizedPnL || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            {' '}(%{(simulation.simulatedRealizedPnLPercent || 0).toFixed(2)})
                          </strong>
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-[11px] opacity-80 shrink-0">
                    İşlem Tutarı: {((typeof txQuantity === 'number' ? txQuantity : 0) * (typeof txPrice === 'number' ? txPrice : 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* CHRONOLOGICAL TRANSACTION TABLE */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span>Geçmiş İşlem Kayıtları & Lot Listesi ({calcResult.enrichedTransactions.length} İşlem)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Tarihe göre kronolojik sırada hesaplanır
              </span>
            </div>

            {calcResult.enrichedTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                Kayıtlı işlem bulunamadı. Yukarıdaki formu kullanarak ilk alış işleminizi ekleyin.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">İşlem Türü</th>
                        <th className="py-2.5 px-3">Miktar / Adet</th>
                        <th className="py-2.5 px-3">Birim Fiyat</th>
                        <th className="py-2.5 px-3">Toplam Tutar</th>
                        <th className="py-2.5 px-3">Ort. Maliyet Sonrası</th>
                        <th className="py-2.5 px-3">Kalan Bakiye</th>
                        <th className="py-2.5 px-3">Realize K/Z</th>
                        <th className="py-2.5 px-3">Not</th>
                        <th className="py-2.5 px-2 text-right">Sil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {calcResult.enrichedTransactions.map((tx, idx) => {
                        const isBuy = tx.type === 'buy';
                        return (
                          <tr 
                            key={tx.id || idx}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            {/* Date */}
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {tx.date}
                            </td>

                            {/* Type Badge */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                                isBuy
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{isBuy ? 'ALIŞ' : 'SATIŞ'}</span>
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {isBuy ? '+' : '-'}{tx.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                            </td>

                            {/* Price */}
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              {tx.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </td>

                            {/* Total Amount */}
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {tx.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </td>

                            {/* Running Average Cost */}
                            <td className="py-2.5 px-3 text-indigo-700 dark:text-indigo-400 font-bold">
                              {tx.averageCostAfter ? `${tx.averageCostAfter.toFixed(2)} ₺` : '-'}
                            </td>

                            {/* Running Quantity */}
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {tx.remainingQuantityAfter !== undefined ? tx.remainingQuantityAfter.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : '-'}
                            </td>

                            {/* Realized PnL on sell */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {tx.realizedProfitLoss !== undefined ? (
                                <span className={`font-bold ${
                                  tx.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {tx.realizedProfitLoss >= 0 ? '+' : ''}{tx.realizedProfitLoss.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                  <span className="text-[10px] opacity-75 ml-1">
                                    (%{(tx.realizedProfitLossPercent || 0).toFixed(1)})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Notes */}
                            <td className="py-2.5 px-3 font-sans text-[11px] text-slate-500 truncate max-w-[130px]">
                              {tx.notes || '-'}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isBuy && calcResult.currentQuantity > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSellLot(tx, idx)}
                                    className="px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/60 rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                                    title="Bu lotu satmak için forma yükle"
                                  >
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    <span>Sat</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTransactionByIndex(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title="İşlemi Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono text-center sm:text-left">
            Güncellenecek Durum: <strong className="text-slate-900 dark:text-white">{calcResult.currentQuantity} {meta.unitLabel}</strong> @ <strong className="text-indigo-600 dark:text-indigo-400">{calcResult.averageCost.toFixed(2)} ₺</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>İşlemleri Portföye Kaydet ve Güncelle</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
