import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BrainCircuit } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface NovaAIAction {
  label: string;
  prompt: string;
  mode?: string;
}

interface NovaAILauncherProps {
  clientId?: string;
  clientName?: string;
  context?: string;
  actions?: NovaAIAction[];
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'icon';
}

export function NovaAILauncher({
  clientId,
  clientName,
  context,
  actions,
  variant = 'dropdown',
  size = 'sm',
}: NovaAILauncherProps) {
  const navigate = useNavigate();

  const launchNovaAI = (prompt?: string, mode?: string) => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    if (prompt) params.set('prompt', prompt);
    if (mode) params.set('mode', mode);
    if (context) params.set('context', context);
    navigate(`/nova-ai?${params.toString()}`);
  };

  if (variant === 'button' || !actions?.length) {
    return (
      <Button
        variant="outline"
        size={size}
        className="gap-1.5"
        onClick={() => launchNovaAI()}
      >
        <BrainCircuit className="w-3.5 h-3.5" />
        Ask Nova AI
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5" />
          Ask Nova AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => launchNovaAI()}>
          <BrainCircuit className="w-3.5 h-3.5 mr-2" />
          Open Nova AI
        </DropdownMenuItem>
        {actions.map((a, i) => (
          <DropdownMenuItem key={i} onClick={() => launchNovaAI(a.prompt, a.mode)}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
