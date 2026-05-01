'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Activity, 
  Settings,
  Calendar,
  PlusCircle,
  Users,
  BarChart3,
  TrendingDown,
  Brain,
  Shield,
  LogOut
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'New Trade', icon: PlusCircle, href: '/new-trade' },
  { name: 'Accounts', icon: Users, href: '/accounts' }, 
  { name: 'Trades', icon: Activity, href: '/trades' },
  { name: 'Calendar', icon: Calendar, href: '/calendar' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Drawdown', icon: TrendingDown, href: '/drawdown' },
  { name: 'Psychology', icon: Brain, href: '/psychology' },
  { name: 'Risk', icon: Shield, href: '/risk' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex flex-col flex-1 bg-white border-r border-gray-200 shadow-sm">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                KUTrades
              </h1>
              <p className="text-xs text-gray-500">Trade Smarter</p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-lg">
                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-semibold text-sm">{user?.displayName || 'Trader'}</p>
              <p className="text-xs text-primary-600 truncate max-w-[140px]">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 mt-auto">
          <div className="text-center">
            <p className="text-xs text-gray-400">© 2024 KUTrades</p>
            <p className="text-xs text-gray-400 mt-1">All rights reserved</p>
          </div>
        </div>
      </div>
    </aside>
  );
}