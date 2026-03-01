import { useState, useEffect } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings2, Info } from 'lucide-react';

interface BillingProfile {
  utilization_policy: string;
  allow_mobile_post_hours: boolean;
  require_note_final_to_post: boolean;
  auto_post_on_note_finalize: boolean;
}

const defaults: BillingProfile = {
  utilization_policy: 'separate',
  allow_mobile_post_hours: false,
  require_note_final_to_post: true,
  auto_post_on_note_finalize: false,
};

export default function AgencyBillingPolicy() {
  const { currentAgency, loading: agencyLoading } = useAgencyContext();
  const [profile, setProfile] = useState<BillingProfile>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentAgency) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('agency_billing_profiles')
        .select('utilization_policy, allow_mobile_post_hours, require_note_final_to_post, auto_post_on_note_finalize')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();
      if (data) {
        setProfile({
          utilization_policy: data.utilization_policy ?? defaults.utilization_policy,
          allow_mobile_post_hours: data.allow_mobile_post_hours ?? defaults.allow_mobile_post_hours,
          require_note_final_to_post: data.require_note_final_to_post ?? defaults.require_note_final_to_post,
          auto_post_on_note_finalize: data.auto_post_on_note_finalize ?? defaults.auto_post_on_note_finalize,
        });
      }
      setLoading(false);
    })();
  }, [currentAgency]);

  const handleSave = async () => {
    if (!currentAgency) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('rpc_update_agency_billing_policy', {
        p_agency_id: currentAgency.id,
        p_utilization_policy: profile.utilization_policy,
        p_allow_mobile_post_hours: profile.allow_mobile_post_hours,
        p_require_note_final_to_post: profile.require_note_final_to_post,
        p_auto_post_on_note_finalize: profile.auto_post_on_note_finalize,
      });
      if (error) throw error;
      toast.success('Billing policy saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (agencyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentAgency) {
    return (
      <div className="p-6 text-center text-muted-foreground">No agency selected.</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Utilization Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how {currentAgency.name} handles session posting and utilization tracking.
        </p>
      </div>

      {/* Helper banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 items-start pt-4 pb-4">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">
            <strong>Reserved</strong> holds units against an authorization without entering the billing pipeline.{' '}
            <strong>Posted</strong> deducts units and enters the billing pipeline for claim generation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Utilization Controls
          </CardTitle>
          <CardDescription>
            These settings apply to all clinicians within this agency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Utilization Policy */}
          <div className="space-y-2">
            <Label htmlFor="utilization_policy">Utilization Policy</Label>
            <Select
              value={profile.utilization_policy}
              onValueChange={(v) => setProfile((p) => ({ ...p, utilization_policy: v }))}
            >
              <SelectTrigger id="utilization_policy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="separate">
                  Separate — reserve and post are distinct manual steps
                </SelectItem>
                <SelectItem value="hybrid">
                  Hybrid — auto-reserve on session save, manual post
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls how sessions transition from reserved to posted status.
            </p>
          </div>

          {/* Allow Mobile Post */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow_mobile">Allow Mobile Post Hours</Label>
              <p className="text-xs text-muted-foreground">
                Let staff post hours directly from the mobile app.
              </p>
            </div>
            <Switch
              id="allow_mobile"
              checked={profile.allow_mobile_post_hours}
              onCheckedChange={(v) => setProfile((p) => ({ ...p, allow_mobile_post_hours: v }))}
            />
          </div>

          {/* Require Note Final */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="require_note">Require Note Finalized to Post</Label>
              <p className="text-xs text-muted-foreground">
                Sessions cannot be posted until the session note is finalized.
              </p>
            </div>
            <Switch
              id="require_note"
              checked={profile.require_note_final_to_post}
              onCheckedChange={(v) => setProfile((p) => ({ ...p, require_note_final_to_post: v }))}
            />
          </div>

          {/* Auto Post on Finalize */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto_post">Auto-Post on Note Finalize</Label>
              <p className="text-xs text-muted-foreground">
                Automatically post hours when the session note is finalized.
              </p>
            </div>
            <Switch
              id="auto_post"
              checked={profile.auto_post_on_note_finalize}
              onCheckedChange={(v) => setProfile((p) => ({ ...p, auto_post_on_note_finalize: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Policy
        </Button>
      </div>
    </div>
  );
}
