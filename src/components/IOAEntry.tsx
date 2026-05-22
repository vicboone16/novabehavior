import { useState, useMemo } from 'react';
import { BarChart2, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDataStore } from '@/store/dataStore';
import { IOAEntry } from '@/types/behavior';
import { format } from 'date-fns';

interface IOAEntryPanelProps {
  studentId: string;
  behaviorId: string;
  behaviorName: string;
  studentColor?: string;
}

const METHOD_LABELS: Record<IOAEntry['method'], string> = {
  total_count: 'Total Count (overall count agreement)',
  point_by_point: 'Point-by-Point (trial-level agreement)',
  interval: 'Interval-by-Interval (interval agreement)',
};

const IOA_THRESHOLD = 80;

export function IOAEntryPanel({ studentId, behaviorId, behaviorName, studentColor }: IOAEntryPanelProps) {
  const { addIOAEntry, getIOAEntries, deleteIOAEntry } = useDataStore() as any;
  const [showDialog, setShowDialog] = useState(false);

  const [method, setMethod] = useState<IOAEntry['method']>('total_count');
  const [primaryCount, setPrimaryCount] = useState('');
  const [secondaryCount, setSecondaryCount] = useState('');
  const [agreements, setAgreements] = useState('');
  const [totalOpportunities, setTotalOpportunities] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const existingEntries: IOAEntry[] = useMemo(
    () => getIOAEntries(studentId, behaviorId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentId, behaviorId, showDialog]
  );

  const calculatedIOA = useMemo(() => {
    if (method === 'total_count') {
      const p = parseFloat(primaryCount);
      const s = parseFloat(secondaryCount);
      if (isNaN(p) || isNaN(s) || p + s === 0) return null;
      const smaller = Math.min(p, s);
      const larger = Math.max(p, s);
      return larger === 0 ? 100 : Math.round((smaller / larger) * 100);
    }
    if (method === 'point_by_point' || method === 'interval') {
      const a = parseFloat(agreements);
      const t = parseFloat(totalOpportunities);
      if (isNaN(a) || isNaN(t) || t === 0) return null;
      return Math.round((a / t) * 100);
    }
    return null;
  }, [method, primaryCount, secondaryCount, agreements, totalOpportunities]);

  const handleSave = () => {
    if (calculatedIOA === null) return;
    addIOAEntry({
      studentId,
      behaviorId,
      date: new Date(date),
      method,
      primaryObserverCount: method === 'total_count' ? parseFloat(primaryCount) : undefined,
      secondaryObserverCount: method === 'total_count' ? parseFloat(secondaryCount) : undefined,
      agreements: method !== 'total_count' ? parseFloat(agreements) : undefined,
      totalOpportunities: method !== 'total_count' ? parseFloat(totalOpportunities) : undefined,
      agreementPercentage: calculatedIOA,
      notes: notes.trim() || undefined,
    });
    // Reset
    setPrimaryCount('');
    setSecondaryCount('');
    setAgreements('');
    setTotalOpportunities('');
    setNotes('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setShowDialog(false);
  };

  const avgIOA = existingEntries.length > 0
    ? Math.round(existingEntries.reduce((s, e) => s + e.agreementPercentage, 0) / existingEntries.length)
    : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        style={{ borderColor: studentColor }}
        onClick={() => setShowDialog(true)}
      >
        <BarChart2 className="w-3.5 h-3.5" />
        IOA {avgIOA !== null && (
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 ${avgIOA >= IOA_THRESHOLD ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {avgIOA}%
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Inter-Observer Agreement — {behaviorName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* New entry form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Record IOA Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as IOAEntry['method'])}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(METHOD_LABELS) as [IOAEntry['method'], string][]).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {method === 'total_count' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary Observer Count</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8 text-sm"
                        value={primaryCount}
                        onChange={(e) => setPrimaryCount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Secondary Observer Count</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8 text-sm"
                        value={secondaryCount}
                        onChange={(e) => setSecondaryCount(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {(method === 'point_by_point' || method === 'interval') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Agreements</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8 text-sm"
                        value={agreements}
                        onChange={(e) => setAgreements(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total Opportunities</Label>
                      <Input
                        type="number"
                        min="1"
                        className="h-8 text-sm"
                        value={totalOpportunities}
                        onChange={(e) => setTotalOpportunities(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {calculatedIOA !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Calculated IOA</span>
                      <span
                        className={`font-bold text-base ${
                          calculatedIOA >= IOA_THRESHOLD ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {calculatedIOA}%
                      </span>
                    </div>
                    <Progress value={calculatedIOA} className="h-2" />
                    {calculatedIOA < IOA_THRESHOLD && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Below 80% threshold — data may not be reliable
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    className="text-sm min-h-[60px]"
                    placeholder="Observer names, conditions, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={calculatedIOA === null}
                  style={{ backgroundColor: studentColor }}
                >
                  Save IOA Record
                </Button>
              </CardContent>
            </Card>

            {/* History */}
            {existingEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">IOA History</Label>
                  {avgIOA !== null && (
                    <Badge
                      className={avgIOA >= IOA_THRESHOLD ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                    >
                      Avg: {avgIOA}%
                    </Badge>
                  )}
                </div>
                {existingEntries
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {entry.agreementPercentage >= IOA_THRESHOLD ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), 'MMM d, yyyy')} · {METHOD_LABELS[entry.method]}
                          </div>
                          {entry.notes && (
                            <div className="text-xs text-muted-foreground">{entry.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            entry.agreementPercentage >= IOA_THRESHOLD ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {entry.agreementPercentage}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteIOAEntry(entry.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
