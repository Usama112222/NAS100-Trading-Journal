'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, RefreshCw, Plus, Menu, Settings, TrendingUp, Users } from 'lucide-react';
import { useTradingData } from '@/hooks/useTradingData';

export default function Header() {
  const router = useRouter();
  const { refreshData } = useTradingData();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">KUTrades</h1>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Accounts Button */}
            <button 
              onClick={() => router.push('/accounts')}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="Manage Accounts"
            >
              <Users className="w-5 h-5" />
            </button>
            
            {/* Refresh Button */}
            <button 
              onClick={refreshData}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            {/* Notifications Button */}
            <button className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
            </button>
            
            {/* Settings Button */}
            <button 
              onClick={() => router.push('/settings')}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {/* New Trade Button */}
            <button 
              onClick={() => router.push('/new-trade')}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Trade</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}