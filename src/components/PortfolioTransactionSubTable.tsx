import React, { useState, useMemo } from 'react';
import { 
  PortfolioItem, 
  PortfolioTransaction, 
  TransactionType 
} from '../types';
import { 
  calculateWeightedTransactions,
  simulateTransaction
} from '../utils/portfolioCalculations';
import { 
  formatCurrency, 
  formatPercent, 
  formatDateTurkish 
} from '../utils/formatters';
import { 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Calculator, 
  Check, 
  X,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckSquare,
  Square
} from 'lucide-react';

interface PortfolioTransactionSubTableProps {
  item: PortfolioItem & {
    currentPrice?: number;
    dailyChange?: number;
    changePercent?: number;
  };
  onUpdateItem: (updatedItem: PortfolioItem) => void;
  onOpenModal?: () => void;
  onOpenFullModal?: () => void;
  onSelectAsset?: () => void;
}

export const PortfolioTransactionSubTable: React.FC<PortfolioTransactionSubTableProps> = ({
  item,
  onUpdateItem,
  onOpenModal,
  onOpenFullModal,
  onSelectAsset
}) => {
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newType, setNewType] = useState<TransactionType>('buy');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [newPrice, setNewPrice] = useState<number | ''>(() => item.currentPrice || item.averageCost || 10);
  const [newNotes, setNewNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Sell Modal state (for selling a single lot or bulk)
  const [sellModalTarget, setSellModalTarget] = useState<{
    mode: 'single' | 'bulk' | 'all';
    targetLot?: PortfolioTransaction;
    targetIndex?: number;
  } | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>(() => item.currentPrice || item.averageCost || 10);
  const [sellDate, setSellDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sellNotes, setSellNotes] = useState<string>('');

  // Selected row indices for multi-select actions
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Normalize raw transaction list with guaranteed unique IDs
  const rawTransactions = useMemo(() => {
    if (item.transactions && item.transactions.length > 0) {
      return item.transactions.map((t, idx) => ({
        ...t,
        id: t.id ? t.id : `tx_${item.id || item.code}_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      }));
    }
    if (item.quantity > 0) {
      return [
        {
          id: `tx_${item.id || item.code}_init`,
          code: item.code,
          type: 'buy' as const,
          date: item.addedDate || new Date().toISOString().split('T')[0],
          quantity: item.quantity,
          price: item.averageCost,
          totalAmount: item.quantity * item.averageCost,
          notes: item.notes || 'Başlangıç Alımı / Portföy Girişi',
          createdAt: item.addedDate
        }
      ];
    }
    return [];
  }, [item]);

  // Compute enriched transactions with running balances & realized PnL
  const calcResult = useMemo(() => {
    return calculateWeightedTransactions(
      rawTransactions,
      item.quantity,
      item.averageCost,
      item.addedDate,
      item.code
    );
  }, [rawTransactions, item]);

  const liveUnitPrice = item.currentPrice || item.averageCost;

  // Live simulation for the inline add form
  const inlineSimulation = useMemo(() => {
    const qty = typeof newQuantity === 'number' ? newQuantity : Number(newQuantity);
    const prc = typeof newPrice === 'number' ? newPrice : Number(newPrice);
    if (!qty || qty <= 0 || !prc || prc <= 0) return null;
    return simulateTransaction(
      calcResult.currentQuantity,
      calcResult.averageCost,
      newType,
      qty,
      prc
    );
  }, [calcResult, newType, newQuantity, newPrice]);

  // Modal open handler fallback
  const handleOpenAdvancedModal = () => {
    if (onOpenModal) {
      onOpenModal();
    } else if (onOpenFullModal) {
      onOpenFullModal();
    }
  };

  // Handle adding new transaction inline
  const handleSaveInlineTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const qty = Number(newQuantity);
    const prc = Number(newPrice);

    if (!qty || qty <= 0) {
      setErrorMsg('Lütfen geçerli bir adet giriniz.');
      return;
    }
    if (!prc || prc <= 0) {
      setErrorMsg('Lütfen geçerli bir birim fiyat giriniz.');
      return;
    }

    if (newType === 'sell' && qty > calcResult.currentQuantity) {
      setErrorMsg(`Mevcut bakiyeden (${calcResult.currentQuantity.toLocaleString('tr-TR')} adet) fazla satış yapılamaz.`);
      return;
    }

    const newTx: PortfolioTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      code: item.code,
      type: newType,
      date: newDate || new Date().toISOString().split('T')[0],
      quantity: qty,
      price: prc,
      totalAmount: Number((qty * prc).toFixed(2)),
      notes: newNotes.trim() || (newType === 'buy' ? 'Kademeli Alım' : 'Kâr / Pozisyon Satışı'),
      createdAt: new Date().toISOString()
    };

    const updatedRaw = [...rawTransactions, newTx];
    const newCalc = calculateWeightedTransactions(
      updatedRaw,
      0,
      item.averageCost,
      item.addedDate,
      item.code
    );

    const updatedItem: PortfolioItem = {
      ...item,
      quantity: newCalc.currentQuantity,
      averageCost: newCalc.averageCost,
      realizedProfitLoss: newCalc.totalRealizedProfitLoss,
      addedDate: newCalc.firstBuyDate || item.addedDate,
      transactions: newCalc.enrichedTransactions
    };

    onUpdateItem(updatedItem);

    // Reset inline form
    setNewQuantity('');
    setNewNotes('');
    setShowInlineAdd(false);
  };

  // Handle deleting a single transaction by exact index
  const handleDeleteTransactionByIndex = (targetIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (rawTransactions.length <= 1) {
      if (!window.confirm('Bu tek işlem silinirse tüm pozisyon sıfırlanacaktır. Devam etmek istiyor musunuz?')) {
        return;
      }
    }

    const filtered = rawTransactions.filter((_, idx) => idx !== targetIdx);
    
    if (filtered.length === 0) {
      const resetItem: PortfolioItem = {
        ...item,
        quantity: 0,
        averageCost: item.averageCost,
        realizedProfitLoss: 0,
        transactions: []
      };
      onUpdateItem(resetItem);
      setSelectedIndices(new Set());
      return;
    }

    const newCalc = calculateWeightedTransactions(
      filtered,
      0,
      item.averageCost,
      item.addedDate,
      item.code
    );

    const updatedItem: PortfolioItem = {
      ...item,
      quantity: newCalc.currentQuantity,
      averageCost: newCalc.averageCost,
      realizedProfitLoss: newCalc.totalRealizedProfitLoss,
      addedDate: newCalc.firstBuyDate || item.addedDate,
      transactions: newCalc.enrichedTransactions
    };

    onUpdateItem(updatedItem);
    setSelectedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < targetIdx) next.add(i);
        else if (i > targetIdx) next.add(i - 1);
      });
      return next;
    });
  };

  // Handle opening Quick Sell for a specific lot
  const handleOpenSingleLotSell = (tx: PortfolioTransaction, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultQty = Math.min(tx.quantity, calcResult.currentQuantity > 0 ? calcResult.currentQuantity : tx.quantity);
    setSellModalTarget({
      mode: 'single',
      targetLot: tx,
      targetIndex: idx
    });
    setSellQuantity(defaultQty > 0 ? defaultQty : 1);
    setSellPrice(liveUnitPrice);
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellNotes(`${tx.quantity} lot alımından satış (#${idx + 1})`);
    setErrorMsg(null);
  };

  // Handle opening Bulk Sell / Close all
  const handleOpenBulkSell = (mode: 'all' | 'bulk') => {
    let defaultQty = calcResult.currentQuantity;
    if (mode === 'bulk' && selectedIndices.size > 0) {
      defaultQty = 0;
      selectedIndices.forEach(idx => {
        const tx = calcResult.enrichedTransactions[idx];
        if (tx && tx.type === 'buy') {
          defaultQty += tx.quantity;
        }
      });
      defaultQty = Math.min(defaultQty, calcResult.currentQuantity);
    }

    setSellModalTarget({ mode });
    setSellQuantity(defaultQty > 0 ? defaultQty : calcResult.currentQuantity);
    setSellPrice(liveUnitPrice);
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellNotes(mode === 'all' ? 'Tüm Pozisyonu Kapatma Satışı' : `Seçilen ${selectedIndices.size} işlemden toplu satış`);
    setErrorMsg(null);
  };

  // Execute Sale Submission
  const handleExecuteSell = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(sellQuantity);
    const prc = Number(sellPrice);

    if (!qty || qty <= 0) {
      setErrorMsg('Lütfen satılacak geçerli bir adet giriniz.');
      return;
    }
    if (!prc || prc <= 0) {
      setErrorMsg('Lütfen geçerli bir satış fiyatı giriniz.');
      return;
    }
    if (qty > calcResult.currentQuantity) {
      setErrorMsg(`Mevcut kalan bakiyeden (${calcResult.currentQuantity.toLocaleString('tr-TR')} adet) fazla satış yapılamaz.`);
      return;
    }

    const sellTx: PortfolioTransaction = {
      id: `tx_sell_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      code: item.code,
      type: 'sell',
      date: sellDate || new Date().toISOString().split('T')[0],
      quantity: qty,
      price: prc,
      totalAmount: Number((qty * prc).toFixed(2)),
      notes: sellNotes.trim() || 'Kâr / Lot Satışı',
      createdAt: new Date().toISOString()
    };

    const updatedRaw = [...rawTransactions, sellTx];
    const newCalc = calculateWeightedTransactions(
      updatedRaw,
      0,
      item.averageCost,
      item.addedDate,
      item.code
    );

    const updatedItem: PortfolioItem = {
      ...item,
      quantity: newCalc.currentQuantity,
      averageCost: newCalc.averageCost,
      realizedProfitLoss: newCalc.totalRealizedProfitLoss,
      addedDate: newCalc.firstBuyDate || item.addedDate,
      transactions: newCalc.enrichedTransactions
    };

    onUpdateItem(updatedItem);
    setSellModalTarget(null);
    setSelectedIndices(new Set());
  };

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    if (selectedIndices.size === calcResult.enrichedTransactions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(calcResult.enrichedTransactions.map((_, i) => i)));
    }
  };

  const handleToggleSelectRow = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Delete all selected
  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    if (!window.confirm(`Seçilen ${selectedIndices.size} adet işlem kaydı silinecektir. Devam etmek istiyor musunuz?`)) {
      return;
    }

    const filtered = rawTransactions.filter((_, idx) => !selectedIndices.has(idx));
    if (filtered.length === 0) {
      const resetItem: PortfolioItem = {
        ...item,
        quantity: 0,
        averageCost: item.averageCost,
        realizedProfitLoss: 0,
        transactions: []
      };
      onUpdateItem(resetItem);
      setSelectedIndices(new Set());
      return;
    }

    const newCalc = calculateWeightedTransactions(
      filtered,
      0,
      item.averageCost,
      item.addedDate,
      item.code
    );

    const updatedItem: PortfolioItem = {
      ...item,
      quantity: newCalc.currentQuantity,
      averageCost: newCalc.averageCost,
      realizedProfitLoss: newCalc.totalRealizedProfitLoss,
      addedDate: newCalc.firstBuyDate || item.addedDate,
      transactions: newCalc.enrichedTransactions
    };

    onUpdateItem(updatedItem);
    setSelectedIndices(new Set());
  };

  // Calculate selected lots sum
  const selectedLotsSum = useMemo(() => {
    let sum = 0;
    selectedIndices.forEach(idx => {
      const tx = calcResult.enrichedTransactions[idx];
      if (tx && tx.type === 'buy') {
        sum += tx.quantity;
      }
    });
    return sum;
  }, [selectedIndices, calcResult.enrichedTransactions]);

  return (
    <div className="p-4 bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-900/90 dark:to-slate-950 border-t border-b border-indigo-200/60 dark:border-indigo-900/50 shadow-inner">
      {/* Top Banner with Asset Details & Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                {item.code}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                — {item.name}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                {calcResult.enrichedTransactions.length} Hareket / İşlem
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bu varlığa ait tüm kademeli alış ve satış hareketleri tek satır altında toplanmıştır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {calcResult.currentQuantity > 0 && (
            <button
              type="button"
              onClick={() => handleOpenBulkSell('all')}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Kalan tüm lotları tek tıkla sat veya pozisyonu kapat"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Tümünü Sat ({calcResult.currentQuantity.toLocaleString('tr-TR')} Lot)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowInlineAdd(!showInlineAdd);
              setErrorMsg(null);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Hareket Ekle</span>
          </button>
          
          <button
            type="button"
            onClick={handleOpenAdvancedModal}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kademeli alım simülatörü ve gelişmiş işlem yönetimi penceresini aç"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-500" />
            <span>Kademeli Yönetim</span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Action Bar */}
      {selectedIndices.size > 0 && (
        <div className="my-2.5 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <span className="font-bold">
              {selectedIndices.size} işlem seçildi
            </span>
            {selectedLotsSum > 0 && (
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                (Toplam {selectedLotsSum.toLocaleString('tr-TR')} Alış Lotu)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedLotsSum > 0 && (
              <button
                type="button"
                onClick={() => handleOpenBulkSell('bulk')}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <TrendingDown className="w-3 h-3" />
                <span>Seçilenleri Sat</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Seçilenleri Sil ({selectedIndices.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIndices(new Set())}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Seçimi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 my-3">
        <div className={`p-2.5 rounded-xl border shadow-2xs ${
          calcResult.currentQuantity === 0 
            ? 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700' 
            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
        }`}>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Kalan Net Lot</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {calcResult.currentQuantity.toLocaleString('tr-TR')}
            </span>
            {calcResult.currentQuantity === 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                Kapandı
              </span>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ağırlıklı Ort. Maliyet</span>
          <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {formatCurrency(calcResult.averageCost, 'TL')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Toplam Alış Maliyeti</span>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(calcResult.totalCost, 'TL')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Güncel Piyasa Değeri</span>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(calcResult.currentQuantity * liveUnitPrice, 'TL')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Gerçekleşen Net K/Z</span>
          <span className={`text-sm font-bold font-mono ${
            calcResult.totalRealizedProfitLoss >= 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {calcResult.totalRealizedProfitLoss >= 0 ? '+' : ''}
            {formatCurrency(calcResult.totalRealizedProfitLoss, 'TL')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Toplam İşlem Adedi</span>
          <div className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300 mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400">{calcResult.totalBuyCount} Alış</span>
            <span className="mx-1">/</span>
            <span className="text-rose-600 dark:text-rose-400">{calcResult.totalSellCount} Satış</span>
          </div>
        </div>
      </div>

      {/* INLINE ADD TRANSACTION FORM */}
      {showInlineAdd && (
        <div className="my-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/80 dark:border-indigo-500/70 shadow-lg animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{item.code} • Yeni Parçalı Hareket Ekle</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    ({newType === 'buy' ? 'Kademeli Alış' : 'Kâr / Pozisyon Satışı'})
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mevcut Pozisyon: {calcResult.currentQuantity.toLocaleString('tr-TR')} Lot @ {formatCurrency(calcResult.averageCost, 'TL')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Type Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setNewType('buy');
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    newType === 'buy'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>ALIŞ (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewType('sell');
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    newType === 'sell'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3 h-3" />
                  <span>SATIŞ (-)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowInlineAdd(false);
                  setErrorMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveInlineTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Tarih */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={newDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Miktar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    İşlem Miktarı (Lot/Adet)
                  </label>
                  {newType === 'sell' && calcResult.currentQuantity > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewQuantity(calcResult.currentQuantity)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      TÜMÜ ({calcResult.currentQuantity.toLocaleString('tr-TR')})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  max={newType === 'sell' ? calcResult.currentQuantity : undefined}
                  placeholder="örn: 100"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Birim Fiyat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Birim Fiyat (TL)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPrice(liveUnitPrice)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    title="Canlı piyasa fiyatını aktar"
                  >
                    Piyasa ({formatCurrency(liveUnitPrice, 'TL')})
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  placeholder="Birim Fiyat"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Açıklama */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Açıklama / Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder={newType === 'buy' ? 'Örn: Kademeli alım, Destek alımı' : 'Örn: Kâr satışı'}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* LIVE SIMULATION CARD */}
            {typeof newQuantity === 'number' && newQuantity > 0 && typeof newPrice === 'number' && newPrice > 0 && inlineSimulation && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Toplam İşlem Tutarı</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                    {formatCurrency(newQuantity * newPrice, 'TL')}
                  </span>
                </div>

                {newType === 'buy' ? (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[10px]">İşlem Sonrası Toplam Lot</span>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                        {inlineSimulation.simulatedQuantity.toLocaleString('tr-TR')} Lot
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Yeni Ağırlıklı Ort. Maliyet</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                          {formatCurrency(inlineSimulation.simulatedAverageCost, 'TL')}
                        </span>
                        {calcResult.averageCost > 0 && (
                          <span className={`text-[10px] font-mono font-bold ${
                            inlineSimulation.costDifference <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            ({inlineSimulation.costDifference <= 0 ? '' : '+'}{formatCurrency(inlineSimulation.costDifference, 'TL')})
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Satış Sonrası Kalan Lot</span>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                        {inlineSimulation.simulatedQuantity.toLocaleString('tr-TR')} Lot
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bu Satıştan Realize Kâr/Zarar</span>
                      <span className={`font-bold font-mono text-sm ${
                        (inlineSimulation.simulatedRealizedPnL || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {(inlineSimulation.simulatedRealizedPnL || 0) >= 0 ? '+' : ''}
                        {formatCurrency(inlineSimulation.simulatedRealizedPnL || 0, 'TL')} ({formatPercent(inlineSimulation.simulatedRealizedPnLPercent || 0)})
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineAdd(false);
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                      newType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{newType === 'buy' ? 'Alışı Kaydet' : 'Satışı Kaydet'}</span>
                  </button>
                </div>
              </div>
            )}

            {!(typeof newQuantity === 'number' && newQuantity > 0 && typeof newPrice === 'number' && newPrice > 0) && (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInlineAdd(false);
                    setErrorMsg(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                    newType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{newType === 'buy' ? 'Alışı Kaydet' : 'Satışı Kaydet'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* QUICK SELL MODAL / POPUP (For Single Lot or Bulk Sell) */}
      {sellModalTarget && (
        <div className="my-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-600/80 shadow-lg animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {sellModalTarget.mode === 'single'
                    ? `${item.code} • Tekil Lot Satışı`
                    : sellModalTarget.mode === 'all'
                    ? `${item.code} • Tüm Pozisyonu Kapatma Satışı`
                    : `${item.code} • Toplu Satış Yap`}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {sellModalTarget.mode === 'single' && sellModalTarget.targetLot
                    ? `Seçilen Alım: #${(sellModalTarget.targetIndex || 0) + 1} (${sellModalTarget.targetLot.quantity} Lot @ ${formatCurrency(sellModalTarget.targetLot.price, 'TL')})`
                    : `Mevcut Açık Pozisyon: ${calcResult.currentQuantity.toLocaleString('tr-TR')} Lot (Ort. Maliyet: ${formatCurrency(calcResult.averageCost, 'TL')})`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSellModalTarget(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleExecuteSell} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Satılacak Adet (Lot)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    max={calcResult.currentQuantity}
                    placeholder="Adet"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setSellQuantity(calcResult.currentQuantity)}
                    className="absolute right-1.5 top-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    TÜMÜ
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Satış Birim Fiyatı (TL)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  placeholder="Satış Fiyatı"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Satış Tarihi
                </label>
                <input
                  type="date"
                  value={sellDate}
                  onChange={(e) => setSellDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  placeholder="Örn: Kâr satışı"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Instant Realized Gain Calculation Preview */}
            {typeof sellQuantity === 'number' && sellQuantity > 0 && typeof sellPrice === 'number' && sellPrice > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Toplam Satış Geliri</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                    {formatCurrency(sellQuantity * sellPrice, 'TL')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Satış Sonrası Kalan Lot</span>
                  <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                    {Math.max(0, calcResult.currentQuantity - sellQuantity).toLocaleString('tr-TR')} Lot
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Bu Satıştan Gerçekleşecek Kâr/Zarar</span>
                  {(() => {
                    const diff = (sellPrice - calcResult.averageCost) * sellQuantity;
                    const diffPercent = calcResult.averageCost > 0 ? ((sellPrice - calcResult.averageCost) / calcResult.averageCost) * 100 : 0;
                    return (
                      <span className={`font-bold font-mono text-sm ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {diff >= 0 ? '+' : ''}{formatCurrency(diff, 'TL')} ({formatPercent(diffPercent)})
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSellModalTarget(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Satışı Onayla ve Kaydet</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Movements Display: Desktop Table + Mobile Card List */}
      
      {/* 1. Desktop Table (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th className="py-2 px-3 w-8 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Tümünü Seç / Temizle"
                >
                  {selectedIndices.size > 0 && selectedIndices.size === calcResult.enrichedTransactions.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </th>
              <th className="py-2 px-3"># / Tarih</th>
              <th className="py-2 px-3">İşlem Türü</th>
              <th className="py-2 px-3 text-right">Miktar (Lot)</th>
              <th className="py-2 px-3 text-right">İşlem Fiyatı</th>
              <th className="py-2 px-3 text-right">Toplam Tutar</th>
              <th className="py-2 px-3 text-right">İşlem Sonrası Ort. Maliyet</th>
              <th className="py-2 px-3 text-right">Kalan Lot</th>
              <th className="py-2 px-3 text-right">Kâr / Zarar Durumu</th>
              <th className="py-2 px-3">Açıklama / Not</th>
              <th className="py-2 px-3 text-center w-24">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {calcResult.enrichedTransactions.map((tx, idx) => {
              const isBuy = tx.type === 'buy';
              const totalVal = tx.totalAmount || (tx.quantity * tx.price);
              const isSelected = selectedIndices.has(idx);
              
              // Unrealized PnL vs live price for buy transactions
              const unrealizedGain = isBuy 
                ? (liveUnitPrice - tx.price) * tx.quantity 
                : undefined;
              const unrealizedGainPercent = isBuy && tx.price > 0
                ? ((liveUnitPrice - tx.price) / tx.price) * 100
                : undefined;

              return (
                <tr 
                  key={tx.id || `row_${idx}`}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectRow(idx, e)}
                      className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 text-xs">
                        {formatDateTurkish(tx.date)}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-sans ${
                      isBuy
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                    }`}>
                      {isBuy ? (
                        <>
                          <ArrowUpRight className="w-3 h-3" />
                          <span>ALIŞ</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-3 h-3" />
                          <span>SATIŞ</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                    {tx.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                    {formatCurrency(tx.price, 'TL')}
                  </td>

                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(totalVal, 'TL')}
                  </td>

                  <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-medium">
                    {tx.averageCostAfter !== undefined ? formatCurrency(tx.averageCostAfter, 'TL') : '—'}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                    {tx.remainingQuantityAfter !== undefined ? tx.remainingQuantityAfter.toLocaleString('tr-TR') : '—'}
                  </td>

                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {isBuy ? (
                      unrealizedGain !== undefined ? (
                        <div className={`text-xs font-semibold ${unrealizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          <span>{unrealizedGain >= 0 ? '+' : ''}{formatCurrency(unrealizedGain, 'TL')}</span>
                          <span className="text-[10px] ml-1 opacity-80">({formatPercent(unrealizedGainPercent || 0)})</span>
                        </div>
                      ) : '—'
                    ) : (
                      tx.realizedProfitLoss !== undefined ? (
                        <div className={`text-xs font-bold ${tx.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          <span>{tx.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(tx.realizedProfitLoss, 'TL')} Realize</span>
                          {tx.realizedProfitLossPercent !== undefined && (
                            <span className="text-[10px] ml-1 opacity-80">({formatPercent(tx.realizedProfitLossPercent)})</span>
                          )}
                        </div>
                      ) : '—'
                    )}
                  </td>

                  <td className="py-2.5 px-3 font-sans text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]" title={tx.notes}>
                    {tx.notes || '—'}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isBuy && calcResult.currentQuantity > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenSingleLotSell(tx, idx, e)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/60 rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="Bu alımı / lotu tekil olarak sat"
                        >
                          <TrendingDown className="w-2.5 h-2.5" />
                          <span>Sat</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteTransactionByIndex(idx, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        title="Bu işlemi sil"
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

      {/* 2. Mobile Cards (shown on mobile, hidden on md+) */}
      <div className="md:hidden space-y-2.5">
        {/* Mobile Header / Select All Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 font-medium cursor-pointer"
          >
            {selectedIndices.size > 0 && selectedIndices.size === calcResult.enrichedTransactions.length ? (
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Tüm Hareketleri Seç ({selectedIndices.size}/{calcResult.enrichedTransactions.length})</span>
          </button>
          
          <span className="text-[11px] font-mono font-semibold text-slate-500">
            {calcResult.enrichedTransactions.length} Kayıt
          </span>
        </div>

        {/* Transaction Cards */}
        {calcResult.enrichedTransactions.map((tx, idx) => {
          const isBuy = tx.type === 'buy';
          const totalVal = tx.totalAmount || (tx.quantity * tx.price);
          const isSelected = selectedIndices.has(idx);
          
          // Unrealized PnL vs live price for buy transactions
          const unrealizedGain = isBuy 
            ? (liveUnitPrice - tx.price) * tx.quantity 
            : undefined;
          const unrealizedGainPercent = isBuy && tx.price > 0
            ? ((liveUnitPrice - tx.price) / tx.price) * 100
            : undefined;

          return (
            <div
              key={tx.id || `mobile_row_${idx}`}
              className={`p-3 rounded-xl border transition-all duration-150 ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
              }`}
            >
              {/* Header: Checkbox + Number + Date + Type + Actions */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelectRow(idx, e)}
                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatDateTurkish(tx.date)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    isBuy
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  }`}>
                    {isBuy ? (
                      <>
                        <ArrowUpRight className="w-3 h-3" />
                        <span>ALIŞ</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3 h-3" />
                        <span>SATIŞ</span>
                      </>
                    )}
                  </span>

                  {isBuy && calcResult.currentQuantity > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenSingleLotSell(tx, idx, e)}
                      className="px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/60 rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                      title="Bu alımı / lotu tekil olarak sat"
                    >
                      <TrendingDown className="w-2.5 h-2.5" />
                      <span>Sat</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTransactionByIndex(idx, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    title="Bu işlemi sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2x2 Details Grid */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-1 font-mono text-xs">
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">İşlem Miktarı & Fiyat</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {tx.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} Lot
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    @ {formatCurrency(tx.price, 'TL')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Toplam Tutar</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(totalVal, 'TL')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Sonrası Ort. Maliyet</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {tx.averageCostAfter !== undefined ? formatCurrency(tx.averageCostAfter, 'TL') : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Kalan Lot</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {tx.remainingQuantityAfter !== undefined ? `${tx.remainingQuantityAfter.toLocaleString('tr-TR')} Lot` : '—'}
                  </span>
                </div>
              </div>

              {/* Profit/Loss or Realized Box */}
              {(isBuy && unrealizedGain !== undefined) || (!isBuy && tx.realizedProfitLoss !== undefined) ? (
                <div className={`mt-2 p-2 rounded-lg text-xs font-mono flex items-center justify-between ${
                  isBuy
                    ? (unrealizedGain || 0) >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
                    : (tx.realizedProfitLoss || 0) >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
                }`}>
                  <span className="font-sans text-[11px] font-medium">
                    {isBuy ? 'Cari K/Z Durumu:' : 'Gerçekleşen K/Z:'}
                  </span>
                  <div className="font-bold">
                    {isBuy ? (
                      <span>
                        {(unrealizedGain || 0) >= 0 ? '+' : ''}{formatCurrency(unrealizedGain || 0, 'TL')} ({formatPercent(unrealizedGainPercent || 0)})
                      </span>
                    ) : (
                      <span>
                        {(tx.realizedProfitLoss || 0) >= 0 ? '+' : ''}{formatCurrency(tx.realizedProfitLoss || 0, 'TL')}
                        {tx.realizedProfitLossPercent !== undefined && ` (${formatPercent(tx.realizedProfitLossPercent)})`}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Note / Remarks */}
              {tx.notes && (
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded border border-slate-100 dark:border-slate-800 italic">
                  Not: {tx.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
