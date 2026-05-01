'use client';

import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  broker: string;
  currentBalance: number;
  initialBalance: number;
  currency: string;
  isActive: boolean;
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  viewMode: 'combined' | 'individual';
  onViewModeChange: (mode: 'combined' | 'individual') => void;
}

export default function AccountSelector({
  accounts,
  selectedAccount,
  onSelectAccount,
  viewMode,
  onViewModeChange,
}: AccountSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAccountSelect = (account: Account) => {
    onSelectAccount(account);
    onViewModeChange('individual');
    setShowDropdown(false);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => onViewModeChange('combined')}
        className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
          viewMode === 'combined'
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
            : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
        }`}
      >
        <span>📊</span>
        Combined View (All Accounts)
      </button>
      
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
            viewMode === 'individual'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          {viewMode === 'individual' && selectedAccount ? selectedAccount.name : 'Select Account'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100">
                SWITCH ACCOUNT
              </div>
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                    selectedAccount?.id === account.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedAccount?.id === account.id ? 'bg-primary-500' : 'bg-gray-200'
                  }`}>
                    <span className={`text-sm font-bold ${
                      selectedAccount?.id === account.id ? 'text-white' : 'text-gray-600'
                    }`}>
                      {account.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${selectedAccount?.id === account.id ? 'text-primary-600' : 'text-gray-900'}`}>
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-400">{account.broker}</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      ${account.currentBalance.toLocaleString()}
                    </p>
                  </div>
                  {selectedAccount?.id === account.id && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}