/**
 * Sticky demo mode banner shown across the app when demo mode is active.
 */

import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useNavigate } from 'react-router-dom';

export function DemoModeBanner() {
  const { isDemoMode, exitDemoMode } = useDemoMode();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  return (
    <div className="bg-demo-banner border-b border-demo-banner-border px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-demo-accent" />
        <span className="font-medium text-demo-banner-foreground">Demo Mode</span>
        <StatusBadge variant="demo">DEMO</StatusBadge>
        <span className="text-demo-banner-foreground/70 hidden sm:inline">— all data shown is simulated</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-demo-banner-foreground hover:bg-demo-surface text-xs h-7"
          onClick={() => navigate('/demo')}
        >
          Demo Center
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-demo-accent hover:bg-demo-surface h-7 w-7"
          onClick={() => {
            exitDemoMode();
            navigate('/');
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
