import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings2, Mail, MessageSquare, Eye, Shield, Copy, Check } from 'lucide-react';

interface ReportProfile {
  id: string;
  name: string;
  scope_type: string;
  scope_id: string;
  cadence: string;
  delivery_mode: string;
  detail_level: string;
  tone: string;
  active: boolean;
}

interface ProfileRules {
  id: string;
  profile_id: string;
  include_points: boolean;
  include_rewards: boolean;
  include_behavior_counts: boolean;
  include_engagement: boolean;
  include_charts: boolean;
  include_teacher_note: boolean;
  include_positive_highlight: boolean;
  include_photos: boolean;
  include_replacement_behavior_progress: boolean;
  include_abc_detail: boolean;
  include_weekly_graphs: boolean;
  allow_reply: boolean;
}

interface ParentReportConfigPanelProps {
  studentId?: string;
  classroomId?: string;
  agencyId?: string;
}

const CADENCE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'both', label: 'Daily + Weekly' },
  { value: 'manual', label: 'Manual Only' },
];

const DELIVERY_OPTIONS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'secure_link', label: 'Secure Link' },
  { value: 'portal', label: 'Behavior Decoded Portal' },
];

const DETAIL_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'custom', label: 'Custom' },
];

const TONE_OPTIONS = [
  { value: 'celebratory', label: 'Celebratory' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'teacher_friendly', label: 'Teacher-Friendly' },
];

const TOGGLE_FIELDS: { key: keyof Omit<ProfileRules, 'id' | 'profile_id'>; label: string; description: string }[] = [
  { key: 'include_points', label: 'Points Earned', description: 'Show Beacon Points totals' },
  { key: 'include_rewards', label: 'Rewards Redeemed', description: 'Show reward redemption activity' },
  { key: 'include_behavior_counts', label: 'Behavior Counts', description: 'Show behavior frequency data' },
  { key: 'include_engagement', label: 'Engagement %', description: 'Show engagement percentage' },
  { key: 'include_charts', label: 'Trend Charts', description: 'Include visual trend charts' },
  { key: 'include_teacher_note', label: 'Teacher Note', description: 'Include teacher written note' },
  { key: 'include_positive_highlight', label: 'Positive Highlight', description: 'Show top win of the day' },
  { key: 'include_photos', label: 'Photos / Posts', description: 'Include classroom photos' },
  { key: 'include_replacement_behavior_progress', label: 'Replacement Behavior', description: 'Show replacement behavior progress' },
  { key: 'include_abc_detail', label: 'ABC Detail', description: 'Include antecedent-behavior-consequence detail' },
  { key: 'include_weekly_graphs', label: 'Weekly Graphs', description: 'Include weekly breakdown graphs' },
  { key: 'allow_reply', label: 'Allow Reply', description: 'Let parent reply to this report' },
];

