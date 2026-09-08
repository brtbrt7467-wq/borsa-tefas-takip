import { Stock, Fund, MarketIndex, KapNewsItem, PricePoint } from '../src/types';

// Helper to generate realistic historical price points
function generateHistory(basePrice: number, volatility: number = 0.015, trend: number = 0.0005): Record<string, PricePoint[]> {
  const now = new Date();
  
  // 1D: 30 intraday intervals
  const d1: PricePoint[] = [];
  let currentPrice = basePrice * (1 - (Math.random() * 0.02 - 0.01));
  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hourStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 0.4 - volatility * 0.2) + trend * 0.1);
    d1.push({ date: hourStr, price: Number(currentPrice.toFixed(2)) });
  }
  // make last one exact basePrice
  d1[d1.length - 1].price = basePrice;

  // 1W: 7 days
  const w1: PricePoint[] = [];
  currentPrice = basePrice * (1 - (Math.random() * 0.04 - 0.01));
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility - volatility * 0.48));
    w1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  w1[w1.length - 1].price = basePrice;

  // 1M: 30 days
  const m1: PricePoint[] = [];
  currentPrice = basePrice * 0.92;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 1.2 - volatility * 0.55));
    m1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  m1[m1.length - 1].price = basePrice;

  // 3M: 90 days (sampled every 3 days)
  const m3: PricePoint[] = [];
  currentPrice = basePrice * 0.85;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3 * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    currentPrice = currentPrice * (1 + (Math.random() * volatility * 1.5 - volatility * 0.7));
    m3.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  m3[m3.length - 1].price = basePrice;

  // 1Y: 12 months
  const y1: PricePoint[] = [];
  currentPrice = basePrice * 0.65;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
    currentPrice = currentPrice * (1 + (Math.random() * 0.08 - 0.02) + 0.03);
    y1.push({ date: dateStr, price: Number(currentPrice.toFixed(2)) });
  }
  y1[y1.length - 1].price = basePrice;

  // 5Y: 5 years
  const y5: PricePoint[] = [];
  currentPrice = basePrice * 0.18;
  for (let i = 4; i >= 0; i--) {
    const year = now.getFullYear() - i;
    currentPrice = currentPrice * (1.45 + (Math.random() * 0.3 - 0.15));
    y5.push({ date: year.toString(), price: Number(currentPrice.toFixed(2)) });
  }
  y5[y5.length - 1].price = basePrice;

  return { '1D': d1, '1W': w1, '1M': m1, '3M': m3, '1Y': y1, '5Y': y5 };
}

export const INITIAL_MARKET_INDICES: MarketIndex[] = [
  {
    code: 'XU100',
    name: 'BIST 100',
    value: 9942.50,
    change: 142.30,
    changePercent: 1.45,
    high: 9988.40,
    low: 9812.10,
    volume: '94.2 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XU030',
    name: 'BIST 30',
    value: 10875.20,
    change: 178.60,
    changePercent: 1.67,
    high: 10920.00,
    low: 10730.50,
    volume: '71.5 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XBANK',
    name: 'BIST Banka',
    value: 14250.80,
    change: 365.10,
    changePercent: 2.63,
    high: 14380.00,
    low: 13950.00,
    volume: '28.4 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'XUSIN',
    name: 'BIST Sınai',
    value: 13890.40,
    change: 85.20,
    changePercent: 0.62,
    high: 13950.00,
    low: 13780.00,
    volume: '36.8 Milyar TL',
    lastUpdated: '18:10:00'
  },
  {
    code: 'USDTRY',
    name: 'Dolar / TL',
    value: 36.82,
    change: 0.04,
    changePercent: 0.11,
    high: 36.88,
    low: 36.75,
    lastUpdated: '18:15:00'
  },
  {
    code: 'EURTRY',
    name: 'Euro / TL',
    value: 38.65,
    change: 0.08,
    changePercent: 0.21,
    high: 38.74,
    low: 38.52,
    lastUpdated: '18:15:00'
  },
  {
    code: 'GAU_TRY',
    name: 'Gram Altın',
    value: 3410.50,
    change: 28.50,
    changePercent: 0.84,
    high: 3425.00,
    low: 3380.00,
    lastUpdated: '18:15:00'
  },
  {
    code: 'REPO',
    name: 'TCMB Politika Faizi',
    value: 47.50,
    change: 0.00,
    changePercent: 0.00,
    lastUpdated: 'Güncel'
  }
];

