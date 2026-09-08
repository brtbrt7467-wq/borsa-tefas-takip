import React, { useState } from 'react';
import { MarketIndex } from '../types';
import { formatPercent } from '../utils/formatters';
import { TrendingUp, TrendingDown, Clock, Pause, Play } from 'lucide-react';

interface MarketTickerProps {
  indices: MarketIndex[];
  lastUpdated?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({
  indices,
  lastUpdated,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate items for continuous seamless loop
  const tickerItems = [...indices, ...indices];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-3">
          {/* Static Live Badge on the Left */}
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-800 z-10 bg-slate-900">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 hidden sm:inline">
              Piyasa Özeti
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 sm:hidden">
              Piyasa
            </span>
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Kaymayı Başlat" : "Kaymayı Duraklat"}
              className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors ml-0.5"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>

          {/* Continuous Scrolling Marquee Track */}
          <div 
            className="relative flex-1 overflow-hidden mask-fade-edges"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left & Right Gradient Shadows for Soft In/Out Transitions */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

            <div className={`animate-marquee ${isPaused ? 'paused' : ''} flex items-center gap-6 sm:gap-8 py-0.5`}>
              {tickerItems.map((idx, index) => {
                const isPositive = idx.changePercent >= 0;
                const isZero = idx.changePercent === 0;
                return (
                  <div
                    key={`${idx.code}-${index}`}
                    className="flex items-center gap-2 shrink-0 text-xs sm:text-sm cursor-pointer transition-transform hover:scale-105"
                    title={`${idx.name} - En Yüksek: ${idx.high || '-'} / En Düşük: ${idx.low || '-'}`}
                  >
                    <span className="font-bold text-slate-300 text-xs sm:text-sm">{idx.name}</span>
                    <span className="font-mono text-white font-semibold text-xs sm:text-sm">
                      {idx.code.includes('USD') || idx.code.includes('EUR') 
                        ? idx.value.toFixed(2) + ' ₺'
                        : idx.code === 'REPO'
                        ? '%' + idx.value.toFixed(2)
                        : idx.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`flex items-center text-[11px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isZero
                          ? 'bg-slate-800 text-slate-400'
                          : isPositive
                          ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/90 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {!isZero && (isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />)}
                      {formatPercent(idx.changePercent)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Updated Timestamp on the Right */}
          {lastUpdated && (
            <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-500 shrink-0 pl-3 border-l border-slate-800 z-10 bg-slate-900">
              <Clock className="w-3 h-3" />
              <span>{lastUpdated}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
