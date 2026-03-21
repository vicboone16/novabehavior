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
          No BOPS profile found for this student. Start a BOPS assessment to generate one.
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
          <CardTitle className="text-lg">BOPS Profile</CardTitle>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clinical Name</p>
          <p className="text-lg font-semibold mt-1">{profile.clinical_name}</p>
          <p className="text-sm text-muted-foreground">{profile.training_name}</p>
        </div>

        {/* Archetypes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Primary</p>
            <p className="font-semibold text-primary">{profile.primary_archetype}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Secondary</p>
            <p className="font-semibold">{profile.secondary_archetype}</p>
          </div>
          {profile.tertiary_archetype && (
            <div className="p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Tertiary</p>
              <p className="font-semibold">{profile.tertiary_archetype}</p>
            </div>
          )}
        </div>

        {/* Supporting Drivers */}
        {drivers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Supporting Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {drivers.map((d: string) => <Badge key={d} variant="outline">{d}</Badge>)}
            </div>
          </div>
        )}

        {/* Functions & Safety */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Primary Functions</p>
            <div className="flex flex-wrap gap-1.5">
              {functions.map((f: string) => <Badge key={f} variant="secondary">{f}</Badge>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Safety Flags</p>
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f: string) => <Badge key={f} variant="destructive">{f}</Badge>)}
            </div>
          </div>
        </div>

        {/* Active Domains */}
        {domains.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Active Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {domains.map((d: string) => <Badge key={d} variant="outline">{d}</Badge>)}
            </div>
          </div>
        )}

        {/* CFI */}
        {profile.recommended_cfi && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground">Recommended Placement (CFI)</p>
            <p className="font-medium">{profile.recommended_cfi}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
