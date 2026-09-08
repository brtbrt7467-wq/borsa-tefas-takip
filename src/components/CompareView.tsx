import React, { useState } from 'react';
import { Stock, Fund, AssetType } from '../types';
import { formatCurrency, formatPercent, formatCompactNumber, getRiskColor } from '../utils/formatters';
import { Scale, Plus, X, ArrowRight, Bot, Shield, Check, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface CompareViewProps {
  stocks: Stock[];
  funds: Fund[];
  onOpenAIForCompare: (codes: string[]) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  stocks,
  funds,
  onOpenAIForCompare,
}) => {
  // Up to 4 selected codes
  const [selectedItems, setSelectedItems] = useState<{ code: string; type: AssetType }[]>([
    { code: 'AD4', type: 'fund' },
    { code: 'YLB', type: 'fund' },
    { code: 'AKBNK', type: 'stock' }
  ]);

  const [searchCode, setSearchCode] = useState('');
  const [searchType, setSearchType] = useState<AssetType>('fund');

  const getAsset = (code: string, type: AssetType): Stock | Fund | undefined => {
    if (type === 'stock') return stocks.find(s => s.code.toUpperCase() === code.toUpperCase());
    return funds.find(f => f.code.toUpperCase() === code.toUpperCase());
  };

  const handleAddCompare = (code: string, type: AssetType) => {
    if (selectedItems.some(i => i.code === code && i.type === type)) return;
    if (selectedItems.length >= 4) return;
    setSelectedItems([...selectedItems, { code, type }]);
  };

  const handleRemoveCompare = (code: string) => {
    setSelectedItems(selectedItems.filter(i => i.code !== code));
  };

  const comparedAssets = selectedItems.map(i => getAsset(i.code, i.type)).filter(Boolean) as (Stock | Fund)[];

  // Chart data comparison (1 Month, 1 Year if available)
  const chartData = comparedAssets.map(asset => {
    const isFund = asset.type === 'fund';
    const fund = isFund ? (asset as Fund) : null;
    const stock = !isFund ? (asset as Stock) : null;

    return {
      name: asset.code,
      '1 Aylık Getiri %': isFund ? (fund?.return1M || 0) : ((asset.history['1M']?.[asset.history['1M'].length - 1]?.price || asset.price) / (asset.history['1M']?.[0]?.price || asset.price) - 1) * 100,
      '1 Yıllık Getiri %': isFund ? (fund?.return1Y || 0) : ((asset.history['1Y']?.[asset.history['1Y'].length - 1]?.price || asset.price) / (asset.history['1Y']?.[0]?.price || asset.price) - 1) * 100,
    };
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-900/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Karşılaştırma Matrisi
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Hisse ve TEFAS Fon Kıyaslama
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Örn: AD4 vs YLB vs AKBNK gibi hisse ve fonları getiri, risk derecesi, valör ve maliyet bazında yan yana kıyaslayın.
            </p>
          </div>

          <button
            onClick={() => onOpenAIForCompare(selectedItems.map(i => i.code))}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all self-start md:self-auto"
          >
            <Bot className="w-4 h-4" />
            <span>AI Karşılaştırma Raporu</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-2">Seçili Varlıklar (Maks 4):</span>
          {selectedItems.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700"
            >
              <span>{item.code}</span>
              <button
                onClick={() => handleRemoveCompare(item.code)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {selectedItems.length < 4 && (
            <div className="flex items-center gap-2 ml-auto">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const [code, type] = e.target.value.split(':');
                    handleAddCompare(code, type as AssetType);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="" disabled>+ Karşılaştırmaya Varlık Ekle</option>
                <optgroup label="TEFAS Yatırım Fonları">
                  {funds.map(f => (
                    <option key={f.code} value={`${f.code}:fund`}>{f.code} - {f.name}</option>
                  ))}
                </optgroup>
                <optgroup label="BIST Hisseleri">
                  {stocks.map(s => (
                    <option key={s.code} value={`${s.code}:stock`}>{s.code} - {s.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                <th className="py-3 px-4 w-44">Karşılaştırma Kriteri</th>
                {comparedAssets.map(asset => (
                  <th key={asset.code} className="py-3 px-4 text-slate-900 dark:text-white font-bold">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base">{asset.code}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">{asset.name}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {asset.type === 'stock' ? 'Hisse' : 'TEFAS Fon'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {/* Price */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Birim Fiyat</td>
                {comparedAssets.map(asset => (
                  <td key={asset.code} className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(asset.price, 'TL')}
                  </td>
                ))}
              </tr>

              {/* Daily Return % */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Günlük Değişim %</td>
                {comparedAssets.map(asset => {
                  const ret = asset.changePercent || 0;
                  const isPos = ret >= 0;
                  return (
                    <td key={asset.code} className={`py-3 px-4 font-bold font-mono ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatPercent(ret, true, asset.type === 'fund' ? 3 : 2)}
                    </td>
                  );
                })}
              </tr>

              {/* Category / Sector */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Kategori / Sektör</td>
                {comparedAssets.map(asset => (
                  <td key={asset.code} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {asset.type === 'stock' ? (asset as Stock).sector : (asset as Fund).fundCategory}
                  </td>
                ))}
              </tr>

              {/* 1 Month Return */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">1 Aylık Getiri %</td>
                {comparedAssets.map(asset => {
                  const ret = asset.type === 'fund' ? (asset as Fund).return1M : ((asset as Stock).changePercent || 0);
                  const isPos = ret >= 0;
                  return (
                    <td key={asset.code} className={`py-3 px-4 font-bold font-mono ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatPercent(ret, true, 2)}
                    </td>
                  );
                })}
              </tr>

              {/* 1 Year Return */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">1 Yıllık Getiri %</td>
                {comparedAssets.map(asset => {
                  const ret = asset.type === 'fund' ? (asset as Fund).return1Y : 82.5;
                  const isPos = ret >= 0;
                  return (
                    <td key={asset.code} className={`py-3 px-4 font-bold font-mono ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatPercent(ret, true, 1)}
                    </td>
                  );
                })}
              </tr>

              {/* Risk Level */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Risk Seviyesi</td>
                {comparedAssets.map(asset => {
                  const riskVal = asset.type === 'fund' ? (asset as Fund).riskValue : 6;
                  const style = getRiskColor(riskVal);
                  return (
                    <td key={asset.code} className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${style.bg} ${style.text} ${style.border}`}>
                        {riskVal} / 7 ({asset.type === 'stock' ? 'Hisse Riski' : riskVal === 1 ? 'Çok Düşük / Likit' : 'Orta/Yüksek'})
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Liquidity / Valeur */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Likidite & Valör</td>
                {comparedAssets.map(asset => {
                  const valStr = asset.type === 'fund' 
                    ? `Alış: T+${(asset as Fund).valeurBuy} / Satış: T+${(asset as Fund).valeurSell}`
                    : 'T+2 Takas (Anlık Seans İçi Satış)';
                  return (
                    <td key={asset.code} className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {valStr}
                    </td>
                  );
                })}
              </tr>

              {/* Management Fee */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500">Yıllık Yönetim Ücreti</td>
                {comparedAssets.map(asset => {
                  const fee = asset.type === 'fund' ? `%${(asset as Fund).managementFee.toFixed(2)}` : 'Yok (Komisyon)';
                  return (
                    <td key={asset.code} className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                      {fee}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Return Comparison Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Dönemsel Getiri Kıyaslama Grafiği
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `%${val}`} />
              <Tooltip 
                formatter={(val: any) => [`%${Number(val).toFixed(2)}`, 'Getiri']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="1 Aylık Getiri %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="1 Yıllık Getiri %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
