'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Account {
  id: string;
  name: string;
  broker: string;
  currentBalance: number;
  initialBalance: number;
  currency: string;
  isActive: boolean;
}

export function useTradingData() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const fetchData = useCallback(async () => {
    // MUST have a user to fetch data - NO localStorage fallback
    if (!user) {
      console.log('👤 No user logged in. Cannot fetch data.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userId = user.uid; // Always use Firebase Auth UID
      console.log('🔄 Fetching data for user:', userId);
      
      // Fetch accounts for this specific user
      const accountsRes = await fetch(`/api/accounts?userId=${userId}`);
      const accountsData = await accountsRes.json();
      
      if (accountsData.success && accountsData.accounts) {
        console.log('📋 Accounts loaded:', accountsData.accounts.length);
        setAccounts(accountsData.accounts);
        
        if (!selectedAccount && accountsData.accounts.length > 0) {
          setSelectedAccount(accountsData.accounts[0]);
        }
      }
      
      // Fetch trades for this specific user
      const tradesRes = await fetch(`/api/trades?userId=${userId}`);
      const tradesData = await tradesRes.json();
      
      if (tradesData.success && tradesData.trades) {
        console.log('📊 Trades loaded:', tradesData.trades.length);
        setAllTrades(tradesData.trades);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedAccount]);

  useEffect(() => {
    fetchData();
    
    const handleFocus = () => {
      console.log('📱 Page focused, refreshing...');
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData]);

  const refreshData = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return {
    accounts,
    allTrades,
    loading,
    selectedAccount,
    setSelectedAccount,
    refreshData,
  };
}