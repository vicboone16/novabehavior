import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Monitor,
  GraduationCap,
  Brain,
  School,
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
  Eye,
  FileText,
  Database,
  Edit3,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppAccessConfig {
  app_slug: string;
  enabled: boolean;
  role: string;
  studentPermissions: AppStudentPermission[];
}

export interface AppStudentPermission {
  student_id: string;
  student_name: string;
  enabled: boolean;
  can_view_notes: boolean;
  can_view_documents: boolean;
  can_collect_data: boolean;
  can_edit_profile: boolean;
  can_generate_reports: boolean;
  permission_level: string;
}

interface Agency {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  agency_id?: string | null;
}

export interface AgencyAppAccess {
  agency_id: string;
  apps: AppAccessConfig[];
}

const APP_DEFINITIONS = [
  { slug: 'novatrack', label: 'Nova Track', icon: Monitor, description: 'Clinical ABA platform', color: 'text-blue-600' },
  { slug: 'student_connect', label: 'Student Connect', icon: GraduationCap, description: 'Supervisor portal', color: 'text-emerald-600' },
  { slug: 'behavior_decoded', label: 'Behavior Decoded', icon: Brain, description: 'Parent coaching', color: 'text-purple-600' },
  { slug: 'teacher_hub', label: 'Teacher Hub', icon: School, description: 'Teacher data collection', color: 'text-amber-600' },
];

const PERMISSION_FIELDS = [
  { field: 'can_collect_data' as const, icon: Database, label: 'Collect Data' },
  { field: 'can_view_notes' as const, icon: FileText, label: 'View Notes' },
  { field: 'can_view_documents' as const, icon: Eye, label: 'View Docs' },
  { field: 'can_edit_profile' as const, icon: Edit3, label: 'Edit Profile' },
  { field: 'can_generate_reports' as const, icon: BarChart2, label: 'Reports' },
];

const PERMISSION_PRESETS: Record<string, Partial<AppStudentPermission>> = {
  view: { can_view_notes: false, can_view_documents: false, can_collect_data: false, can_edit_profile: false, can_generate_reports: false },
  collect: { can_view_notes: false, can_view_documents: false, can_collect_data: true, can_edit_profile: false, can_generate_reports: false },
  standard: { can_view_notes: true, can_view_documents: true, can_collect_data: true, can_edit_profile: false, can_generate_reports: false },
  full: { can_view_notes: true, can_view_documents: true, can_collect_data: true, can_edit_profile: true, can_generate_reports: true },
};

interface MultiAppAccessPanelProps {
  agencies: Agency[];
  students: Student[];
  agencyAppAccess: AgencyAppAccess[];
  onAgencyAppAccessChange: (access: AgencyAppAccess[]) => void;
}

