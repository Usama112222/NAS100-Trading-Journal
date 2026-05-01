'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTradingData } from '@/hooks/useTradingData';
import { Plus, Trash2, Wallet, ArrowLeft, AlertCircle, Crown, RefreshCw } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  broker: string;
  currentBalance: number;
  initialBalance: number;
  currency: string;
  isActive: boolean;
  userId: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from Firebase
  const { allTrades, refreshData, loading: tradingLoading } = useTradingData();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountBroker, setNewAccountBroker] = useState('');

  const fetchAccounts = async () => {
    // MUST have authenticated user
    if (!user) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/accounts?userId=${user.uid}`);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const createAccount = async () => {
    if (!user) {
      alert('Please login first');
      return;
    }

    if (!newAccountName || !newAccountBalance) {
      alert('Please fill in account name and initial balance');
      return;
    }

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid, // Always use Firebase Auth UID
          name: newAccountName,
          broker: newAccountBroker || 'Manual Trading',
          initialBalance: parseFloat(newAccountBalance),
          currency: 'USD',
          isActive: accounts.length === 0,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchAccounts();
        await refreshData();
        setShowCreateModal(false);
        setNewAccountName('');
        setNewAccountBalance('');
        setNewAccountBroker('');
      } else {
        alert(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account');
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/accounts?id=${accountId}&userId=${user.uid}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchAccounts();
        await refreshData();
        setShowDeleteConfirm(null);
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  };

  const getActiveAccount = () => {
    return accounts.find(acc => acc.isActive);
  };

  const getAccountPnL = (accountId: string) => {
    const accountTrades = allTrades.filter(t => t.accountId === accountId);
    return accountTrades.reduce((sum, t) => sum + (t.pnlCalculated || 0), 0);
  };

  if (loading || tradingLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading accounts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
              <p className="text-gray-600 mt-1">Manage all your trading accounts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAccounts}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add New Account
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">Total Accounts</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">Total Balance</p>
              <p className="text-2xl font-bold">${getTotalBalance().toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">Active Account</p>
              <p className="text-lg font-semibold truncate">{getActiveAccount()?.name || 'None'}</p>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Your Trading Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">View, add, or remove trading accounts</p>
          </div>

          {accounts.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No trading accounts yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first account to start tracking trades</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create First Account
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accounts.map((account) => {
                const accountPnL = getAccountPnL(account.id);
                const accountTrades = allTrades.filter(t => t.accountId === account.id);
                
                return (
                  <div key={account.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          account.isActive 
                            ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
                            : 'bg-gradient-to-br from-gray-200 to-gray-300'
                        }`}>
                          <span className={`text-xl font-bold ${
                            account.isActive ? 'text-white' : 'text-gray-600'
                          }`}>
                            {account.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-lg">{account.name}</p>
                            {account.isActive && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{account.broker}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-sm font-semibold text-green-600">
                              Balance: ${account.currentBalance.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              Initial: ${account.initialBalance.toLocaleString()}
                            </p>
                            <p className={`text-xs font-medium ${accountPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              P&L: ${accountPnL.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              Trades: {accountTrades.length}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(account.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Account Management Tips</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Active Account:</strong> The first account you create becomes active.</li>
                <li>• <strong>Deleting Accounts:</strong> When you delete an account, all trades associated with it will also be deleted.</li>
                <li>• <strong>Multiple Accounts:</strong> You can create accounts for different brokers, strategies, or prop firms.</li>
                <li>• <strong>Balance Updates:</strong> Account balances update automatically as you add winning or losing trades.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add New Account</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Main Account, FTMO Challenge, Demo"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker / Platform</label>
                <input
                  type="text"
                  placeholder="e.g., FTMO, TD Ameritrade, Binance"
                  value={newAccountBroker}
                  onChange={(e) => setNewAccountBroker(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance ($) *</label>
                <input
                  type="number"
                  step="1000"
                  placeholder="e.g., 50000"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createAccount}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete Account</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this account? All trades associated with this account will also be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccount(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}