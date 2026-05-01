'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import {
  TrendingDown, TrendingUp, Activity, Shield, 
  Calendar, Clock, AlertCircle, CheckCircle, LineChart, BarChart3
} from 'lucide-react';

export default function DrawdownPage() {
  const { allTrades, loading } = useTradingData();
  const [timeRange, setTimeRange] = useState<'all' | '3m' | '6m' | '1y'>('all');
  const [chartType, setChartType] = useState<'equity' | 'drawdown'>('equity');

  // Filter trades by time range
  const filteredTrades = useMemo(() => {
    let trades = [...allTrades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
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

  // Calculate all drawdown metrics
  const drawdownMetrics = useMemo(() => {
    if (filteredTrades.length === 0) return null;
    
    let runningEquity = 0;
    let peakEquity = 0;
    let maxDrawdownAmount = 0;
    let maxDrawdownPercent = 0;
    
    const equityHistory: { date: string; equity: number; peak: number; drawdown: number; percent: number }[] = [];
    const drawdownPeriods: { start: string; end: string; days: number; amount: number; percent: number; peakAtStart: number }[] = [];
    
    let currentDrawdownStart: string | null = null;
    let currentDrawdownPeak = 0;
    let currentDrawdownMax = 0;
    let currentDrawdownMaxPercent = 0;
    
    // Track losing streaks
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    
    // Process each trade in order
    filteredTrades.forEach((trade, idx) => {
      const pnl = trade.pnlCalculated || 0;
      runningEquity += pnl;
      
      // Check if this is a new peak
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
        
        // If we were in a drawdown period, close it
        if (currentDrawdownStart !== null) {
          drawdownPeriods.push({
            start: currentDrawdownStart,
            end: trade.date,
            days: Math.ceil((new Date(trade.date).getTime() - new Date(currentDrawdownStart).getTime()) / (1000 * 60 * 60 * 24)),
            amount: currentDrawdownMax,
            percent: currentDrawdownMaxPercent,
            peakAtStart: currentDrawdownPeak
          });
          currentDrawdownStart = null;
          currentDrawdownMax = 0;
          currentDrawdownMaxPercent = 0;
        }
      }
      
      // Calculate current drawdown from peak
      const currentDrawdown = peakEquity - runningEquity;
      const currentDrawdownPercent = peakEquity > 0 ? (currentDrawdown / peakEquity) * 100 : 0;
      
      // Track maximum drawdown overall
      if (currentDrawdown > maxDrawdownAmount) {
        maxDrawdownAmount = currentDrawdown;
        maxDrawdownPercent = currentDrawdownPercent;
      }
      
      // Start a new drawdown period if we're in drawdown and not already tracking one
      if (currentDrawdown > 0 && currentDrawdownStart === null) {
        currentDrawdownStart = trade.date;
        currentDrawdownPeak = peakEquity;
      }
      
      // Update max drawdown for current period
      if (currentDrawdown > currentDrawdownMax) {
        currentDrawdownMax = currentDrawdown;
        currentDrawdownMaxPercent = currentDrawdownPercent;
      }
      
      // Record equity history
      equityHistory.push({
        date: trade.date,
        equity: runningEquity,
        peak: peakEquity,
        drawdown: currentDrawdown,
        percent: currentDrawdownPercent
      });
      
      // Track losing streaks
      if (trade.result === 'Loss') {
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      } else if (trade.result === 'Win') {
        currentLossStreak = 0;
      }
    });
    
    // Close any open drawdown period at the end
    if (currentDrawdownStart !== null && filteredTrades.length > 0) {
      drawdownPeriods.push({
        start: currentDrawdownStart,
        end: 'Ongoing',
        days: Math.ceil((new Date().getTime() - new Date(currentDrawdownStart).getTime()) / (1000 * 60 * 60 * 24)),
        amount: currentDrawdownMax,
        percent: currentDrawdownMaxPercent,
        peakAtStart: currentDrawdownPeak
      });
    }
    
    // Calculate recovery stats (only for completed drawdowns)
    const completedPeriods = drawdownPeriods.filter(p => p.end !== 'Ongoing');
    const avgRecoveryDays = completedPeriods.length > 0 
      ? completedPeriods.reduce((sum, p) => sum + p.days, 0) / completedPeriods.length 
      : 0;
    
    // Calculate Calmar Ratio
    const totalPnL = runningEquity;
    const calmarRatio = maxDrawdownAmount > 0 ? (totalPnL / maxDrawdownAmount).toFixed(2) : '0.00';
    
    // Risk score
    const riskScore = maxDrawdownPercent < 10 ? 'Low' : maxDrawdownPercent < 20 ? 'Medium' : 'High';
    
    // Find min/max for chart scaling
    const maxEquity = Math.max(...equityHistory.map(p => p.equity), 1);
    const minEquity = Math.min(...equityHistory.map(p => p.equity), 0);
    
    return {
      equityHistory,
      maxDrawdown: maxDrawdownAmount,
      maxDrawdownPercent,
      currentDrawdown: equityHistory.length > 0 ? equityHistory[equityHistory.length - 1].drawdown : 0,
      currentDrawdownPercent: equityHistory.length > 0 ? equityHistory[equityHistory.length - 1].percent : 0,
      peakEquity,
      currentEquity: runningEquity,
      drawdownPeriods,
      maxLossStreak,
      avgRecoveryDays,
      calmarRatio,
      riskScore,
      totalTrades: filteredTrades.length,
      wins: filteredTrades.filter(t => t.result === 'Win').length,
      losses: filteredTrades.filter(t => t.result === 'Loss').length,
      maxEquity,
      minEquity
    };
  }, [filteredTrades]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading drawdown analysis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!drawdownMetrics || filteredTrades.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No trade data available</p>
            <p className="text-sm text-gray-400 mt-2">Add some trades to see drawdown analysis</p>
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
            <TrendingDown className="w-6 h-6 text-red-500" />
            Drawdown Analysis
          </h1>
          <p className="text-gray-500 mt-1">Track your risk exposure and recovery periods</p>
        </div>

        {/* Time Range & Chart Type */}
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
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
          
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('equity')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                chartType === 'equity'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LineChart className="w-4 h-4" />
              Equity Curve
            </button>
            <button
              onClick={() => setChartType('drawdown')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                chartType === 'drawdown'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Drawdown
            </button>
          </div>
        </div>

        {/* Main Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Max Drawdown</p>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              ${drawdownMetrics.maxDrawdown.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {drawdownMetrics.maxDrawdownPercent.toFixed(1)}% from peak
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Current Drawdown</p>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-2xl font-bold ${drawdownMetrics.currentDrawdown === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              ${drawdownMetrics.currentDrawdown.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {drawdownMetrics.currentDrawdownPercent.toFixed(1)}% from peak
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Peak / Current</p>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              ${drawdownMetrics.peakEquity.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              → ${drawdownMetrics.currentEquity.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Calmar Ratio</p>
              <Shield className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{drawdownMetrics.calmarRatio}</p>
            <p className="text-xs text-gray-500 mt-1">Return vs Risk</p>
          </div>
        </div>

        {/* Chart - Simple Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {chartType === 'equity' ? (
              <><LineChart className="w-5 h-5 text-green-500" /> Equity Growth Over Time</>
            ) : (
              <><BarChart3 className="w-5 h-5 text-red-500" /> Drawdown History</>
            )}
          </h3>
          
          {/* Chart Container */}
          <div className="relative h-80">
            {/* Y-axis labels */}
            <div className="absolute -left-2 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-400">
              <span>${drawdownMetrics.maxEquity.toLocaleString()}</span>
              <span>${Math.round((drawdownMetrics.maxEquity + drawdownMetrics.minEquity) / 2).toLocaleString()}</span>
              <span>${drawdownMetrics.minEquity.toLocaleString()}</span>
            </div>
            
            {/* Chart Bars */}
            <div className="ml-16 h-full flex items-end gap-1">
              {drawdownMetrics.equityHistory.map((point, idx) => {
                let heightPercent = 0;
                let barColor = '';
                let barLabel = '';
                
                if (chartType === 'equity') {
                  // Equity chart
                  const range = drawdownMetrics.maxEquity - drawdownMetrics.minEquity;
                  heightPercent = range > 0 ? ((point.equity - drawdownMetrics.minEquity) / range) * 100 : 0;
                  
                  const isNewHigh = point.equity === point.peak;
                  const isWin = idx > 0 && point.equity > drawdownMetrics.equityHistory[idx-1]?.equity;
                  const isLoss = idx > 0 && point.equity < drawdownMetrics.equityHistory[idx-1]?.equity;
                  
                  if (isNewHigh) barColor = 'bg-green-500';
                  else if (isWin) barColor = 'bg-green-400';
                  else if (isLoss) barColor = 'bg-red-400';
                  else barColor = 'bg-blue-400';
                  
                  barLabel = `$${point.equity.toLocaleString()}`;
                } else {
                  // Drawdown chart
                  heightPercent = point.percent;
                  barColor = point.percent === 0 ? 'bg-green-500' : 
                             point.percent < 5 ? 'bg-yellow-400' : 
                             point.percent < 10 ? 'bg-orange-400' : 'bg-red-500';
                  barLabel = `${point.percent.toFixed(1)}%`;
                }
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className={`w-full ${barColor} rounded-t transition-all duration-300 hover:opacity-80`}
                        style={{ height: `${Math.max(heightPercent, 2)}px` }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          {new Date(point.date).toLocaleDateString()}: {barLabel}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 transform -rotate-45 origin-top-left w-8">
                      {new Date(point.date).toLocaleDateString().slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
            {chartType === 'equity' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs text-gray-600">New Peak High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span className="text-xs text-gray-600">Winning Trade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded"></div>
                  <span className="text-xs text-gray-600">Losing Trade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <span className="text-xs text-gray-600">In Drawdown</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs text-gray-600">0% (At Peak)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span className="text-xs text-gray-600">&lt;5% Drawdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span className="text-xs text-gray-600">5-10% Drawdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-600">&gt;10% Drawdown</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Drawdown Periods */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Drawdown Periods ({drawdownMetrics.drawdownPeriods.length})
            </h3>
          </div>
          
          {drawdownMetrics.drawdownPeriods.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No drawdown periods detected!</p>
              <p className="text-sm text-gray-400">You've been consistently setting new equity highs.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {drawdownMetrics.drawdownPeriods.map((period, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          period.percent < 5 ? 'bg-green-100 text-green-700' :
                          period.percent < 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {period.percent.toFixed(1)}% Drawdown
                        </span>
                        <span className="text-xs text-gray-500">
                          📅 {period.days} {period.days === 1 ? 'day' : 'days'}
                        </span>
                        {period.end === 'Ongoing' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Lost ${period.amount.toLocaleString()} from peak of ${period.peakAtStart.toLocaleString()}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>Started: {period.start}</span>
                        {period.end !== 'Ongoing' && <span>✅ Recovered: {period.end}</span>}
                      </div>
                    </div>
                    <div className="w-32">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            period.percent < 5 ? 'bg-green-500' :
                            period.percent < 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(period.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">Worst Losing Streak</p>
            </div>
            <p className="text-3xl font-bold text-red-600">{drawdownMetrics.maxLossStreak}</p>
            <p className="text-xs text-red-700 mt-1">consecutive losses</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-900">Avg Recovery Time</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{drawdownMetrics.avgRecoveryDays.toFixed(0)} days</p>
            <p className="text-xs text-green-700 mt-1">to recover from drawdowns</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-900">Win/Loss Record</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{drawdownMetrics.wins}W / {drawdownMetrics.losses}L</p>
            <p className="text-xs text-blue-700 mt-1">out of {drawdownMetrics.totalTrades} trades</p>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className={`rounded-xl p-6 border ${
          drawdownMetrics.riskScore === 'Low' 
            ? 'bg-green-50 border-green-200' 
            : drawdownMetrics.riskScore === 'Medium'
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Assessment
              </h3>
              <p className="text-sm text-gray-700">
                {drawdownMetrics.riskScore === 'Low' && '✓ Your risk management is excellent! Drawdowns are well controlled.'}
                {drawdownMetrics.riskScore === 'Medium' && '⚠️ Good but watch your drawdowns. Consider reducing position sizes.'}
                {drawdownMetrics.riskScore === 'High' && `🔴 High risk detected. Your max drawdown of ${drawdownMetrics.maxDrawdownPercent.toFixed(1)}% exceeds the recommended 15% limit. Consider reducing position sizes and using tighter stop losses.`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Risk Level:</p>
              <p className={`text-xl font-bold ${
                drawdownMetrics.riskScore === 'Low' ? 'text-green-700' : 
                drawdownMetrics.riskScore === 'Medium' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {drawdownMetrics.riskScore}
              </p>
            </div>
          </div>
          
          {/* Progress to target */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Max Drawdown: {drawdownMetrics.maxDrawdownPercent.toFixed(1)}%</span>
              <span>Target: 15%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  drawdownMetrics.maxDrawdownPercent < 10 ? 'bg-green-500' :
                  drawdownMetrics.maxDrawdownPercent < 15 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((drawdownMetrics.maxDrawdownPercent / 15) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Educational Note */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            💡 <strong>What is Drawdown?</strong> Drawdown is the decline from your peak account balance. 
            Lower drawdowns mean better risk management. 
            {drawdownMetrics.maxDrawdownPercent < 10 && ` Your ${drawdownMetrics.maxDrawdownPercent.toFixed(1)}% drawdown is excellent!`}
            {drawdownMetrics.maxDrawdownPercent >= 10 && drawdownMetrics.maxDrawdownPercent < 20 && ` Your ${drawdownMetrics.maxDrawdownPercent.toFixed(1)}% drawdown is acceptable but could be improved.`}
            {drawdownMetrics.maxDrawdownPercent >= 20 && ` Your ${drawdownMetrics.maxDrawdownPercent.toFixed(1)}% drawdown needs improvement. Aim to keep drawdowns below 15%.`}
          </p>
        </div>
      </div>
    </Layout>
  );
}