export function MultiAppAccessPanel({
  agencies,
  students,
  agencyAppAccess,
  onAgencyAppAccessChange,
}: MultiAppAccessPanelProps) {
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  const toggleAgency = (agencyId: string) => {
    setExpandedAgencies(prev => {
      const next = new Set(prev);
      next.has(agencyId) ? next.delete(agencyId) : next.add(agencyId);
      return next;
    });
  };

  const toggleAppExpanded = (key: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleStudentExpanded = (key: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const ensureAgencyAccess = (agencyId: string): AgencyAppAccess[] => {
    const existing = agencyAppAccess.find(a => a.agency_id === agencyId);
    if (existing) return agencyAppAccess;

    const agencyStudents = students.filter(s => s.agency_id === agencyId);
    const defaultApps: AppAccessConfig[] = APP_DEFINITIONS.map(app => ({
      app_slug: app.slug,
      enabled: app.slug === 'novatrack', // Nova Track enabled by default
      role: 'staff',
      studentPermissions: agencyStudents.map(s => ({
        student_id: s.id,
        student_name: s.name,
        enabled: false,
        can_view_notes: false,
        can_view_documents: false,
        can_collect_data: false,
        can_edit_profile: false,
        can_generate_reports: false,
        permission_level: 'view',
      })),
    }));

    return [...agencyAppAccess, { agency_id: agencyId, apps: defaultApps }];
  };

  const handleToggleAgencyEnabled = (agencyId: string) => {
    const exists = agencyAppAccess.find(a => a.agency_id === agencyId);
    if (exists) {
      // Remove agency
      onAgencyAppAccessChange(agencyAppAccess.filter(a => a.agency_id !== agencyId));
    } else {
      // Add agency with defaults
      const updated = ensureAgencyAccess(agencyId);
      onAgencyAppAccessChange(updated);
      setExpandedAgencies(prev => new Set(prev).add(agencyId));
    }
  };

  const handleToggleApp = (agencyId: string, appSlug: string, enabled: boolean) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? { ...a, apps: a.apps.map(app => app.app_slug === appSlug ? { ...app, enabled } : app) }
          : a
      )
    );
  };

  const handleAppRoleChange = (agencyId: string, appSlug: string, role: string) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? { ...a, apps: a.apps.map(app => app.app_slug === appSlug ? { ...app, role } : app) }
          : a
      )
    );
  };

  const handleToggleStudent = (agencyId: string, appSlug: string, studentId: string, enabled: boolean) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? {
              ...a,
              apps: a.apps.map(app =>
                app.app_slug === appSlug
                  ? { ...app, studentPermissions: app.studentPermissions.map(sp => sp.student_id === studentId ? { ...sp, enabled } : sp) }
                  : app
              ),
            }
          : a
      )
    );
  };

  const handleStudentPermission = (agencyId: string, appSlug: string, studentId: string, field: string, value: boolean | string) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? {
              ...a,
              apps: a.apps.map(app =>
                app.app_slug === appSlug
                  ? { ...app, studentPermissions: app.studentPermissions.map(sp => sp.student_id === studentId ? { ...sp, [field]: value } : sp) }
                  : app
              ),
            }
          : a
      )
    );
  };

  const handlePresetChange = (agencyId: string, appSlug: string, studentId: string, preset: string) => {
    const presetValues = PERMISSION_PRESETS[preset] || {};
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? {
              ...a,
              apps: a.apps.map(app =>
                app.app_slug === appSlug
                  ? { ...app, studentPermissions: app.studentPermissions.map(sp => sp.student_id === studentId ? { ...sp, permission_level: preset, ...presetValues } : sp) }
                  : app
              ),
            }
          : a
      )
    );
  };

  const handleEnableAllStudents = (agencyId: string, appSlug: string, enabled: boolean) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? {
              ...a,
              apps: a.apps.map(app =>
                app.app_slug === appSlug
                  ? { ...app, studentPermissions: app.studentPermissions.map(sp => ({ ...sp, enabled })) }
                  : app
              ),
            }
          : a
      )
    );
  };

  const handleFullAccessAllStudents = (agencyId: string, appSlug: string) => {
    onAgencyAppAccessChange(
      agencyAppAccess.map(a =>
        a.agency_id === agencyId
          ? {
              ...a,
              apps: a.apps.map(app =>
                app.app_slug === appSlug
                  ? { ...app, studentPermissions: app.studentPermissions.map(sp => ({ ...sp, enabled: true, permission_level: 'full', ...PERMISSION_PRESETS.full })) }
                  : app
              ),
            }
          : a
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Multi-App Access & Permissions
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Configure which apps and clients this user can access per organization.
      </p>

      {agencies.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-lg">
          No organizations available.
        </div>
      ) : (
        <div className="space-y-2">
          {agencies.map(agency => {
            const agencyAccess = agencyAppAccess.find(a => a.agency_id === agency.id);
            const isEnabled = !!agencyAccess;
            const isExpanded = expandedAgencies.has(agency.id);
            const enabledAppCount = agencyAccess?.apps.filter(a => a.enabled).length || 0;

            return (
              <div
                key={agency.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  isEnabled ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                {/* Agency header */}
                <div className="flex items-center gap-3 p-3">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleAgencyEnabled(agency.id)}
                    className="scale-90"
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => isEnabled && toggleAgency(agency.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{agency.name}</span>
                      {isEnabled && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {enabledAppCount} app{enabledAppCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </button>
                  {isEnabled && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAgency(agency.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                </div>

                {/* Apps under this agency */}
                {isEnabled && isExpanded && agencyAccess && (
                  <div className="px-3 pb-3 space-y-2 border-t border-primary/10 pt-2">
                    {APP_DEFINITIONS.map(appDef => {
                      const appConfig = agencyAccess.apps.find(a => a.app_slug === appDef.slug);
                      if (!appConfig) return null;
                      const appKey = `${agency.id}:${appDef.slug}`;
                      const isAppExpanded = expandedApps.has(appKey);
                      const enabledStudentCount = appConfig.studentPermissions.filter(s => s.enabled).length;
                      const searchQuery = searchQueries[appKey] || '';

                      return (
                        <div
                          key={appDef.slug}
                          className={cn(
                            "rounded-md border transition-colors",
                            appConfig.enabled ? "border-primary/20 bg-background" : "border-border/50 bg-muted/20"
                          )}
                        >
                          {/* App header */}
                          <div className="flex items-center gap-2 p-2.5">
                            <Switch
                              checked={appConfig.enabled}
                              onCheckedChange={(v) => handleToggleApp(agency.id, appDef.slug, v)}
                              className="scale-75"
                            />
                            <appDef.icon className={cn("w-4 h-4", appConfig.enabled ? appDef.color : "text-muted-foreground")} />
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-sm font-medium", !appConfig.enabled && "text-muted-foreground")}>
                                {appDef.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-2">{appDef.description}</span>
                            </div>
                            {appConfig.enabled && (
                              <>
                                <Select value={appConfig.role} onValueChange={(v) => handleAppRoleChange(agency.id, appDef.slug, v)}>
                                  <SelectTrigger className="h-7 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleAppExpanded(appKey)}>
                                  {isAppExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Client permissions under this app */}
                          {appConfig.enabled && isAppExpanded && (
                            <div className="px-2.5 pb-2.5 border-t border-border/50 pt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  <Input
                                    className="pl-7 h-7 text-xs"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQueries(q => ({ ...q, [appKey]: e.target.value }))}
                                  />
                                </div>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleEnableAllStudents(agency.id, appDef.slug, true)}>
                                  All On
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleEnableAllStudents(agency.id, appDef.slug, false)}>
                                  All Off
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleFullAccessAllStudents(agency.id, appDef.slug)}>
                                  Full Access All
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {enabledStudentCount} / {appConfig.studentPermissions.length} clients enabled
                              </p>

                              <ScrollArea className="max-h-48">
                                <div className="space-y-1">
                                  {appConfig.studentPermissions
                                    .filter(sp => !searchQuery || sp.student_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(sp => {
                                      const studentKey = `${appKey}:${sp.student_id}`;
                                      const isStudentExpanded = expandedStudents.has(studentKey);

                                      return (
                                        <div
                                          key={sp.student_id}
                                          className={cn(
                                            "rounded border transition-colors",
                                            sp.enabled ? "border-primary/20 bg-primary/5" : "border-transparent"
                                          )}
                                        >
                                          <div className="flex items-center gap-2 p-1.5">
                                            <Checkbox
                                              checked={sp.enabled}
                                              onCheckedChange={(v) => handleToggleStudent(agency.id, appDef.slug, sp.student_id, !!v)}
                                            />
                                            <span className={cn("text-xs flex-1", !sp.enabled && "text-muted-foreground")}>
                                              {sp.student_name}
                                            </span>
                                            {sp.enabled && (
                                              <>
                                                <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                  {sp.permission_level}
                                                </Badge>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleStudentExpanded(studentKey)}>
                                                  {isStudentExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </Button>
                                              </>
                                            )}
                                          </div>

                                          {sp.enabled && isStudentExpanded && (
                                            <div className="px-2 pb-2 pt-1 border-t border-primary/10 space-y-1.5">
                                              <Select
                                                value={sp.permission_level}
                                                onValueChange={(v) => handlePresetChange(agency.id, appDef.slug, sp.student_id, v)}
                                              >
                                                <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="view">View Only</SelectItem>
                                                  <SelectItem value="collect">Data Collection</SelectItem>
                                                  <SelectItem value="standard">Standard</SelectItem>
                                                  <SelectItem value="full">Full Access</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                {PERMISSION_FIELDS.map(({ field, icon: Icon, label }) => (
                                                  <label key={field} className="flex items-center gap-1 cursor-pointer">
                                                    <Checkbox
                                                      checked={Boolean(sp[field])}
                                                      onCheckedChange={(v) => handleStudentPermission(agency.id, appDef.slug, sp.student_id, field, !!v)}
                                                      className="scale-75"
                                                    />
                                                    <Icon className="w-2.5 h-2.5 text-muted-foreground" />
                                                    <span className="text-[10px]">{label}</span>
                                                  </label>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
