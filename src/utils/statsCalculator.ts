export interface DashboardStats {
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  balance: number;
  consecutiveWins: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
}

export interface AccountStats {
  accountId: string;
  accountName: string;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  currentBalance: number;
}

// Calculate correct PnL for a trade based on direction and result
const calculateTradePnL = (trade: any): number => {
  const contracts = trade.contracts || 1;
  const entry = trade.entryPrice;
  const exit = trade.takeProfit || trade.finalExitPrice || trade.entryPrice;
  let points = 0;
  
  // Calculate raw points based on direction
  if (trade.direction === 'SELL') {
    points = entry - exit;
  } else {
    points = exit - entry;
  }
  
  // If trade result is Loss, make points negative
  if (trade.result === 'Loss') {
    points = -Math.abs(points);
  }
  
  // P&L = points × $10 × contracts
  return points * 10 * contracts;
};

export const calculateStats = (trades: any[], accountBalance: number = 0): DashboardStats => {
  const total = trades.length;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalPnL = 0;
  
  trades.forEach(trade => {
    const pnl = calculateTradePnL(trade);
    totalPnL += pnl;
    
    if (trade.result === 'Win') wins++;
    else if (trade.result === 'Loss') losses++;
    else if (trade.result === 'Breakeven') breakeven++;
  });
  
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  // Calculate consecutive wins
  let currentStreak = 0;
  let maxStreak = 0;
  for (let i = 0; i < trades.length; i++) {
    if (trades[i].result === 'Win') {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  // Calculate profit factor
  let grossProfit = 0;
  let grossLoss = 0;
  trades.forEach(trade => {
    const pnl = calculateTradePnL(trade);
    if (pnl > 0) grossProfit += pnl;
    if (pnl < 0) grossLoss += Math.abs(pnl);
  });
  
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? grossProfit : 0;
  
  return {
    totalPnL,
    winRate,
    profitFactor,
    balance: accountBalance,
    consecutiveWins: maxStreak,
    totalTrades: total,
    winningTrades: wins,
    losingTrades: losses,
    breakevenTrades: breakeven,
  };
};

export const calculateAccountStats = (trades: any[], accounts: any[]): AccountStats[] => {
  const statsMap = new Map();
  
  // Initialize stats for each account
  accounts.forEach(account => {
    statsMap.set(account.id, {
      accountId: account.id,
      accountName: account.name,
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      currentBalance: account.currentBalance,
    });
  });
  
  // Calculate stats per account
  trades.forEach(trade => {
    const stat = statsMap.get(trade.accountId);
    if (stat) {
      stat.totalTrades++;
      const pnl = calculateTradePnL(trade);
      stat.totalPnL += pnl;
      
      if (trade.result === 'Win') stat.winningTrades++;
      else if (trade.result === 'Loss') stat.losingTrades++;
      else if (trade.result === 'Breakeven') stat.breakevenTrades++;
    }
  });
  
  // Calculate win rates
  const result: AccountStats[] = [];
  statsMap.forEach(stat => {
    stat.winRate = stat.totalTrades > 0 ? (stat.winningTrades / stat.totalTrades) * 100 : 0;
    result.push(stat);
  });
  
  return result;
};

// Helper function to format trade for display
export const formatTradeForDisplay = (trade: any) => {
  const entryPrice = trade.entryPrice;
  const exitPrice = trade.takeProfit || trade.finalExitPrice || trade.entryPrice;
  const contracts = trade.contracts || 1;
  
  // Calculate points based on direction and result
  let pointsDifference: number;
  let tradeType: 'LONG' | 'SHORT';
  let directionIcon: string;
  
  if (trade.direction === 'SELL') {
    tradeType = 'SHORT';
    directionIcon = '📉';
    pointsDifference = entryPrice - exitPrice;
  } else {
    tradeType = 'LONG';
    directionIcon = '📈';
    pointsDifference = exitPrice - entryPrice;
  }
  
  // If trade result is Loss, make points negative
  if (trade.result === 'Loss') {
    pointsDifference = -Math.abs(pointsDifference);
  }
  
  const valuePerPoint = 10 * contracts;
  const pnl = pointsDifference * valuePerPoint;
  const pnlPercentage = entryPrice !== 0 ? (pointsDifference / entryPrice) * 100 : 0;
  
  return {
    id: trade.id,
    symbol: 'NAS100',
    type: tradeType,
    directionIcon,
    entryPrice,
    exitPrice,
    quantity: contracts,
    pnl,
    pnlPercentage,
    closeTime: new Date(trade.date),
    pointsDifference,
    valuePerPoint,
  };
};