import { PortfolioTransaction, TransactionType } from '../types';

export interface CalculationResult {
  currentQuantity: number;
  averageCost: number;
  totalCost: number;
  totalInvested: number; // Total money put in through buys
  totalRealizedProfitLoss: number; // Total realized PnL from all sells
  totalBuyCount: number;
  totalSellCount: number;
  firstBuyDate?: string;
  lastTransactionDate?: string;
  enrichedTransactions: PortfolioTransaction[];
}

/**
 * Calculates running average cost, remaining balance, and realized PnL
 * using standard Weighted Average Cost (WAC / Ağırlıklı Ortalama Maliyet) method.
 */
export function calculateWeightedTransactions(
  rawTransactions: PortfolioTransaction[],
  fallbackQuantity?: number,
  fallbackAverageCost?: number,
  fallbackDate?: string,
  assetCode?: string
): CalculationResult {
  // If no transactions exist, create a virtual initial buy transaction based on the item's summary
  let txs = [...rawTransactions];
  if (txs.length === 0 && fallbackQuantity && fallbackQuantity > 0 && fallbackAverageCost !== undefined) {
    txs = [
      {
        id: `init_${Date.now()}`,
        code: assetCode || 'ASSET',
        type: 'buy',
        date: fallbackDate || new Date().toISOString().split('T')[0],
        quantity: fallbackQuantity,
        price: fallbackAverageCost,
        totalAmount: fallbackQuantity * fallbackAverageCost,
        notes: 'Başlangıç Alımı / Portföy Girişi',
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Sort transactions chronologically: by date ascending, then 'buy' before 'sell', then created timestamp
  txs.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.type !== b.type) {
      return a.type === 'buy' ? -1 : 1; // buys processed before sells on the same day
    }
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  let currentQty = 0;
  let totalCost = 0;
  let averageCost = 0;
  let totalInvested = 0;
  let totalRealizedPnL = 0;
  let buyCount = 0;
  let sellCount = 0;
  let firstBuyDate: string | undefined = undefined;
  let lastDate: string | undefined = undefined;

  const enrichedTransactions: PortfolioTransaction[] = [];

  for (const tx of txs) {
    lastDate = tx.date;
    const totalAmount = tx.totalAmount || tx.quantity * tx.price;

    if (tx.type === 'buy') {
      buyCount++;
      if (!firstBuyDate) firstBuyDate = tx.date;
      
      const newTotalCost = totalCost + totalAmount;
      currentQty += tx.quantity;
      averageCost = currentQty > 0 ? newTotalCost / currentQty : 0;
      totalCost = currentQty * averageCost;
      totalInvested += totalAmount;

      enrichedTransactions.push({
        ...tx,
        totalAmount,
        costBasisAtSale: undefined,
        realizedProfitLoss: undefined,
        realizedProfitLossPercent: undefined,
        averageCostAfter: averageCost,
        remainingQuantityAfter: currentQty
      });
    } else if (tx.type === 'sell') {
      sellCount++;
      const costBasis = averageCost;
      const realizedPnL = (tx.price - costBasis) * tx.quantity;
      const realizedPnLPercent = costBasis > 0 ? ((tx.price - costBasis) / costBasis) * 100 : 0;

      currentQty = Math.max(0, currentQty - tx.quantity);
      totalCost = currentQty * averageCost;
      totalRealizedPnL += realizedPnL;

      enrichedTransactions.push({
        ...tx,
        totalAmount,
        costBasisAtSale: costBasis,
        realizedProfitLoss: realizedPnL,
        realizedProfitLossPercent: realizedPnLPercent,
        averageCostAfter: averageCost,
        remainingQuantityAfter: currentQty
      });
    }
  }

  return {
    currentQuantity: Number(currentQty.toFixed(6)),
    averageCost: Number(averageCost.toFixed(4)),
    totalCost: Number(totalCost.toFixed(2)),
    totalInvested: Number(totalInvested.toFixed(2)),
    totalRealizedProfitLoss: Number(totalRealizedPnL.toFixed(2)),
    totalBuyCount: buyCount,
    totalSellCount: sellCount,
    firstBuyDate,
    lastTransactionDate: lastDate,
    enrichedTransactions
  };
}

/**
 * Simulates a hypothetical future Buy or Sell transaction
 * to preview what the new average cost or realized PnL will be.
 */
export function simulateTransaction(
  currentQuantity: number,
  currentAverageCost: number,
  newType: TransactionType,
  newQuantity: number,
  newPrice: number
): {
  simulatedQuantity: number;
  simulatedAverageCost: number;
  simulatedTotalCost: number;
  costDifference: number;
  simulatedRealizedPnL?: number;
  simulatedRealizedPnLPercent?: number;
} {
  if (newType === 'buy') {
    const currentCost = currentQuantity * currentAverageCost;
    const addedCost = newQuantity * newPrice;
    const simulatedQuantity = currentQuantity + newQuantity;
    const simulatedAverageCost = simulatedQuantity > 0 ? (currentCost + addedCost) / simulatedQuantity : 0;
    const simulatedTotalCost = simulatedQuantity * simulatedAverageCost;
    const costDifference = simulatedAverageCost - currentAverageCost;

    return {
      simulatedQuantity,
      simulatedAverageCost,
      simulatedTotalCost,
      costDifference
    };
  } else {
    // Sell simulation
    const costBasis = currentAverageCost;
    const simulatedRealizedPnL = (newPrice - costBasis) * newQuantity;
    const simulatedRealizedPnLPercent = costBasis > 0 ? ((newPrice - costBasis) / costBasis) * 100 : 0;
    const simulatedQuantity = Math.max(0, currentQuantity - newQuantity);
    const simulatedAverageCost = currentAverageCost;
    const simulatedTotalCost = simulatedQuantity * simulatedAverageCost;

    return {
      simulatedQuantity,
      simulatedAverageCost,
      simulatedTotalCost,
      costDifference: 0,
      simulatedRealizedPnL,
      simulatedRealizedPnLPercent
    };
  }
}
