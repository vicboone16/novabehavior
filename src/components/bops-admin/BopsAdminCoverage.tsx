import { useState } from 'react';
import { useBopsCoverageAudit, useBopsMasterPrograms } from '@/hooks/useBopsAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronRight } from 'lucide-react';

export function BopsAdminCoverage() {
  const { data: audit, isLoading } = useBopsCoverageAudit();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMissing, setFilterMissing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | undefined>();
  const { data: programs, isLoading: loadingPrograms } = useBopsMasterPrograms(selectedProfile);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const types = [...new Set((audit || []).map((a: any) => a.profile_type))] as string[];
  const totalCovered = (audit || []).filter((a: any) => !a.missing_programs).length;
  const totalMissing = (audit || []).filter((a: any) => a.missing_programs).length;

  const filtered = (audit || []).filter((a: any) => {
    if (filterType !== 'all' && a.profile_type !== filterType) return false;
    if (filterMissing && !a.missing_programs) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Covered</p><p className="text-2xl font-bold">{totalCovered}</p></CardContent></Card>
        <Card className={totalMissing > 0 ? 'border-destructive/50' : ''}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Missing</p><p className={`text-2xl font-bold ${totalMissing > 0 ? 'text-destructive' : ''}`}>{totalMissing}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Profiles</p><p className="text-2xl font-bold">{(audit || []).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Profile Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={filterMissing ? 'default' : 'outline'} size="sm" onClick={() => setFilterMissing(!filterMissing)}>
          Missing Only
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Profile Key</TableHead>
                <TableHead className="text-right">Programs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.profile_key} className={a.missing_programs ? 'bg-destructive/5' : ''}>
                  <TableCell><Badge variant="outline" className="text-xs">{a.profile_type}</Badge></TableCell>
                  <TableCell className="text-xs font-mono max-w-[200px] truncate">{a.profile_key}</TableCell>
                  <TableCell className="text-right">{a.total_programs}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedProfile(a.profile_key)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedProfile && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Programs for: {selectedProfile}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrograms ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {(programs || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No programs found for this profile.</p>
                  ) : (programs || []).map((p: any) => (
                    <div key={p.id || p.program_key} className="border rounded p-2 text-xs space-y-0.5">
                      <p className="font-medium">{p.program_name}</p>
                      <p className="text-muted-foreground">{p.program_type} • {p.domain}</p>
                      <p>{p.goal_title}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
