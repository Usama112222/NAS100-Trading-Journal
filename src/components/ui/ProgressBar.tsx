interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ 
  value, 
  max = 100, 
  color = 'bg-primary-500',
  height = 'h-2',
  showLabel = false
}: ProgressBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs text-gray-600">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${height}`}>
        <div 
          className={`${color} rounded-full ${height}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}