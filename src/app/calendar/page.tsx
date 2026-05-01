'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DailyStats {
  date: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
}

export default function CalendarPage() {
  const { allTrades, loading } = useTradingData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group trades by date
  const dailyStats = useMemo(() => {
    const stats: { [key: string]: DailyStats } = {};
    
    allTrades.forEach(trade => {
      let dateStr = trade.date;
      if (dateStr && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }
      
      if (!stats[dateStr]) {
        stats[dateStr] = {
          date: dateStr,
          trades: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
        };
      }
      
      stats[dateStr].trades++;
      stats[dateStr].pnl += trade.pnlCalculated || 0;
      if (trade.result === 'Win') stats[dateStr].wins++;
      if (trade.result === 'Loss') stats[dateStr].losses++;
    });
    
    return stats;
  }, [allTrades]);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const tradesInMonth: any[] = [];
    
    allTrades.forEach(trade => {
      let dateStr = trade.date;
      if (dateStr && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }
      const tradeDate = new Date(dateStr);
      
      if (tradeDate.getMonth() === currentMonth.getMonth() && 
          tradeDate.getFullYear() === currentMonth.getFullYear()) {
        tradesInMonth.push(trade);
      }
    });
    
    const totalTrades = tradesInMonth.length;
    const totalPnL = tradesInMonth.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
    const wins = tradesInMonth.filter(t => t.result === 'Win').length;
    const losses = tradesInMonth.filter(t => t.result === 'Loss').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    let bestDay = { date: '', pnl: -Infinity };
    let worstDay = { date: '', pnl: Infinity };
    
    Object.values(dailyStats).forEach(day => {
      const dayDate = new Date(day.date);
      if (dayDate.getMonth() === currentMonth.getMonth() &&
          dayDate.getFullYear() === currentMonth.getFullYear()) {
        if (day.pnl > bestDay.pnl) {
          bestDay = { date: day.date, pnl: day.pnl };
        }
        if (day.pnl < worstDay.pnl) {
          worstDay = { date: day.date, pnl: day.pnl };
        }
      }
    });
    
    return {
      totalTrades,
      totalPnL,
      winRate,
      wins,
      losses,
      bestDay: bestDay.pnl !== -Infinity ? bestDay : null,
      worstDay: worstDay.pnl !== Infinity ? worstDay : null,
    };
  }, [allTrades, currentMonth, dailyStats]);

  // Generate calendar days - Monday first
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(null);
  };

  const getDayColorClass = (pnl: number, trades: number) => {
    if (trades === 0) return 'bg-white hover:bg-gray-50';
    if (pnl > 0) return 'bg-green-50 hover:bg-green-100 border-green-200';
    if (pnl < 0) return 'bg-red-50 hover:bg-red-100 border-red-200';
    return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const selectedDateTrades = useMemo(() => {
    if (!selectedDate) return [];
    return allTrades.filter(trade => {
      let tradeDate = trade.date;
      if (tradeDate && tradeDate.includes('T')) {
        tradeDate = tradeDate.split('T')[0];
      }
      return tradeDate === selectedDate;
    });
  }, [selectedDate, allTrades]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading calendar data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary-500" />
              Trading Calendar
            </h1>
            <p className="text-gray-500 mt-1">View your daily trading performance</p>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Today
          </button>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold text-gray-900">{monthlySummary.totalTrades}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">P&L</p>
            <p className={`text-2xl font-bold ${getPnLColor(monthlySummary.totalPnL)}`}>
              {formatCurrency(monthlySummary.totalPnL)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Best Day</p>
            <p className={`text-lg font-bold ${monthlySummary.bestDay ? getPnLColor(monthlySummary.bestDay.pnl) : 'text-gray-400'}`}>
              {monthlySummary.bestDay ? formatCurrency(monthlySummary.bestDay.pnl) : '-'}
            </p>
            <p className="text-xs text-gray-400">{monthlySummary.bestDay?.date || 'No trades'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Worst Day</p>
            <p className={`text-lg font-bold ${monthlySummary.worstDay ? getPnLColor(monthlySummary.worstDay.pnl) : 'text-gray-400'}`}>
              {monthlySummary.worstDay ? formatCurrency(monthlySummary.worstDay.pnl) : '-'}
            </p>
            <p className="text-xs text-gray-400">{monthlySummary.worstDay?.date || 'No trades'}</p>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 mb-6 border border-primary-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Monthly Win Rate</p>
              <p className="text-3xl font-bold text-primary-600">{monthlySummary.winRate.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Wins / Losses</p>
              <p className="text-lg font-semibold text-gray-900">{monthlySummary.wins} / {monthlySummary.losses}</p>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarDays.map((date, index) => {
              const dateKey = date ? date.toISOString().split('T')[0] : null;
              const dayStats = dateKey ? dailyStats[dateKey] : null;
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === new Date().toISOString().split('T')[0];
              
              if (!date) {
                return <div key={`empty-${index}`} className="bg-gray-50 min-h-[100px] border-r border-b border-gray-100"></div>;
              }
              
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`
                    min-h-[100px] p-2 border-r border-b border-gray-100 text-left
                    transition-all hover:shadow-md relative
                    ${getDayColorClass(dayStats?.pnl || 0, dayStats?.trades || 0)}
                    ${isSelected ? 'ring-2 ring-primary-500 ring-inset' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${isToday ? 'text-primary-600 font-bold' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </span>
                    {isToday && <span className="text-xs bg-primary-500 text-white px-1 rounded">Today</span>}
                  </div>
                  
                  {dayStats && dayStats.trades > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">📊 {dayStats.trades} trade{dayStats.trades !== 1 ? 's' : ''}</p>
                      <p className={`text-sm font-semibold ${getPnLColor(dayStats.pnl)}`}>
                        {formatCurrency(dayStats.pnl)}
                      </p>
                      {dayStats.wins > 0 && <p className="text-xs text-green-600">✓ {dayStats.wins} wins</p>}
                    </div>
                  )}
                  
                  {(!dayStats || dayStats.trades === 0) && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">No trades</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedDateTrades.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Trades on {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <div className="space-y-3">
              {selectedDateTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {trade.direction === 'BUY' ? '📈 LONG' : '📉 SHORT'} 
                      <span className="text-gray-500 text-sm ml-2">{trade.date}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Entry: ${trade.entryPrice} | Exit: ${trade.weightedAvgExit || trade.takeProfit || trade.entryPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${trade.pnlCalculated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(trade.pnlCalculated || 0)}
                    </p>
                    <p className="text-xs text-gray-400">{trade.contracts} contract{trade.contracts !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Daily Total:</span>
                <span className={`text-xl font-bold ${getPnLColor(selectedDateTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0))}`}>
                  {formatCurrency(selectedDateTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}