export const INITIAL_STOCKS: Stock[] = [
  {
    type: 'stock',
    code: 'AKBNK',
    name: 'Akbank T.A.Ş.',
    sector: 'Bankacılık',
    subSector: 'Özel Bankalar',
    price: 64.25,
    change: 1.85,
    changePercent: 2.96,
    open: 62.60,
    high: 64.90,
    low: 62.40,
    volume: 84250000,
    volumeTry: 5410000000,
    marketCap: 334100000000,
    pe: 4.82,
    pb: 1.15,
    dividendYield: 4.20,
    week52High: 71.50,
    week52Low: 38.40,
    beta: 1.25,
    rsi: 61.4,
    currency: 'TL',
    description: 'Akbank T.A.Ş., Türkiye’nin öncü özel mevduat bankalarından biridir. Güçlü sermaye yeterlilik rasyosu, dijital bankacılık penetrasyonu ve yüksek özkaynak karlılığı ile Borsa İstanbul BIST 30 endeksinin lokomotif şirketlerindendir.',
    history: generateHistory(64.25, 0.02, 0.001),
    kapNews: [
      {
        id: 'akbnk-1',
        title: 'Akbank 2024 Yılı Kar Dağıtım ve Temettü Ödeme Planı',
        summary: 'Yönetim kurulu pay başına net 2.15 TL nakit kar payı dağıtımını genel kurula sunma kararı almıştır.',
        date: 'Bugün 15:45',
        category: 'Temettü',
        impact: 'positive'
      },
      {
        id: 'akbnk-2',
        title: 'Sendikasyon Kredisi Yenileme ve Sürdürülebilirlik Taahhüdü',
        summary: 'Akbank, 600 milyon USD tutarındaki uluslararası sendikasyon kredisini %100ün üzerinde çevirme oranıyla başarıyla tamamlamıştır.',
        date: 'Dün 10:20',
        category: 'Özel Durum',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'THYAO',
    name: 'Türk Hava Yolları A.O.',
    sector: 'Ulaştırma',
    subSector: 'Havacılık',
    price: 312.50,
    change: 4.50,
    changePercent: 1.46,
    open: 309.00,
    high: 315.00,
    low: 307.50,
    volume: 24600000,
    volumeTry: 7680000000,
    marketCap: 431250000000,
    pe: 4.10,
    pb: 0.92,
    dividendYield: 0.00,
    week52High: 342.00,
    week52Low: 215.00,
    beta: 1.18,
    rsi: 58.2,
    currency: 'TL',
    description: 'Türk Hava Yolları (THY), 120den fazla ülkeye uçan dünyanın en geniş uluslararası uçuş ağına sahip küresel bayrak taşıyıcımızdır. Kargo, yolcu doluluk oranları ve filo genişleme planları ile küresel ölçekte rekabet etmektedir.',
    history: generateHistory(312.50, 0.018, 0.0008),
    kapNews: [
      {
        id: 'thyao-1',
        title: 'Aylık Trafik ve Yolcu Taşıma İstatistikleri',
        summary: 'Ocak ayı toplam yolcu sayısı geçen yılın aynı dönemine göre %9.4 artışla 6.8 milyona ulaşmıştır.',
        date: 'Bugün 11:30',
        category: 'Finansal Rapor',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'GARAN',
    name: 'Garanti BBVA (Türkiye Garanti Bankası)',
    sector: 'Bankacılık',
    subSector: 'Özel Bankalar',
    price: 118.40,
    change: 3.20,
    changePercent: 2.78,
    open: 115.80,
    high: 119.50,
    low: 115.30,
    volume: 38200000,
    volumeTry: 4520000000,
    marketCap: 497280000000,
    pe: 5.20,
    pb: 1.38,
    dividendYield: 3.85,
    week52High: 132.00,
    week52Low: 68.50,
    beta: 1.30,
    rsi: 64.0,
    currency: 'TL',
    description: 'Garanti BBVA, Türkiye’nin en yüksek piyasa değerine sahip özel bankası olup İspanyol BBVA grubu iştirakidir. Güçlü aktif kalitesi ve lider perakende kredi payına sahiptir.',
    history: generateHistory(118.40, 0.022, 0.0012),
    kapNews: [
      {
        id: 'garan-1',
        title: 'Sermaye Benzeri Tahvil İhracı Onayı',
        summary: 'SPK tarafından 500 milyon USD nominal tutarlı borçlanma aracı ihracı onaylanmıştır.',
        date: '15 Şubat 14:15',
        category: 'Özel Durum',
        impact: 'neutral'
      }
    ]
  },
  {
    type: 'stock',
    code: 'ISCTR',
    name: 'Türkiye İş Bankası C Grubu',
    sector: 'Bankacılık',
    subSector: 'Özel Bankalar',
    price: 15.60,
    change: 0.38,
    changePercent: 2.50,
    open: 15.25,
    high: 15.75,
    low: 15.20,
    volume: 145000000,
    volumeTry: 2260000000,
    marketCap: 390000000000,
    pe: 4.35,
    pb: 1.08,
    dividendYield: 4.50,
    week52High: 17.80,
    week52Low: 9.80,
    beta: 1.22,
    rsi: 59.8,
    currency: 'TL',
    description: 'Türkiye İş Bankası, Cumhuriyetin ilk milli bankası olarak güçlü sanayi ve finans iştirakleri portföyüne (Şişecam, Anadolu Sigorta, TSKB vb.) sahip dev bir finansal holding niteliğindedir.',
    history: generateHistory(15.60, 0.02, 0.0009),
    kapNews: [
      {
        id: 'isctr-1',
        title: 'Geri Alınan Payların İptali ve Bedelsiz Sermaye Artırımı Değerlendirmesi',
        summary: 'Yönetim kurulu şirketin güçlü özkaynak yapısı doğrultusunda sermaye artırım gündemini değerlendirmektedir.',
        date: '14 Şubat 17:00',
        category: 'Pay Alımı',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'EREGL',
    name: 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.',
    sector: 'Metal & Demir Çelik',
    subSector: 'Yassı Çelik Üretimi',
    price: 38.90,
    change: -0.42,
    changePercent: -1.07,
    open: 39.40,
    high: 39.60,
    low: 38.70,
    volume: 68400000,
    volumeTry: 2660000000,
    marketCap: 136150000000,
    pe: 11.20,
    pb: 0.85,
    dividendYield: 6.80,
    week52High: 60.50,
    week52Low: 36.20,
    beta: 0.95,
    rsi: 42.5,
    currency: 'TL',
    description: 'Erdemir, Türkiye’nin en büyük yassı çelik üreticisi ve entegre maden sahibi sanayi kuruluşudur. Bingöl-Avnik peletleme yatırımı ile hammadde bağımsızlığını artırmaktadır.',
    history: generateHistory(38.90, 0.015, -0.0002),
    kapNews: [
      {
        id: 'eregl-1',
        title: 'Güneş Enerjisi Santrali (GES) ve Karbon Nötr Yatırımları',
        summary: 'Şirket yeşil çelik dönüşümü çerçevesinde 150 MW kapasiteli ilave yenilenebilir enerji yatırımını devreye almıştır.',
        date: '12 Şubat 09:30',
        category: 'Özel Durum',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'TUPRS',
    name: 'Tüpraş (Türkiye Petrol Rafinerileri A.Ş.)',
    sector: 'Enerji & Petrol',
    subSector: 'Rafineri ve Akaryakıt',
    price: 168.20,
    change: 2.10,
    changePercent: 1.26,
    open: 166.50,
    high: 169.80,
    low: 165.90,
    volume: 29500000,
    volumeTry: 4960000000,
    marketCap: 324100000000,
    pe: 6.40,
    pb: 1.62,
    dividendYield: 8.50,
    week52High: 205.00,
    week52Low: 142.00,
    beta: 0.88,
    rsi: 54.6,
    currency: 'TL',
    description: 'Tüpraş, Koç Holding bünyesinde Türkiye’nin en büyük sanayi kuruluşu ve akaryakıt rafinerisidir. Yüksek temettü verimi, sıfır karbon stratejik dönüşüm planı ve biyoyakıt yatırımları ile öne çıkar.',
    history: generateHistory(168.20, 0.016, 0.0005),
    kapNews: [
      {
        id: 'tuprs-1',
        title: 'Rafineri Bakım ve Kapasite Kullanım Raporu',
        summary: 'İzmit ve İzmir rafinerilerinde planlı bakımların tamamlanmasıyla kapasite kullanım oranı %96 seviyesine yükselmiştir.',
        date: '11 Şubat 16:40',
        category: 'Finansal Rapor',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'BIMAS',
    name: 'BİM Birleşik Mağazalar A.Ş.',
    sector: 'Perakende',
    subSector: 'Gıda Perakendeciliği',
    price: 495.00,
    change: 6.50,
    changePercent: 1.33,
    open: 490.00,
    high: 498.50,
    low: 488.00,
    volume: 4100000,
    volumeTry: 2030000000,
    marketCap: 300560000000,
    pe: 12.80,
    pb: 4.20,
    dividendYield: 2.90,
    week52High: 610.00,
    week52Low: 345.00,
    beta: 0.72,
    rsi: 56.1,
    currency: 'TL',
    description: 'BİM, Türkiye, Fas ve Mısır’da 12.000’den fazla mağazasıyla yüksek nakit akışı yaratan, enflasyonist ortamda güçlü ciro büyümesi sergileyen lider indirim marketler zinciridir.',
    history: generateHistory(495.00, 0.014, 0.0006),
    kapNews: [
      {
        id: 'bimas-1',
        title: 'Yeni Lojistik Merkezi ve Mağaza Açılışları',
        summary: '2024 yılı içerisinde 850 yeni mağaza ve 2 bölge deposunun operasyona alındığı bildirilmiştir.',
        date: '9 Şubat 18:00',
        category: 'Özel Durum',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'ASELS',
    name: 'ASELSAN Elektronik Sanayi ve Ticaret A.Ş.',
    sector: 'Savunma & Teknoloji',
    subSector: 'Savunma Elektroniği',
    price: 68.90,
    change: 1.70,
    changePercent: 2.53,
    open: 67.50,
    high: 69.40,
    low: 67.20,
    volume: 48500000,
    volumeTry: 3340000000,
    marketCap: 314180000000,
    pe: 14.50,
    pb: 3.10,
    dividendYield: 0.85,
    week52High: 73.80,
    week52Low: 46.00,
    beta: 0.90,
    rsi: 63.8,
    currency: 'TL',
    description: 'ASELSAN, Türk Silahlı Kuvvetlerini Güçlendirme Vakfı iştiraki olup radar, elektronik harp, elektro-optik, haberleşme ve aviyonik alanlarında dünyanın en büyük 50 savunma şirketinden biridir. 12 milyar USD üzeri rekor bakiye sipariş portföyüne sahiptir.',
    history: generateHistory(68.90, 0.018, 0.001),
    kapNews: [
      {
        id: 'asels-1',
        title: 'Yeni İhracat Sözleşmesi İmzalanması (120 Milyon Dolar)',
        summary: 'ASELSAN ile uluslararası bir müşteri arasında hava savunma sistemleri tedariki kapsamında 120 milyon USD tutarında sözleşme imzalanmıştır.',
        date: 'Bugün 09:15',
        category: 'Özel Durum',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'FROTO',
    name: 'Ford Otomotiv Sanayi A.Ş.',
    sector: 'Otomotiv',
    subSector: 'Ticari Araç ve İhracat',
    price: 1045.00,
    change: 18.00,
    changePercent: 1.75,
    open: 1030.00,
    high: 1055.00,
    low: 1025.00,
    volume: 2100000,
    volumeTry: 2190000000,
    marketCap: 366700000000,
    pe: 8.90,
    pb: 4.80,
    dividendYield: 6.20,
    week52High: 1210.00,
    week52Low: 780.00,
    beta: 0.98,
    rsi: 57.3,
    currency: 'TL',
    description: 'Ford Otosan, Ford Avrupa’nın en büyük ticari araç üretim merkezi olup Türkiye ve Romanya (Craiova) fabrikalarıyla Avrupa pazar lideridir. Düzenli yüksek temettü ödeme geleneği vardır.',
    history: generateHistory(1045.00, 0.017, 0.0008),
    kapNews: [
      {
        id: 'froto-1',
        title: 'Elektrikli Transit ve Courier Modelleri İhracat Rakamları',
        summary: 'Romanya ve Kocaeli fabrikalarında üretilen yeni nesil modellerin Avrupa teslimatları hız kazanmıştır.',
        date: '8 Şubat 15:30',
        category: 'Finansal Rapor',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'KCHOL',
    name: 'Koç Holding A.Ş.',
    sector: 'Holdingler',
    subSector: 'Çok Sektörlü Yatırım',
    price: 214.50,
    change: 3.50,
    changePercent: 1.66,
    open: 212.00,
    high: 216.50,
    low: 210.50,
    volume: 16500000,
    volumeTry: 3540000000,
    marketCap: 544000000000,
    pe: 6.10,
    pb: 1.25,
    dividendYield: 4.10,
    week52High: 268.00,
    week52Low: 162.00,
    beta: 1.05,
    rsi: 55.4,
    currency: 'TL',
    description: 'Koç Holding, Tüpraş, Ford Otosan, Yapı Kredi, Tofaş, Arçelik, Aygaz ve TürkTraktör gibi Türkiye’nin dev kuruluşlarının ana çatı şirketidir. Türkiye GSYİH ve ihracatının önemli bir payını oluşturur.',
    history: generateHistory(214.50, 0.016, 0.0007),
    kapNews: [
      {
        id: 'kchol-1',
        title: 'Net Aktif Değer (NAD) ve Portföy Güncellemesi',
        summary: 'Holding net aktif değerine göre Borsa İstanbul işlem fiyatı %32 iskonto ile işlem görmektedir.',
        date: '7 Şubat 18:20',
        category: 'Finansal Rapor',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'stock',
    code: 'SISE',
    name: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.',
    sector: 'Cam & Kimya',
    subSector: 'Düzcam ve Soda Külü',
    price: 43.80,
    change: 0.40,
    changePercent: 0.92,
    open: 43.50,
    high: 44.20,
    low: 43.30,
    volume: 34200000,
    volumeTry: 1500000000,
    marketCap: 134180000000,
    pe: 8.40,
    pb: 0.98,
    dividendYield: 2.10,
    week52High: 56.50,
    week52Low: 38.90,
    beta: 0.92,
    rsi: 48.9,
    currency: 'TL',
    description: 'Şişecam, dünyanın en büyük düzcam, cam ev eşyası, cam ambalaj ve soda külü üreticilerinden biridir. 4 kıtada 14 ülkede üretim tesisleri bulunmaktadır.',
    history: generateHistory(43.80, 0.014, 0.0003),
    kapNews: [
      {
        id: 'sise-1',
        title: 'ABD Doğal Soda Külü Yatırımı İlerleme Raporu',
        summary: 'Wyoming tesisinde kapasite artırım çalışmalarının planlanan takvimde ilerlediği açıklanmıştır.',
        date: '5 Şubat 11:00',
        category: 'Özel Durum',
        impact: 'neutral'
      }
    ]
  },
  {
    type: 'stock',
    code: 'YKBNK',
    name: 'Yapı ve Kredi Bankası A.Ş.',
    sector: 'Bankacılık',
    subSector: 'Özel Bankalar',
    price: 32.40,
    change: 0.90,
    changePercent: 2.86,
    open: 31.60,
    high: 32.70,
    low: 31.50,
    volume: 98000000,
    volumeTry: 3170000000,
    marketCap: 273600000000,
    pe: 4.40,
    pb: 1.10,
    dividendYield: 4.00,
    week52High: 39.50,
    week52Low: 18.20,
    beta: 1.28,
    rsi: 60.5,
    currency: 'TL',
    description: 'Yapı Kredi, Koç Finansal Hizmetler ortaklığında Türkiye’nin kredi kartı ve bireysel bankacılıkta öncü kurumlarından biridir. Yüksek dijitalleşme oranı ve verimlilik oranlarıyla öne çıkar.',
    history: generateHistory(32.40, 0.02, 0.001),
    kapNews: [
      {
        id: 'ykbnk-1',
        title: 'Tahvil İhracı ve Yurt Dışı Borçlanma',
        summary: 'Uluslararası piyasalarda eurobond ihracı yüksek talep görerek başarıyla tamamlanmıştır.',
        date: '3 Şubat 14:00',
        category: 'Özel Durum',
        impact: 'positive'
      }
    ]
  }
];

export const INITIAL_FUNDS: Fund[] = [
  {
    type: 'fund',
    code: 'YLB',
    name: 'Yapı Kredi Portföy Para Piyasası Fonu',
    issuer: 'Yapı Kredi Portföy Yönetimi A.Ş.',
    fundType: 'Para Piyasası (TL)',
    fundCategory: 'Para Piyasası',
    price: 1.482930,
    changePercent: 0.145, // Günlük getiri ~ %0.145 (Yıllık bileşik ~%53)
    return1M: 4.25,
    return3M: 13.80,
    return6M: 28.90,
    returnYtd: 7.85,
    return1Y: 62.40,
    return3Y: 184.20,
    return5Y: 340.50,
    aum: 48500000000, // 48.5 Milyar TL
    investorsCount: 312000,
    sharesCount: 32705400000,
    riskValue: 1, // En düşük risk
    managementFee: 1.50,
    tefasTradeable: true,
    valeurBuy: 0, // T+0 anında alış
    valeurSell: 0, // T+0 anında satış (Nakit gibi kullanılabilir)
    currency: 'TL',
    description: 'YLB Fonu, portföyünün tamamını vadesine en fazla 184 gün kalmış likit kamu ve özel sektör borçlanma araçları, ters repo, Takasbank para piyasası ve mevduatta değerlendirir. Günlük düzenli faiz getirisi sağlar, sermaye kaybı riski minimum seviyededir. Borsa ve fon işlemlerinde nakit parkı için en popüler fonlardan biridir.',
    allocations: [
      { name: 'Ters Repo / Takasbank', percentage: 48.5, color: '#3b82f6' },
      { name: 'Mevduat / Katılma Hesabı (TL)', percentage: 34.0, color: '#10b981' },
      { name: 'Özel Sektör Bonosu (Finansman Bonosu)', percentage: 14.5, color: '#8b5cf6' },
      { name: 'Devlet Tahvili (Kısa Vadeli)', percentage: 3.0, color: '#f59e0b' }
    ],
    history: generateHistory(1.48293, 0.0005, 0.0014),
    kapNews: [
      {
        id: 'ylb-1',
        title: 'YLB Aylık Portföy Dağıtım Raporu Açıklanması',
        summary: 'Fonun ağırlıklı ortalama vadesi 24 gün olarak gerçekleşmiş olup, brüt getiri oranı yıllık bileşik %53.20 olarak devam etmektedir.',
        date: 'Bugün 10:00',
        category: 'Fon Portföy',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'fund',
    code: 'AD4',
    name: 'Ak Portföy BIST 100 Dışı Şirketler Hisse Senedi (TL) Fonu',
    issuer: 'Ak Portföy Yönetimi A.Ş.',
    fundType: 'Hisse Senedi Yoğun Fon',
    fundCategory: 'Hisse Senedi',
    price: 4.891240,
    changePercent: 1.88,
    return1M: 8.40,
    return3M: 22.50,
    return6M: 41.20,
    returnYtd: 15.60,
    return1Y: 98.40,
    return3Y: 680.50,
    return5Y: 1450.00,
    aum: 18200000000, // 18.2 Milyar TL
    investorsCount: 148000,
    sharesCount: 3720980000,
    riskValue: 6, // Yüksek getiri / yüksek risk
    managementFee: 2.80,
    tefasTradeable: true,
    valeurBuy: 1, // T+1
    valeurSell: 2, // T+2
    currency: 'TL',
    description: 'AD4 Fonu, portföyünün en az %80ini BIST 100 Endeksi Dışındaki (XTUMY) yüksek büyüme potansiyeline sahip, yenilikçi, ihracatçı ve güçlü bilançolu orta/küçük ölçekli (Mid/Small Cap) şirketlerin hisselerine yatırır. Türkiye’de son yılların en yüksek getiri sağlayan hisse fonları arasındadır. Stopajdan (%0) muaftır.',
    allocations: [
      { name: 'BIST 100 Dışı Türk Hisseleri', percentage: 86.4, color: '#ec4899' },
      { name: 'BIST 100 Seçilmiş Büyüme Hisseleri', percentage: 8.2, color: '#8b5cf6' },
      { name: 'Takasbank Para Piyasası / Likit', percentage: 4.2, color: '#10b981' },
      { name: 'VİOP Teminat & Vadeli İşlemler', percentage: 1.2, color: '#f59e0b' }
    ],
    history: generateHistory(4.89124, 0.024, 0.0018),
    kapNews: [
      {
        id: 'ad4-1',
        title: 'AD4 Fon Portföyünde Ağırlık Artırılan Sektörler',
        summary: 'Fon yönetim ekibi teknoloji, yeşil enerji ve savunma sanayii yan sanayi şirketlerindeki ağırlığını artırdığını duyurmuştur.',
        date: 'Bugün 12:45',
        category: 'Fon Portföy',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'fund',
    code: 'MAC',
    name: 'Marmara Capital Portföy Hisse Senedi (TL) Fonu',
    issuer: 'Marmara Capital Portföy Yönetimi A.Ş.',
    fundType: 'Hisse Senedi Yoğun Fon',
    fundCategory: 'Hisse Senedi',
    price: 18.452100,
    changePercent: 1.42,
    return1M: 7.15,
    return3M: 19.80,
    return6M: 38.50,
    returnYtd: 14.20,
    return1Y: 92.60,
    return3Y: 740.00,
    return5Y: 1820.00,
    aum: 9800000000,
    investorsCount: 64000,
    sharesCount: 531100000,
    riskValue: 6,
    managementFee: 2.50,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 2,
    currency: 'TL',
    description: 'Haydar Acun yönetimindeki MAC Fonu, "Değer Yatırımı" (Value Investing) felsefesiyle yönetilen Türkiye’nin en köklü hisse senedi fonlarındandır. Şirketlerin pazar konumu, nakit akışları ve yönetim kalitesine odaklanır.',
    allocations: [
      { name: 'Borsa İstanbul Hisse Senetleri', percentage: 92.0, color: '#3b82f6' },
      { name: 'Nakit ve Takasbank Repo', percentage: 6.5, color: '#10b981' },
      { name: 'VİOP Korunma Pozisyonu', percentage: 1.5, color: '#6366f1' }
    ],
    history: generateHistory(18.4521, 0.02, 0.0016),
    kapNews: [
      {
        id: 'mac-1',
        title: 'Marmara Capital Aylık Yatırımcı Mektubu',
        summary: '2024 yılı 4. çeyrek bilanço beklentileri ve seçici hisse senedi stratejisine ilişkin değerlendirmeler yayımlanmıştır.',
        date: '14 Şubat 11:15',
        category: 'Finansal Rapor',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'fund',
    code: 'TI3',
    name: 'İş Portföy BIST 30 Endeksi Hisse Senedi Fonu',
    issuer: 'İş Portföy Yönetimi A.Ş.',
    fundType: 'Hisse Senedi (Endeks)',
    fundCategory: 'Hisse Senedi',
    price: 0.842150,
    changePercent: 1.65,
    return1M: 6.20,
    return3M: 16.40,
    return6M: 32.10,
    returnYtd: 12.80,
    return1Y: 82.50,
    return3Y: 490.00,
    return5Y: 960.00,
    aum: 14500000000,
    investorsCount: 92000,
    sharesCount: 17217800000,
    riskValue: 6,
    managementFee: 1.80,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 2,
    currency: 'TL',
    description: 'TI3 Fonu, BIST 30 Endeksini birebir takip etmeyi hedefler. THYAO, AKBNK, GARAN, TUPRS, KCHOL, ASELS gibi Türkiye’nin en büyük 30 şirketine tek işlemle dengeli yatırım imkanı sağlar.',
    allocations: [
      { name: 'BIST 30 Hisseleri', percentage: 95.5, color: '#0ea5e9' },
      { name: 'Takasbank ve Vadeli İşlemler', percentage: 4.5, color: '#10b981' }
    ],
    history: generateHistory(0.84215, 0.019, 0.0014),
    kapNews: []
  },
  {
    type: 'fund',
    code: 'IPB',
    name: 'İstanbul Portföy Birinci Değişken Fon',
    issuer: 'İstanbul Portföy Yönetimi A.Ş.',
    fundType: 'Değişken Fon',
    fundCategory: 'Değişken',
    price: 12.845000,
    changePercent: 0.95,
    return1M: 5.80,
    return3M: 18.20,
    return6M: 36.40,
    returnYtd: 13.90,
    return1Y: 88.50,
    return3Y: 580.00,
    return5Y: 1320.00,
    aum: 22400000000,
    investorsCount: 115000,
    sharesCount: 1743860000,
    riskValue: 5,
    managementFee: 2.40,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 2,
    currency: 'TL',
    description: 'IPB, piyasa koşullarına göre varlık dağılımını dinamik olarak değiştiren esnek bir değişken fondur. Borsa yükselişlerinde hisse ağırlığını artırırken, riskli dönemlerde döviz, altın ve faiz enstrümanlarına geçerek portföyü korur.',
    allocations: [
      { name: 'Yerli Hisse Senetleri', percentage: 58.0, color: '#3b82f6' },
      { name: 'Özel Sektör Tahvil/Bono', percentage: 22.0, color: '#8b5cf6' },
      { name: 'Altın & Emtia Türevleri', percentage: 11.5, color: '#f59e0b' },
      { name: 'Ters Repo & Nakit', percentage: 8.5, color: '#10b981' }
    ],
    history: generateHistory(12.845, 0.016, 0.0012),
    kapNews: []
  },
  {
    type: 'fund',
    code: 'GTA',
    name: 'Garanti Portföy Altın Fonu',
    issuer: 'Garanti Portföy Yönetimi A.Ş.',
    fundType: 'Kıymetli Madenler Fonu',
    fundCategory: 'Altın / Emtia',
    price: 0.284500,
    changePercent: 0.85,
    return1M: 4.80,
    return3M: 14.50,
    return6M: 26.20,
    returnYtd: 9.40,
    return1Y: 68.20,
    return3Y: 310.00,
    return5Y: 680.00,
    aum: 26800000000,
    investorsCount: 185000,
    sharesCount: 94200000000,
    riskValue: 6,
    managementFee: 1.20,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 1,
    currency: 'TL',
    description: 'GTA Fonu, portföyünün en az %80ini Borsa İstanbul Kıymetli Madenler Piyasasında işlem gören altın ve altına dayalı sermaye piyasası araçlarında değerlendirir. Gram altın fiyat hareketlerini ve ons/dolar kurunu yakından izler.',
    allocations: [
      { name: 'Fiziki Altın (Kıymetli Maden)', percentage: 84.5, color: '#eab308' },
      { name: 'Altına Dayalı Kira Sertifikaları', percentage: 11.2, color: '#f59e0b' },
      { name: 'Takasbank & Nakit', percentage: 4.3, color: '#10b981' }
    ],
    history: generateHistory(0.2845, 0.012, 0.0008),
    kapNews: []
  },
  {
    type: 'fund',
    code: 'KZL',
    name: 'Kuveyt Türk Portföy Altın Katılım Fonu',
    issuer: 'KT Portföy Yönetimi A.Ş.',
    fundType: 'Kıymetli Madenler (Faizsiz Katılım)',
    fundCategory: 'Katılım / Faizsiz',
    price: 0.312000,
    changePercent: 0.86,
    return1M: 4.85,
    return3M: 14.60,
    return6M: 26.40,
    returnYtd: 9.50,
    return1Y: 68.80,
    return3Y: 312.00,
    return5Y: 695.00,
    aum: 19400000000,
    investorsCount: 142000,
    sharesCount: 62179000000,
    riskValue: 6,
    managementFee: 1.10,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 1,
    currency: 'TL',
    description: 'KZL Fonu, faizsiz finans ilkelerine tam uygun olarak altına ve altına dayalı kira sertifikalarına yatırım yapar. Katılım bankacılığı prensiplerine uyan tasarruf sahipleri için idealdir.',
    allocations: [
      { name: 'Fiziki Altın (Darphane/BIST)', percentage: 88.0, color: '#eab308' },
      { name: 'Kira Sertifikaları (Sukuk)', percentage: 9.5, color: '#10b981' },
      { name: 'Katılma Hesapları (Cari)', percentage: 2.5, color: '#6366f1' }
    ],
    history: generateHistory(0.312, 0.012, 0.0008),
    kapNews: []
  },
  {
    type: 'fund',
    code: 'AFT',
    name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu',
    issuer: 'Ak Portföy Yönetimi A.Ş.',
    fundType: 'Yabancı Hisse Senedi Fonu',
    fundCategory: 'Yabancı Hisse / Teknoloji',
    price: 0.524100,
    changePercent: 1.15,
    return1M: 6.90,
    return3M: 24.50,
    return6M: 48.20,
    returnYtd: 18.40,
    return1Y: 84.60,
    return3Y: 420.00,
    return5Y: 1150.00,
    aum: 28500000000,
    investorsCount: 220000,
    sharesCount: 54378000000,
    riskValue: 7, // En yüksek risk/volatilite
    managementFee: 2.90,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 3, // T+3 (Yabancı borsa takası)
    currency: 'TL',
    description: 'AFT Fonu, Apple, Nvidia, Microsoft, Alphabet, Meta, TSMC ve ASML gibi dünyanın en büyük 20 küresel teknoloji ve yapay zeka şirketine Türk Lirası ile tek işlemde yatırım imkanı sunar. Dolar/TL kuru ve Nasdaq performansından beslenir.',
    allocations: [
      { name: 'Yabancı Hisse Senedi (ABD/Nasdaq)', percentage: 91.5, color: '#6366f1' },
      { name: 'Yabancı Borsa Yatırım Fonları (ETF)', percentage: 5.5, color: '#3b82f6' },
      { name: 'Dövizli Likit / Takasbank', percentage: 3.0, color: '#10b981' }
    ],
    history: generateHistory(0.5241, 0.022, 0.0017),
    kapNews: [
      {
        id: 'aft-1',
        title: 'Yapay Zeka ve Yarı İletken Sektörü Raporu',
        summary: 'Fon portföyündeki mikroçip ve yapay zeka altyapı sağlayıcılarının güçlü bilanço açıklamaları bildirilmiştir.',
        date: '10 Şubat 16:00',
        category: 'Fon Portföy',
        impact: 'positive'
      }
    ]
  },
  {
    type: 'fund',
    code: 'TCD',
    name: 'Tacirler Portföy Değişken Fon',
    issuer: 'Tacirler Portföy Yönetimi A.Ş.',
    fundType: 'Değişken Fon',
    fundCategory: 'Değişken',
    price: 9.654000,
    changePercent: 1.25,
    return1M: 7.80,
    return3M: 21.40,
    return6M: 39.10,
    returnYtd: 14.80,
    return1Y: 94.20,
    return3Y: 690.00,
    return5Y: 1780.00,
    aum: 11200000000,
    investorsCount: 52000,
    sharesCount: 1160140000,
    riskValue: 6,
    managementFee: 2.60,
    tefasTradeable: true,
    valeurBuy: 1,
    valeurSell: 2,
    currency: 'TL',
    description: 'TCD Fonu, yüksek alfa arayışında olan agresif büyüme odaklı bir değişkendir. Ağırlıklı olarak Borsa İstanbuldaki büyüme potansiyeli yüksek hisse senetlerinde yoğunlaşır ve VİOP opsiyon türevleri ile getiri maksimizasyonu hedefler.',
    allocations: [
      { name: 'Borsa İstanbul Hisse Senetleri', percentage: 76.0, color: '#f43f5e' },
      { name: 'VİOP ve Türev Araçlar', percentage: 14.0, color: '#8b5cf6' },
      { name: 'Para Piyasası ve Repo', percentage: 10.0, color: '#10b981' }
    ],
    history: generateHistory(9.654, 0.022, 0.0015),
    kapNews: []
  },
  {
    type: 'fund',
    code: 'PPZ',
    name: 'Azimut Portföy Para Piyasası Fonu',
    issuer: 'Azimut Portföy Yönetimi A.Ş.',
    fundType: 'Para Piyasası (TL)',
    fundCategory: 'Para Piyasası',
    price: 4.120500,
    changePercent: 0.146,
    return1M: 4.28,
    return3M: 13.90,
    return6M: 29.10,
    returnYtd: 7.90,
    return1Y: 63.10,
    return3Y: 188.00,
    return5Y: 348.00,
    aum: 32000000000,
    investorsCount: 165000,
    sharesCount: 7766000000,
    riskValue: 1,
    managementFee: 1.40,
    tefasTradeable: true,
    valeurBuy: 0,
    valeurSell: 0,
    currency: 'TL',
    description: 'PPZ Fonu, kurumsal ve bireysel yatırımcılara istikrarlı günlük getiri sunan, TEFAS üzerinden tüm banka ve aracı kurumlardan anında (T+0) alınıp satılabilen dev bir para piyasası fonudur.',
    allocations: [
      { name: 'Mevduat ve Katılma Hesapları', percentage: 45.0, color: '#10b981' },
      { name: 'Ters Repo ve Takasbank', percentage: 38.0, color: '#3b82f6' },
      { name: 'Bono ve Finansman Bonoları', percentage: 17.0, color: '#f59e0b' }
    ],
    history: generateHistory(4.1205, 0.0005, 0.0014),
    kapNews: []
  }
];
