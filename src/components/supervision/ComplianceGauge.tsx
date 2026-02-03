interface ComplianceGaugeProps {
  percentage: number;
  target: number;
}

export function ComplianceGauge({ percentage, target }: ComplianceGaugeProps) {
  const isCompliant = percentage >= target;
  const displayPercentage = Math.min(percentage, 100);
  
  const getColor = () => {
    if (percentage >= target) return 'text-green-500';
    if (percentage >= target * 0.8) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <path
            className="text-muted stroke-current"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Progress circle */}
          <path
            className={`${getColor()} stroke-current`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${displayPercentage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${getColor()}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Target: {target}%
      </div>
    </div>
  );
}
