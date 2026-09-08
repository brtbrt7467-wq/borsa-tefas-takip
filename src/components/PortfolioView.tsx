import React, { useState, useMemo } from 'react';
import { Stock, Fund, PortfolioItem, WatchlistItem, AssetType, PortfolioCategory, MarketIndex } from '../types';
import { 
  formatCurrency, 
  formatPercent, 
  formatCompactNumber, 
  getDaysDifference, 
  formatHoldingDuration, 
  formatDateTurkish, 
  calculateAnnualizedReturn 
} from '../utils/formatters';
import { 
  PORTFOLIO_CATEGORIES, 
  PRESET_CUSTOM_ASSETS, 
  getCategoryMeta, 
  calculateDepositCurrentValue,
  calculateEurobondDetails,
  generateEurobondCouponSchedule,
  CategoryMeta 
} from '../data/assetCategoriesData';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Edit3, 
  Bot, 
  Star, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Info, 
  Calendar, 
  Layers, 
  Clock, 
  Activity, 
  BarChart2, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight,
  HelpCircle,
  Coins,
  Landmark,
  ShieldCheck,
  LayoutGrid,
  ListFilter,
  ChevronDown,
  ChevronRight,
  Percent,
  FileSpreadsheet,
  Globe,
  FileText,
  History,
  Calculator,
  DollarSign,
  Bell,
  Minus,
  MinusCircle,
  PlusCircle,
  ChevronUp,
  ArrowUpDown
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { EurobondCouponModal } from './EurobondCouponModal';
import { PortfolioTransactionSubTable } from './PortfolioTransactionSubTable';
import { PortfolioMobileItemCard } from './PortfolioMobileItemCard';
import { calculateWeightedTransactions } from '../utils/portfolioCalculations';

interface PortfolioViewProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  stocks: Stock[];
  funds: Fund[];
  indices?: MarketIndex[];
  onAddPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => void;
  onUpdatePortfolioItem: (item: PortfolioItem) => void;
  onRemovePortfolioItem: (id: string) => void;
  onSelectAsset: (asset: Stock | Fund) => void;
  onOpenAIForPortfolio: () => void;
  onToggleWatchlist: (asset: Stock | Fund) => void;
  onOpenBackupModal?: () => void;
  onOpenSetAlert?: (asset: Stock | Fund | any) => void;
}