export function ParentReportConfigPanel({ studentId, classroomId, agencyId }: ParentReportConfigPanelProps) {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Fetch all profiles (presets + custom)
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['parent-report-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_report_profiles')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as ReportProfile[];
    },
  });

  // Fetch rules for selected profile
  const { data: rules } = useQuery({
    queryKey: ['parent-report-rules', selectedProfileId],
    enabled: !!selectedProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_report_profile_rules')
        .select('*')
        .eq('profile_id', selectedProfileId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as ProfileRules | null;
    },
  });

  // Auto-select first profile
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  // Update profile settings
  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<ReportProfile>) => {
      if (!selectedProfileId) return;
      const { error } = await supabase
        .from('parent_report_profiles')
        .update(updates as any)
        .eq('id', selectedProfileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-report-profiles'] });
      toast.success('Profile updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update rules
  const updateRules = useMutation({
    mutationFn: async (updates: Partial<ProfileRules>) => {
      if (!rules?.id) return;
      const { error } = await supabase
        .from('parent_report_profile_rules')
        .update(updates as any)
        .eq('id', rules.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-report-rules', selectedProfileId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Duplicate preset as custom
  const duplicateProfile = useMutation({
    mutationFn: async () => {
      if (!selectedProfile || !rules) return;
      const { data: newProfile, error: pErr } = await supabase
        .from('parent_report_profiles')
        .insert({
          name: `${selectedProfile.name} (Copy)`,
          scope_type: studentId ? 'student' : classroomId ? 'classroom' : 'agency',
          scope_id: studentId || classroomId || agencyId || selectedProfile.scope_id,
          cadence: selectedProfile.cadence,
          delivery_mode: selectedProfile.delivery_mode,
          detail_level: selectedProfile.detail_level,
          tone: selectedProfile.tone,
          active: true,
        } as any)
        .select()
        .single();
      if (pErr) throw pErr;

      const { id: _id, profile_id: _pid, ...ruleData } = rules;
      const { error: rErr } = await supabase
        .from('parent_report_profile_rules')
        .insert({ ...ruleData, profile_id: (newProfile as any).id } as any);
      if (rErr) throw rErr;

      return newProfile;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['parent-report-profiles'] });
      if (data?.id) setSelectedProfileId(data.id);
      toast.success('Profile duplicated — customize it for this scope');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (profilesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPreset = selectedProfile?.scope_type === 'preset';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Parent Communication Settings
        </CardTitle>
        <CardDescription>
          Configure what parents see, when they see it, and how they receive updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="profile" className="gap-1 text-xs">
              <Mail className="w-3 h-3" /> Profile
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1 text-xs">
              <Eye className="w-3 h-3" /> Content
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1 text-xs">
              <Shield className="w-3 h-3" /> Access
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-4">
            {/* Profile selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Profile</Label>
              <div className="flex gap-2 flex-wrap">
                {profiles.map(p => (
                  <Button
                    key={p.id}
                    variant={p.id === selectedProfileId ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedProfileId(p.id)}
                  >
                    {p.name}
                    {p.scope_type === 'preset' && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1">Preset</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {isPreset && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground flex-1">
                  This is a system preset. Duplicate it to create a custom version you can edit.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs shrink-0"
                  onClick={() => duplicateProfile.mutate()}
                  disabled={duplicateProfile.isPending}
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </Button>
              </div>
            )}

            <Separator />

            {/* Settings grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cadence</Label>
                <Select
                  value={selectedProfile?.cadence || 'daily'}
                  onValueChange={v => updateProfile.mutate({ cadence: v })}
                  disabled={isPreset}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADENCE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Delivery</Label>
                <Select
                  value={selectedProfile?.delivery_mode || 'email'}
                  onValueChange={v => updateProfile.mutate({ delivery_mode: v })}
                  disabled={isPreset}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Detail Level</Label>
                <Select
                  value={selectedProfile?.detail_level || 'standard'}
                  onValueChange={v => updateProfile.mutate({ detail_level: v })}
                  disabled={isPreset}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DETAIL_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tone</Label>
                <Select
                  value={selectedProfile?.tone || 'neutral'}
                  onValueChange={v => updateProfile.mutate({ tone: v })}
                  disabled={isPreset}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* CONTENT TOGGLES TAB */}
          <TabsContent value="content" className="space-y-3">
            {!rules ? (
              <p className="text-xs text-muted-foreground">No rules configured for this profile yet.</p>
            ) : (
              TOGGLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center justify-between gap-3 py-1.5">
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  </div>
                  <Switch
                    checked={!!rules[field.key]}
                    onCheckedChange={v => updateRules.mutate({ [field.key]: v })}
                    disabled={isPreset}
                  />
                </div>
              ))
            )}
          </TabsContent>

          {/* ACCESS TAB */}
          <TabsContent value="access" className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted/30 border space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Override Hierarchy
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Settings cascade from broader to narrower scope:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>District default</li>
                    <li>School / Agency default</li>
                    <li>Classroom default</li>
                    <li>Student-specific override</li>
                    <li>Guardian-specific override</li>
                  </ol>
                  <p className="mt-2">Narrower scopes take priority over broader ones.</p>
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted/30 border space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Reply Modes
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>One-way only:</strong> Teacher sends, parent cannot reply.</p>
                  <p><strong>Teacher only:</strong> Parent can reply directly to teacher.</p>
                  <p><strong>Classroom team:</strong> Reply goes to classroom support thread.</p>
                  <p><strong>Portal only:</strong> Reply through Behavior Decoded only.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
