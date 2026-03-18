import { FlaskConical, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const DEMO_BADGE = () => (
  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
    DEMO
  </Badge>
);

export function DemoCenterHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
        <FlaskConical className="w-6 h-6 text-amber-700" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Demo Center</h1>
          <DEMO_BADGE />
        </div>
        <p className="text-sm text-muted-foreground">
          Nova Behavioral Collaborative — a fully lived-in demo ecosystem
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.open('/help-center', '_self')}>
        <BookOpen className="w-4 h-4 mr-1" /> Help Center
      </Button>
    </div>
  );
}
