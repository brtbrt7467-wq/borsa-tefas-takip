import React, { useState } from 'react';
import { Stock, Fund, PortfolioItem, AIAnalysisResponse, AssetType } from '../types';
import { 
  Bot, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Loader2, 
  HelpCircle,
  BarChart3,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface AIAnalystViewProps {
  stocks: Stock[];
  funds: Fund[];
  portfolio: PortfolioItem[];
  preselectedCode?: string;
  preselectedType?: AssetType;
}

export const AIAnalystView: React.FC<AIAnalystViewProps> = ({
  stocks,
  funds,
  portfolio,
  preselectedCode,
  preselectedType,
}) => {
  const [mode, setMode] = useState<'asset' | 'portfolio' | 'market_digest' | 'custom'>('asset');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>(preselectedType || 'stock');
  const [selectedCode, setSelectedCode] = useState<string>(preselectedCode || 'AKBNK');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let bodyPayload: any = {};

      if (mode === 'portfolio') {
        bodyPayload = {
          mode: 'portfolio',
          portfolioItems: portfolio.map(item => ({
            code: item.code,
            name: item.name,
            type: item.type,
            category: item.category || (item.type === 'stock' ? 'stock' : 'fund'),
            quantity: item.quantity,
            cost: item.averageCost,
            currentPrice: item.currentPrice || item.averageCost,
            interestRate: item.interestRate,
            addedDate: item.addedDate
          })),
          userQuery: customQuestion || undefined
        };
      } else if (mode === 'market_digest') {
        bodyPayload = {
          mode: 'market_digest',
          userQuery: customQuestion || undefined
        };
      } else {
        bodyPayload = {
          code: selectedCode,
          type: selectedAssetType,
          mode: 'asset_detail',
          userQuery: customQuestion || undefined
        };
      }

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        throw new Error('Analiz servisi yanıt vermedi.');
      }

      const data: AIAnalysisResponse = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Yapay zeka analizi oluşturulurken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-purple-800/40 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Gemini 3.7 Flash & Google Search
              </span>
              <span className="text-xs text-purple-400 font-semibold">SPK Standartlarında Analiz</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Yapay Zeka Fon ve Borsa Analisti
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Türk hisse senetleri (AKBNK vb.) ve TEFAS fonları (YLB, AD4 vb.) için güncel finansal raporlar, temel çarpanlar, risk metrikleri ve portföy sağlık değerlendirmesi.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setMode('asset')}
            className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${
              mode === 'asset'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="block font-bold">Tek Varlık Analizi</span>
            <span className="text-[10px] font-normal text-slate-500 block mt-0.5">Hisse veya TEFAS Fonu</span>
          </button>

          <button
            onClick={() => setMode('portfolio')}
            className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${
              mode === 'portfolio'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="block font-bold">Portföy Doktoru</span>
            <span className="text-[10px] font-normal text-slate-500 block mt-0.5">Mevcut varlıkların analizi</span>
          </button>

          <button
            onClick={() => setMode('market_digest')}
            className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${
              mode === 'market_digest'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="block font-bold">Günlük Piyasa Bülteni</span>
            <span className="text-[10px] font-normal text-slate-500 block mt-0.5">BIST & Faiz & Fon Raporu</span>
          </button>

          <button
            onClick={() => setMode('custom')}
            className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${
              mode === 'custom'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="block font-bold">Özel Finansal Soru</span>
            <span className="text-[10px] font-normal text-slate-500 block mt-0.5">Serbest Piyasa Sorusu</span>
          </button>
        </div>

        {/* Asset Selection Controls (if asset mode) */}
        {mode === 'asset' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">Varlık Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetType('stock');
                    setSelectedCode(stocks[0]?.code || 'AKBNK');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    selectedAssetType === 'stock'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  BIST Hissesi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetType('fund');
                    setSelectedCode(funds[0]?.code || 'YLB');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    selectedAssetType === 'fund'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  TEFAS Yatırım Fonu
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-semibold block mb-1">İncelenecek Kod</label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                {selectedAssetType === 'stock'
                  ? stocks.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))
                  : funds.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.code} - {f.name}
                      </option>
                    ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom question input */}
        <div>
          <label className="text-xs text-slate-500 font-semibold block mb-1">
            Özel Odaklanılmasını İstediğiniz Nokta (İsteğe Bağlı)
          </label>
          <div className="relative">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={
                mode === 'portfolio'
                  ? 'örn: Faiz indirim sürecinde bu portföy nasıl etkilenir?'
                  : 'örn: 2024 temettü beklentisi ve 1 yıllık hedef nedir?'
              }
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white pr-24"
            />
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Analiz Ediliyor...' : 'Analiz Et'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Analysis Output Section */}
      {analysisResult ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-6 animate-in fade-in duration-300">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  {analysisResult.sentiment}
                </span>
                <span className="text-xs text-slate-400 font-mono">{analysisResult.timestamp}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {analysisResult.title}
              </h3>
            </div>

            {analysisResult.healthScore && (
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Sağlık & Uygunluk Skoru</span>
                <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  {analysisResult.healthScore}/100
                </span>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
              Yönetici Özeti
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {analysisResult.summary}
            </p>
          </div>

          {/* Strengths & Risks Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Öne Çıkan Güçlü Yönler & Fırsatlar
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {analysisResult.keyStrengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Dikkat Edilmesi Gereken Risk Faktörleri
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {analysisResult.keyRisks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Technical & Fundamental Outlook */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {analysisResult.technicalOutlook && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Teknik / Getiri Kanalı Görünümü
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {analysisResult.technicalOutlook}
                </p>
              </div>
            )}

            {analysisResult.fundamentalOutlook && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Temel Analiz / Portföy Stratejisi
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {analysisResult.fundamentalOutlook}
                </p>
              </div>
            )}
          </div>

          {/* Actionable Insights */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Yatırımcı İçin Stratejik Eylem Adımları
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {analysisResult.actionableInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">{idx + 1}.</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Web search sources if any */}
          {analysisResult.sources && analysisResult.sources.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
              <span className="font-medium">Google Arama Doğrulaması:</span>
              {analysisResult.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
          <Bot className="w-10 h-10 text-purple-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Analiz Başlatılmaya Hazır
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Yukarıdaki seçeneklerden birini belirleyip "Analiz Et" butonuna tıklayarak kapsamlı SPK düzeyinde analiz raporunu görüntüleyin.
          </p>
        </div>
      )}
    </div>
  );
};
