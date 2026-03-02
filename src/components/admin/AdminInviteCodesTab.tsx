import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Copy, Plus, Loader2, Ban, RotateCcw, ChevronDown, Link2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface CollaboratorCode {
  id: string;
  code: string;
  agency_id: string;
  student_id: string | null;
  student_ids: string[];
  recipient_type: string;
  recipient_label: string | null;
  app_access: string[];
  role: string;
  max_uses: number;
  uses: number;
  is_active: boolean;
  expires_at: string | null;
  permissions: any;
  created_by: string | null;
  created_at: string;
}

interface Agency {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  agency_id: string | null;
}

const APP_OPTIONS = [
  { value: 'novatrack', label: 'Nova Track' },
  { value: 'student_connect', label: 'Student Connect' },
  { value: 'behavior_decoded', label: 'Behavior Decoded' },
  { value: 'teacher_hub', label: 'Teacher Hub' },
];

const RECIPIENT_TYPES = [
  { value: 'parent', label: 'Parent / Caregiver' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'custom', label: 'Custom' },
];

const ROLE_OPTIONS = ['viewer', 'data_collector', 'editor', 'admin'];

export function AdminInviteCodesTab() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<CollaboratorCode[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [editingCode, setEditingCode] = useState<CollaboratorCode | null>(null);

  // Create form state
  const [formAgencyId, setFormAgencyId] = useState('');
  const [formRecipientType, setFormRecipientType] = useState('parent');
  const [formRecipientLabel, setFormRecipientLabel] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formAppAccess, setFormAppAccess] = useState<string[]>(['behavior_decoded']);
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]);
  const [formMaxUses, setFormMaxUses] = useState('1');
  const [formExpiresDays, setFormExpiresDays] = useState('30');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, agenciesRes, studentsRes] = await Promise.all([
        supabase.from('collaborator_invite_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('agencies').select('id, name').eq('status', 'active').order('name'),
        supabase.from('students').select('id, name, agency_id').eq('is_archived', false).order('name'),
      ]);
      setCodes((codesRes.data || []) as unknown as CollaboratorCode[]);
      setAgencies((agenciesRes.data || []) as Agency[]);
      setStudents((studentsRes.data || []) as Student[]);
      // Auto-expand all agencies
      const agencyIds = new Set((agenciesRes.data || []).map((a: Agency) => a.id));
      setExpandedAgencies(agencyIds);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!user || !formAgencyId) return;
    setCreating(true);
    try {
      const { data: generatedCode, error: codeErr } = await supabase.rpc('generate_collaborator_invite_code');
      if (codeErr) throw codeErr;

      const expiresAt = formExpiresDays !== 'never'
        ? new Date(Date.now() + parseInt(formExpiresDays) * 86400000).toISOString()
        : null;

      const { error } = await supabase
        .from('collaborator_invite_codes')
        .insert({
          code: generatedCode,
          agency_id: formAgencyId,
          student_id: formStudentIds.length === 1 ? formStudentIds[0] : null,
          student_ids: formStudentIds,
          recipient_type: formRecipientType,
          recipient_label: formRecipientType === 'custom' ? formRecipientLabel : null,
          app_access: formAppAccess,
          role: formRole,
          max_uses: parseInt(formMaxUses),
          expires_at: expiresAt,
          created_by: user.id,
        } as any);

      if (error) throw error;
      toast.success('Invite code created');
      setShowCreate(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      toast.error('Failed to create code: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormRecipientType('parent');
    setFormRecipientLabel('');
    setFormRole('viewer');
    setFormAppAccess(['behavior_decoded']);
    setFormStudentIds([]);
    setFormMaxUses('1');
    setFormExpiresDays('30');
  };

  const toggleActive = async (code: CollaboratorCode) => {
    try {
      const { error } = await (supabase.from('collaborator_invite_codes') as any)
        .update({ is_active: !code.is_active, updated_at: new Date().toISOString() })
        .eq('id', code.id);
      if (error) throw error;
      toast.success(code.is_active ? 'Code disabled' : 'Code re-enabled');
      fetchAll();
    } catch {
      toast.error('Failed to update code');
    }
  };

  const updateCodeField = async (codeId: string, field: string, value: any) => {
    try {
      const { error } = await (supabase.from('collaborator_invite_codes') as any)
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', codeId);
      if (error) throw error;
      toast.success('Code updated');
      fetchAll();
      setEditingCode(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  const toggleAppAccess = (app: string) => {
    setFormAppAccess(prev =>
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  const toggleStudentId = (id: string) => {
    setFormStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isExpired = (c: CollaboratorCode) => c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c: CollaboratorCode) => c.uses >= c.max_uses;

  const getStatusBadge = (c: CollaboratorCode) => {
    if (!c.is_active) return <Badge variant="secondary">Disabled</Badge>;
    if (isExpired(c)) return <Badge variant="destructive">Expired</Badge>;
    if (isExhausted(c)) return <Badge variant="secondary">Used Up</Badge>;
    return <Badge className="bg-green-600 text-white">Active</Badge>;
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';
  const getAgencyName = (id: string) => agencies.find(a => a.id === id)?.name || 'Unknown';

  // Group codes by agency → student
  const groupedByAgency = agencies.reduce((acc, agency) => {
    const agencyCodes = codes.filter(c => c.agency_id === agency.id);
    if (agencyCodes.length > 0) {
      acc[agency.id] = agencyCodes;
    }
    return acc;
  }, {} as Record<string, CollaboratorCode[]>);

  const agencyStudents = formAgencyId
    ? students.filter(s => s.agency_id === formAgencyId)
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage invite codes for parents, teachers, collaborators, and supervisors. Organized by agency and learner.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Code
        </Button>
      </div>

      {Object.keys(groupedByAgency).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No non-staff invite codes yet</p>
            <p className="text-xs mt-1">Create codes for parents, teachers, or collaborators</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByAgency).map(([agencyId, agencyCodes]) => {
            const isOpen = expandedAgencies.has(agencyId);
            // Group by student within agency
            const byStudent: Record<string, CollaboratorCode[]> = {};
            const noStudent: CollaboratorCode[] = [];
            agencyCodes.forEach(c => {
              if (c.student_id) {
                if (!byStudent[c.student_id]) byStudent[c.student_id] = [];
                byStudent[c.student_id].push(c);
              } else {
                noStudent.push(c);
              }
            });

            return (
              <Collapsible key={agencyId} open={isOpen} onOpenChange={(open) => {
                setExpandedAgencies(prev => {
                  const next = new Set(prev);
                  open ? next.add(agencyId) : next.delete(agencyId);
                  return next;
                });
              }}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{getAgencyName(agencyId)}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{agencyCodes.length} codes</Badge>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Learner</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>For</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Apps</TableHead>
                            <TableHead>Uses</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Codes grouped by student */}
                          {Object.entries(byStudent).map(([studentId, sCodes]) =>
                            sCodes.map((c, idx) => (
                              <TableRow key={c.id}>
                                {idx === 0 && (
                                  <TableCell rowSpan={sCodes.length} className="font-medium align-top">
                                    {getStudentName(studentId)}
                                  </TableCell>
                                )}
                                <CodeRowCells code={c} onCopy={copyCode} onToggle={toggleActive} onEdit={setEditingCode} />
                              </TableRow>
                            ))
                          )}
                          {/* Multi-student or no-student codes */}
                          {noStudent.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="text-muted-foreground text-xs">
                                {c.student_ids && c.student_ids.length > 0
                                  ? c.student_ids.map(id => getStudentName(id)).join(', ')
                                  : '—'}
                              </TableCell>
                              <CodeRowCells code={c} onCopy={copyCode} onToggle={toggleActive} onEdit={setEditingCode} />
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Non-Staff Invite Code</DialogTitle>
            <DialogDescription>
              Generate a code for a parent, teacher, collaborator, or supervisor to access specific learners.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Agency</Label>
              <Select value={formAgencyId} onValueChange={setFormAgencyId}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  {agencies.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipient Type</Label>
              <Select value={formRecipientType} onValueChange={setFormRecipientType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECIPIENT_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formRecipientType === 'custom' && (
              <div>
                <Label>Custom Label</Label>
                <Input value={formRecipientLabel} onChange={e => setFormRecipientLabel(e.target.value)} placeholder="e.g. Outside BCBA" />
              </div>
            )}

            <div>
              <Label>App Access</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {APP_OPTIONS.map(app => (
                  <label key={app.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formAppAccess.includes(app.value)}
                      onCheckedChange={() => toggleAppAccess(app.value)}
                    />
                    {app.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formAgencyId && (
              <div>
                <Label>Learner(s)</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1 mt-1">
                  {agencyStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No learners in this agency</p>
                  ) : (
                    agencyStudents.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={formStudentIds.includes(s.id)}
                          onCheckedChange={() => toggleStudentId(s.id)}
                        />
                        {s.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Uses</Label>
                <Input type="number" value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)} min={1} />
              </div>
              <div>
                <Label>Expires In</Label>
                <Select value={formExpiresDays} onValueChange={setFormExpiresDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !formAgencyId || formAppAccess.length === 0}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Generate Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingCode && (
        <EditCodeDialog
          code={editingCode}
          onClose={() => setEditingCode(null)}
          onUpdate={updateCodeField}
        />
      )}
    </div>
  );
}

function CodeRowCells({
  code,
  onCopy,
  onToggle,
  onEdit,
}: {
  code: CollaboratorCode;
  onCopy: (c: string) => void;
  onToggle: (c: CollaboratorCode) => void;
  onEdit: (c: CollaboratorCode) => void;
}) {
  const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
  const isExhausted = code.uses >= code.max_uses;

  const getStatus = () => {
    if (!code.is_active) return <Badge variant="secondary">Disabled</Badge>;
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    if (isExhausted) return <Badge variant="secondary">Used Up</Badge>;
    return <Badge className="bg-green-600 text-white">Active</Badge>;
  };

  const recipientLabel = code.recipient_type === 'custom' && code.recipient_label
    ? code.recipient_label
    : RECIPIENT_TYPES.find(r => r.value === code.recipient_type)?.label || code.recipient_type;

  return (
    <>
      <TableCell>
        <div className="flex items-center gap-1">
          <code className="font-mono text-xs font-bold">{code.code}</code>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onCopy(code.code)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize text-xs">{recipientLabel}</Badge>
      </TableCell>
      <TableCell className="capitalize text-xs">{code.role.replace('_', ' ')}</TableCell>
      <TableCell>
        <div className="flex gap-0.5 flex-wrap">
          {(code.app_access || []).map(app => (
            <Badge key={app} variant="outline" className="text-[10px] px-1">
              {APP_OPTIONS.find(a => a.value === app)?.label || app}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-xs">{code.uses}/{code.max_uses}</TableCell>
      <TableCell>{getStatus()}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(code)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggle(code)} title={code.is_active ? 'Disable' : 'Re-enable'}>
            {code.is_active ? <Ban className="h-3.5 w-3.5 text-destructive" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </TableCell>
    </>
  );
}

const RECIPIENT_TYPES_MAP = RECIPIENT_TYPES;

function EditCodeDialog({
  code,
  onClose,
  onUpdate,
}: {
  code: CollaboratorCode;
  onClose: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
}) {
  const [role, setRole] = useState(code.role);
  const [appAccess, setAppAccess] = useState<string[]>(code.app_access || []);

  const toggleApp = (app: string) => {
    setAppAccess(prev => prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Code: {code.code}</DialogTitle>
          <DialogDescription>Update role or app access for this code.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>App Access</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {APP_OPTIONS.map(app => (
                <label key={app.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={appAccess.includes(app.value)} onCheckedChange={() => toggleApp(app.value)} />
                  {app.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => {
              // Update both fields
              onUpdate(code.id, 'role', role);
              if (JSON.stringify(appAccess) !== JSON.stringify(code.app_access)) {
                onUpdate(code.id, 'app_access', appAccess);
              }
            }}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
