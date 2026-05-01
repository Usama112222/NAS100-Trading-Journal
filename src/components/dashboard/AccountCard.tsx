'use client';

interface AccountCardProps {
  account: {
    accountId: string;
    accountName: string;
  };
  onClick: () => void;
}

export default function AccountCard({ account, onClick }: AccountCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center group-hover:from-primary-500 group-hover:to-primary-600 transition-all">
          <span className="text-primary-600 font-bold text-xl group-hover:text-white transition-all">
            {account.accountName.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{account.accountName}</p>
          <p className="text-xs text-gray-500">Click to view trades</p>
        </div>
      </div>
    </div>
  );
}