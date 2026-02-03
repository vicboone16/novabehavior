import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Referral, REFERRAL_STAGES } from '@/types/referral';
import { differenceInDays } from 'date-fns';
import { User, Calendar, AlertCircle } from 'lucide-react';

interface ReferralCardProps {
  referral: Referral;
  onClick: () => void;
  variant?: 'kanban' | 'list';
}

export function ReferralCard({ referral, onClick, variant = 'kanban' }: ReferralCardProps) {
  const daysInPipeline = differenceInDays(new Date(), new Date(referral.created_at));
  const stage = REFERRAL_STAGES.find(s => s.value === referral.status);
  
  const getPriorityColor = () => {
    switch (referral.priority_level) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (variant === 'list') {
    return (
      <div 
        onClick={onClick}
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-2 h-8 rounded-full ${getPriorityColor()}`} />
          <div>
            <p className="font-medium">{referral.client_first_name} {referral.client_last_name}</p>
            <p className="text-sm text-muted-foreground">
              {referral.source} • {new Date(referral.referral_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={stage?.color.replace('bg-', 'border-')}>
            {stage?.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{daysInPipeline}d</span>
        </div>
      </div>
    );
  }

  return (
    <Card 
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">
              {referral.client_first_name} {referral.client_last_name}
            </p>
            {referral.client_dob && (
              <p className="text-xs text-muted-foreground">
                Age: {differenceInDays(new Date(), new Date(referral.client_dob)) / 365 | 0}
              </p>
            )}
          </div>
          <div className={`w-2 h-2 rounded-full ${getPriorityColor()}`} />
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span className="capitalize">{referral.source}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{daysInPipeline} days</span>
          </div>
          {referral.priority_level === 'urgent' && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
