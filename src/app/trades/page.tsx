'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import { 
  Eye, Search, RefreshCw, TrendingUp, TrendingDown, 
  X, Image as ImageIcon, Calendar, Clock, Target, Award, Trash2
} from 'lucide-react';

interface Trade {
  id: string;
  accountId: string;  // <-- ADD THIS LINE
  date: string;
  session: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  points: number;
  result: string;
  pnlCalculated: number;
  setupGrade: string;
  screenshotUrl: string;
  rr: number;
  contracts: number;
  notes: string;
  htfBias: string;
  liquiditySweep: string;
  sweepType: string;
  smt: string;
  structureShift: string;
  entryType: string;
  partialClosesEnabled: boolean;
  weightedAvgExit: number;
}

export default function TradesPage() {
  const { allTrades, loading, refreshData } = useTradingData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const tradesPerPage = 10;

  // Delete trade function
  const deleteTrade = async (tradeId: string, tradePnL: number, accountId: string) => {
    if (!confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      return;
    }

    setDeletingId(tradeId);
    
    try {
      // Delete the trade
      const deleteResponse = await fetch(`/api/trades/${tradeId}`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete trade');
      }
      
      // Update account balance (reverse the P&L)
      const accountResponse = await fetch('/api/accounts');
      const accountsData = await accountResponse.json();
      const account = accountsData.accounts?.find((a: any) => a.id === accountId);
      
      if (account) {
        const newBalance = (account.currentBalance || account.initialBalance || 0) - tradePnL;
        await fetch(`/api/accounts/${accountId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentBalance: newBalance })
        });
      }
      
      // Refresh the trades list
      await refreshData();
      
      // Close modal if open
      if (selectedTrade?.id === tradeId) {
        setShowModal(false);
        setSelectedTrade(null);
      }
      
      alert('Trade deleted successfully!');
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter trades
  const filteredTrades = allTrades.filter(trade => {
    const matchesSearch = searchTerm === '' || 
      trade.entryPrice.toString().includes(searchTerm) ||
      trade.date.includes(searchTerm) ||
      trade.direction.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResult = filterResult === 'all' || trade.result === filterResult;
    
    return matchesSearch && matchesResult;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);
  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * tradesPerPage,
    currentPage * tradesPerPage
  );

  const getResultBadge = (result: string) => {
    if (result === 'Win') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1">🎉 Win</span>;
    } else if (result === 'Loss') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1">💔 Loss</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium flex items-center gap-1">🤝 Breakeven</span>;
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'BUY') return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const calculatePoints = (trade: Trade) => {
    if (trade.partialClosesEnabled && trade.weightedAvgExit) {
      const points = trade.direction === 'BUY' 
        ? trade.weightedAvgExit - trade.entryPrice 
        : trade.entryPrice - trade.weightedAvgExit;
      return points.toFixed(2);
    }
    const exit = trade.exitPrice || trade.takeProfit || trade.entryPrice;
    if (trade.direction === 'SELL') {
      return (trade.entryPrice - exit).toFixed(2);
    }
    return (exit - trade.entryPrice).toFixed(2);
  };

  const getRRColor = (rr: number) => {
    if (rr >= 2) return 'text-green-600';
    if (rr >= 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading trades...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Trades</h1>
          <p className="text-gray-600 mt-1">View and manage all your trading history</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by date, price, direction..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Filter by Result */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterResult('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterResult === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterResult('Win')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterResult === 'Win'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Wins 🎉
              </button>
              <button
                onClick={() => setFilterResult('Loss')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterResult === 'Loss'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Losses 💔
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refreshData}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Trades Table */}
        {filteredTrades.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No trades found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first trade to see it here</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry/Exit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">R:R</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screenshot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTrades.map((trade: Trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{trade.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{trade.session}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getDirectionIcon(trade.direction)}
                            <span className={`text-sm font-medium ${trade.direction === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.direction === 'BUY' ? 'LONG' : 'SHORT'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm">
                            <div>E: ${trade.entryPrice.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              X: ${(trade.exitPrice || trade.takeProfit || trade.weightedAvgExit || trade.entryPrice).toFixed(2)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${parseFloat(calculatePoints(trade)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(calculatePoints(trade)) >= 0 ? '+' : ''}{calculatePoints(trade)} pts
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getResultBadge(trade.result)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getRRColor(trade.rr)}`}>
                            1:{trade.rr?.toFixed(2) || '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getPnLColor(trade.pnlCalculated)}`}>
                            {trade.pnlCalculated >= 0 ? '+' : ''}${Math.abs(trade.pnlCalculated).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                            trade.setupGrade === 'A+' ? 'bg-green-100 text-green-700' :
                            trade.setupGrade === 'A' ? 'bg-blue-100 text-blue-700' :
                            trade.setupGrade === 'B' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {trade.setupGrade}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {trade.screenshotUrl ? (
                            <button
                              onClick={() => setShowImageModal(trade.screenshotUrl)}
                              className="text-primary-500 hover:text-primary-600"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">No image</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedTrade(trade);
                                setShowModal(true);
                              }}
                              className="text-gray-400 hover:text-primary-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteTrade(trade.id, trade.pnlCalculated, trade.accountId)}
                              disabled={deletingId === trade.id}
                              className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete Trade"
                            >
                              {deletingId === trade.id ? (
                                <div className="w-5 h-5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * tradesPerPage) + 1} to {Math.min(currentPage * tradesPerPage, filteredTrades.length)} of {filteredTrades.length} trades
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Trade Details Modal */}
      {showModal && selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Trade Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteTrade(selectedTrade.id, selectedTrade.pnlCalculated, selectedTrade.accountId)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Trade
                </button>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Rest of the modal content remains the same */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Date & Session</p>
                  <p className="font-medium">{selectedTrade.date} - {selectedTrade.session}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Direction</p>
                  <p className="font-medium flex items-center gap-2">
                    {getDirectionIcon(selectedTrade.direction)}
                    {selectedTrade.direction === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Entry Price</p>
                  <p className="font-medium text-lg">${selectedTrade.entryPrice.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Stop Loss</p>
                  <p className="font-medium text-red-600">${selectedTrade.stopLoss?.toFixed(2) || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Take Profit</p>
                  <p className="font-medium text-green-600">${(selectedTrade.takeProfit || selectedTrade.exitPrice || selectedTrade.weightedAvgExit || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Result</p>
                  {getResultBadge(selectedTrade.result)}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Risk/Reward</p>
                  <p className="text-xl font-bold text-primary-600">1:{selectedTrade.rr?.toFixed(2) || '0'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">P&L</p>
                  <p className={`text-xl font-bold ${getPnLColor(selectedTrade.pnlCalculated)}`}>
                    {selectedTrade.pnlCalculated >= 0 ? '+' : ''}${Math.abs(selectedTrade.pnlCalculated).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Setup Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Points:</span> {calculatePoints(selectedTrade)}</div>
                  <div><span className="text-gray-500">Contracts:</span> {selectedTrade.contracts || 1}</div>
                  <div><span className="text-gray-500">HTF Bias:</span> {selectedTrade.htfBias || 'N/A'}</div>
                  <div><span className="text-gray-500">Setup Grade:</span> {selectedTrade.setupGrade}</div>
                  <div><span className="text-gray-500">Liquidity Sweep:</span> {selectedTrade.liquiditySweep || 'No'}</div>
                  <div><span className="text-gray-500">Sweep Type:</span> {selectedTrade.sweepType || 'N/A'}</div>
                  <div><span className="text-gray-500">SMT:</span> {selectedTrade.smt || 'No'}</div>
                  <div><span className="text-gray-500">Structure Shift:</span> {selectedTrade.structureShift || 'None'}</div>
                  <div><span className="text-gray-500">Entry Type:</span> {selectedTrade.entryType || 'Break'}</div>
                  {selectedTrade.partialClosesEnabled && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Partial Closes:</span> Yes (Weighted Avg: ${selectedTrade.weightedAvgExit?.toFixed(2)})
                    </div>
                  )}
                </div>
              </div>

              {selectedTrade.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedTrade.notes}</p>
                </div>
              )}

              {selectedTrade.screenshotUrl && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Screenshot</p>
                  <img
                    src={selectedTrade.screenshotUrl}
                    alt="Trade screenshot"
                    className="max-h-64 rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => setShowImageModal(selectedTrade.screenshotUrl)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full">
            <img src={showImageModal} alt="Full size" className="w-full h-auto rounded-lg" />
            <button
              onClick={() => setShowImageModal(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-75"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}