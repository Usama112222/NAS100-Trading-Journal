import { Download, Sparkles } from 'lucide-react';

interface WelcomeBannerProps {
  userName: string;
}

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 via-primary-50 to-primary-50 rounded-2xl border border-primary-100">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {userName}! 👋</h2>
          <p className="text-gray-600 mt-1">Great to see you. Your trading performance is looking strong today.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Analysis
          </button>
        </div>
      </div>
    </div>
  );
}