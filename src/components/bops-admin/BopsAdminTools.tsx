import { useState } from 'react';
import { useRefreshAllViews, useRefreshClassroomAnalytics, useSyncTargets, useSyncProgramming, useSeedManualProfile } from '@/hooks/useBopsAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, RefreshCw, UserPlus, Link, ArrowDownToLine, BookOpen, Check } from 'lucide-react';
import { seedCanonicalLibrary } from '@/utils/seedCanonicalLibrary';
import { toast } from 'sonner';

export function BopsAdminTools() {
  const refreshAll = useRefreshAllViews();
  const refreshAnalytics = useRefreshClassroomAnalytics();
  const syncTargets = useSyncTargets();
  const syncProg = useSyncProgramming();
  const seedProfile = useSeedManualProfile();

  const [studentIdTarget, setStudentIdTarget] = useState('');
  const [studentIdProg, setStudentIdProg] = useState('');
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedingLibrary, setSeedingLibrary] = useState(false);
  const [librarySeeded, setLibrarySeeded] = useState(false);
  const [seedForm, setSeedForm] = useState({
    p_student: '', p_training_name: '', p_clinical_name: '', p_profile_type: 'dual',
    p_primary: '', p_secondary: '', p_tertiary: '',
    p_storm_score: 0, p_escalation_index: 0, p_hidden_need_index: 0,
    p_sensory_load_index: 0, p_power_conflict_index: 0,
    p_social_complexity_index: 0, p_recovery_burden_index: 0,
  });

  const handleSeedLibrary = async () => {
    setSeedingLibrary(true);
    try {
      const result = await seedCanonicalLibrary();
      toast.success(`Library seeded: ${result.domainsInserted} domains, ${result.subdomainsInserted} subdomains, ${result.frameworkTagsInserted} framework tags`);
      setLibrarySeeded(true);
    } catch (err) {
      toast.error('Failed to seed library');
      console.error(err);
    } finally {
      setSeedingLibrary(false);
    }
  };

  const tools = [
    {
      title: 'Refresh Everything',
      desc: 'Refresh all classroom genomes and analytics',
      icon: RefreshCw,
      action: () => refreshAll.mutate({}),
      loading: refreshAll.isPending,
    },
    {
      title: 'Refresh Classroom Analytics',
      desc: 'Recalculate volatility, contagion, and balance scores',
      icon: RefreshCw,
      action: () => refreshAnalytics.mutate({}),
      loading: refreshAnalytics.isPending,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map(t => (
          <Card key={t.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><t.icon className="w-4 h-4" />{t.title}</CardTitle>
              <CardDescription className="text-xs">{t.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" disabled={t.loading} onClick={t.action}>
                {t.loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} Run
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Link className="w-4 h-4" />Rebuild Student Targets</CardTitle>
            <CardDescription className="text-xs">Sync BOPS programs to student_targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Student UUID" value={studentIdTarget} onChange={e => setStudentIdTarget(e.target.value)} className="text-xs" />
            <Button size="sm" disabled={!studentIdTarget || syncTargets.isPending} onClick={() => syncTargets.mutate({ p_student: studentIdTarget })}>
              {syncTargets.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} Sync
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ArrowDownToLine className="w-4 h-4" />Rebuild Programming</CardTitle>
            <CardDescription className="text-xs">Sync BOPS bank to programming</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Student UUID" value={studentIdProg} onChange={e => setStudentIdProg(e.target.value)} className="text-xs" />
            <Button size="sm" disabled={!studentIdProg || syncProg.isPending} onClick={() => syncProg.mutate({ p_student: studentIdProg })}>
              {syncProg.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} Sync
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="w-4 h-4" />Seed Manual Profile</CardTitle>
            <CardDescription className="text-xs">Create a full BOPS profile manually</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => setSeedOpen(true)}>Open Form</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Seed Canonical Library</CardTitle>
            <CardDescription className="text-xs">Populate domains, subdomains, and framework tags</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" disabled={seedingLibrary || librarySeeded} onClick={handleSeedLibrary}>
              {seedingLibrary ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : librarySeeded ? <Check className="w-3.5 h-3.5 mr-1" /> : null}
              {librarySeeded ? 'Library Seeded ✓' : 'Seed Library'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Seed Manual Profile</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {[
              { key: 'p_student', label: 'Student UUID', type: 'text' },
              { key: 'p_training_name', label: 'Training Name', type: 'text' },
              { key: 'p_clinical_name', label: 'Clinical Name', type: 'text' },
              { key: 'p_profile_type', label: 'Profile Type', type: 'text' },
              { key: 'p_primary', label: 'Primary Archetype', type: 'text' },
              { key: 'p_secondary', label: 'Secondary Archetype', type: 'text' },
              { key: 'p_tertiary', label: 'Tertiary Archetype', type: 'text' },
              { key: 'p_storm_score', label: 'Storm Score', type: 'number' },
              { key: 'p_escalation_index', label: 'Escalation Index', type: 'number' },
              { key: 'p_hidden_need_index', label: 'Hidden Need Index', type: 'number' },
              { key: 'p_sensory_load_index', label: 'Sensory Load Index', type: 'number' },
              { key: 'p_power_conflict_index', label: 'Power Conflict Index', type: 'number' },
              { key: 'p_social_complexity_index', label: 'Social Complexity Index', type: 'number' },
              { key: 'p_recovery_burden_index', label: 'Recovery Burden Index', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type={f.type}
                  value={(seedForm as any)[f.key]}
                  onChange={e => setSeedForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedOpen(false)}>Cancel</Button>
            <Button disabled={!seedForm.p_student || !seedForm.p_primary || seedProfile.isPending}
              onClick={() => {
                seedProfile.mutate(seedForm);
                setSeedOpen(false);
              }}>
              {seedProfile.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Seed Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
