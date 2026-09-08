import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent, formatCompactNumber } from '../utils/formatters';
import { Calculator, Sparkles, TrendingUp, PiggyBank, ArrowRight, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const CalculatorView: React.FC = () => {
  const [initialAmount, setInitialAmount] = useState<number>(20000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(5000);
  const [years, setYears] = useState<number>(3);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(55); // %55 (örn YLB/AD4/BIST karması)

  // Simulation calculation
  const simulation = useMemo(() => {
    const months = years * 12;
    const monthlyRate = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;
    
    let currentBalance = initialAmount;
    let totalInvested = initialAmount;
    const monthlyData = [];

    for (let m = 1; m <= months; m++) {
      currentBalance = currentBalance * (1 + monthlyRate) + monthlyContribution;
      totalInvested += monthlyContribution;

      if (m % 3 === 0 || m === months) {
        const year = (m / 12).toFixed(1);
        monthlyData.push({
          month: `${year} Yıl`,
          'Toplam Birikim': Math.round(currentBalance),
          'Yatırılan Anapara': Math.round(totalInvested),
          'Toplam Getiri': Math.round(currentBalance - totalInvested)
        });
      }
    }

    const finalBalance = currentBalance;
    const totalGain = finalBalance - totalInvested;
    const totalReturnPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return {
      finalBalance,
      totalInvested,
      totalGain,
      totalReturnPercent,
      chartData: monthlyData
    };
  }, [initialAmount, monthlyContribution, years, annualReturnRate]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-5 sm:p-6 text-white border border-emerald-800/40 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Bileşik Getiri Simülatörü
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Fon ve Borsa Düzenli Birikim Hesaplayıcı
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Aylık düzenli fon alımı (DCA) ve bileşik faizin gücüyle portföyünüzün yıllar içindeki büyüme projeksiyonunu simüle edin.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-500" />
            Birikim Parametreleri
          </h3>

          {/* Initial Amount */}
          <div>
            <label className="text-xs text-slate-500 font-semibold block mb-1">
              Başlangıç Sermayesi (TL)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="text-xs text-slate-500 font-semibold block mb-1">
              Aylık Düzenli Yatırım Tutarı (TL)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
            />
          </div>

          {/* Duration in Years */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Yatırım Süresi:</span>
              <span className="text-slate-900 dark:text-white font-mono">{years} Yıl ({years * 12} Ay)</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Expected Return Rate */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Beklenen Yıllık Getiri Oranı:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">%{annualReturnRate}</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="1"
              value={annualReturnRate}
              onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />

            {/* Quick preset buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setAnnualReturnRate(48)}
                className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                  annualReturnRate === 48 ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                }`}
              >
                Mevduat (%48)
              </button>
              <button
                type="button"
                onClick={() => setAnnualReturnRate(54)}
                className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                  annualReturnRate === 54 ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                }`}
              >
                YLB Para P. (%54)
              </button>
              <button
                type="button"
                onClick={() => setAnnualReturnRate(85)}
                className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                  annualReturnRate === 85 ? 'bg-teal-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                }`}
              >
                AD4 / Hisse (%85)
              </button>
            </div>
          </div>
        </div>

        {/* Results & Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 flex flex-col justify-between">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Toplam Yatırılan Tutar</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                {formatCurrency(simulation.totalInvested, 'TL')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-bold">Kazanılan Bileşik Getiri</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-300 mt-1 block">
                +{formatCurrency(simulation.totalGain, 'TL')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-teal-900 to-slate-900 text-white border border-teal-700/50">
              <span className="text-xs text-teal-300 block font-medium">Nihai Portföy Değeri</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {formatCurrency(simulation.finalBalance, 'TL')}
              </span>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Yıllara Göre Portföy Büyüme Eğrisi
            </span>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => formatCompactNumber(val, '₺')} orientation="right" />
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val), 'TL'), '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="Toplam Birikim" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBalance)" />
                  <Area type="monotone" dataKey="Yatırılan Anapara" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
