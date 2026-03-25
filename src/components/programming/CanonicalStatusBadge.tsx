import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusDisplay } from '@/hooks/useCanonicalBehaviors';
import { Archive, GitMerge, AlertTriangle, FileQuestion, Clock, MapPin, Puzzle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CanonicalStatusBadgeProps {
  status: string | null;
  originalId?: string | null;
  effectiveId?: string | null;
  successorName?: string | null;
  size?: 'sm' | 'default';
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  archived: <Archive className="h-3 w-3" />,
  merged: <GitMerge className="h-3 w-3" />,
  deprecated: <AlertTriangle className="h-3 w-3" />,
  draft: <FileQuestion className="h-3 w-3" />,
  historical: <Clock className="h-3 w-3" />,
};

export function CanonicalStatusBadge({
  status,
  originalId,
  effectiveId,
  successorName,
  size = 'default',
}: CanonicalStatusBadgeProps) {
  const display = getStatusDisplay(status, originalId, effectiveId, successorName);

  if (status === 'active' && originalId === effectiveId) {
    return null; // Don't show badge for normal active items
  }

  const icon = STATUS_ICONS[status || ''];
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={display.variant} className={`${textSize} gap-1 font-normal`}>
            {icon}
            {display.label}
          </Badge>
        </TooltipTrigger>
        {display.description && (
          <TooltipContent>
            <p className="text-xs">{display.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
