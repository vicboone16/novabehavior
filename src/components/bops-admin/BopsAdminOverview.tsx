import { useBopsAdminDashboard } from '@/hooks/useBopsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Users, Brain, Target, LayoutGrid, BarChart3 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function BopsAdminOverview() {
  const { data: d, isLoading } = useBopsAdminDashboard();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!d) return <p className="text-muted-foreground text-sm p-4">No dashboard data available.</p>;

  const kpis = [
    { label: 'Total Profiles', value: d.total_profiles, icon: Brain },
    { label: 'Missing Programs', value: d.profiles_missing_programs, icon: AlertTriangle, warn: d.profiles_missing_programs > 0 },
    { label: 'Total Programs', value: d.total_programs, icon: Target },
    { label: 'BOPS Students', value: d.total_bops_students, icon: Users },
    { label: 'Enabled', value: d.enabled_students, icon: CheckCircle },
    { label: 'Profile Saved', value: d.profile_saved_students, icon: CheckCircle },
    { label: 'Programming Active', value: d.programming_active_students, icon: CheckCircle },
    { label: 'Program Bank Rows', value: d.total_bank_rows, icon: LayoutGrid },
    { label: 'Student Targets', value: d.total_bops_targets, icon: Target },
    { label: 'Classroom Genomes', value: d.total_genomes, icon: BarChart3 },
    { label: 'Classroom Analytics', value: d.total_analytics, icon: BarChart3 },
  ];

  const warnings: string[] = [];
  if (d.profiles_missing_programs > 0) warnings.push(`${d.profiles_missing_programs} profiles have no mapped programs.`);
  if (d.profile_saved_students > 0 && d.programming_active_students < d.profile_saved_students * 0.5)
    warnings.push(`Only ${d.programming_active_students}/${d.profile_saved_students} profiled students have active programming.`);
  if (d.total_genomes === 0) warnings.push('No classroom genomes generated yet. Run genome refresh.');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className={k.warn ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.warn ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className={`text-2xl font-bold ${k.warn ? 'text-destructive' : ''}`}>{k.value ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {warnings.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              System Health Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-destructive">• {w}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
