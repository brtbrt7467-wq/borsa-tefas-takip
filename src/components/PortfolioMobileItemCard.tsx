import React from 'react';
import { PortfolioItem, Stock, Fund } from '../types';
import { CategoryMeta } from '../data/assetCategoriesData';
import { formatCurrency, formatPercent, formatDateTurkish } from '../utils/formatters';
import { 
  History, 
  Edit3, 
  Trash2, 
  Bell, 
  Globe, 
  ChevronUp, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus
} from 'lucide-react';
import { PortfolioTransactionSubTable } from './PortfolioTransactionSubTable';

export interface PortfolioMobileItemCardProps {
  item: any;
  meta: CategoryMeta;
  isItemExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onSelectAsset?: (asset: Stock | Fund) => void;
  onOpenEdit: (item: PortfolioItem, e?: React.MouseEvent) => void;
  onRemoveItem: (id: string) => void;
  onOpenSetAlert?: (item: PortfolioItem) => void;
  onOpenEurobondModal?: (item: PortfolioItem) => void;
  onUpdateItem: (item: PortfolioItem) => void;
  onOpenFullTransactionModal?: (item: PortfolioItem) => void;
  eurRate?: number;
  usdRate?: number;
}

export const PortfolioMobileItemCard: React.FC<PortfolioMobileItemCardProps> = ({
  item,
  meta,
  isItemExpanded,
  onToggleExpand,
  onSelectAsset,
  onOpenEdit,
  onRemoveItem,
  onOpenSetAlert,
  onOpenEurobondModal,
  onUpdateItem,
  onOpenFullTransactionModal,
}) => {
  const isProfit = (item.profitLoss || 0) >= 0;
  const isPassive = item.isPassive || item.status === 'passive' || item.quantity <= 0.00001;
  const txCount = item.transactions?.length || 1;
  const isEurobond = item.category === 'eurobond';
  const hasRealizedPnl = item.realizedProfitLoss !== undefined && Math.abs(item.realizedProfitLoss) > 0.01;

  return (
    <div
      id={`portfolio-mobile-card-${item.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
        isPassive
          ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 opacity-85'
          : isItemExpanded
          ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header Row: Asset Identity & Action Buttons */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Code & Name (Click to view asset modal) */}
          <div 
            onClick={() => item.asset && onSelectAsset && onSelectAsset(item.asset)}
            className={`flex-1 min-w-0 ${item.asset ? 'cursor-pointer group' : ''}`}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                style={{ backgroundColor: meta.color }} 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
              />
              <span className="font-bold text-slate-900 dark:text-white font-mono text-base tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {item.code}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                {meta.shortLabel}
              </span>
              {isPassive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  Pasif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={item.name}>
              {item.name}
            </p>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Movements expand button */}
            <button
              type="button"
              onClick={onToggleExpand}
              className={`px-2 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1 transition-all cursor-pointer ${
                isItemExpanded
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60'
              }`}
              title={isItemExpanded ? "Hareketleri Gizle" : `Tüm ${txCount} Hareketi Listele`}
            >
              <History className="w-3 h-3" />
              <span>{txCount}</span>
              {isItemExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Eurobond modal button */}
            {isEurobond && onOpenEurobondModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEurobondModal(item);
                }}
                className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-lg transition-colors cursor-pointer"
                title="Eurobond Kupon Takvimi ve Döviz Detayları"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Price Alert button */}
            {onOpenSetAlert && (item.category === 'stock' || item.category === 'fund' || item.category === 'crypto' || item.category === 'gold_fx') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSetAlert(item);
                }}
                className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                title="Fiyat Alarmı Kur"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Edit button */}
            <button
              type="button"
              onClick={(e) => onOpenEdit(item, e)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
              title="Düzenle"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item.id);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2x2 Financial Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          {/* Box 1: Miktar / Adet */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isEurobond ? 'Nominal Tutar' : 'Miktar (Adet)'}
            </span>
            <div className="font-bold font-mono text-slate-900 dark:text-white text-sm mt-0.5">
              {isEurobond && item.nominalAmount ? (
                <span>
                  {item.nominalCurrency === 'EUR' ? '€' : '$'}
                  {item.nominalAmount.toLocaleString('tr-TR')}
                </span>
              ) : (
                <span>
                  {item.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} Lot
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
              {isPassive ? '(Pozisyon Kapalı)' : txCount > 1 ? `(${txCount} Parçalı Alış)` : 'Tekil Giriş'}
            </span>
          </div>

          {/* Box 2: Alış Maliyeti */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Alış Maliyeti
            </span>
            <div className="font-bold font-mono text-slate-900 dark:text-white text-sm mt-0.5">
              {formatCurrency(item.averageCost, 'TL')}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
              {isEurobond && item.priceInCurrency ? (
                `%${item.priceInCurrency} (Kur: ₺${(item.buyExchangeRate || 0).toFixed(2)})`
              ) : txCount > 1 ? (
                'Ağırlıklı Ort.'
              ) : (
                item.addedDate ? formatDateTurkish(item.addedDate) : '—'
              )}
            </span>
          </div>

          {/* Box 3: Güncel Fiyat & Günlük % */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Güncel Fiyat
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
              <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                {formatCurrency(item.currentPrice, 'TL')}
              </span>
              {item.changePercent !== undefined && item.changePercent !== 0 && (
                <span className={`text-[10px] font-bold font-mono flex items-center ${
                  item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {item.changePercent >= 0 ? '+' : ''}{formatPercent(item.changePercent)}
                </span>
              )}
            </div>
            {isEurobond && item.priceInCurrency && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                %{item.priceInCurrency.toFixed(2)} {item.nominalCurrency || 'USD'}
              </span>
            )}
          </div>

          {/* Box 4: Toplam Portföy Değeri */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-2.5 border border-indigo-100/60 dark:border-indigo-900/40">
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Piyasa Değeri
            </span>
            <div className="font-bold font-mono text-indigo-950 dark:text-indigo-200 text-sm sm:text-base mt-0.5">
              {formatCurrency(item.currentValue, 'TL')}
            </div>
            {isEurobond && item.nominalAmount && (
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono block">
                ≈ {item.nominalCurrency === 'EUR' ? '€' : '$'}{((item.nominalAmount * (item.priceInCurrency || 100)) / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Banner: Net P/L & Holding Period */}
        <div className={`mt-2.5 p-2.5 rounded-xl flex items-center justify-between gap-2 ${
          isProfit 
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40' 
            : 'bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/40'
        }`}>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
              Toplam Kâr / Zarar
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-bold font-mono text-sm ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {isProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
              </span>
              <span className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                isProfit ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
              }`}>
                {isProfit ? '+' : ''}{formatPercent(item.profitLossPercent)}
              </span>
            </div>
            {hasRealizedPnl && (
              <span className={`text-[10px] font-mono font-medium block mt-0.5 ${
                item.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                Gerçekleşen: {item.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(item.realizedProfitLoss, 'TL')}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
              Giriş / Süre
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
              {item.daysHeld !== undefined ? `${item.daysHeld} gün` : '—'}
            </span>
            {item.annualizedReturn !== null && item.annualizedReturn !== undefined && (
              <span className={`text-[10px] font-mono font-semibold block ${
                item.annualizedReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                CAGR: {formatPercent(item.annualizedReturn)}/yıl
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Movements SubTable (Expanded) */}
      {isItemExpanded && (
        <div className="border-t border-indigo-200 dark:border-indigo-900/80 bg-slate-50/90 dark:bg-slate-950/70 p-2 sm:p-3">
          <PortfolioTransactionSubTable
            item={item}
            onUpdateItem={(updated) => onUpdateItem(updated)}
            onOpenFullModal={() => onOpenFullTransactionModal && onOpenFullTransactionModal(item)}
          />
        </div>
      )}
    </div>
  );
};
