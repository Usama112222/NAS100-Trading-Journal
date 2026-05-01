import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'up' | 'down';
  iconBgColor?: string;
  iconColor?: string;
  children?: ReactNode;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'up',
  iconBgColor = 'bg-primary-50',
  iconColor = 'text-primary-600',
  children
}: StatsCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 ${iconBgColor} rounded-xl`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change && (
          <span className={`text-xs ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}