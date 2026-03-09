import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FlaskConical, Search } from 'lucide-react';

export function AnalysisWorkspaceSection() {
  const [designFilter, setDesignFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Analysis Workspace
          </CardTitle>
          <CardDescription className="text-xs">
            Filter, preview, and analyze single-case design graphs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Design Type</Label>
              <Select value={designFilter} onValueChange={setDesignFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designs</SelectItem>
                  <SelectItem value="multiple_baseline">Multiple Baseline</SelectItem>
                  <SelectItem value="changing_criterion">Changing Criterion</SelectItem>
                  <SelectItem value="reversal">Reversal</SelectItem>
                  <SelectItem value="alternating_treatments">Alternating Treatments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="gap-1">
                <Search className="w-3.5 h-3.5" /> Load
              </Button>
            </div>
          </div>

          {/* Graph preview area */}
          <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground">
            <FlaskConical className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Graph Preview Area</p>
            <p className="text-xs">Select filters and load data to render research-style graphs with phase lines, criterion steps, and aligned series</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