// Icon mapper helper
const renderCategoryIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Globe': return <Globe className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Coins': return <Coins className={className} />;
    case 'Landmark': return <Landmark className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    default: return <HelpCircle className={className} />;
  }
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolio,
  watchlist,
  stocks,
  funds,
  indices = [],
  onAddPortfolioItem,
  onUpdatePortfolioItem,
  onRemovePortfolioItem,
  onSelectAsset,
  onOpenAIForPortfolio,
  onToggleWatchlist,
  onOpenBackupModal,
  onOpenSetAlert,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'portfolio' | 'periodic' | 'watchlist'>('portfolio');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ 'p-tursg': true });

  const toggleItemExpand = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const expandAllItems = () => {
    const all: Record<string, boolean> = {};
    portfolio.forEach(item => {
      all[item.id] = true;
    });
    setExpandedItems(all);
  };

  const collapseAllItems = () => {
    setExpandedItems({});
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [selectedTransactionItem, setSelectedTransactionItem] = useState<PortfolioItem | null>(null);
  const [selectedEurobondItem, setSelectedEurobondItem] = useState<PortfolioItem | null>(null);

  // Active vs. Passive status filter ('all' | 'active' | 'passive')
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'active' | 'passive'>('all');

  // Sorting state (Default: Alphabetical A to Z)
  const [portfolioSortBy, setPortfolioSortBy] = useState<'alphabetical' | 'value' | 'pnl' | 'date'>('alphabetical');
  const [portfolioSortOrder, setPortfolioSortOrder] = useState<'asc' | 'desc'>('asc');

  // Live exchange rates from market indices
  const usdRate = indices.find(i => i.code === 'USDTRY')?.value || 36.82;
  const eurRate = indices.find(i => i.code === 'EURTRY')?.value || 38.65;

  // Form states for adding holding
  const [addCategory, setAddCategory] = useState<PortfolioCategory>('stock');
  const [addStatus, setAddStatus] = useState<'active' | 'passive'>('active');
  const [addEntryMode, setAddEntryMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetCode, setSelectedPresetCode] = useState<string>('AKBNK');
  const [customCode, setCustomCode] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [averageCost, setAverageCost] = useState<number>(60.0);
  const [currentPriceInput, setCurrentPriceInput] = useState<number>(60.0);
  const [interestRate, setInterestRate] = useState<number>(48.5);
  const [maturityDate, setMaturityDate] = useState<string>('');
  const [addedDate, setAddedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Eurobond-specific Add form states
  const [addNominalCurrency, setAddNominalCurrency] = useState<'USD' | 'EUR'>('USD');
  const [addPriceInCurrency, setAddPriceInCurrency] = useState<number>(100.25);
  const [addBuyExchangeRate, setAddBuyExchangeRate] = useState<number>(usdRate);
  const [addCouponRateAnnual, setAddCouponRateAnnual] = useState<number>(7.625);
  const [addCouponFrequency, setAddCouponFrequency] = useState<number>(2);

  // Form states for editing holding
  const [editCategory, setEditCategory] = useState<PortfolioCategory>('stock');
  const [editStatus, setEditStatus] = useState<'active' | 'passive'>('active');
  const [editCode, setEditCode] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<number>(100);
  const [editAverageCost, setEditAverageCost] = useState<number>(60.0);
  const [editCurrentPrice, setEditCurrentPrice] = useState<number>(60.0);
  const [editInterestRate, setEditInterestRate] = useState<number | undefined>(undefined);
  const [editMaturityDate, setEditMaturityDate] = useState<string>('');
  const [editAddedDate, setEditAddedDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');

  // Eurobond-specific Edit form states
  const [editNominalCurrency, setEditNominalCurrency] = useState<'USD' | 'EUR'>('USD');
  const [editPriceInCurrency, setEditPriceInCurrency] = useState<number>(100.25);
  const [editBuyExchangeRate, setEditBuyExchangeRate] = useState<number>(usdRate);
  const [editCouponRateAnnual, setEditCouponRateAnnual] = useState<number>(7.625);
  const [editCouponFrequency, setEditCouponFrequency] = useState<number>(2);

  // Helper to resolve live/computed asset price
  const getAssetPriceAndMeta = (item: PortfolioItem): {
    currentPrice: number;
    dailyChangePercent: number;
    liveAsset?: Stock | Fund;
    categoryMeta: CategoryMeta;
  } => {
    // Determine canonical category
    let cat: PortfolioCategory = item.category || (item.type === 'stock' ? 'stock' : 'fund');
    const categoryMeta = getCategoryMeta(cat);

    // If stock or TEFAS fund, check live market service
    if (cat === 'stock') {
      const stock = stocks.find(s => s.code.toUpperCase() === item.code.toUpperCase());
      if (stock) {
        return { currentPrice: stock.price, dailyChangePercent: stock.changePercent, liveAsset: stock, categoryMeta };
      }
    } else if (cat === 'fund') {
      const fund = funds.find(f => f.code.toUpperCase() === item.code.toUpperCase());
      if (fund) {
        return { currentPrice: fund.price, dailyChangePercent: fund.changePercent, liveAsset: fund, categoryMeta };
      }
    } else if (cat === 'deposit' && item.interestRate) {
      // Calculate accrued interest dynamically based on days held
      const days = getDaysDifference(item.addedDate);
      const { currentValue } = calculateDepositCurrentValue(item.averageCost * item.quantity, item.interestRate, days);
      const calculatedUnitPrice = item.quantity > 0 ? currentValue / item.quantity : item.averageCost;
      return {
        currentPrice: calculatedUnitPrice,
        dailyChangePercent: (item.interestRate / 365),
        categoryMeta
      };
    } else if (cat === 'eurobond') {
      // Dynamic live TL conversion using current USD/TRY or EUR/TRY exchange rate
      const eb = calculateEurobondDetails(item, usdRate, eurRate);
      const unitPriceInTRY = (eb.priceInCurrencyPercent / 100) * eb.currentFxRate;
      return {
        currentPrice: unitPriceInTRY,
        dailyChangePercent: 0,
        categoryMeta
      };
    }

    // Otherwise check presets or item's stored currentPrice
    const preset = PRESET_CUSTOM_ASSETS.find(p => p.code.toUpperCase() === item.code.toUpperCase());
    const fallbackPrice = item.currentPrice || preset?.defaultPrice || item.averageCost;

    return {
      currentPrice: fallbackPrice,
      dailyChangePercent: 0,
      categoryMeta
    };
  };

  // Open add modal pre-populated with an asset from Watchlist
  const handleOpenAddModalWithAsset = (asset: Stock | Fund, e: React.MouseEvent) => {
    e.stopPropagation();
    const isStock = 'volume' in asset;
    setAddCategory(isStock ? 'stock' : 'fund');
    setAddEntryMode('preset');
    setSelectedPresetCode(asset.code);
    setCustomCode(asset.code);
    setCustomName(asset.name);
    setCurrentPriceInput(asset.price);
    setAverageCost(asset.price);
    setQuantity(100);
    setIsAddModalOpen(true);
  };

  // Toggle collapse state for grouped categories
  const toggleCollapse = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Open edit modal with item's values
  const handleOpenEdit = (item: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { currentPrice } = getAssetPriceAndMeta(item);
    const cat = item.category || (item.type === 'stock' ? 'stock' : 'fund');

    const curr = (item.nominalCurrency || item.currency || (item.code.toUpperCase().includes('EUR') ? 'EUR' : 'USD')).toUpperCase() as 'USD' | 'EUR';
    const rate = curr === 'EUR' ? eurRate : usdRate;

    setEditingItem(item);
    setEditCategory(cat);
    setEditStatus(item.status || (item.quantity <= 0.00001 || item.isPassive ? 'passive' : 'active'));
    setEditCode(item.code);
    setEditName(item.name);
    setEditQuantity(item.nominalAmount || item.quantity);
    setEditAverageCost(item.averageCost);
    setEditCurrentPrice(currentPrice);
    setEditInterestRate(item.interestRate);
    setEditMaturityDate(item.maturityDate || '');
    setEditAddedDate(item.addedDate || new Date().toISOString().split('T')[0]);
    setEditNotes(item.notes || '');

    // Eurobond specific
    setEditNominalCurrency(curr);
    setEditPriceInCurrency(item.priceInCurrency ?? 100.0);
    setEditBuyExchangeRate(item.buyExchangeRate || rate);
    setEditCouponRateAnnual(item.couponRateAnnual ?? item.interestRate ?? 7.625);
    setEditCouponFrequency(item.couponFrequency || 2);
  };

  // Save edited holding
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const isEurobond = editCategory === 'eurobond';
    const currentFx = editNominalCurrency === 'EUR' ? eurRate : usdRate;
    const computedAverageCost = isEurobond 
      ? Number(((editPriceInCurrency / 100) * editBuyExchangeRate).toFixed(4))
      : Number(editAverageCost);
    const computedCurrentPrice = isEurobond
      ? Number(((editPriceInCurrency / 100) * currentFx).toFixed(4))
      : Number(editCurrentPrice);

    const newQty = Number(editQuantity);
    const newCode = editCode.trim().toUpperCase() || editingItem.code;
    const newName = editName.trim() || editingItem.name;
    const newDate = editAddedDate || new Date().toISOString().split('T')[0];
    const newNotes = editNotes.trim();
    const isPassive = newQty <= 0.00001 || editStatus === 'passive';

    // Synchronize transactions with edited quantity, cost, code, and date
    let updatedTransactions = editingItem.transactions && editingItem.transactions.length > 0
      ? [...editingItem.transactions]
      : [];

    if (updatedTransactions.length <= 1) {
      // Single transaction or initial entry: direct 1-to-1 sync
      updatedTransactions = [
        {
          id: updatedTransactions[0]?.id || `tx_${editingItem.id || newCode}_init`,
          code: newCode,
          type: 'buy',
          date: newDate,
          quantity: newQty,
          price: computedAverageCost,
          totalAmount: Number((newQty * computedAverageCost).toFixed(2)),
          notes: newNotes || updatedTransactions[0]?.notes || 'Başlangıç Alımı / Portföy Girişi',
          createdAt: updatedTransactions[0]?.createdAt || new Date().toISOString()
        }
      ];
    } else {
      // Multiple transactions exist: adjust lots so net remaining quantity matches newQty
      const currentNetQty = updatedTransactions.reduce(
        (acc, t) => acc + (t.type === 'buy' ? t.quantity : -t.quantity),
        0
      );
      const diff = newQty - currentNetQty;

      if (Math.abs(diff) > 0.00001) {
        // Adjust the first buy transaction if possible
        const firstBuyIdx = updatedTransactions.findIndex(t => t.type === 'buy');
        if (firstBuyIdx >= 0 && (updatedTransactions[firstBuyIdx].quantity + diff) > 0) {
          const targetTx = updatedTransactions[firstBuyIdx];
          const adjQty = targetTx.quantity + diff;
          updatedTransactions[firstBuyIdx] = {
            ...targetTx,
            code: newCode,
            quantity: adjQty,
            totalAmount: Number((adjQty * targetTx.price).toFixed(2))
          };
        } else {
          // If first buy cannot absorb diff without going negative, replace with consolidated lot
          updatedTransactions = [
            {
              id: `tx_${newCode}_consolidated_${Date.now()}`,
              code: newCode,
              type: 'buy',
              date: newDate,
              quantity: newQty,
              price: computedAverageCost,
              totalAmount: Number((newQty * computedAverageCost).toFixed(2)),
              notes: newNotes || 'Güncellenmiş Toplam Pozisyon',
              createdAt: new Date().toISOString()
            }
          ];
        }
      } else {
        // Update asset code in all transactions in case code was renamed
        updatedTransactions = updatedTransactions.map(t => ({
          ...t,
          code: newCode
        }));
      }
    }

    onUpdatePortfolioItem({
      ...editingItem,
      code: newCode,
      name: newName,
      category: editCategory,
      type: (editCategory === 'stock' || editCategory === 'crypto' || editCategory === 'gold_fx') ? 'stock' : 'fund',
      quantity: newQty,
      status: isPassive ? 'passive' : 'active',
      isPassive: isPassive,
      nominalAmount: isEurobond ? newQty : undefined,
      nominalCurrency: isEurobond ? editNominalCurrency : undefined,
      currency: isEurobond ? editNominalCurrency : undefined,
      priceInCurrency: isEurobond ? Number(editPriceInCurrency) : undefined,
      buyExchangeRate: isEurobond ? Number(editBuyExchangeRate) : undefined,
      couponRateAnnual: isEurobond ? Number(editCouponRateAnnual) : undefined,
      couponFrequency: isEurobond ? Number(editCouponFrequency) : undefined,
      averageCost: computedAverageCost,
      currentPrice: computedCurrentPrice,
      interestRate: editCategory === 'deposit' ? Number(editInterestRate || 0) : (isEurobond ? Number(editCouponRateAnnual) : undefined),
      maturityDate: editMaturityDate || undefined,
      addedDate: newDate,
      notes: newNotes,
      transactions: updatedTransactions
    });

    setEditingItem(null);
  };

  // Custom code input change with auto-lookup
  const handleCustomCodeChange = (rawCode: string) => {
    const code = rawCode.toUpperCase();
    setCustomCode(code);

    const matchedStock = stocks.find(s => s.code.toUpperCase() === code);
    if (matchedStock) {
      setCustomName(matchedStock.name);
      setAverageCost(matchedStock.price);
      setCurrentPriceInput(matchedStock.price);
      return;
    }
    const matchedFund = funds.find(f => f.code.toUpperCase() === code);
    if (matchedFund) {
      setCustomName(matchedFund.name);
      setAverageCost(matchedFund.price);
      setCurrentPriceInput(matchedFund.price);
      return;
    }
    const matchedPreset = PRESET_CUSTOM_ASSETS.find(p => p.code.toUpperCase() === code);
    if (matchedPreset) {
      setCustomName(matchedPreset.name);
      setAverageCost(matchedPreset.defaultCost || matchedPreset.defaultPrice);
      setCurrentPriceInput(matchedPreset.defaultPrice);
      if (matchedPreset.category === 'eurobond') {
        const curr = matchedPreset.nominalCurrency || 'USD';
        setAddNominalCurrency(curr);
        setAddPriceInCurrency(matchedPreset.defaultPrice || 100.25);
        setAddBuyExchangeRate(curr === 'EUR' ? eurRate : usdRate);
        setAddCouponRateAnnual(matchedPreset.couponRateAnnual || 7.625);
        setAddCouponFrequency(matchedPreset.couponFrequency || 2);
        setMaturityDate(matchedPreset.maturityDate || '2030-03-25');
      }
      return;
    }
  };

  // Switch category in add modal and set reasonable defaults
  const handleSwitchAddCategory = (cat: PortfolioCategory) => {
    setAddCategory(cat);
    if (cat === 'stock') {
      const firstStock = stocks[0] || { code: 'AKBNK', name: 'Akbank T.A.Ş.', price: 60 };
      setSelectedPresetCode(firstStock.code);
      setCustomCode(firstStock.code);
      setCustomName(firstStock.name);
      setAverageCost(firstStock.price);
      setCurrentPriceInput(firstStock.price);
      setQuantity(100);
    } else if (cat === 'fund') {
      const firstFund = funds[0] || { code: 'YLB', name: 'Yapı Kredi Para Piyasası Fonu', price: 1.82 };
      setSelectedPresetCode(firstFund.code);
      setCustomCode(firstFund.code);
      setCustomName(firstFund.name);
      setAverageCost(firstFund.price);
      setCurrentPriceInput(firstFund.price);
      setQuantity(10000);
    } else if (cat === 'eurobond') {
      const presetsForCat = PRESET_CUSTOM_ASSETS.filter(p => p.category === 'eurobond');
      const firstPreset = presetsForCat[0] || {
        code: 'TR-USD-2030',
        name: 'T.C. Hazine $ Eurobond (25.03.2030 %7.625)',
        nominalCurrency: 'USD',
        defaultPrice: 100.25,
        couponRateAnnual: 7.625,
        couponFrequency: 2,
        maturityDate: '2030-03-25'
      };
      setSelectedPresetCode(firstPreset.code);
      setCustomCode(firstPreset.code);
      setCustomName(firstPreset.name);
      setAddNominalCurrency(firstPreset.nominalCurrency || 'USD');
      setAddPriceInCurrency(100.25);
      setAddBuyExchangeRate(firstPreset.nominalCurrency === 'EUR' ? eurRate : usdRate);
      setAddCouponRateAnnual(firstPreset.couponRateAnnual || 7.625);
      setAddCouponFrequency(firstPreset.couponFrequency || 2);
      setMaturityDate(firstPreset.maturityDate || '2030-03-25');
      setQuantity(10000);
    } else {
      const presetsForCat = PRESET_CUSTOM_ASSETS.filter(p => p.category === cat);
      if (presetsForCat.length > 0) {
        setSelectedPresetCode(presetsForCat[0].code);
        setCustomCode(presetsForCat[0].code);
        setCustomName(presetsForCat[0].name);
        setAverageCost(presetsForCat[0].defaultCost || presetsForCat[0].defaultPrice);
        setCurrentPriceInput(presetsForCat[0].defaultPrice);
        setInterestRate(presetsForCat[0].interestRate || 48.5);
        setQuantity(cat === 'crypto' ? 0.05 : (cat === 'deposit' ? 50000 : 10));
      } else {
        setSelectedPresetCode('CUSTOM');
        setCustomCode('');
        setCustomName('');
      }
    }
  };

  // Handle add submit
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCode = '';
    let finalName = '';
    let finalType: AssetType = (addCategory === 'stock' || addCategory === 'crypto' || addCategory === 'gold_fx') ? 'stock' : 'fund';

    if (addEntryMode === 'custom') {
      finalCode = customCode.trim().toUpperCase() || 'VARLIK';
      finalName = customName.trim() || finalCode;
    } else {
      if (selectedPresetCode === 'CUSTOM') {
        finalCode = customCode.trim().toUpperCase() || 'VARLIK';
        finalName = customName.trim() || finalCode;
      } else if (addCategory === 'stock') {
        const s = stocks.find(st => st.code === selectedPresetCode);
        finalCode = customCode.trim().toUpperCase() || selectedPresetCode;
        finalName = customName.trim() || s?.name || selectedPresetCode;
      } else if (addCategory === 'fund') {
        const f = funds.find(fn => fn.code === selectedPresetCode);
        finalCode = customCode.trim().toUpperCase() || selectedPresetCode;
        finalName = customName.trim() || f?.name || selectedPresetCode;
      } else {
        const p = PRESET_CUSTOM_ASSETS.find(pr => pr.code === selectedPresetCode);
        if (p) {
          finalCode = customCode.trim().toUpperCase() || p.code;
          finalName = customName.trim() || p.name;
        } else {
          finalCode = customCode.trim().toUpperCase() || 'OZEL';
          finalName = customName.trim() || finalCode;
        }
      }
    }

    const isEurobond = addCategory === 'eurobond';
    const currentFx = addNominalCurrency === 'EUR' ? eurRate : usdRate;
    const computedAverageCost = isEurobond 
      ? Number(((addPriceInCurrency / 100) * addBuyExchangeRate).toFixed(4))
      : Number(averageCost);
    const computedCurrentPrice = isEurobond
      ? Number(((addPriceInCurrency / 100) * currentFx).toFixed(4))
      : Number(currentPriceInput || averageCost);

    // If eurobond, auto generate periodic coupon schedule
    const autoSchedule = isEurobond ? generateEurobondCouponSchedule(
      Number(quantity),
      addNominalCurrency,
      Number(addCouponRateAnnual),
      Number(addCouponFrequency),
      addedDate || new Date().toISOString().split('T')[0],
      maturityDate || '2030-03-25',
      currentFx
    ).map(s => ({
      id: s.id,
      paymentDate: s.paymentDate,
      couponRateAnnual: Number(addCouponRateAnnual),
      amountInCurrency: s.amountInCurrency,
      currency: s.currency,
      exchangeRate: s.isPaid ? addBuyExchangeRate : currentFx,
      amountInTRY: s.amountInTRY,
      isPaid: s.isPaid,
      periodLabel: s.periodLabel
    })) : undefined;

    const isItemPassive = Number(quantity) <= 0.00001 || addStatus === 'passive';
    onAddPortfolioItem({
      category: addCategory,
      type: finalType,
      code: finalCode,
      name: finalName,
      quantity: Number(quantity),
      status: isItemPassive ? 'passive' : 'active',
      isPassive: isItemPassive,
      nominalAmount: isEurobond ? Number(quantity) : undefined,
      nominalCurrency: isEurobond ? addNominalCurrency : undefined,
      currency: isEurobond ? addNominalCurrency : undefined,
      priceInCurrency: isEurobond ? Number(addPriceInCurrency) : undefined,
      buyExchangeRate: isEurobond ? Number(addBuyExchangeRate) : undefined,
      couponRateAnnual: isEurobond ? Number(addCouponRateAnnual) : undefined,
      couponFrequency: isEurobond ? Number(addCouponFrequency) : undefined,
      averageCost: computedAverageCost,
      currentPrice: computedCurrentPrice,
      interestRate: addCategory === 'deposit' ? Number(interestRate) : (isEurobond ? Number(addCouponRateAnnual) : undefined),
      maturityDate: maturityDate || undefined,
      addedDate: addedDate || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      couponPayments: autoSchedule
    });

    setIsAddModalOpen(false);
    setCustomCode('');
    setCustomName('');
    setNotes('');
  };

  // Comprehensive portfolio summary calculation with category groupings & asset consolidation
  const portfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let totalDailyChange = 0;
    let totalDaysWeighted = 0;

    // Consolidate duplicate items with the same code & category into a single master item
    const consolidatedMap = new Map<string, PortfolioItem>();

    portfolio.forEach(item => {
      const cat = item.category || (item.type === 'stock' ? 'stock' : 'fund');
      const curr = item.nominalCurrency || item.currency || 'TL';
      const key = `${item.code.toUpperCase()}_${cat}_${curr}`;

      const existing = consolidatedMap.get(key);
      if (!existing) {
        // First entry for this asset
        const rawTxs = item.transactions && item.transactions.length > 0
          ? item.transactions
          : [{
              id: `tx_${item.id}_init`,
              code: item.code,
              type: 'buy' as const,
              date: item.addedDate || new Date().toISOString().split('T')[0],
              quantity: item.quantity,
              price: item.averageCost,
              totalAmount: item.quantity * item.averageCost,
              notes: item.notes || 'Başlangıç Alımı'
            }];

        const calc = calculateWeightedTransactions(
          rawTxs,
          item.quantity,
          item.averageCost,
          item.addedDate,
          item.code
        );

        const itemRealized = calc.totalRealizedProfitLoss !== 0 ? calc.totalRealizedProfitLoss : (item.realizedProfitLoss || 0);

        consolidatedMap.set(key, {
          ...item,
          category: cat,
          quantity: calc.currentQuantity,
          averageCost: calc.averageCost,
          realizedProfitLoss: itemRealized,
          addedDate: calc.firstBuyDate || item.addedDate,
          transactions: calc.enrichedTransactions
        });
      } else {
        // Merge into existing master item
        const existingTxs = existing.transactions && existing.transactions.length > 0
          ? existing.transactions
          : [{
              id: `tx_${existing.id}_init`,
              code: existing.code,
              type: 'buy' as const,
              date: existing.addedDate || new Date().toISOString().split('T')[0],
              quantity: existing.quantity,
              price: existing.averageCost,
              totalAmount: existing.quantity * existing.averageCost,
              notes: existing.notes || 'Başlangıç Alımı'
            }];

        const incomingTxs = item.transactions && item.transactions.length > 0
          ? item.transactions
          : [{
              id: `tx_${item.id}_init`,
              code: item.code,
              type: 'buy' as const,
              date: item.addedDate || new Date().toISOString().split('T')[0],
              quantity: item.quantity,
              price: item.averageCost,
              totalAmount: item.quantity * item.averageCost,
              notes: item.notes || 'Ek Pozisyon Girişi'
            }];

        const allTxs = [...existingTxs, ...incomingTxs];
        const calc = calculateWeightedTransactions(
          allTxs,
          existing.quantity + item.quantity,
          existing.averageCost,
          existing.addedDate,
          existing.code
        );

        const itemRealized = calc.totalRealizedProfitLoss !== 0 
          ? calc.totalRealizedProfitLoss 
          : ((existing.realizedProfitLoss || 0) + (item.realizedProfitLoss || 0));

        consolidatedMap.set(key, {
          ...existing,
          quantity: calc.currentQuantity,
          averageCost: calc.averageCost,
          realizedProfitLoss: itemRealized,
          addedDate: calc.firstBuyDate || existing.addedDate,
          transactions: calc.enrichedTransactions,
          notes: existing.notes ? `${existing.notes} | ${item.notes || ''}` : item.notes
        });
      }
    });

    const consolidatedList = Array.from(consolidatedMap.values());

    const itemsWithComputed = consolidatedList.map(item => {
      const { currentPrice, dailyChangePercent, liveAsset, categoryMeta } = getAssetPriceAndMeta(item);
      const cat = item.category || (item.type === 'stock' ? 'stock' : 'fund');
      const isActive = (item.quantity > 0.00001) && item.status !== 'passive' && !item.isPassive;

      const currentValue = isActive ? item.quantity * currentPrice : 0;
      const costValue = isActive ? item.quantity * item.averageCost : 0;
      const profitLoss = isActive ? currentValue - costValue : 0;
      const profitLossPercent = isActive && costValue > 0 ? (profitLoss / costValue) * 100 : 0;
      
      // Exact daily nominal change for active positions
      const dailyChange = isActive
        ? (liveAsset && 'change' in liveAsset && typeof (liveAsset as any).change === 'number'
          ? item.quantity * (liveAsset as any).change
          : (dailyChangePercent !== -100 ? (currentValue * dailyChangePercent) / (100 + dailyChangePercent) : 0))
        : 0;
      const daysHeld = getDaysDifference(item.addedDate);
      const holdingLabel = formatHoldingDuration(item.addedDate);
      const annualizedReturn = calculateAnnualizedReturn(profitLossPercent, daysHeld);
      const dailyPnlRate = daysHeld > 0 ? profitLoss / daysHeld : 0;

      totalValue += currentValue;
      totalCost += costValue;
      totalDailyChange += dailyChange;
      if (isActive) {
        totalDaysWeighted += daysHeld * (costValue || 1);
      }

      const txList = item.transactions || [];
      const buyCount = txList.filter(t => t.type === 'buy').length;
      const sellCount = txList.filter(t => t.type === 'sell').length;

      return {
        ...item,
        category: cat,
        categoryMeta,
        isActive,
        status: isActive ? 'active' : 'passive',
        isPassive: !isActive,
        currentPrice,
        currentValue,
        costValue,
        profitLoss,
        profitLossPercent,
        realizedProfitLoss: item.realizedProfitLoss || 0,
        dailyChange,
        changePercent: dailyChangePercent,
        daysHeld,
        holdingLabel,
        annualizedReturn,
        dailyPnlRate,
        asset: liveAsset,
        buyCount,
        sellCount,
        totalTxCount: txList.length
      };
    });

    const netProfitLoss = totalValue - totalCost;
    const netProfitLossPercent = totalCost > 0 ? (netProfitLoss / totalCost) * 100 : 0;
    const prevDayValue = totalValue - totalDailyChange;
    const totalDailyChangePercent = prevDayValue > 0 ? (totalDailyChange / prevDayValue) * 100 : 0;
    const avgDaysHeld = totalCost > 0 ? Math.round(totalDaysWeighted / totalCost) : 0;
    const portfolioAnnualized = calculateAnnualizedReturn(netProfitLossPercent, Math.max(7, avgDaysHeld));
    
    // Accurate Realized Profit / Loss from all buy/sell transactions
    const totalRealizedProfitLoss = itemsWithComputed.reduce((acc, item) => acc + (item.realizedProfitLoss || 0), 0);
    const totalSellCount = itemsWithComputed.reduce((acc, item) => acc + (item.sellCount || 0), 0);
    const totalCombinedProfitLoss = netProfitLoss + totalRealizedProfitLoss;
    const totalCombinedProfitLossPercent = totalCost > 0 ? (totalCombinedProfitLoss / totalCost) * 100 : 0;

    // Helper comparator for sorting items (Default: Alphabetical A to Z by code, then by name)
    const compareItems = (a: typeof itemsWithComputed[0], b: typeof itemsWithComputed[0]) => {
      if (portfolioSortBy === 'alphabetical') {
        const codeA = (a.code || '').trim();
        const codeB = (b.code || '').trim();
        const comp = codeA.localeCompare(codeB, 'tr', { sensitivity: 'base' });
        if (comp !== 0) return portfolioSortOrder === 'asc' ? comp : -comp;
        const nameComp = (a.name || '').trim().localeCompare((b.name || '').trim(), 'tr', { sensitivity: 'base' });
        return portfolioSortOrder === 'asc' ? nameComp : -nameComp;
      } else if (portfolioSortBy === 'value') {
        return portfolioSortOrder === 'asc' ? a.currentValue - b.currentValue : b.currentValue - a.currentValue;
      } else if (portfolioSortBy === 'pnl') {
        return portfolioSortOrder === 'asc' ? a.profitLoss - b.profitLoss : b.profitLoss - a.profitLoss;
      } else if (portfolioSortBy === 'date') {
        const dateA = new Date(a.addedDate).getTime();
        const dateB = new Date(b.addedDate).getTime();
        return portfolioSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    };

    // Sort master items list
    itemsWithComputed.sort(compareItems);

    // Grouping by categories with separate Active and Passive sub-buckets
    const categoryGroups = PORTFOLIO_CATEGORIES.map(cat => {
      const itemsInCat = itemsWithComputed.filter(i => i.category === cat.id).sort(compareItems);
      const activeItems = itemsInCat.filter(i => i.isActive).sort(compareItems);
      const passiveItems = itemsInCat.filter(i => !i.isActive).sort(compareItems);
      
      const catValue = activeItems.reduce((acc, i) => acc + i.currentValue, 0);
      const catCost = activeItems.reduce((acc, i) => acc + i.costValue, 0);
      const catPnl = catValue - catCost;
      const catPnlPercent = catCost > 0 ? (catPnl / catCost) * 100 : 0;
      const catPassiveRealized = passiveItems.reduce((acc, i) => acc + (i.realizedProfitLoss || 0), 0);
      const weight = totalValue > 0 ? (catValue / totalValue) * 100 : 0;

      return {
        categoryMeta: cat,
        items: itemsInCat,
        activeItems,
        passiveItems,
        totalValue: catValue,
        totalCost: catCost,
        netProfitLoss: catPnl,
        netProfitLossPercent: catPnlPercent,
        activeValue: catValue,
        activeCost: catCost,
        activeProfitLoss: catPnl,
        activeProfitLossPercent: catPnlPercent,
        passiveRealizedProfitLoss: catPassiveRealized,
        weight,
        count: itemsInCat.length,
        activeCount: activeItems.length,
        passiveCount: passiveItems.length
      };
    }).filter(g => g.count > 0);

    const totalActiveCount = itemsWithComputed.filter(i => i.isActive).length;
    const totalPassiveCount = itemsWithComputed.filter(i => !i.isActive).length;

    // Allocation pie data (based on active values)
    const allocationData = categoryGroups.filter(g => g.totalValue > 0).map(g => ({
      name: g.categoryMeta.label,
      shortName: g.categoryMeta.shortLabel,
      value: g.totalValue,
      color: g.categoryMeta.color,
      weight: g.weight
    }));

    // Time horizon buckets (active items)
    const buckets = [
      { key: '<1M', label: '0-30 Gün', min: 0, max: 30, items: [] as typeof itemsWithComputed },
      { key: '1-3M', label: '1-3 Ay', min: 31, max: 90, items: [] as typeof itemsWithComputed },
      { key: '3-6M', label: '3-6 Ay', min: 91, max: 180, items: [] as typeof itemsWithComputed },
      { key: '6-12M', label: '6-12 Ay', min: 181, max: 365, items: [] as typeof itemsWithComputed },
      { key: '1Y+', label: '1+ Yıl', min: 366, max: 99999, items: [] as typeof itemsWithComputed },
    ];

    buckets.forEach(b => {
      b.items = itemsWithComputed.filter(i => i.isActive && i.daysHeld >= b.min && i.daysHeld <= b.max).sort(compareItems);
    });

    // Filter items based on selected category tab and active status filter
    const filteredItems = itemsWithComputed.filter(i => {
      if (selectedCategoryFilter !== 'all' && i.category !== selectedCategoryFilter) return false;
      if (activeStatusFilter === 'active' && !i.isActive) return false;
      if (activeStatusFilter === 'passive' && i.isActive) return false;
      return true;
    }).sort(compareItems);

    const filteredCategoryGroups = categoryGroups.map(g => {
      let displayActive = g.activeItems;
      let displayPassive = g.passiveItems;
      if (activeStatusFilter === 'active') {
        displayPassive = [];
      } else if (activeStatusFilter === 'passive') {
        displayActive = [];
      }
      return {
        ...g,
        displayActive,
        displayPassive,
        displayItems: [...displayActive, ...displayPassive],
        displayCount: displayActive.length + displayPassive.length
      };
    }).filter(g => {
      if (selectedCategoryFilter !== 'all' && g.categoryMeta.id !== selectedCategoryFilter) return false;
      return g.displayCount > 0;
    });

    return {
      totalValue,
      totalCost,
      netProfitLoss,
      netProfitLossPercent,
      totalRealizedProfitLoss,
      totalSellCount,
      totalCombinedProfitLoss,
      totalCombinedProfitLossPercent,
      totalDailyChange,
      totalDailyChangePercent,
      avgDaysHeld,
      portfolioAnnualized,
      totalActiveCount,
      totalPassiveCount,
      items: itemsWithComputed,
      filteredItems,
      categoryGroups,
      filteredCategoryGroups,
      allocationData,
      buckets: buckets.filter(b => b.items.length > 0)
    };
  }, [portfolio, stocks, funds, selectedCategoryFilter, activeStatusFilter, portfolioSortBy, portfolioSortOrder]);

  // Calculations for Edit Modal preview
  const editPreview = useMemo(() => {
    if (!editingItem) return null;
    const newCostValue = (editQuantity || 0) * (editAverageCost || 0);
    const newCurrentValue = (editQuantity || 0) * (editCurrentPrice || editAverageCost);
    const newProfitLoss = newCurrentValue - newCostValue;
    const newProfitLossPercent = newCostValue > 0 ? (newProfitLoss / newCostValue) * 100 : 0;
    const daysHeld = getDaysDifference(editAddedDate);
    const durationLabel = formatHoldingDuration(editAddedDate);
    const annualized = calculateAnnualizedReturn(newProfitLossPercent, daysHeld);

    return {
      newCostValue,
      newCurrentValue,
      newProfitLoss,
      newProfitLossPercent,
      daysHeld,
      durationLabel,
      annualized
    };
  }, [editingItem, editQuantity, editAverageCost, editCurrentPrice, editAddedDate]);

  return (
    <div className="space-y-6">
      {/* Portfolio Overview & KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Value */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-5 text-white border border-slate-700/50 shadow-md flex flex-col justify-between overflow-hidden">
          <div>
            <span className="text-xs text-slate-400 font-medium block truncate">Toplam Portföy Değeri</span>
            <div 
              className="text-xl sm:text-2xl xl:text-3xl font-bold font-mono mt-1 text-white whitespace-nowrap truncate"
              title={formatCurrency(portfolioSummary.totalValue, 'TL')}
            >
              {formatCurrency(portfolioSummary.totalValue, 'TL')}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono flex items-center justify-between gap-2 border-t border-slate-700/50 pt-2">
            <span className="shrink-0">Toplam Alış Maliyeti:</span>
            <span className="font-semibold text-slate-300 truncate" title={formatCurrency(portfolioSummary.totalCost, 'TL')}>
              {formatCurrency(portfolioSummary.totalCost, 'TL')}
            </span>
          </div>
        </div>

        {/* 2. Open / Unrealized Profit/Loss & Daily Change */}
        <div className={`rounded-2xl p-4 sm:p-5 border shadow-md flex flex-col justify-between overflow-hidden ${
          portfolioSummary.netProfitLoss >= 0 
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-400 font-medium block truncate">Açık Portföy K/Z (Anlık)</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                portfolioSummary.netProfitLoss >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {formatPercent(portfolioSummary.netProfitLossPercent)}
              </span>
            </div>
            <div 
              className="text-xl sm:text-2xl xl:text-3xl font-bold font-mono mt-1 whitespace-nowrap truncate"
              title={`${portfolioSummary.netProfitLoss >= 0 ? '+' : ''}${formatCurrency(portfolioSummary.netProfitLoss, 'TL')}`}
            >
              <span>{portfolioSummary.netProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.netProfitLoss, 'TL')}</span>
            </div>
          </div>
          <div className="text-xs font-bold font-mono mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
            <span className="text-slate-400 font-normal shrink-0">Bugün:</span>
            <span className="text-xs flex items-center gap-1 truncate justify-end">
              <span className={`truncate ${portfolioSummary.totalDailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioSummary.totalDailyChange >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalDailyChange, 'TL')}
              </span>
              <span className="text-[11px] opacity-75 shrink-0">
                ({formatPercent(portfolioSummary.totalDailyChangePercent)})
              </span>
            </span>
          </div>
        </div>

        {/* 3. Realized Profit / Loss from Buy/Sell Transactions */}
        <div className={`rounded-2xl p-4 sm:p-5 border shadow-md flex flex-col justify-between overflow-hidden ${
          portfolioSummary.totalRealizedProfitLoss > 0
            ? 'bg-gradient-to-br from-indigo-950/60 to-emerald-950/60 border-emerald-700/60 text-emerald-300'
            : portfolioSummary.totalRealizedProfitLoss < 0
            ? 'bg-gradient-to-br from-slate-900 to-rose-950/60 border-rose-800/60 text-rose-300'
            : 'bg-slate-900/90 border-slate-700/70 text-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-400 font-medium block truncate">Gerçekleşen Net K/Z</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                Al-Sat Kazancı
              </span>
            </div>
            <div 
              className={`text-xl sm:text-2xl xl:text-3xl font-bold font-mono mt-1 whitespace-nowrap truncate ${
                portfolioSummary.totalRealizedProfitLoss > 0
                  ? 'text-emerald-400'
                  : portfolioSummary.totalRealizedProfitLoss < 0
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
              title={`${portfolioSummary.totalRealizedProfitLoss >= 0 ? '+' : ''}${formatCurrency(portfolioSummary.totalRealizedProfitLoss, 'TL')}`}
            >
              <span>{portfolioSummary.totalRealizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalRealizedProfitLoss, 'TL')}</span>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono flex items-center justify-between gap-2 border-t border-white/10 pt-2">
            <span className="shrink-0">Tamamlanan Satışlar:</span>
            <span className="font-bold text-slate-200 truncate">
              {portfolioSummary.totalSellCount > 0 ? `${portfolioSummary.totalSellCount} Satış İşlemi` : 'Satış Yapılmadı'}
            </span>
          </div>
        </div>

        {/* 4. Total Combined P/L & AI Assistant */}
        <div className="bg-gradient-to-br from-purple-950/80 via-slate-900 to-indigo-950/80 rounded-2xl p-4 sm:p-5 border border-purple-800/60 text-white flex flex-col justify-between shadow-md overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-purple-300 font-medium block truncate">Toplam Birleşik Getiri</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                Açık + Realize
              </span>
            </div>
            <div 
              className={`text-xl sm:text-2xl xl:text-3xl font-bold font-mono mt-1 whitespace-nowrap truncate ${
                portfolioSummary.totalCombinedProfitLoss >= 0 ? 'text-purple-200' : 'text-rose-300'
              }`}
              title={`${portfolioSummary.totalCombinedProfitLoss >= 0 ? '+' : ''}${formatCurrency(portfolioSummary.totalCombinedProfitLoss, 'TL')}`}
            >
              <span>{portfolioSummary.totalCombinedProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalCombinedProfitLoss, 'TL')}</span>
            </div>
          </div>
          <div className="text-xs mt-2 pt-2 border-t border-purple-800/50 flex items-center justify-between gap-2">
            <span className="text-purple-300 text-[11px] truncate">
              {portfolioSummary.items.length} Ürün ({portfolioSummary.categoryGroups.length} Grup)
            </span>
            <button
              onClick={onOpenAIForPortfolio}
              className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
              title="Yapay Zeka Portföy Analizini Başlat"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Analizi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset Allocation Breakdown Banner with Mini Donut & Category Chips */}
      {portfolioSummary.categoryGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Varlık Dağılımı ve Sınıf Ağırlıkları</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Toplam {formatCurrency(portfolioSummary.totalValue, 'TL')}
            </span>
          </div>

          {/* Allocation Progress Bar */}
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
            {portfolioSummary.allocationData.map(item => (
              <div
                key={item.name}
                style={{ width: `${Math.max(item.weight, 2)}%`, backgroundColor: item.color }}
                className="h-full transition-all duration-300 relative group"
                title={`${item.name}: %${item.weight.toFixed(1)} (${formatCurrency(item.value, 'TL')})`}
              />
            ))}
          </div>

          {/* Category Summary Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            {portfolioSummary.categoryGroups.map(group => {
              const meta = group.categoryMeta;
              const isProfit = group.netProfitLoss >= 0;
              const isSelected = selectedCategoryFilter === meta.id;

              return (
                <button
                  key={meta.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : meta.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700' 
                      : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: meta.color }}>
                        {renderCategoryIcon(meta.iconName, 'w-3.5 h-3.5')}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {meta.shortLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      %{group.weight.toFixed(1)}
                    </span>
                  </div>

                  <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                    {formatCompactNumber(group.totalValue, 'TL')}
                  </div>

                  <div className="flex items-center justify-between text-[11px] mt-1 font-mono">
                    <span className="text-slate-400">{group.count} Varlık</span>
                    <span className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isProfit ? '+' : ''}{formatPercent(group.netProfitLossPercent)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('portfolio')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
              activeSubTab === 'portfolio'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Varlıklarım ({portfolioSummary.items.length})
          </button>

          <button
            onClick={() => setActiveSubTab('periodic')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'periodic'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dönemsel K/Z Analizi</span>
          </button>

          <button
            onClick={() => setActiveSubTab('watchlist')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
              activeSubTab === 'watchlist'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            İzleme Listem ({watchlist.length})
          </button>
        </div>

        {/* View mode toggle & Add Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeSubTab === 'portfolio' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const hasAnyOpen = Object.values(expandedItems).some(Boolean);
                  if (hasAnyOpen) {
                    collapseAllItems();
                  } else {
                    expandAllItems();
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/80 shadow-xs transition-colors"
                title="Tüm varlıkların kademeli alış/satış hareketlerini aç veya kapat"
              >
                {Object.values(expandedItems).some(Boolean) ? (
                  <>
                    <MinusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">Hareketleri Kapat</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">Tüm Hareketleri Aç (+)</span>
                  </>
                )}
              </button>

              <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800">
                <button
                  onClick={() => setViewLayout('grouped')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    viewLayout === 'grouped'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Gruplara Göre Ayrılmış Görünüm"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Gruplu</span>
                </button>
                <button
                  onClick={() => setViewLayout('flat')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    viewLayout === 'flat'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Düz Tablo Görünümü"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Düz Liste</span>
                </button>
              </div>
            </>
          )}

          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              title="Portföyü Google E-Tablolar'a Yedekle"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/80 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets'e Yedekle</span>
              <span className="sm:hidden">Yedekle</span>
            </button>
          )}

          <button
            onClick={() => {
              handleSwitchAddCategory('stock');
              setAddedDate(new Date().toISOString().split('T')[0]);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Varlık Ekle</span>
          </button>
        </div>
      </div>

      {/* Category & Status Filter Bar */}
      {activeSubTab === 'portfolio' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs pb-1">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Tüm Kategoriler ({portfolioSummary.items.length})
            </button>

            {PORTFOLIO_CATEGORIES.map(cat => {
              const count = portfolioSummary.items.filter(i => i.category === cat.id).length;
              if (count === 0) return null;
              const isSelected = selectedCategoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                    isSelected
                      ? `${cat.badgeBg} ${cat.badgeText} ${cat.borderColor} ring-1 ring-indigo-500`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span style={{ color: cat.color }}>
                    {renderCategoryIcon(cat.iconName, 'w-3.5 h-3.5')}
                  </span>
                  <span>{cat.shortLabel}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sorting controls */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (portfolioSortBy === 'alphabetical') {
                    setPortfolioSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setPortfolioSortBy('alphabetical');
                    setPortfolioSortOrder('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  portfolioSortBy === 'alphabetical'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Ürünleri alfabetik (A'dan Z'ye) sırala veya ters çevir"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Alfabetik {portfolioSortBy === 'alphabetical' ? (portfolioSortOrder === 'asc' ? '(A→Z)' : '(Z→A)') : ''}</span>
              </button>
              <select
                value={portfolioSortBy}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setPortfolioSortBy(val);
                  setPortfolioSortOrder(val === 'alphabetical' ? 'asc' : 'desc');
                }}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold text-xs px-2 py-0.5 border-none focus:ring-0 cursor-pointer"
                title="Sıralama Kriteri"
              >
                <option value="alphabetical" className="bg-white dark:bg-slate-900">Alfabetik (A-Z)</option>
                <option value="value" className="bg-white dark:bg-slate-900">Piyasa Değeri</option>
                <option value="pnl" className="bg-white dark:bg-slate-900">Kâr / Zarar</option>
                <option value="date" className="bg-white dark:bg-slate-900">Alış Tarihi</option>
              </select>
            </div>

            {/* Active / Passive Status Segment */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setActiveStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tümü ({portfolioSummary.items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Aktif ({portfolioSummary.totalActiveCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('passive')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStatusFilter === 'passive'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Pasif ({portfolioSummary.totalPassiveCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeSubTab === 'portfolio' ? (
        portfolioSummary.items.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <PieIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Portföyünüz Henüz Boş</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              Borsa hisseleri, TEFAS fonları, BES emeklilik fonları, Vadeli Mevduat veya Kripto varlıklarınızı ekleyerek portföyünüzü tek çatı altında izleyin.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Varlığınızı Ekleyin</span>
            </button>
          </div>
        ) : viewLayout === 'grouped' ? (
          /* GROUPED CATEGORY VIEW */
          <div className="space-y-6">
            {portfolioSummary.filteredCategoryGroups.map(group => {
              const meta = group.categoryMeta;
              const isCollapsed = collapsedCategories[meta.id];
              const isProfit = group.netProfitLoss >= 0;

              return (
                <div 
                  key={meta.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  {/* Category Header with Subtotals */}
                  <div 
                    onClick={() => toggleCollapse(meta.id)}
                    className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400 p-1">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className={`p-2 rounded-xl border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                        {renderCategoryIcon(meta.iconName, 'w-4 h-4')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {meta.label}
                          </h4>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {group.activeCount} Aktif{group.passiveCount > 0 ? ` • ${group.passiveCount} Pasif` : ''} • %{group.weight.toFixed(1)} Pay
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{meta.description}</p>
                      </div>
                    </div>

                    {/* Subtotals */}
                    <div className="flex items-center gap-6 self-end md:self-auto font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Aktif Grup Değeri:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {formatCurrency(group.totalValue, 'TL')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Net Kâr / Zarar:</span>
                        <span className={`font-bold text-sm ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isProfit ? '+' : ''}{formatCurrency(group.netProfitLoss, 'TL')} ({formatPercent(group.netProfitLossPercent)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Table & Mobile Cards */}
                  {!isCollapsed && (
                    <>
                      {/* Desktop Table (hidden on mobile) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <th className="py-2.5 px-4">Varlık Kodu & Adı</th>
                            <th className="py-2.5 px-3">Alış / Giriş Tarihi</th>
                            <th className="py-2.5 px-3">Miktar / {meta.unitLabel}</th>
                            <th className="py-2.5 px-3">Alış Maliyeti</th>
                            <th className="py-2.5 px-3">Güncel Fiyat</th>
                            <th className="py-2.5 px-3">Toplam Değer</th>
                            <th className="py-2.5 px-3">Net K / Z</th>
                            <th className="py-2.5 px-3 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {/* 1. AKTİF VARLIKLAR BÖLÜMÜ */}
                          {group.displayActive.length > 0 && (
                            <>
                              <tr className="bg-emerald-50/70 dark:bg-emerald-950/30 border-y border-emerald-200/70 dark:border-emerald-800/60 font-sans">
                                <td colSpan={8} className="py-2 px-4">
                                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      <span>🟢 Aktif Pozisyonlar ({group.displayActive.length})</span>
                                    </div>
                                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                      Toplam: {formatCurrency(group.activeValue, 'TL')}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {group.displayActive.map((item) => {
                                const isItemProfit = item.profitLoss >= 0;
                                const isItemExpanded = !!expandedItems[item.id];
                                const txCount = item.transactions?.length || 1;

                                return (
                                  <React.Fragment key={item.id}>
                                    <tr
                                      onClick={() => item.asset && onSelectAsset(item.asset)}
                                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                                        isItemExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                                      }`}
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex items-start gap-2.5">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleItemExpand(item.id, e)}
                                            className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                                              isItemExpanded
                                                ? 'bg-indigo-600 text-white shadow-xs rotate-0'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:text-indigo-600'
                                            }`}
                                            title={isItemExpanded ? "Alış/Satış hareketlerini gizle" : "Alış/Satış hareketlerini göster (+)"}
                                          >
                                            {isItemExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                          </button>
                                          <span style={{ backgroundColor: meta.color }} className="w-2 h-2 rounded-full shrink-0 mt-2" />
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                                                {item.code}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => toggleItemExpand(item.id, e)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                                                  isItemExpanded
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
                                                }`}
                                                title="Tüm kademeli alış ve satış hareketlerini aç/kapat"
                                              >
                                                <History className="w-2.5 h-2.5" />
                                                <span>{txCount} Hareket</span>
                                              </button>
                                              {item.interestRate && item.category !== 'eurobond' && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 font-bold">
                                                  %{item.interestRate} Faiz
                                                </span>
                                              )}
                                              {item.category === 'eurobond' && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1">
                                                  <span>{item.nominalCurrency === 'EUR' ? '€ EUR' : '$ USD'}</span>
                                                  <span>•</span>
                                                  <span>%{item.couponRateAnnual || item.interestRate || 7.625} Kupon</span>
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.name}</p>
                                            {item.category === 'eurobond' && (
                                              <div className="mt-1">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEurobondItem(item);
                                                  }}
                                                  className="text-[10px] font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 w-fit transition-colors"
                                                  title="Eurobond kupon takvimi, ödeme takibi ve döviz/TL getiri detayları"
                                                >
                                                  <Globe className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                                  <span>Kupon & Kur Takvimi</span>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3 px-3">
                                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block">
                                          {formatDateTurkish(item.addedDate)}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                          {item.holdingLabel}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 text-xs">
                                        {item.category === 'eurobond' ? (
                                          <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                              {item.nominalCurrency === 'EUR' ? '€' : '$'}{(item.nominalAmount || item.quantity).toLocaleString('en-US')}
                                            </div>
                                            <div className="text-[10px] text-teal-600 dark:text-teal-400">
                                              Nominal {item.nominalCurrency || 'USD'}
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                              {item.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                                            </span>
                                            {txCount > 1 && (
                                              <span className="block text-[10px] text-slate-400">
                                                (Toplam Net Lot)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                        <div>
                                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {formatCurrency(item.averageCost, 'TL')}
                                          </span>
                                          {txCount > 1 && (
                                            <span className="block text-[10px] text-indigo-600 dark:text-indigo-400">
                                              Ağırlıklı Ort.
                                            </span>
                                          )}
                                        </div>
                                        {item.category === 'eurobond' && item.priceInCurrency && (
                                          <div className="text-[10px] text-slate-400">
                                            %{item.priceInCurrency} ({item.nominalCurrency === 'EUR' ? '€' : '$'})
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                          {formatCurrency(item.currentPrice, 'TL')}
                                        </div>
                                        {item.category === 'eurobond' && (
                                          <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                            1 {item.nominalCurrency || 'USD'} = {(item.nominalCurrency === 'EUR' ? eurRate : usdRate).toFixed(2)} ₺
                                          </div>
                                        )}
                                        {item.changePercent !== undefined && item.changePercent !== 0 && (
                                          <div className={`text-[10px] font-semibold ${item.changePercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {formatPercent(item.changePercent, true, item.type === 'fund' ? 3 : 2)}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(item.currentValue, 'TL')}
                                        {item.category === 'eurobond' && (
                                          <div className="text-[10px] font-medium text-slate-400 font-sans">
                                            {item.nominalCurrency === 'EUR' ? '€' : '$'}{((item.nominalAmount || item.quantity) * ((item.priceInCurrency || 100) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 font-mono">
                                        <div className={`font-bold text-xs ${isItemProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                          {isItemProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
                                        </div>
                                        <div className={`text-[11px] font-semibold ${isItemProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          {formatPercent(item.profitLossPercent)}
                                        </div>
                                        {item.realizedProfitLoss !== undefined && Math.abs(item.realizedProfitLoss) > 0.01 && (
                                          <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[10px]" title="Bu varlığın alım-satım işlemlerinden realize edilen net kâr/zarar">
                                            <span className="text-slate-400 font-sans">Gerçekleşen:</span>
                                            <span className={`font-bold font-mono ${item.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              {item.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(item.realizedProfitLoss, 'TL')}
                                            </span>
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleItemExpand(item.id, e)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                              isItemExpanded
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                                            }`}
                                            title={isItemExpanded ? "Hareketleri Kapat" : "Alış/Satış Hareketlerini Listele (+)"}
                                          >
                                            {isItemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                                          </button>
                                          {item.category === 'eurobond' && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEurobondItem(item);
                                              }}
                                              className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors rounded-lg"
                                              title="Eurobond Kupon Takvimi ve Döviz Detayları"
                                            >
                                              <Globe className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <button
                                            onClick={(e) => handleOpenEdit(item, e)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            title="Düzenle"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemovePortfolioItem(item.id);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                            title="Sil"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Expanded Movements SubTable Row */}
                                    {isItemExpanded && (
                                      <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-indigo-100 dark:border-indigo-950">
                                        <td colSpan={8} className="p-0">
                                          <PortfolioTransactionSubTable
                                            item={item}
                                            onUpdateItem={(updated) => onUpdatePortfolioItem(updated)}
                                            onOpenFullModal={() => setSelectedTransactionItem(item)}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </>
                          )}

                          {/* 2. PASİF / KAPATILMIŞ VARLIKLAR BÖLÜMÜ */}
                          {group.displayPassive.length > 0 && (
                            <>
                              <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 font-sans">
                                <td colSpan={8} className="py-2 px-4">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                      <span>⚪ Pasif / Kapatılmış Pozisyonlar ({group.displayPassive.length})</span>
                                      <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">(Arşivlenen / Kapatılan İşlemler)</span>
                                    </div>
                                    {group.passiveRealizedProfitLoss !== 0 && (
                                      <span className={`font-mono text-[11px] font-bold ${group.passiveRealizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        Realize K/Z: {group.passiveRealizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(group.passiveRealizedProfitLoss, 'TL')}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {group.displayPassive.map((item) => {
                                const isItemProfit = item.profitLoss >= 0;
                                const isItemExpanded = !!expandedItems[item.id];
                                const txCount = item.transactions?.length || 1;

                                return (
                                  <React.Fragment key={item.id}>
                                    <tr
                                      onClick={() => item.asset && onSelectAsset(item.asset)}
                                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors opacity-75 hover:opacity-100 ${
                                        isItemExpanded ? 'bg-slate-100/50 dark:bg-slate-800/40' : ''
                                      }`}
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex items-start gap-2.5">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleItemExpand(item.id, e)}
                                            className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                                              isItemExpanded
                                                ? 'bg-slate-700 text-white shadow-xs rotate-0'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                            }`}
                                            title={isItemExpanded ? "Alış/Satış hareketlerini gizle" : "Alış/Satış hareketlerini göster (+)"}
                                          >
                                            {isItemExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                          </button>
                                          <span className="w-2 h-2 rounded-full shrink-0 mt-2 bg-slate-400" />
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-sm">
                                                {item.code}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                                                Pasif
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => toggleItemExpand(item.id, e)}
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                                title="Tüm kademeli alış ve satış hareketlerini aç/kapat"
                                              >
                                                <History className="w-2.5 h-2.5" />
                                                <span>{txCount} Hareket</span>
                                              </button>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.name}</p>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3 px-3">
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 block">
                                          {formatDateTurkish(item.addedDate)}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                          {item.holdingLabel}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400 text-xs">
                                        <div>
                                          <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {item.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                                          </span>
                                          <span className="block text-[10px] text-slate-400">
                                            (Kapalı)
                                          </span>
                                        </div>
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                        <div>
                                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(item.averageCost, 'TL')}
                                          </span>
                                        </div>
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                                          {formatCurrency(item.currentPrice, 'TL')}
                                        </div>
                                      </td>

                                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                                        {formatCurrency(item.currentValue, 'TL')}
                                      </td>

                                      <td className="py-3 px-3 font-mono">
                                        {item.realizedProfitLoss !== undefined && Math.abs(item.realizedProfitLoss) > 0.01 ? (
                                          <div>
                                            <div className={`font-bold text-xs ${item.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              {item.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(item.realizedProfitLoss, 'TL')}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-sans block">Realize K/Z</span>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className={`font-bold text-xs ${isItemProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              {isItemProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
                                            </div>
                                            <div className={`text-[11px] font-semibold ${isItemProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {formatPercent(item.profitLossPercent)}
                                            </div>
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleItemExpand(item.id, e)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                              isItemExpanded
                                                ? 'bg-slate-700 text-white'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                            title={isItemExpanded ? "Hareketleri Kapat" : "Alış/Satış Hareketlerini Listele (+)"}
                                          >
                                            {isItemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            onClick={(e) => handleOpenEdit(item, e)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            title="Düzenle"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemovePortfolioItem(item.id);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                            title="Sil"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Expanded Movements SubTable Row */}
                                    {isItemExpanded && (
                                      <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                                        <td colSpan={8} className="p-0">
                                          <PortfolioTransactionSubTable
                                            item={item}
                                            onUpdateItem={(updated) => onUpdatePortfolioItem(updated)}
                                            onOpenFullModal={() => setSelectedTransactionItem(item)}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </>
                          )}
                        </tbody>
                      </table>
                      </div>

                      {/* Mobile Cards (shown on mobile, hidden on md+) */}
                      <div className="md:hidden space-y-3 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                        {/* 1. Aktif Varlıklar */}
                        {group.displayActive.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>Aktif Pozisyonlar ({group.displayActive.length})</span>
                              </div>
                              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                {formatCurrency(group.activeValue, 'TL')}
                              </span>
                            </div>

                            {group.displayActive.map((item) => (
                              <PortfolioMobileItemCard
                                key={item.id}
                                item={item}
                                meta={meta}
                                isItemExpanded={!!expandedItems[item.id]}
                                onToggleExpand={(e) => toggleItemExpand(item.id, e)}
                                onSelectAsset={onSelectAsset}
                                onOpenEdit={handleOpenEdit}
                                onRemoveItem={onRemovePortfolioItem}
                                onOpenSetAlert={onOpenSetAlert}
                                onOpenEurobondModal={setSelectedEurobondItem}
                                onUpdateItem={onUpdatePortfolioItem}
                                onOpenFullTransactionModal={setSelectedTransactionItem}
                                eurRate={eurRate}
                                usdRate={usdRate}
                              />
                            ))}
                          </div>
                        )}

                        {/* 2. Pasif Varlıklar */}
                        {group.displayPassive.length > 0 && (
                          <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <span>Kapatılan / Pasif Pozisyonlar ({group.displayPassive.length})</span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-500 font-semibold">
                                Realize: {formatCurrency(group.passiveRealized, 'TL')}
                              </span>
                            </div>

                            {group.displayPassive.map((item) => (
                              <PortfolioMobileItemCard
                                key={item.id}
                                item={item}
                                meta={meta}
                                isItemExpanded={!!expandedItems[item.id]}
                                onToggleExpand={(e) => toggleItemExpand(item.id, e)}
                                onSelectAsset={onSelectAsset}
                                onOpenEdit={handleOpenEdit}
                                onRemoveItem={onRemovePortfolioItem}
                                onOpenSetAlert={onOpenSetAlert}
                                onOpenEurobondModal={setSelectedEurobondItem}
                                onUpdateItem={onUpdatePortfolioItem}
                                onOpenFullTransactionModal={setSelectedTransactionItem}
                                eurRate={eurRate}
                                usdRate={usdRate}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* FLAT TABLE & MOBILE CARDS VIEW */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Varlık & Kategori</th>
                    <th className="py-3 px-3">Giriş / Alış Tarihi</th>
                    <th className="py-3 px-3">Adet / Miktar</th>
                    <th className="py-3 px-3">Alış Maliyeti</th>
                    <th className="py-3 px-3">Güncel Fiyat</th>
                    <th className="py-3 px-3">Toplam Değer</th>
                    <th className="py-3 px-3">Net K / Z</th>
                    <th className="py-3 px-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {portfolioSummary.filteredItems.map((item) => {
                    const isProfit = item.profitLoss >= 0;
                    const meta = item.categoryMeta;
                    const isItemExpanded = !!expandedItems[item.id];
                    const txCount = item.transactions?.length || 1;
                    const isPassive = item.status === 'passive' || item.isPassive || item.quantity <= 0.00001;

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => item.asset && onSelectAsset(item.asset)}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isPassive ? 'opacity-80' : ''
                          } ${
                            isItemExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => toggleItemExpand(item.id, e)}
                                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                                  isItemExpanded
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:text-indigo-600'
                                }`}
                                title={isItemExpanded ? "Alış/Satış hareketlerini gizle" : "Alış/Satış hareketlerini göster (+)"}
                              >
                                {isItemExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              </button>
                              <span style={{ backgroundColor: meta.color }} className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                                    {item.code}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                                    {meta.shortLabel}
                                  </span>
                                  {isPassive && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                                      Pasif
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleItemExpand(item.id, e)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                                      isItemExpanded
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
                                    }`}
                                    title="Tüm kademeli alış ve satış hareketlerini aç/kapat"
                                  >
                                    <History className="w-2.5 h-2.5" />
                                    <span>{txCount} Hareket</span>
                                  </button>
                                  {item.category === 'eurobond' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                                      {item.nominalCurrency === 'EUR' ? '€ EUR' : '$ USD'} • %{item.couponRateAnnual || item.interestRate || 7.625}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate max-w-[170px]">{item.name}</p>
                                {item.category === 'eurobond' && (
                                  <div className="mt-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEurobondItem(item);
                                      }}
                                      className="text-[10px] font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 w-fit transition-colors"
                                      title="Eurobond kupon takvimi, ödeme takibi ve döviz/TL getiri detayları"
                                    >
                                      <Globe className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                      <span>Kupon & Kur</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{formatDateTurkish(item.addedDate)}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                              {item.holdingLabel} ({item.daysHeld}g)
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 text-xs">
                            {item.category === 'eurobond' ? (
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {item.nominalCurrency === 'EUR' ? '€' : '$'}{(item.nominalAmount || item.quantity).toLocaleString('en-US')}
                                </div>
                                <div className="text-[10px] text-teal-600 dark:text-teal-400">
                                  Nominal {item.nominalCurrency || 'USD'}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}
                                </span>
                                {txCount > 1 && (
                                  <span className="block text-[10px] text-slate-400">
                                    (Toplam Net Lot)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(item.averageCost, 'TL')}
                              </span>
                              {txCount > 1 && (
                                <span className="block text-[10px] text-indigo-600 dark:text-indigo-400">
                                  Ağırlıklı Ort.
                                </span>
                              )}
                            </div>
                            {item.category === 'eurobond' && item.priceInCurrency && (
                              <div className="text-[10px] text-slate-400">
                                %{item.priceInCurrency} ({item.nominalCurrency === 'EUR' ? '€' : '$'})
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-xs">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(item.currentPrice, 'TL')}
                            </div>
                            {item.category === 'eurobond' && (
                              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                1 {item.nominalCurrency || 'USD'} = {(item.nominalCurrency === 'EUR' ? eurRate : usdRate).toFixed(2)} ₺
                              </div>
                            )}
                            {item.changePercent !== undefined && item.changePercent !== 0 && (
                              <div className={`text-[10px] font-semibold ${item.changePercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatPercent(item.changePercent, true, item.type === 'fund' ? 3 : 2)}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(item.currentValue, 'TL')}
                            {item.category === 'eurobond' && (
                              <div className="text-[10px] font-medium text-slate-400 font-sans">
                                {item.nominalCurrency === 'EUR' ? '€' : '$'}{((item.nominalAmount || item.quantity) * ((item.priceInCurrency || 100) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono">
                            <div className={`font-bold text-sm ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
                            </div>
                            <div className={`text-xs font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatPercent(item.profitLossPercent)}
                            </div>
                            {item.realizedProfitLoss !== undefined && Math.abs(item.realizedProfitLoss) > 0.01 && (
                              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[10px]" title="Bu varlığın alım-satım işlemlerinden realize edilen net kâr/zarar">
                                <span className="text-slate-400 font-sans">Gerçekleşen:</span>
                                <span className={`font-bold font-mono ${item.realizedProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {item.realizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(item.realizedProfitLoss, 'TL')}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => toggleItemExpand(item.id, e)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isItemExpanded
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                                }`}
                                title={isItemExpanded ? "Hareketleri Kapat" : "Alış/Satış Hareketlerini Listele (+)"}
                              >
                                {isItemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                              </button>
                              {onOpenSetAlert && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenSetAlert(item);
                                  }}
                                  className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors rounded-lg"
                                  title="Bu Varlık İçin Fiyat Alarmı Kur"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {item.category === 'eurobond' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEurobondItem(item);
                                  }}
                                  className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors rounded-lg"
                                  title="Eurobond Kupon Takvimi ve Döviz Detayları"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleOpenEdit(item, e)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                title="Düzenle"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemovePortfolioItem(item.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Movements SubTable Row */}
                        {isItemExpanded && (
                          <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-indigo-100 dark:border-indigo-950">
                            <td colSpan={8} className="p-0">
                              <PortfolioTransactionSubTable
                                item={item}
                                onUpdateItem={(updated) => onUpdatePortfolioItem(updated)}
                                onOpenFullModal={() => setSelectedTransactionItem(item)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (shown on mobile, hidden on md+) */}
            <div className="md:hidden space-y-3 p-3">
              {portfolioSummary.filteredItems.map((item) => (
                <PortfolioMobileItemCard
                  key={item.id}
                  item={item}
                  meta={item.categoryMeta}
                  isItemExpanded={!!expandedItems[item.id]}
                  onToggleExpand={(e) => toggleItemExpand(item.id, e)}
                  onSelectAsset={onSelectAsset}
                  onOpenEdit={handleOpenEdit}
                  onRemoveItem={onRemovePortfolioItem}
                  onOpenSetAlert={onOpenSetAlert}
                  onOpenEurobondModal={setSelectedEurobondItem}
                  onUpdateItem={onUpdatePortfolioItem}
                  onOpenFullTransactionModal={setSelectedTransactionItem}
                  eurRate={eurRate}
                  usdRate={usdRate}
                />
              ))}
            </div>
          </div>
        )
      ) : activeSubTab === 'periodic' ? (
        /* PERIODIC P/L ANALYSIS TAB */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-900/50 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Varlık Sınıfları & Zaman Analizi
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Kategori ve Dönem Bazlı Getiri Matrisi
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                  BES fonları, hisseler, mevduat ve kripto yatırımlarınızın tutulma sürelerine göre yıllıklandırılmış bileşik (CAGR) getiri performanslarını inceleyin.
                </p>
              </div>
            </div>
          </div>

          {/* Time Bucket Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioSummary.buckets.map(b => {
              const bucketCost = b.items.reduce((acc, i) => acc + i.costValue, 0);
              const bucketValue = b.items.reduce((acc, i) => acc + i.currentValue, 0);
              const bucketPnl = bucketValue - bucketCost;
              const bucketPnlPercent = bucketCost > 0 ? (bucketPnl / bucketCost) * 100 : 0;
              const isProfit = bucketPnl >= 0;

              return (
                <div key={b.key} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{b.label} Pozisyonları</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.items.length} Varlık
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium">Toplam Değer / Kâr-Zarar:</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(bucketValue, 'TL')}
                      </span>
                      <span className={`text-sm font-bold font-mono ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isProfit ? '+' : ''}{formatPercent(bucketPnlPercent)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {b.items.map(i => (
                      <span
                        key={i.id}
                        onClick={() => handleOpenEdit(i)}
                        className="cursor-pointer text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Düzenlemek için tıkla"
                      >
                        {i.code} ({i.daysHeld}g • {formatPercent(i.profitLossPercent)})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Periodic Table & Mobile Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tüm Varlıklar Dönemsel Performans ve Yıllık Getiri Hızı</h3>
              <span className="text-xs font-mono font-semibold text-slate-500">{portfolioSummary.items.length} Varlık</span>
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Varlık & Kategori</th>
                    <th className="py-3 px-3">Giriş Tarihi</th>
                    <th className="py-3 px-3">Geçen Süre</th>
                    <th className="py-3 px-3">Alış Maliyeti</th>
                    <th className="py-3 px-3">Güncel Fiyat</th>
                    <th className="py-3 px-3">Toplam K/Z</th>
                    <th className="py-3 px-3">Net Getiri %</th>
                    <th className="py-3 px-3">Yıllıklandırılmış (CAGR)</th>
                    <th className="py-3 px-3 text-right">Düzenle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {portfolioSummary.items.map((item) => {
                    const isProfit = item.profitLoss >= 0;
                    const meta = item.categoryMeta;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span style={{ backgroundColor: meta.color }} className="w-2 h-2 rounded-full shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white font-mono">{item.code}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                              {meta.shortLabel}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {formatDateTurkish(item.addedDate)}
                        </td>

                        <td className="py-3 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {item.holdingLabel} ({item.daysHeld}g)
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.averageCost, 'TL')}
                        </td>

                        <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(item.currentPrice, 'TL')}
                        </td>

                        <td className="py-3 px-3 font-mono text-xs font-bold">
                          <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-xs font-bold">
                          <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {formatPercent(item.profitLossPercent)}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-xs font-bold">
                          {item.annualizedReturn !== null ? (
                            <span className={item.annualizedReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {formatPercent(item.annualizedReturn)} / yıl
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">&lt; 7 gün</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Düzenle</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (shown on mobile, hidden on md+) */}
            <div className="md:hidden space-y-3 p-3">
              {portfolioSummary.items.map((item) => {
                const isProfit = item.profitLoss >= 0;
                const meta = item.categoryMeta;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ backgroundColor: meta.color }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-base">{item.code}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.borderColor}`}>
                          {meta.shortLabel}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Düzenle</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                        <span className="text-[10px] font-sans text-slate-400 block">Giriş / Süre</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatDateTurkish(item.addedDate)}
                        </span>
                        <span className="text-slate-500 block text-[10px]">
                          {item.holdingLabel} ({item.daysHeld} gün)
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                        <span className="text-[10px] font-sans text-slate-400 block">Maliyet / Fiyat</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.averageCost, 'TL')}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">
                          {formatCurrency(item.currentPrice, 'TL')}
                        </span>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl flex items-center justify-between ${
                      isProfit
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40'
                    }`}>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block">Toplam Kâr / Zarar</span>
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className={`font-bold text-sm ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {isProfit ? '+' : ''}{formatCurrency(item.profitLoss, 'TL')}
                          </span>
                          <span className={`text-xs font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ({formatPercent(item.profitLossPercent)})
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-500 block">Yıllık Getiri (CAGR)</span>
                        <span className={`text-xs font-mono font-bold ${
                          (item.annualizedReturn || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.annualizedReturn !== null ? `${formatPercent(item.annualizedReturn)} / yıl` : '< 7 gün'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* WATCHLIST TAB */
        watchlist.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Star className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">İzleme Listeniz Boş</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Hisse ve fon listesindeki yıldız (⭐) butonuna tıklayarak favori varlıklarınızı buraya ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          /* WATCHLIST CARDS (Responsive Grid) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {watchlist.map((item) => {
              const liveAsset = item.type === 'stock'
                ? stocks.find(s => s.code.toUpperCase() === item.code.toUpperCase())
                : funds.find(f => f.code.toUpperCase() === item.code.toUpperCase());

              if (!liveAsset) return null;
              const isPositive = liveAsset.changePercent >= 0;
              const isStock = item.type === 'stock';

              return (
                <div
                  key={item.code}
                  onClick={() => onSelectAsset(liveAsset)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-2xs group space-y-3"
                >
                  {/* Top Bar: Code + Name + Star Remove */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900 dark:text-white font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.code}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isStock 
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}>
                          {isStock ? 'Hisse' : 'TEFAS Fon'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{liveAsset.name}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(liveAsset);
                      }}
                      className="text-amber-500 hover:text-amber-600 p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                      title="İzleme Listesinden Kaldır"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>

                  {/* Price & Daily Change Display */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Güncel Fiyat</span>
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(liveAsset.price, 'TL')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Günlük Değişim</span>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md inline-block ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                      }`}>
                        {isPositive ? '+' : ''}{formatPercent(liveAsset.changePercent)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons on Watchlist Card */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                    {onOpenSetAlert ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const mockHoldingItem: PortfolioItem = {
                            id: `watch_${item.code}`,
                            code: item.code,
                            name: liveAsset.name,
                            type: item.type,
                            category: isStock ? 'stock' : 'fund',
                            quantity: 1,
                            averageCost: liveAsset.price,
                            currentPrice: liveAsset.price,
                            addedDate: new Date().toISOString()
                          };
                          onOpenSetAlert(mockHoldingItem);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Alarm Kur"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Alarm Kur</span>
                      </button>
                    ) : <div></div>}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenAddModalWithAsset(liveAsset, e)}
                        className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Bu varlığı portföyüme ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Portföye Ekle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectAsset(liveAsset)}
                        className="px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Detay ve Grafik"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Detay</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MULTI-CATEGORY ADD HOLDING MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Portföye Yeni Varlık Ekle</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hisse, TEFAS, BES, Kripto, Mevduat veya Altın/Döviz</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              {/* Category Selector Tabs */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-2">
                  1. Varlık Kategorisi Seçin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PORTFOLIO_CATEGORIES.filter(c => c.id !== 'other').map(cat => {
                    const isSelected = addCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSwitchAddCategory(cat.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-transparent shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: isSelected ? '#fff' : cat.color }}>
                            {renderCategoryIcon(cat.iconName, 'w-4 h-4')}
                          </span>
                          <span className="text-xs font-bold truncate">{cat.shortLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Entry Method Selector */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                  2. Giriş Yöntemi & Varlık Bilgileri
                </label>
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAddEntryMode('preset')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      addEntryMode === 'preset'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Hazır Listeden Seç</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddEntryMode('custom')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      addEntryMode === 'custom'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Yeni / Serbest Ürün Gir</span>
                  </button>
                </div>

                {addEntryMode === 'preset' ? (
                  <div className="space-y-3">
                    {addCategory === 'stock' ? (
                      <select
                        value={selectedPresetCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedPresetCode(code);
                          const s = stocks.find(st => st.code === code);
                          if (s) {
                            setCustomCode(s.code);
                            setCustomName(s.name);
                            setAverageCost(s.price);
                            setCurrentPriceInput(s.price);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium"
                      >
                        {[...stocks].sort((a, b) => a.code.localeCompare(b.code, 'tr', { sensitivity: 'base' })).map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code} - {s.name} ({s.price.toFixed(2)} TL)
                          </option>
                        ))}
                      </select>
                    ) : addCategory === 'fund' ? (
                      <select
                        value={selectedPresetCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedPresetCode(code);
                          const f = funds.find(fn => fn.code === code);
                          if (f) {
                            setCustomCode(f.code);
                            setCustomName(f.name);
                            setAverageCost(f.price);
                            setCurrentPriceInput(f.price);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium"
                      >
                        {[...funds].sort((a, b) => a.code.localeCompare(b.code, 'tr', { sensitivity: 'base' })).map((f) => (
                          <option key={f.code} value={f.code}>
                            {f.code} - {f.name} ({f.price.toFixed(4)} TL)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={selectedPresetCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedPresetCode(code);
                          const p = PRESET_CUSTOM_ASSETS.find(pr => pr.code === code);
                          if (p) {
                            setCustomCode(p.code);
                            setCustomName(p.name);
                            setAverageCost(p.defaultCost || p.defaultPrice);
                            setCurrentPriceInput(p.defaultPrice);
                            if (p.interestRate) setInterestRate(p.interestRate);
                          } else {
                            setAddEntryMode('custom');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium"
                      >
                        {PRESET_CUSTOM_ASSETS.filter(p => p.category === addCategory)
                          .sort((a, b) => a.code.localeCompare(b.code, 'tr', { sensitivity: 'base' }))
                          .map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} - {p.name} ({p.defaultPrice > 100 ? formatCurrency(p.defaultPrice, 'TL') : p.defaultPrice})
                          </option>
                        ))}
                        <option value="CUSTOM">+ Farklı / Yeni Ürün Kodu Gir...</option>
                      </select>
                    )}

                    {/* Editable Name & Code preview inputs below dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <div>
                        <label className="text-[11px] text-slate-500 font-semibold block mb-1">Varlık Kodu</label>
                        <input
                          type="text"
                          value={customCode || selectedPresetCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          required
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-slate-500 font-semibold block mb-1">Ürün / Şirket Adı</label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Ürün veya şirket adı..."
                          required
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Custom Free-form Code and Name Entry */
                  <div className="space-y-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block mb-1">
                          Varlık Kodu *
                        </label>
                        <input
                          type="text"
                          placeholder="örn: CLEBI, NRC, BTC"
                          value={customCode}
                          onChange={(e) => handleCustomCodeChange(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block mb-1">
                          Ürün / Şirket Adı *
                        </label>
                        <input
                          type="text"
                          placeholder="örn: Çelebi Hava Servisi A.Ş., Tacirler Fonu"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Borsa İstanbul'daki veya TEFAS'taki dilediğiniz hisse, fon veya özel varlık kodunu ve ürün adını serbestçe girebilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              {/* Deposit-specific extra fields (Faiz oranı & Vade tarihi) */}
              {addCategory === 'deposit' && (
                <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-cyan-800 dark:text-cyan-300 font-bold">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Vadeli Mevduat Parametreleri</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">Yıllık Brüt Faiz %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        required
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">Vade Sonu Tarihi (Opsiyonel)</label>
                      <input
                        type="date"
                        value={maturityDate}
                        onChange={(e) => setMaturityDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Eurobond-specific extra fields (Döviz cinsi, Fiyat %, Alış Kuru, Kupon Faizi & Ödeme Sıklığı) */}
              {addCategory === 'eurobond' && (
                <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-300 font-bold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Eurobond Parametreleri & Otomatik TL Dönüşümü</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      Canlı Kur: 1 {addNominalCurrency} = {(addNominalCurrency === 'EUR' ? eurRate : usdRate).toFixed(2)} ₺
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Nominal Para Birimi
                      </label>
                      <select
                        value={addNominalCurrency}
                        onChange={(e) => {
                          const curr = e.target.value as 'USD' | 'EUR';
                          setAddNominalCurrency(curr);
                          const fx = curr === 'EUR' ? eurRate : usdRate;
                          setAddBuyExchangeRate(fx);
                          setAverageCost(Number(((addPriceInCurrency / 100) * fx).toFixed(4)));
                          setCurrentPriceInput(Number(((addPriceInCurrency / 100) * fx).toFixed(4)));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="USD">$ USD (Amerikan Doları)</option>
                        <option value="EUR">€ EUR (Euro)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Fiyat (% Kirli/Temiz)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={addPriceInCurrency}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setAddPriceInCurrency(val);
                            const fx = addBuyExchangeRate || (addNominalCurrency === 'EUR' ? eurRate : usdRate);
                            setAverageCost(Number(((val / 100) * fx).toFixed(4)));
                            setCurrentPriceInput(Number(((val / 100) * (addNominalCurrency === 'EUR' ? eurRate : usdRate)).toFixed(4)));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Alış Tarihindeki Kur (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={addBuyExchangeRate}
                        onChange={(e) => {
                          const fx = Number(e.target.value);
                          setAddBuyExchangeRate(fx);
                          setAverageCost(Number(((addPriceInCurrency / 100) * fx).toFixed(4)));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-teal-100 dark:border-teal-900/60">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Yıllık Kupon Faizi %
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          value={addCouponRateAnnual}
                          onChange={(e) => setAddCouponRateAnnual(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Kupon Ödeme Sıklığı
                      </label>
                      <select
                        value={addCouponFrequency}
                        onChange={(e) => setAddCouponFrequency(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs text-slate-900 dark:text-white"
                      >
                        <option value={2}>Yılda 2 Kez (6 Aylık)</option>
                        <option value={1}>Yılda 1 Kez (Yıllık)</option>
                        <option value={4}>Yılda 4 Kez (3 Aylık)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        İtfa / Vade Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={maturityDate}
                        onChange={(e) => setMaturityDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Summary badge */}
                  <div className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-900/40 p-2 rounded-lg flex items-center justify-between">
                    <span>
                      Dönemsel Kupon: <strong>{addNominalCurrency === 'EUR' ? '€' : '$'}{((quantity * (addCouponRateAnnual / 100)) / addCouponFrequency).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ({addCouponFrequency === 2 ? '6 ayda bir' : addCouponFrequency === 4 ? '3 ayda bir' : 'yılda bir'})
                    </span>
                    <span>
                      ≈ {formatCurrency(((quantity * (addCouponRateAnnual / 100)) / addCouponFrequency) * (addNominalCurrency === 'EUR' ? eurRate : usdRate), 'TL')}
                    </span>
                  </div>
                </div>
              )}

              {/* Dates & Quantities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Giriş / Alış Tarihi */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Giriş / Alış Tarihi</span>
                  </label>
                  <input
                    type="date"
                    value={addedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAddedDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Miktar / {getCategoryMeta(addCategory).unitLabel}
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Price & Cost Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Birim Alış Maliyeti (TL)
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={averageCost}
                    onChange={(e) => setAverageCost(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Güncel Piyasa / Birim Fiyatı (TL)
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={currentPriceInput}
                    onChange={(e) => setCurrentPriceInput(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                  Pozisyon Notu (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="örn: Bireysel Emeklilik, Vadeli mevduat, Soğuk cüzdan vb."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Portföye Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-CATEGORY EDIT HOLDING MODAL */}
      {editingItem && editPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold border ${getCategoryMeta(editCategory).badgeBg} ${getCategoryMeta(editCategory).badgeText} ${getCategoryMeta(editCategory).borderColor}`}>
                    {getCategoryMeta(editCategory).label}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingItem.code} Pozisyonunu Düzenle</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{editingItem.name}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                  Varlık Kategorisi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PORTFOLIO_CATEGORIES.filter(c => c.id !== 'other').map(cat => {
                    const isSelected = editCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditCategory(cat.id)}
                        className={`p-2 rounded-xl text-left border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-transparent'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span style={{ color: isSelected ? '#fff' : cat.color }}>
                          {renderCategoryIcon(cat.iconName, 'w-3.5 h-3.5')}
                        </span>
                        <span className="text-xs font-bold truncate">{cat.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Asset Code & Product Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Varlık Kodu *</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Ürün / Şirket Adı *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Deposit settings if mevduat */}
              {editCategory === 'deposit' && (
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">Yıllık Brüt Faiz %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editInterestRate || 48.5}
                      onChange={(e) => setEditInterestRate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">Vade Sonu Tarihi</label>
                    <input
                      type="date"
                      value={editMaturityDate}
                      onChange={(e) => setEditMaturityDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Eurobond settings if eurobond */}
              {editCategory === 'eurobond' && (
                <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-300 font-bold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Eurobond Parametreleri & Canlı Kur</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      Canlı Kur: 1 {editNominalCurrency} = {(editNominalCurrency === 'EUR' ? eurRate : usdRate).toFixed(2)} ₺
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Nominal Para Birimi
                      </label>
                      <select
                        value={editNominalCurrency}
                        onChange={(e) => {
                          const curr = e.target.value as 'USD' | 'EUR';
                          setEditNominalCurrency(curr);
                          const fx = curr === 'EUR' ? eurRate : usdRate;
                          setEditAverageCost(Number(((editPriceInCurrency / 100) * editBuyExchangeRate).toFixed(4)));
                          setEditCurrentPrice(Number(((editPriceInCurrency / 100) * fx).toFixed(4)));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="USD">$ USD (Amerikan Doları)</option>
                        <option value="EUR">€ EUR (Euro)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Fiyat (% Temiz/Kirli)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceInCurrency}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditPriceInCurrency(val);
                            const currentFx = editNominalCurrency === 'EUR' ? eurRate : usdRate;
                            setEditAverageCost(Number(((val / 100) * editBuyExchangeRate).toFixed(4)));
                            setEditCurrentPrice(Number(((val / 100) * currentFx).toFixed(4)));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Alış Kuru (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editBuyExchangeRate}
                        onChange={(e) => {
                          const fx = Number(e.target.value);
                          setEditBuyExchangeRate(fx);
                          setEditAverageCost(Number(((editPriceInCurrency / 100) * fx).toFixed(4)));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-teal-100 dark:border-teal-900/60">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Yıllık Kupon Faizi %
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          value={editCouponRateAnnual}
                          onChange={(e) => setEditCouponRateAnnual(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-white pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        Kupon Ödeme Sıklığı
                      </label>
                      <select
                        value={editCouponFrequency}
                        onChange={(e) => setEditCouponFrequency(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs text-slate-900 dark:text-white"
                      >
                        <option value={2}>Yılda 2 Kez (6 Aylık)</option>
                        <option value={1}>Yılda 1 Kez (Yıllık)</option>
                        <option value={4}>Yılda 4 Kez (3 Aylık)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                        İtfa / Vade Sonu Tarihi
                      </label>
                      <input
                        type="date"
                        value={editMaturityDate}
                        onChange={(e) => setEditMaturityDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const item = editingItem;
                        setEditingItem(null);
                        setSelectedEurobondItem(item);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Kupon Takvimi & Ödeme Yönetimini Aç</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dates & Quantities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Giriş / Alış Tarihi */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Giriş / Alış Tarihi</span>
                  </label>
                  <input
                    type="date"
                    value={editAddedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditAddedDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                  />
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block mt-1">
                    Tutma süresi: {editPreview.durationLabel} ({editPreview.daysHeld} gün)
                  </span>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Miktar / {getCategoryMeta(editCategory).unitLabel}
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Price & Cost Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Birim Alış Maliyeti (TL)
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={editAverageCost}
                    onChange={(e) => setEditAverageCost(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                    Güncel Piyasa / Birim Fiyatı (TL)
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={editCurrentPrice}
                    onChange={(e) => setEditCurrentPrice(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block mb-1.5">
                  Pozisyon Notu (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Live Recalculated Preview Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Hesaplanan Yeni K/Z & Getiri Önizlemesi
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block font-sans">Toplam Maliyet:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(editPreview.newCostValue, 'TL')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">Güncel Değer:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(editPreview.newCurrentValue, 'TL')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">Net Kâr / Zarar:</span>
                    <span className={`font-bold ${editPreview.newProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {editPreview.newProfitLoss >= 0 ? '+' : ''}{formatCurrency(editPreview.newProfitLoss, 'TL')} ({formatPercent(editPreview.newProfitLossPercent)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">Yıllıklandırılmış Getiri:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {editPreview.annualized !== null ? formatPercent(editPreview.annualized) + ' / yıl' : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Jump to Transaction History from Edit Modal */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const current = editingItem;
                    setEditingItem(null);
                    setSelectedTransactionItem(current);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800"
                >
                  <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Kademeli Al-Sat & Lot Geçmişi Yöneticisini Aç ({editingItem.transactions?.length || 1} İşlem)</span>
                </button>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY & LOT MANAGEMENT MODAL */}
      {selectedTransactionItem && (
        <TransactionHistoryModal
          item={selectedTransactionItem}
          stocks={stocks}
          funds={funds}
          onClose={() => setSelectedTransactionItem(null)}
          onSaveTransactions={(updatedItem) => {
            onUpdatePortfolioItem(updatedItem);
            setSelectedTransactionItem(null);
          }}
        />
      )}

      {/* EUROBOND COUPON & FX MANAGEMENT MODAL */}
      {selectedEurobondItem && (
        <EurobondCouponModal
          item={selectedEurobondItem}
          usdRate={usdRate}
          eurRate={eurRate}
          onClose={() => setSelectedEurobondItem(null)}
          onSave={(updatedItem) => {
            onUpdatePortfolioItem(updatedItem);
            setSelectedEurobondItem(null);
          }}
        />
      )}
    </div>
  );
};
