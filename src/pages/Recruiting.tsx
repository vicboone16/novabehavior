import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Users, Plus, Filter, UserPlus, ClipboardList } from 'lucide-react';
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
import { useRecruiting } from '@/hooks/useRecruiting';
import { PIPELINE_STAGES, ApplicantPipelineStatus, ApplicantSource } from '@/types/recruiting';
import { toast } from 'sonner';

export default function Recruiting() {
  const navigate = useNavigate();
  const { postings, applicants, templates, tasks, mentorAssignments, isLoading, fetchPostings, fetchApplicants, createPosting, addApplicant, updateApplicantStatus, fetchOnboardingTemplates, fetchTasks, fetchMentorAssignments } = useRecruiting();
  const [showNewPosting, setShowNewPosting] = useState(false);
  const [showNewApplicant, setShowNewApplicant] = useState(false);
  const [postingTitle, setPostingTitle] = useState('');
  const [postingDescription, setPostingDescription] = useState('');
  const [postingCredential, setPostingCredential] = useState('');
  const [postingLocation, setPostingLocation] = useState('');
  
  const [applicantFirst, setApplicantFirst] = useState('');
  const [applicantLast, setApplicantLast] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantSource, setApplicantSource] = useState<ApplicantSource>('website');
  const [applicantPostingId, setApplicantPostingId] = useState('');

  useEffect(() => {
    fetchPostings();
    fetchApplicants();
    fetchOnboardingTemplates();
    fetchTasks();
    fetchMentorAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePosting = async () => {
    if (!postingTitle.trim()) { toast.error('Title required'); return; }
    await createPosting({ title: postingTitle, description: postingDescription || null, credential_required: postingCredential || null, location: postingLocation || null, employment_type: 'full_time', status: 'open', posted_date: new Date().toISOString() });
    setShowNewPosting(false);
    setPostingTitle('');
    setPostingDescription('');
    fetchPostings();
  };

  const handleCreateApplicant = async () => {
    if (!applicantFirst.trim() || !applicantLast.trim() || !applicantEmail.trim()) { toast.error('Name and email required'); return; }
    await addApplicant({ first_name: applicantFirst, last_name: applicantLast, email: applicantEmail, phone: applicantPhone || null, source: applicantSource, pipeline_status: 'applied', job_posting_id: applicantPostingId || null });
    setShowNewApplicant(false);
    setApplicantFirst('');
    setApplicantLast('');
    setApplicantEmail('');
    fetchApplicants();
  };

  const openPostings = postings.filter(p => p.status === 'open').length;
  const hiredCount = applicants.filter(a => a.pipeline_status === 'hired').length;

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
                <h1 className="text-lg font-bold text-foreground">Recruiting & Onboarding</h1>
                <p className="text-xs text-muted-foreground">Manage hiring pipeline and new hire onboarding</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNewPosting(true)} className="gap-2">
                <Briefcase className="w-4 h-4" /> New Posting
              </Button>
              <Button onClick={() => setShowNewApplicant(true)} className="gap-2">
                <UserPlus className="w-4 h-4" /> Add Applicant
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{openPostings}</div><p className="text-sm text-muted-foreground">Open Positions</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{applicants.length}</div><p className="text-sm text-muted-foreground">Total Applicants</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{hiredCount}</div><p className="text-sm text-muted-foreground">Hired</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{templates.length}</div><p className="text-sm text-muted-foreground">Onboarding Templates</p></CardContent></Card>
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Applicant Pipeline</TabsTrigger>
            <TabsTrigger value="postings">Job Postings</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            {/* Pipeline columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              {PIPELINE_STAGES.filter(s => s.status !== 'withdrawn').map(stage => {
                const stageApplicants = applicants.filter(a => a.pipeline_status === stage.status);
                return (
                  <Card key={stage.status}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-xs font-medium flex items-center justify-between">
                        {stage.label}
                        <Badge variant="secondary" className="text-xs">{stageApplicants.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      {stageApplicants.map(app => (
                        <Card key={app.id} className="p-2">
                          <p className="text-xs font-medium">{app.first_name} {app.last_name}</p>
                          <p className="text-xs text-muted-foreground">{app.email}</p>
                          {app.rating && <Badge variant="outline" className="text-xs mt-1">★ {app.rating}</Badge>}
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="postings">
            <Card className="mt-4">
              <CardContent className="pt-6">
                {postings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No job postings yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Credential</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postings.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>{p.credential_required || '—'}</TableCell>
                          <TableCell>{p.location || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                          <TableCell>{new Date(p.posted_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="onboarding">
            <Card className="mt-4">
              <CardContent className="pt-6 text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Onboarding checklists and mentor assignments</p>
                <p className="text-sm">Create templates for RBT, BCBA, and Admin onboarding workflows</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* New Posting Dialog */}
      <Dialog open={showNewPosting} onOpenChange={setShowNewPosting}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Job Posting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={postingTitle} onChange={e => setPostingTitle(e.target.value)} placeholder="e.g., Registered Behavior Technician" /></div>
            <div><Label>Description</Label><Textarea value={postingDescription} onChange={e => setPostingDescription(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Credential Required</Label><Input value={postingCredential} onChange={e => setPostingCredential(e.target.value)} placeholder="e.g., RBT" /></div>
              <div><Label>Location</Label><Input value={postingLocation} onChange={e => setPostingLocation(e.target.value)} placeholder="City, State" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPosting(false)}>Cancel</Button>
            <Button onClick={handleCreatePosting}>Create Posting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Applicant Dialog */}
      <Dialog open={showNewApplicant} onOpenChange={setShowNewApplicant}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Applicant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={applicantFirst} onChange={e => setApplicantFirst(e.target.value)} /></div>
              <div><Label>Last Name *</Label><Input value={applicantLast} onChange={e => setApplicantLast(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email *</Label><Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={applicantSource} onValueChange={v => setApplicantSource(v as ApplicantSource)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="job_board">Job Board</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {postings.length > 0 && (
                <div>
                  <Label>Job Posting</Label>
                  <Select value={applicantPostingId} onValueChange={setApplicantPostingId}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {postings.filter(p => p.status === 'open').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewApplicant(false)}>Cancel</Button>
            <Button onClick={handleCreateApplicant}>Add Applicant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
