import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  studentId: string;
  profile: any;
}

export function BopsProfileCard({ profile }: Props) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-base font-medium text-foreground mb-1">No BOPS Profile Found</p>
          <p className="text-sm">Start a BOPS assessment to generate a behavioral profile for this student.</p>
        </CardContent>
      </Card>
    );
  }

  const drivers = Array.isArray(profile.supporting_drivers) ? profile.supporting_drivers : [];
  const functions = Array.isArray(profile.primary_functions) ? profile.primary_functions : [];
  const flags = Array.isArray(profile.safety_flags) ? profile.safety_flags : [];
  const domains = Array.isArray(profile.active_domains) ? profile.active_domains : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-foreground">BOPS Profile</CardTitle>
          <div className="flex gap-2">
            <Badge variant={profile.bops_assessment_status === 'completed' ? 'default' : 'secondary'}>
              {profile.bops_assessment_status}
            </Badge>
            <Badge variant="outline">{profile.profile_type}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Constellation */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Training Name</p>
          <p className="text-lg font-bold text-foreground mt-1">{profile.training_name}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3">Clinical Name</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{profile.clinical_name}</p>
        </div>

        {/* Archetypes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-primary/5">
            <p className="text-xs font-semibold text-muted-foreground">Primary</p>
            <p className="font-bold text-primary text-base">{profile.primary_archetype}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs font-semibold text-muted-foreground">Secondary</p>
            <p className="font-semibold text-foreground text-base">{profile.secondary_archetype}</p>
          </div>
          {profile.tertiary_archetype && (
            <div className="p-3 rounded-lg border">
              <p className="text-xs font-semibold text-muted-foreground">Tertiary</p>
              <p className="font-semibold text-foreground text-base">{profile.tertiary_archetype}</p>
            </div>
          )}
        </div>

        {/* Supporting Drivers */}
        {drivers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Supporting Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {drivers.map((d: string) => <Badge key={d} variant="outline" className="text-foreground">{d}</Badge>)}
            </div>
          </div>
        )}

        {/* Functions & Safety */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Primary Functions</p>
            <div className="flex flex-wrap gap-1.5">
              {functions.length > 0 ? functions.map((f: string) => <Badge key={f} variant="secondary">{f}</Badge>) : <span className="text-sm text-muted-foreground">None identified</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Safety Flags</p>
            <div className="flex flex-wrap gap-1.5">
              {flags.length > 0 ? flags.map((f: string) => <Badge key={f} variant="destructive">{f}</Badge>) : <span className="text-sm text-muted-foreground">None</span>}
            </div>
          </div>
        </div>

        {/* Active Domains */}
        {domains.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Active Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {domains.map((d: string) => <Badge key={d} variant="outline" className="text-foreground">{d}</Badge>)}
            </div>
          </div>
        )}

        {/* CFI */}
        {profile.recommended_cfi && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground">Recommended Placement (CFI)</p>
            <p className="font-semibold text-foreground">{profile.recommended_cfi}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}