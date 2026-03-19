/**
 * Sticky demo mode banner shown across the app when demo mode is active.
 */

import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useNavigate } from 'react-router-dom';

export function DemoModeBanner() {
  const { isDemoMode, exitDemoMode } = useDemoMode();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-600" />
        <span className="font-medium text-amber-900">Demo Mode</span>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] font-bold">
          DEMO
        </Badge>
        <span className="text-amber-700 hidden sm:inline">— all data shown is simulated</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 text-xs h-7"
          onClick={() => navigate('/demo')}
        >
          Demo Center
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-600 hover:text-amber-900 hover:bg-amber-100 h-7 w-7"
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
