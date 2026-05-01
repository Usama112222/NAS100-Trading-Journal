import { Clock, Filter, Download } from 'lucide-react';
import Link from 'next/link';

interface Trade {
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

interface RecentTradesTableProps {
  trades: Trade[];
  totalTrades: number;
}

export default function RecentTradesTable({ trades, totalTrades }: RecentTradesTableProps) {
  if (!trades || trades.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No trades yet</p>
        <p className="text-sm text-gray-400 mt-1">Add your first trade to see it here</p>
      </div>
    );
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-gray-900 font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          Recent Trades
        </h3>
        <Link href="/trades" className="text-sm text-primary-500 hover:text-primary-600">
          View All Trades →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry/Exit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">R:R</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trade.closeTime.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.type === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {trade.type} {trade.directionIcon}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm">
                    <div>${trade.entryPrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">→ ${trade.exitPrice.toFixed(2)}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className={`text-sm font-semibold ${trade.pointsDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.pointsDifference > 0 ? '+' : ''}{trade.pointsDifference.toFixed(2)} pts
                  </div>
                  <div className="text-xs text-gray-400">${trade.valuePerPoint.toFixed(2)}/pt</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-sm font-semibold ${trade.rr >= 2 ? 'text-green-600' : trade.rr >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                    1:{trade.rr.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className={`font-semibold ${getPnLColor(trade.pnl)}`}>
                      {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toLocaleString()}
                    </span>
                    <span className={`text-xs ${trade.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {trade.closeTime.toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 text-center text-sm text-gray-500 bg-gray-50">
        Showing {trades.length} of {totalTrades} trades
      </div>
    </div>
  );
}