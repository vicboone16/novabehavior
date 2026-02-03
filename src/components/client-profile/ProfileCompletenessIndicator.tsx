import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import type { ProfileCompleteness } from '@/types/clientProfile';
import { cn } from '@/lib/utils';

interface ProfileCompletenessIndicatorProps {
  completeness: ProfileCompleteness;
  compact?: boolean;
}

export function ProfileCompletenessIndicator({ completeness, compact = false }: ProfileCompletenessIndicatorProps) {
  const { status, score, missing, warnings } = completeness;

  const getStatusColor = () => {
    if (status === 'complete') return 'bg-green-500';
    if (status === 'partial') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'partial') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusLabel = () => {
    if (status === 'complete') return 'Complete';
    if (status === 'partial') return 'Partial';
    return 'Incomplete';
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", getStatusColor())} />
            <span className="text-sm text-muted-foreground">{score}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">Profile {getStatusLabel()}</p>
            {missing.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Missing:</p>
                <ul className="text-xs list-disc list-inside">
                  {missing.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <p className="text-xs text-amber-600">Warnings:</p>
                <ul className="text-xs list-disc list-inside text-amber-600">
                  {warnings.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Profile Completeness</span>
          <Badge variant={status === 'complete' ? 'default' : status === 'partial' ? 'secondary' : 'destructive'}>
            {getStatusLabel()}
          </Badge>
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
      
      <Progress value={score} className="h-2" />
      
      {missing.length > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Required to complete:</p>
          <div className="flex flex-wrap gap-1">
            {missing.map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700">
            {warnings.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
