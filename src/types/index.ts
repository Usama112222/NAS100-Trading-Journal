export interface Trade {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  fees: number;
  openTime: Date;
  closeTime: Date;
  status: 'open' | 'closed';
  strategy: string;
  tags: string[];
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  broker: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface DashboardStats {
  totalPnL: number;
  todayPnL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  balance: number;
  totalFees: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  plan: 'free' | 'pro';
}