'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend
} from 'recharts';

interface ChartData {
  date: string;
  pnl: number;
  cumulativePnL: number;
  trades: number;
}

interface PerformanceChartProps {
  trades: any[];
}

// Make sure this is a default export
export default function PerformanceChart({ trades }: PerformanceChartProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    generateChartData();
  }, [trades, timeframe]);

  const generateChartData = () => {
    if (!trades || trades.length === 0) {
      setChartData([]);
      return;
    }

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Filter trades within timeframe
    const filteredTrades = sortedTrades.filter(trade => 
      new Date(trade.date) >= startDate
    );

    if (filteredTrades.length === 0) {
      setChartData([]);
      return;
    }

    // Group by date
    const dailyData = new Map<string, { pnl: number; trades: number }>();
    
    filteredTrades.forEach(trade => {
      const date = trade.date;
      const exit = trade.finalExitPrice || trade.takeProfit || trade.entryPrice;
      let points = trade.direction === 'SELL' 
        ? trade.entryPrice - exit 
        : exit - trade.entryPrice;
      
      if (trade.result === 'Loss') points = -Math.abs(points);
      const pnl = points * 10 * (trade.contracts || 1);
      
      if (dailyData.has(date)) {
        const existing = dailyData.get(date)!;
        dailyData.set(date, {
          pnl: existing.pnl + pnl,
          trades: existing.trades + 1
        });
      } else {
        dailyData.set(date, { pnl, trades: 1 });
      }
    });

    // Generate cumulative data
    let cumulativePnL = 0;
    const dates = Array.from(dailyData.keys()).sort();
    const data: ChartData[] = dates.map(date => {
      const daily = dailyData.get(date)!;
      cumulativePnL += daily.pnl;
      return {
        date,
        pnl: daily.pnl,
        cumulativePnL,
        trades: daily.trades
      };
    });

    setChartData(data);
  };

  const formatXAxis = (date: string) => {
    const d = new Date(date);
    if (timeframe === '7d') {
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          <p className="text-sm">
            <span className="text-gray-600">Daily P&L:</span>{' '}
            <span className={`font-semibold ${payload[0]?.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {payload[0]?.value >= 0 ? '+' : ''}${Math.abs(payload[0]?.value || 0).toLocaleString()}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Cumulative P&L:</span>{' '}
            <span className={`font-semibold ${payload[1]?.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {payload[1]?.value >= 0 ? '+' : ''}${Math.abs(payload[1]?.value || 0).toLocaleString()}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Trades: {payload[0]?.payload.trades}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
        <div className="text-center">
          <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No chart data available</p>
          <p className="text-xs text-gray-400">Add trades to see performance chart</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setTimeframe('7d')}
          className={`px-3 py-1 rounded-lg text-sm transition-all ${
            timeframe === '7d'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          7d
        </button>
        <button
          onClick={() => setTimeframe('30d')}
          className={`px-3 py-1 rounded-lg text-sm transition-all ${
            timeframe === '30d'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          30d
        </button>
        <button
          onClick={() => setTimeframe('90d')}
          className={`px-3 py-1 rounded-lg text-sm transition-all ${
            timeframe === '90d'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          90d
        </button>
        <button
          onClick={() => setTimeframe('1y')}
          className={`px-3 py-1 rounded-lg text-sm transition-all ${
            timeframe === '1y'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          1y
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis 
            yAxisId="left"
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            stroke="#9ca3af"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="pnl"
            name="Daily P&L"
            fill="#3b82f6"
            stroke="#3b82f6"
            fillOpacity={0.2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePnL"
            name="Cumulative P&L"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-center text-xs text-gray-400">
        📈 Blue area: Daily P&L | Green line: Cumulative P&L
      </div>
    </div>
  );
}