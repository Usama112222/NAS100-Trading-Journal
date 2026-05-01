'use client';

import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import { useAuth } from '@/context/AuthContext';
import {
  Shield, TrendingUp, TrendingDown, AlertCircle,
  Calculator, DollarSign, Target, Clock,
  ArrowUp, ArrowDown, CheckCircle, XCircle,
  Settings, Save, RefreshCw, Database, Users
} from 'lucide-react';

interface RiskSettings {
  riskPerTrade: number;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
  maxConsecutiveLosses: number;
  dailyTarget: number;
  weeklyTarget: number;
}

interface TradeRiskAnalysis {
  tradeId: string;
  date: string;
  direction: string;
  result: string;
  pnl: number;
  actualRiskPercent: number;
  recommendedRiskPercent: number;
  riskStatus: 'Good' | 'High' | 'Low';
  contracts: number;
  stopLoss: number;
  entryPrice: number;
  riskInPoints: number;
}

export default function RiskPage() {
  const { user } = useAuth();
  const { allTrades, loading, refreshData } = useTradingData();
  const [settings, setSettings] = useState<RiskSettings>({
    riskPerTrade: 1,
    maxDailyLoss: 2,
    maxWeeklyLoss: 5,
    maxConsecutiveLosses: 3,
    dailyTarget: 2,
    weeklyTarget: 5
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  const [calculatorInputs, setCalculatorInputs] = useState({
    entryPrice: 20000,
    stopLoss: 19990,
    riskAmount: 0
  });

  const CONTRACT_VALUE = 10;

  // Load accounts and settings
  useEffect(() => {
    if (user) {
      loadAccounts();
      loadSettings();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/accounts?userId=${user.uid}`);
      const data = await response.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccountId(data.accounts[0].id);
        
        // Calculate balance including trades
        const accountTrades = allTrades.filter(t => t.accountId === data.accounts[0].id);
        const totalPnL = accountTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
        setAccountBalance((data.accounts[0].initialBalance || 50000) + totalPnL);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      // Load settings from Firestore (user document)
      const response = await fetch(`/api/users/${user.uid}/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.uid}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskSettings: settings })
      });
      
      if (response.ok) {
        setIsEditing(false);
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleAccountChange = async (accountId: string) => {
    setIsLoadingBalance(true);
    setSelectedAccountId(accountId);
    const selectedAccount = accounts.find(a => a.id === accountId);
    if (selectedAccount) {
      const accountTrades = allTrades.filter(t => t.accountId === accountId);
      const totalPnL = accountTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
      const currentBalance = (selectedAccount.initialBalance || 50000) + totalPnL;
      setAccountBalance(currentBalance);
    }
    setIsLoadingBalance(false);
  };

  // Rest of your existing calculations remain the same...
  const todayPnL = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = allTrades.filter(t => t.date === today);
    return todayTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
  }, [allTrades]);

  const weekPnL = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const weekTrades = allTrades.filter(t => {
      const tradeDate = new Date(t.date);
      return tradeDate >= startOfWeek;
    });
    return weekTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
  }, [allTrades]);

  const consecutiveLosses = useMemo(() => {
    let current = 0;
    let max = 0;
    for (const trade of allTrades.slice().reverse()) {
      if (trade.result === 'Loss') {
        current++;
        max = Math.max(max, current);
      } else if (trade.result === 'Win') {
        current = 0;
      }
    }
    return { current, max };
  }, [allTrades]);

  const tradeRiskAnalysis = useMemo((): TradeRiskAnalysis[] => {
    return allTrades.map(trade => {
      const entryPrice = trade.entryPrice;
      const stopLoss = trade.stopLoss || (trade.direction === 'BUY' ? entryPrice * 0.995 : entryPrice * 1.005);
      const riskInPoints = Math.abs(entryPrice - stopLoss);
      const totalRisk = riskInPoints * CONTRACT_VALUE * (trade.contracts || 1);
      const actualRiskPercent = (totalRisk / accountBalance) * 100;
      const recommendedRiskPercent = settings.riskPerTrade;
      
      let riskStatus: 'Good' | 'High' | 'Low' = 'Good';
      const riskRatio = actualRiskPercent / recommendedRiskPercent;
      if (riskRatio > 1.2) {
        riskStatus = 'High';
      } else if (riskRatio < 0.5) {
        riskStatus = 'Low';
      } else {
        riskStatus = 'Good';
      }
      
      return {
        tradeId: trade.id,
        date: trade.date,
        direction: trade.direction === 'BUY' ? 'LONG' : 'SHORT',
        result: trade.result || (trade.pnlCalculated >= 0 ? 'Win' : 'Loss'),
        pnl: trade.pnlCalculated || 0,
        actualRiskPercent,
        recommendedRiskPercent,
        riskStatus,
        contracts: trade.contracts || 1,
        stopLoss,
        entryPrice,
        riskInPoints
      };
    });
  }, [allTrades, accountBalance, settings.riskPerTrade]);

  const riskStats = useMemo(() => {
    const highRiskTrades = tradeRiskAnalysis.filter(t => t.riskStatus === 'High');
    const lowRiskTrades = tradeRiskAnalysis.filter(t => t.riskStatus === 'Low');
    const goodRiskTrades = tradeRiskAnalysis.filter(t => t.riskStatus === 'Good');
    
    const highRiskWins = highRiskTrades.filter(t => t.result === 'Win').length;
    const goodRiskWins = goodRiskTrades.filter(t => t.result === 'Win').length;
    const lowRiskWins = lowRiskTrades.filter(t => t.result === 'Win').length;
    
    const avgRiskPercent = tradeRiskAnalysis.reduce((sum, t) => sum + t.actualRiskPercent, 0) / (tradeRiskAnalysis.length || 1);
    
    return {
      totalTrades: tradeRiskAnalysis.length,
      highRiskCount: highRiskTrades.length,
      lowRiskCount: lowRiskTrades.length,
      goodRiskCount: goodRiskTrades.length,
      highRiskWinRate: highRiskTrades.length > 0 ? (highRiskWins / highRiskTrades.length * 100).toFixed(1) : 0,
      goodRiskWinRate: goodRiskTrades.length > 0 ? (goodRiskWins / goodRiskTrades.length * 100).toFixed(1) : 0,
      lowRiskWinRate: lowRiskTrades.length > 0 ? (lowRiskWins / lowRiskTrades.length * 100).toFixed(1) : 0,
      avgRiskPercent: avgRiskPercent.toFixed(2),
      complianceRate: (goodRiskTrades.length / (tradeRiskAnalysis.length || 1) * 100).toFixed(1)
    };
  }, [tradeRiskAnalysis]);

  const positionSize = useMemo(() => {
    const { entryPrice, stopLoss, riskAmount } = calculatorInputs;
    const riskInPoints = Math.abs(entryPrice - stopLoss);
    const riskPerContract = riskInPoints * CONTRACT_VALUE;
    const maxRiskAmount = (settings.riskPerTrade / 100) * accountBalance;
    const actualRisk = riskAmount || maxRiskAmount;
    const contracts = riskPerContract > 0 ? Math.floor(actualRisk / riskPerContract) : 0;
    const totalValue = contracts * entryPrice;
    const actualRiskPercent = (actualRisk / accountBalance) * 100;
    
    const suggestedTP = entryPrice + (riskInPoints * 2);
    
    return {
      contracts,
      totalValue,
      riskAmount: actualRisk,
      riskPercent: actualRiskPercent.toFixed(2),
      riskPerContract,
      maxRiskAmount,
      riskInPoints,
      suggestedTP
    };
  }, [calculatorInputs, settings.riskPerTrade, accountBalance]);

  const riskStatus = useMemo(() => {
    const dailyLossPercent = (Math.abs(todayPnL) / accountBalance) * 100;
    const weeklyLossPercent = (Math.abs(weekPnL) / accountBalance) * 100;
    const remainingDailyLoss = Math.max(0, settings.maxDailyLoss - dailyLossPercent);
    
    return {
      dailyHit: todayPnL < 0 && dailyLossPercent >= settings.maxDailyLoss,
      weeklyHit: weekPnL < 0 && weeklyLossPercent >= settings.maxWeeklyLoss,
      consecutiveHit: consecutiveLosses.current >= settings.maxConsecutiveLosses,
      dailyLossPercent: dailyLossPercent.toFixed(2),
      weeklyLossPercent: weeklyLossPercent.toFixed(2),
      remainingDailyLoss: remainingDailyLoss.toFixed(2),
      maxAdditionalLosses: Math.floor(remainingDailyLoss / settings.riskPerTrade)
    };
  }, [todayPnL, weekPnL, consecutiveLosses, settings, accountBalance]);

  if (loading || isLoadingBalance || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading risk data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-500" />
            Risk Management
          </h1>
          <p className="text-gray-500 mt-1">Protect your capital, manage your risk for NAS100 trading</p>
        </div>

        {/* Account Selector - Only shows accounts for logged in user */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
          <div className="flex flex-wrap gap-3">
            {accounts.length === 0 ? (
              <div className="text-center p-4 bg-yellow-50 rounded-lg w-full">
                <p className="text-sm text-yellow-700">No accounts found. Please create an account first.</p>
                <button
                  onClick={() => window.location.href = '/accounts'}
                  className="mt-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm"
                >
                  Create Account
                </button>
              </div>
            ) : (
              accounts.map(account => {
                const accountTrades = allTrades.filter(t => t.accountId === account.id);
                const totalPnL = accountTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
                const currentBalance = (account.initialBalance || 50000) + totalPnL;
                
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountChange(account.id)}
                    className={`px-4 py-3 rounded-lg border transition-all text-left ${
                      selectedAccountId === account.id
                        ? 'bg-primary-50 border-primary-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-500">Balance: ${currentBalance.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{accountTrades.length} trades</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Account Balance Display */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <p className="text-sm opacity-90 mb-1">Current Account Balance</p>
            <p className="text-3xl font-bold">${accountBalance.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">From: {selectedAccount?.name || 'Selected Account'}</p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Risk Per Trade ({settings.riskPerTrade}%)</p>
            <p className="text-2xl font-bold text-red-600">${((settings.riskPerTrade / 100) * accountBalance).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Max loss per single trade</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Contract Value</p>
            <p className="text-2xl font-bold text-blue-600">$10 per point</p>
            <p className="text-xs text-gray-400 mt-1">1 contract = $10 per index point</p>
          </div>
        </div>

        {/* Risk Limits Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-5 border ${riskStatus.dailyHit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Daily Loss Limit</p>
              {riskStatus.dailyHit ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <p className="text-2xl font-bold">{settings.maxDailyLoss}%</p>
            <p className="text-xs text-gray-500 mt-1">Today: {riskStatus.dailyLossPercent}%</p>
          </div>

          <div className={`rounded-xl p-5 border ${riskStatus.weeklyHit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Weekly Loss Limit</p>
              {riskStatus.weeklyHit ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <p className="text-2xl font-bold">{settings.maxWeeklyLoss}%</p>
            <p className="text-xs text-gray-500 mt-1">This week: {riskStatus.weeklyLossPercent}%</p>
          </div>

          <div className={`rounded-xl p-5 border ${riskStatus.consecutiveHit ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Consecutive Losses</p>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{consecutiveLosses.current} / {settings.maxConsecutiveLosses}</p>
            <p className="text-xs text-gray-500 mt-1">Max streak: {consecutiveLosses.max}</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Risk Compliance</p>
              <Database className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{riskStats.complianceRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Trades within target risk</p>
          </div>
        </div>

        {/* NAS100 Position Size Calculator */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-500" />
            NAS100 Position Size Calculator
          </h3>
          
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>NAS100 Contract Value:</strong> 1 contract = $10 per 1 index point
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Example: Entry 20,000 → Exit 20,010 (10 points profit) = 10 × $10 = $100 per contract
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Price
                </label>
                <input
                  type="number"
                  value={calculatorInputs.entryPrice}
                  onChange={(e) => setCalculatorInputs({ ...calculatorInputs, entryPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">Example: 20000</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stop Loss Price
                </label>
                <input
                  type="number"
                  value={calculatorInputs.stopLoss}
                  onChange={(e) => setCalculatorInputs({ ...calculatorInputs, stopLoss: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">Example: 19990 (10 point risk)</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Position Size Results</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Risk per contract:</span>
                  <span className="text-sm font-medium">${positionSize.riskPerContract.toFixed(2)} ({positionSize.riskInPoints} points)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Max risk ({settings.riskPerTrade}%):</span>
                  <span className="text-sm font-medium text-red-600">${positionSize.maxRiskAmount.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-900">Contracts to Trade:</span>
                    <span className="text-2xl font-bold text-primary-600">{positionSize.contracts} contracts</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Total position value:</span>
                    <span className="text-sm">${positionSize.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Actual risk %:</span>
                    <span className={`text-sm font-medium ${parseFloat(positionSize.riskPercent) > settings.riskPerTrade ? 'text-red-600' : 'text-green-600'}`}>
                      {positionSize.riskPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Suggested Take Profit (1:2):</span>
                    <span className="text-sm font-medium text-green-600">{positionSize.suggestedTP.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Risk Analysis Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" />
              Trade Risk Analysis (From Database)
            </h3>
            <p className="text-xs text-gray-500 mt-1">Target risk: {settings.riskPerTrade}% of account per trade</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trade</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Contracts</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Risk (Points)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Risk %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">vs Target</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tradeRiskAnalysis.slice(0, 10).map((trade) => {
                  const riskRatio = (trade.actualRiskPercent / trade.recommendedRiskPercent) * 100;
                  return (
                    <tr key={trade.tradeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{trade.date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${trade.direction === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{trade.contracts}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{trade.riskInPoints.toFixed(0)} pts</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${
                          trade.actualRiskPercent > trade.recommendedRiskPercent ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {trade.actualRiskPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium ${
                          riskRatio > 120 ? 'text-red-600' : riskRatio < 50 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {riskRatio > 120 ? '↑ Too High' : riskRatio < 50 ? '↓ Too Low' : '✓ Target'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.riskStatus === 'Good' ? 'bg-green-100 text-green-700' :
                          trade.riskStatus === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {trade.riskStatus}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.pnl.toLocaleString()}
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-700 mb-1">✅ Target Risk Trades</p>
            <p className="text-2xl font-bold text-green-700">{riskStats.goodRiskCount}</p>
            <p className="text-xs text-green-600 mt-1">Win Rate: {riskStats.goodRiskWinRate}%</p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-700 mb-1">⚠️ Low Risk Trades</p>
            <p className="text-2xl font-bold text-yellow-700">{riskStats.lowRiskCount}</p>
            <p className="text-xs text-yellow-600 mt-1">Win Rate: {riskStats.lowRiskWinRate}%</p>
            <p className="text-xs text-yellow-500 mt-1">Leaving money on table</p>
          </div>
          
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-700 mb-1">🔴 High Risk Trades</p>
            <p className="text-2xl font-bold text-red-700">{riskStats.highRiskCount}</p>
            <p className="text-xs text-red-600 mt-1">Win Rate: {riskStats.highRiskWinRate}%</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">📊 Average Risk</p>
            <p className="text-2xl font-bold text-blue-700">{riskStats.avgRiskPercent}%</p>
            <p className="text-xs text-blue-600 mt-1">Target: {settings.riskPerTrade}%</p>
          </div>
        </div>

        {/* Risk Parameters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              Risk Parameters
            </h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="text-sm text-primary-500 hover:text-primary-600">
                Edit Settings
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={saveSettings} className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Risk Per Trade</p>
              {isEditing ? (
                <input type="number" step="0.5" value={settings.riskPerTrade} onChange={(e) => setSettings({ ...settings, riskPerTrade: parseFloat(e.target.value) })} className="w-full px-2 py-1 border rounded" />
              ) : (
                <p className="text-lg font-semibold">{settings.riskPerTrade}%</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Max: ${((settings.riskPerTrade / 100) * accountBalance).toLocaleString()}</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Max Daily Loss</p>
              {isEditing ? (
                <input type="number" step="0.5" value={settings.maxDailyLoss} onChange={(e) => setSettings({ ...settings, maxDailyLoss: parseFloat(e.target.value) })} className="w-full px-2 py-1 border rounded" />
              ) : (
                <p className="text-lg font-semibold">{settings.maxDailyLoss}%</p>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Max Weekly Loss</p>
              {isEditing ? (
                <input type="number" step="0.5" value={settings.maxWeeklyLoss} onChange={(e) => setSettings({ ...settings, maxWeeklyLoss: parseFloat(e.target.value) })} className="w-full px-2 py-1 border rounded" />
              ) : (
                <p className="text-lg font-semibold">{settings.maxWeeklyLoss}%</p>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Max Consecutive Losses</p>
              {isEditing ? (
                <input type="number" value={settings.maxConsecutiveLosses} onChange={(e) => setSettings({ ...settings, maxConsecutiveLosses: parseInt(e.target.value) })} className="w-full px-2 py-1 border rounded" />
              ) : (
                <p className="text-lg font-semibold">{settings.maxConsecutiveLosses}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}