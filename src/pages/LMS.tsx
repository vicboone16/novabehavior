import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Award, Clock, Plus, CheckCircle2, AlertTriangle, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLMS } from '@/hooks/useLMS';
import { useFormBuilder } from '@/hooks/useFormBuilder';
import { BACB_CEU_CATEGORIES, CEUActivityType } from '@/types/lms';
import { FORM_FIELD_TYPES, FormField, FormFieldType } from '@/types/formBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function LMS() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules, assignments, ceuRecords, isLoading: lmsLoading, fetchModules, fetchAssignments, fetchCEURecords, createModule, addCEURecord } = useLMS();
  const { forms, submissions, isLoading: formLoading, fetchForms, createForm } = useFormBuilder();

  const [showAddCEU, setShowAddCEU] = useState(false);
  const [showNewModule, setShowNewModule] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // CEU form
  const [ceuTitle, setCeuTitle] = useState('');
  const [ceuProvider, setCeuProvider] = useState('');
  const [ceuCredits, setCeuCredits] = useState('');
  const [ceuDate, setCeuDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [ceuType, setCeuType] = useState<CEUActivityType>('training');
  const [ceuCategory, setCeuCategory] = useState('general');

  // Module form
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleContentType, setModuleContentType] = useState('document');
  const [moduleCEU, setModuleCEU] = useState('0');

  // Form builder form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('assessment');

  useEffect(() => { fetchModules(); fetchAssignments(); fetchCEURecords(); fetchForms(); }, []);

  const totalCredits = ceuRecords.reduce((s, r) => s + r.credits_earned, 0);
  const ethicsCredits = ceuRecords.filter(r => r.bacb_requirement_category === 'ethics').reduce((s, r) => s + r.credits_earned, 0);

  const handleAddCEU = async () => {
    if (!ceuTitle.trim()) { toast.error('Title required'); return; }
    await addCEURecord({
      title: ceuTitle,
      provider: ceuProvider || null,
      credits_earned: parseFloat(ceuCredits) || 0,
      date_completed: ceuDate,
      activity_type: ceuType,
      bacb_requirement_category: ceuCategory,
      verification_status: 'pending',
    });
    setShowAddCEU(false);
    setCeuTitle('');
    setCeuProvider('');
    setCeuCredits('');
    fetchCEURecords();
  };

  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) { toast.error('Title required'); return; }
    await createModule({
      title: moduleTitle,
      description: moduleDescription || null,
      content_type: moduleContentType as any,
      ceu_credits: parseFloat(moduleCEU) || 0,
      category: 'general',
      required_roles: [],
      pass_criteria: {},
      content_data: {},
      status: 'draft',
    });
    setShowNewModule(false);
    setModuleTitle('');
    fetchModules();
  };

  const handleCreateForm = async () => {
    if (!formTitle.trim()) { toast.error('Title required'); return; }
    await createForm({
      title: formTitle,
      description: formDescription || null,
      form_schema: [],
      version: 1,
      status: 'draft',
      category: formCategory,
      requires_signature: false,
      auto_populate_fields: {},
    });
    setShowNewForm(false);
    setFormTitle('');
    fetchForms();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Learning & Forms</h1>
                <p className="text-xs text-muted-foreground">Training, CEU tracking, and custom form builder</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="ceu">
          <TabsList className="mb-6">
            <TabsTrigger value="ceu" className="gap-2"><Award className="w-4 h-4" />CEU Tracker</TabsTrigger>
            <TabsTrigger value="modules" className="gap-2"><BookOpen className="w-4 h-4" />Training</TabsTrigger>
            <TabsTrigger value="forms" className="gap-2"><Layers className="w-4 h-4" />Form Builder</TabsTrigger>
          </TabsList>

          {/* CEU Tracker */}
          <TabsContent value="ceu">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totalCredits.toFixed(1)}</div><p className="text-sm text-muted-foreground">Total CEUs</p></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{ethicsCredits.toFixed(1)}</div><p className="text-sm text-muted-foreground">Ethics CEUs</p></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{ceuRecords.length}</div><p className="text-sm text-muted-foreground">Activities Logged</p></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-2xl font-bold">32</div><p className="text-sm text-muted-foreground">Required (BCBA)</p></CardContent></Card>
            </div>

            <Button onClick={() => setShowAddCEU(true)} className="gap-2 mb-4"><Plus className="w-4 h-4" />Log CEU Activity</Button>

            <Card>
              <CardContent className="pt-6">
                {ceuRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No CEU records yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Credits</TableHead><TableHead>Category</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {ceuRecords.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell>{r.activity_type}</TableCell>
                          <TableCell>{r.provider || '—'}</TableCell>
                          <TableCell>{r.credits_earned}</TableCell>
                          <TableCell><Badge variant="outline">{r.bacb_requirement_category || 'General'}</Badge></TableCell>
                          <TableCell>{new Date(r.date_completed).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant={r.verification_status === 'verified' ? 'default' : 'secondary'}>{r.verification_status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Modules */}
          <TabsContent value="modules">
            <Button onClick={() => setShowNewModule(true)} className="gap-2 mb-4"><Plus className="w-4 h-4" />New Module</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(m => (
                <Card key={m.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200" onClick={() => navigate(`/academy/lab`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{m.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{m.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{m.content_type}</Badge>
                      {m.ceu_credits > 0 && <Badge variant="secondary">{m.ceu_credits} CEU</Badge>}
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {modules.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No training modules yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Form Builder */}
          <TabsContent value="forms">
            <Button onClick={() => setShowNewForm(true)} className="gap-2 mb-4"><Plus className="w-4 h-4" />New Form</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map(f => (
                <Card key={f.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{f.title}</CardTitle>
                    <CardDescription>{f.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="outline">{f.category}</Badge>
                      <Badge variant="secondary">v{f.version}</Badge>
                      <Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge>
                      {f.requires_signature && <Badge variant="outline">✍️ Sig</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {forms.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No custom forms yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add CEU Dialog */}
      <Dialog open={showAddCEU} onOpenChange={setShowAddCEU}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log CEU Activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={ceuTitle} onChange={e => setCeuTitle(e.target.value)} placeholder="Activity name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Provider</Label><Input value={ceuProvider} onChange={e => setCeuProvider(e.target.value)} /></div>
              <div><Label>Credits</Label><Input type="number" step="0.5" value={ceuCredits} onChange={e => setCeuCredits(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={ceuType} onValueChange={v => setCeuType(v as CEUActivityType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                    <SelectItem value="self_study">Self Study</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>BACB Category</Label>
                <Select value={ceuCategory} onValueChange={setCeuCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BACB_CEU_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Date Completed</Label><Input type="date" value={ceuDate} onChange={e => setCeuDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCEU(false)}>Cancel</Button>
            <Button onClick={handleAddCEU}>Log Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Module Dialog */}
      <Dialog open={showNewModule} onOpenChange={setShowNewModule}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Training Module</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={moduleDescription} onChange={e => setModuleDescription(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Content Type</Label>
                <Select value={moduleContentType} onValueChange={setModuleContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>CEU Credits</Label><Input type="number" step="0.5" value={moduleCEU} onChange={e => setModuleCEU(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModule(false)}>Cancel</Button>
            <Button onClick={handleCreateModule}>Create Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Form Dialog */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Custom Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Form name" /></div>
            <div><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div>
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            <Button onClick={handleCreateForm}>Create Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
