import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function DemoBanner() {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">This is a demo workspace</p>
            <p className="text-xs text-amber-700 mt-0.5">
              All data is fake and isolated from live tenants. School, clinic, home, and multi-payer workflows are represented.
              Records are clearly labeled DEMO throughout.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
