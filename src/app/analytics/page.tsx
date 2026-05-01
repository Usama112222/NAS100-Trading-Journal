'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import {
  TrendingUp, TrendingDown, Activity, Target, Calendar,
  LineChart, BarChart3, PieChart, DollarSign, Percent,
  Award, Flame, AlertCircle, ArrowUp, ArrowDown
} from 'lucide-react';

interface MonthlyStats {
  month: string;
  year: number;
  trades: number;
  wins: number;
  losses: number;
  totalPnL: number;
  winRate: number;
  avgRR: number;
  profitFactor: number;
}

interface TradeWithMetrics {
  id: string;
  date: Date;
  pnl: number;
  result: string;
  rr: number;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  contracts: number;
}

export default function AnalyticsPage() {
  const { allTrades, loading } = useTradingData();
  const [timeRange, setTimeRange] = useState<'all' | '3m' | '6m' | '1y'>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('pnl');

  // Filter trades by time range
  const filteredTrades = useMemo(() => {
    let trades = [...allTrades];
    const now = new Date();
    
    if (timeRange === '3m') {
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      trades = trades.filter(t => new Date(t.date) >= threeMonthsAgo);
    } else if (timeRange === '6m') {
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      trades = trades.filter(t => new Date(t.date) >= sixMonthsAgo);
    } else if (timeRange === '1y') {
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      trades = trades.filter(t => new Date(t.date) >= oneYearAgo);
    }
    
    return trades;
  }, [allTrades, timeRange]);

  // Calculate core metrics
  const metrics = useMemo(() => {
    const trades = filteredTrades;
    const total = trades.length;
    
    if (total === 0) return null;
    
    const wins = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const breakeven = trades.filter(t => t.result === 'Breakeven').length;
    
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
    const grossProfit = trades.reduce((sum, t) => (t.pnlCalculated || 0) > 0 ? sum + (t.pnlCalculated || 0) : sum, 0);
    const grossLoss = Math.abs(trades.reduce((sum, t) => (t.pnlCalculated || 0) < 0 ? sum + (t.pnlCalculated || 0) : sum, 0));
    
    const winRate = (wins / total) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    const expectancy = totalPnL / total;
    
    // Average R:R for winning trades only
    const winningTrades = trades.filter(t => t.result === 'Win' && t.rr);
    const avgRR = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + (t.rr || 0), 0) / winningTrades.length 
      : 0;
    
    // Largest win/loss
    const largestWin = Math.max(...trades.map(t => t.pnlCalculated || 0));
    const largestLoss = Math.min(...trades.map(t => t.pnlCalculated || 0));
    
    // Consecutive wins/losses
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    
    for (const trade of trades) {
      if (trade.result === 'Win') {
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        currentLossStreak = 0;
      } else if (trade.result === 'Loss') {
        currentLossStreak++;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        currentWinStreak = 0;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    }
    
    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let currentEquity = 0;
    
    trades.forEach(trade => {
      currentEquity += (trade.pnlCalculated || 0);
      if (currentEquity > peak) {
        peak = currentEquity;
      }
      const drawdown = peak - currentEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    // Sharpe Ratio (simplified)
    const returns = trades.map(t => t.pnlCalculated || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    return {
      totalTrades: total,
      wins,
      losses,
      breakeven,
      totalPnL,
      winRate,
      profitFactor,
      expectancy,
      avgRR,
      largestWin,
      largestLoss,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown,
      sharpeRatio,
      grossProfit,
      grossLoss
    };
  }, [filteredTrades]);

  // Group by month for monthly performance
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyStats>();
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          year: date.getFullYear(),
          trades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          winRate: 0,
          avgRR: 0,
          profitFactor: 0
        });
      }
      
      const stats = monthlyMap.get(monthKey)!;
      stats.trades++;
      if (trade.result === 'Win') stats.wins++;
      if (trade.result === 'Loss') stats.losses++;
      stats.totalPnL += (trade.pnlCalculated || 0);
      if (trade.rr) stats.avgRR += trade.rr;
    });
    
    // Calculate final percentages
    monthlyMap.forEach(stats => {
      stats.winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
      stats.avgRR = stats.wins > 0 ? stats.avgRR / stats.wins : 0;
      const grossProfit = filteredTrades.filter(t => {
        const tDate = new Date(t.date);
        const tMonthKey = `${tDate.getFullYear()}-${tDate.getMonth() + 1}`;
        const tMonthName = tDate.toLocaleString('default', { month: 'short' });
        return tMonthName === stats.month && (t.pnlCalculated || 0) > 0;
      }).reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
      
      const grossLoss = Math.abs(filteredTrades.filter(t => {
        const tDate = new Date(t.date);
        const tMonthKey = `${tDate.getFullYear()}-${tDate.getMonth() + 1}`;
        const tMonthName = tDate.toLocaleString('default', { month: 'short' });
        return tMonthName === stats.month && (t.pnlCalculated || 0) < 0;
      }).reduce((sum, t) => sum + (t.pnlCalculated || 0), 0));
      
      stats.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    });
    
    return Array.from(monthlyMap.values()).reverse();
  }, [filteredTrades]);

  // Win rate over time (cumulative)
  const winRateOverTime = useMemo(() => {
    let wins = 0;
    let total = 0;
    const data: { date: string; winRate: number; trades: number }[] = [];
    
    filteredTrades.slice().reverse().forEach(trade => {
      total++;
      if (trade.result === 'Win') wins++;
      const winRate = (wins / total) * 100;
      data.push({
        date: new Date(trade.date).toLocaleDateString(),
        winRate,
        trades: total
      });
    });
    
    return data;
  }, [filteredTrades]);

  // P&L distribution by setup grade
  const gradePerformance = useMemo(() => {
    const grades: { [key: string]: { pnl: number; trades: number; wins: number } } = {};
    
    filteredTrades.forEach(trade => {
      const grade = trade.setupGrade || 'C';
      if (!grades[grade]) {
        grades[grade] = { pnl: 0, trades: 0, wins: 0 };
      }
      grades[grade].pnl += (trade.pnlCalculated || 0);
      grades[grade].trades++;
      if (trade.result === 'Win') grades[grade].wins++;
    });
    
    return Object.entries(grades)
      .map(([grade, data]) => ({
        grade,
        pnl: data.pnl,
        trades: data.trades,
        winRate: (data.wins / data.trades) * 100,
        avgPnL: data.pnl / data.trades
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Session performance
  const sessionPerformance = useMemo(() => {
    const sessions: { [key: string]: { pnl: number; trades: number; wins: number } } = {};
    
    filteredTrades.forEach(trade => {
      const session = trade.session || 'Unknown';
      if (!sessions[session]) {
        sessions[session] = { pnl: 0, trades: 0, wins: 0 };
      }
      sessions[session].pnl += (trade.pnlCalculated || 0);
      sessions[session].trades++;
      if (trade.result === 'Win') sessions[session].wins++;
    });
    
    return Object.entries(sessions)
      .map(([session, data]) => ({
        session,
        pnl: data.pnl,
        trades: data.trades,
        winRate: (data.wins / data.trades) * 100,
        avgPnL: data.pnl / data.trades
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!metrics) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500">No trade data available</p>
            <p className="text-sm text-gray-400 mt-2">Add some trades to see analytics</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            Analytics & Performance
          </h1>
          <p className="text-gray-500 mt-1">Deep dive into your trading metrics</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {(['all', '3m', '6m', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === 'all' ? 'All Time' : range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : '1 Year'}
            </button>
          ))}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total P&L</p>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(metrics.totalPnL).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{metrics.totalTrades} trades</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Win Rate</p>
              <Percent className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.winRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-400">{metrics.wins}W / {metrics.losses}L</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Profit Factor</p>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${metrics.profitFactor >= 1.5 ? 'text-green-600' : metrics.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
              {metrics.profitFactor.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">Gross: ${metrics.grossProfit.toLocaleString()} / ${metrics.grossLoss.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Expectancy</p>
              <Target className="w-4 h-4 text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${metrics.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.expectancy.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">per trade</p>
          </div>
        </div>

        {/* Second Row Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Avg R:R (Winners)</p>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgRR.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Risk-to-Reward ratio</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Max Drawdown</p>
              <AlertCircle className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-red-600">${metrics.maxDrawdown.toLocaleString()}</p>
            <p className="text-xs text-gray-400">from peak</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Best/Worst Trade</p>
              <Award className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-lg font-bold">
              <span className="text-green-600">+${metrics.largestWin}</span>
              <span className="text-gray-400"> / </span>
              <span className="text-red-600">-${Math.abs(metrics.largestLoss)}</span>
            </p>
            <p className="text-xs text-gray-400">largest win / loss</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Sharpe Ratio</p>
              <LineChart className="w-4 h-4 text-gray-400" />
            </div>
            <p className={`text-2xl font-bold ${metrics.sharpeRatio >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">risk-adjusted return</p>
          </div>
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-900">Longest Win Streak</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.maxWinStreak} 🔥</p>
            <p className="text-xs text-green-700 mt-1">consecutive winning trades</p>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">Longest Loss Streak</p>
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.maxLossStreak}</p>
            <p className="text-xs text-red-700 mt-1">consecutive losing trades</p>
          </div>
        </div>

        {/* Monthly Performance Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Month</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Trades</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Win Rate</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Avg R:R</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Profit Factor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((month, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {month.month} {month.year}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{month.trades}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${month.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {month.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{month.avgRR.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${month.profitFactor >= 1.5 ? 'text-green-600' : month.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {month.profitFactor.toFixed(2)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${month.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(month.totalPnL).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance by Grade & Session */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Setup Grade Performance */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Performance by Setup Grade</h3>
            </div>
            <div className="p-4 space-y-3">
              {gradePerformance.map((grade) => (
                <div key={grade.grade} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{grade.grade}</span>
                      <span className="text-xs text-gray-500">{grade.trades} trades</span>
                    </div>
                    <p className="text-xs text-gray-500">Win Rate: {grade.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${grade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(grade.pnl).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Avg: ${grade.avgPnL.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Performance */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Performance by Session</h3>
            </div>
            <div className="p-4 space-y-3">
              {sessionPerformance.map((session) => (
                <div key={session.session} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{session.session}</span>
                      <span className="text-xs text-gray-500">{session.trades} trades</span>
                    </div>
                    <p className="text-xs text-gray-500">Win Rate: {session.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${session.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(session.pnl).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Avg: ${session.avgPnL.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Win Rate Progression */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Win Rate Progression (Cumulative)
          </h3>
          <div className="space-y-2">
            {winRateOverTime.slice(-10).map((point, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const arrow = point.winRate > (arr[idx-1]?.winRate || point.winRate) ? '↑' : point.winRate < (arr[idx-1]?.winRate || point.winRate) ? '↓' : '→';
              const arrowColor = point.winRate > (arr[idx-1]?.winRate || point.winRate) ? 'text-green-600' : point.winRate < (arr[idx-1]?.winRate || point.winRate) ? 'text-red-600' : 'text-gray-400';
              
              return (
                <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24">{point.date}</span>
                    <div className="flex-1 w-48">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${point.winRate}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${point.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {point.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <span className={`text-xs ${arrowColor}`}>{arrow}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Based on {metrics.totalTrades} trades • Current win rate: {metrics.winRate.toFixed(1)}%
          </p>
        </div>
      </div>
    </Layout>
  );
}