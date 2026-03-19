import { Shield, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DEMO_BANNERS } from '@/lib/demoCopy';

export function DemoBanner() {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">{DEMO_BANNERS.primary}</p>
            <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              {DEMO_BANNERS.secondary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
