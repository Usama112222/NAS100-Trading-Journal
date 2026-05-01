'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import ProgressBar from '@/components/ui/ProgressBar';
import RecentTradesTable from '@/components/dashboard/RecentTradesTable';
import AccountSelector from '@/components/dashboard/AccountSelector';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import { useTradingData } from '@/hooks/useTradingData';
import { 
  TrendingUp, Target, Activity, Wallet, Flame, RefreshCw, PlusCircle
} from 'lucide-react';

interface TradeDisplay {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  directionIcon: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  closeTime: Date;
  pointsDifference: number;
  valuePerPoint: number;
  result: string;
  rr: number;
  setupGrade: string;
  screenshotUrl: string;
}

export default function HomePage() {
  const router = useRouter();
  const { accounts, allTrades, loading, selectedAccount, setSelectedAccount, refreshData } = useTradingData();
  const [viewMode, setViewMode] = useState<'combined' | 'individual'>('combined');

  const handleAccountSelect = useCallback((account: any) => {
    setSelectedAccount(account);
    setViewMode('individual');
  }, [setSelectedAccount]);

  const handleViewModeChange = useCallback((mode: 'combined' | 'individual') => {
    setViewMode(mode);
    if (mode === 'combined') {
      setSelectedAccount(null);
    }
  }, [setSelectedAccount]);

  const getCurrentTrades = () => {
    if (viewMode === 'individual' && selectedAccount) {
      return allTrades.filter(trade => trade.accountId === selectedAccount.id);
    }
    return allTrades;
  };

  // Calculate statistics from trades - FIXED: Use stored P&L
  const calculateStatsFromTrades = (tradesData: any[]) => {
    const total = tradesData.length;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let totalPnL = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    tradesData.forEach(trade => {
      const pnl = trade.pnlCalculated || 0;
      totalPnL += pnl;
      
      if (trade.result === 'Win') {
        wins++;
        if (pnl > 0) grossProfit += pnl;
      } else if (trade.result === 'Loss') {
        losses++;
        if (pnl < 0) grossLoss += Math.abs(pnl);
      } else if (trade.result === 'Breakeven') {
        breakeven++;
      }
    });
    
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    
    let currentStreak = 0;
    let maxStreak = 0;
    for (let i = 0; i < tradesData.length; i++) {
      if (tradesData[i].result === 'Win') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? grossProfit : 0;
    
    return {
      totalPnL,
      winRate,
      profitFactor,
      consecutiveWins: maxStreak,
      totalTrades: total,
      winningTrades: wins,
      losingTrades: losses,
      breakevenTrades: breakeven,
    };
  };

  const currentTrades = getCurrentTrades();
  const stats = calculateStatsFromTrades(currentTrades);
  
  const getAccountBalance = () => {
    if (viewMode === 'individual' && selectedAccount) {
      let accountPnL = 0;
      const accountTrades = allTrades.filter(t => t.accountId === selectedAccount.id);
      accountTrades.forEach(trade => {
        accountPnL += trade.pnlCalculated || 0;
      });
      return (selectedAccount.initialBalance || 50000) + accountPnL;
    } else {
      return accounts.reduce((sum, acc) => sum + (acc.currentBalance || acc.initialBalance || 50000), 0);
    }
  };
  
  const totalBalance = getAccountBalance();
  
  const getAccountPnL = (accountId: string) => {
    const accountTrades = allTrades.filter(t => t.accountId === accountId);
    let pnl = 0;
    accountTrades.forEach(trade => {
      pnl += trade.pnlCalculated || 0;
    });
    return pnl;
  };

  let bestAccount = 'N/A';
  let worstAccount = 'N/A';
  if (accounts.length > 0) {
    const accountPnLs = accounts.map(acc => ({ name: acc.name, pnl: getAccountPnL(acc.id) }));
    const sorted = [...accountPnLs].sort((a, b) => b.pnl - a.pnl);
    bestAccount = sorted[0]?.name || 'N/A';
    worstAccount = sorted[sorted.length - 1]?.name || 'N/A';
  }

  const formatTradesForTable = (): TradeDisplay[] => {
    if (!currentTrades || currentTrades.length === 0) {
      return [];
    }
    
    return currentTrades.slice(0, 5).map(trade => {
      const entryPrice = trade.entryPrice;
      const exitPrice = trade.finalExitPrice || trade.takeProfit || trade.weightedAvgExit || trade.entryPrice;
      
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
      
      if (trade.result === 'Loss') {
        pointsDifference = -Math.abs(pointsDifference);
      }
      
      const contracts = trade.contracts || 1;
      const valuePerPoint = 10 * contracts;
      
      let actualPnL = trade.pnlCalculated;
      
      if (actualPnL === undefined || actualPnL === null) {
        actualPnL = pointsDifference * valuePerPoint;
      }
      
      const pnlPercentage = entryPrice !== 0 ? (pointsDifference / entryPrice) * 100 : 0;
      
      return {
        id: trade.id,
        symbol: 'NAS100',
        type: tradeType,
        directionIcon,
        entryPrice,
        exitPrice,
        quantity: contracts,
        pnl: actualPnL,
        pnlPercentage,
        closeTime: new Date(trade.date),
        pointsDifference,
        valuePerPoint,
        result: trade.result,
        rr: trade.rr || 0,
        setupGrade: trade.setupGrade || 'B',
        screenshotUrl: trade.screenshotUrl || '',
      };
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading your trading data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty state for new users
  if (!loading && accounts.length === 0 && allTrades.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Your Trading Dashboard!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Get started by creating your first trading account.
            </p>
            <button
              onClick={() => router.push('/accounts')}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center gap-2 justify-center mx-auto"
            >
              <PlusCircle className="w-5 h-5" />
              Create Your First Account
            </button>
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 <strong>Tip:</strong> Create an account first, then start adding your trades.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const formattedTrades = formatTradesForTable();

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <AccountSelector
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={handleAccountSelect}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        
        <div className="flex items-center gap-2 text-sm">
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-gray-600 dark:text-gray-400">Accounts: </span>
            <span className="font-semibold text-gray-900 dark:text-white">{accounts.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-gray-600 dark:text-gray-400">Trades: </span>
            <span className="font-semibold text-gray-900 dark:text-white">{stats.totalTrades}</span>
          </div>
          <button 
            onClick={refreshData}
            className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {viewMode === 'combined' && accounts.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map(account => {
            const accountPnL = getAccountPnL(account.id);
            const accountTrades = allTrades.filter(t => t.accountId === account.id);
            return (
              <div
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                className="cursor-pointer bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-bold text-xl">{account.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{account.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{accountTrades.length} trades</p>
                    <p className={`text-sm font-semibold ${accountPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {accountPnL >= 0 ? '+' : ''}${Math.abs(accountPnL).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border border-primary-100 dark:border-primary-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Currently Viewing</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {viewMode === 'combined' ? '📊 All Accounts Combined' : `📈 ${selectedAccount?.name}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {stats.totalTrades} trade{stats.totalTrades !== 1 ? 's' : ''} • {stats.winningTrades} Wins • {stats.losingTrades} Losses
            </p>
          </div>
          {viewMode === 'individual' && selectedAccount && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Account Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${getAccountBalance().toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Initial: ${(selectedAccount.initialBalance || 50000).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={viewMode === 'combined' ? "Combined P&L" : "Account P&L"}
          value={`${stats.totalPnL >= 0 ? '+' : ''}$${Math.abs(stats.totalPnL).toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatsCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={Target}>
          <ProgressBar value={stats.winRate} color="bg-primary-500" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.winningTrades}W / {stats.losingTrades}L</p>
        </StatsCard>
        <StatsCard title="Profit Factor" value={stats.profitFactor.toFixed(2)} icon={Activity} />
        <StatsCard title="Balance" value={`$${totalBalance.toLocaleString()}`} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Performance Overview
          </h3>
          <PerformanceChart trades={currentTrades} />
        </div>

        <div className="card p-6">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary-500" />
            {viewMode === 'combined' ? 'Account Performance' : 'Hot Streak'}
          </h3>
          <div className="space-y-4">
            {viewMode === 'combined' ? (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">🏆 Best Account</span>
                  <span className="text-green-600 font-bold">{bestAccount}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">📉 Worst Account</span>
                  <span className="text-red-600 font-bold">{worstAccount}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Total Accounts</span>
                  <span className="text-gray-900 dark:text-white font-bold">{accounts.length}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Combined Win Rate</span>
                  <span className={`font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Consecutive Wins</span>
                  <span className="text-primary-600 font-bold">{stats.consecutiveWins} 🔥</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Total Trades</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.totalTrades}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Win/Loss Ratio</span>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {stats.winningTrades}:{stats.losingTrades}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Win Rate</span>
                  <span className={`font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <RecentTradesTable trades={formattedTrades} totalTrades={stats.totalTrades} />
      
      <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        📊 P&L = Points Difference × $10 per contract | LONG: (Exit - Entry) | SHORT: (Entry - Exit)
      </div>
    </Layout>
  );
}