import { useState, useEffect } from 'react';
import { Users, Plus, Clock, CheckCircle2, BookOpen, BarChart3, Package, UserPlus } from 'lucide-react';
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
import { useCaregiverTraining } from '@/hooks/useCaregiverTraining';
import { useCoachEvidencePackets, CoachEvidencePacket } from '@/hooks/useCoachEvidencePackets';
import { BST_PHASE_LABELS, BSTPhase } from '@/types/caregiverTraining';
import { InviteCaregiverSection } from './InviteCaregiverSection';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CaregiverTrainingTabProps {
  studentId: string;
}

export function CaregiverTrainingTab({ studentId }: CaregiverTrainingTabProps) {
  const { programs, sessions, competencyChecks, probes, isLoading, fetchPrograms, fetchSessions, logSession } = useCaregiverTraining();
  const { packets: approvedPackets, fetchPackets } = useCoachEvidencePackets();
  const [showLogSession, setShowLogSession] = useState(false);
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  const [bstPhase, setBstPhase] = useState<BSTPhase>('instruction');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [competencyRating, setCompetencyRating] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');

  useEffect(() => {
    fetchPrograms();
    fetchSessions(studentId);
    fetchPackets({ studentId, status: 'approved' });
  }, [studentId]);

  const studentSessions = sessions.filter(s => s.student_id === studentId);
  const totalHours = studentSessions.reduce((s, sess) => s + sess.duration_minutes / 60, 0);

  const handleLogSession = async () => {
    if (!caregiverName.trim()) {
      toast.error('Please enter the caregiver name');
      return;
    }
    await logSession({
      student_id: studentId,
      program_id: selectedProgramId || null,
      caregiver_name: caregiverName,
      caregiver_relationship: caregiverRelationship || null,
      session_date: sessionDate,
      duration_minutes: parseInt(durationMinutes) || 30,
      bst_phase: bstPhase,
      competency_rating: competencyRating ? parseInt(competencyRating) : null,
      skills_addressed: [],
      notes: notes || null,
    });
    setShowLogSession(false);
    setCaregiverName('');
    setNotes('');
    fetchSessions(studentId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{studentSessions.length}</div>
            <p className="text-sm text-muted-foreground">Training Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{competencyChecks.length}</div>
            <p className="text-sm text-muted-foreground">Competency Checks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{probes.length}</div>
            <p className="text-sm text-muted-foreground">Generalization Probes</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setShowLogSession(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log Training Session
        </Button>
      </div>

      {/* Invite Codes Section */}
      <InviteCaregiverSection studentId={studentId} />

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="evidence">
            Evidence
            {approvedPackets.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{approvedPackets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="competency">Competency</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardContent className="pt-6">
              {studentSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No training sessions logged</p>
                  <p className="text-sm">Log a BST training session to track caregiver progress</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Caregiver</TableHead>
                      <TableHead>BST Phase</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSessions.map((sess) => (
                      <TableRow key={sess.id}>
                        <TableCell>{new Date(sess.session_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{sess.caregiver_name}</TableCell>
                        <TableCell><Badge variant="outline">{BST_PHASE_LABELS[sess.bst_phase]}</Badge></TableCell>
                        <TableCell>{sess.duration_minutes} min</TableCell>
                        <TableCell>{sess.competency_rating != null ? `${sess.competency_rating}%` : '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{sess.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardContent className="pt-6">
              {approvedPackets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No approved evidence packets</p>
                  <p className="text-sm">Coach-submitted evidence will appear here after supervisor approval</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Caregiver</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Active Time</TableHead>
                      <TableHead>Completions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedPackets.map((pkt) => (
                      <TableRow key={pkt.id}>
                        <TableCell>{format(new Date(pkt.submitted_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{pkt.caregiver_name}</TableCell>
                        <TableCell>{pkt.title}</TableCell>
                        <TableCell>{Math.round((pkt.active_seconds || 0) / 60)} min</TableCell>
                        <TableCell>{pkt.completion_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card>
            <CardContent className="pt-6">
              {programs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No training programs created</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programs.map((prog) => (
                    <Card key={prog.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{prog.title}</CardTitle>
                        <CardDescription>{prog.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{prog.category}</Badge>
                          <Badge variant="outline">{prog.status}</Badge>
                          {prog.estimated_duration_hours && (
                            <Badge variant="secondary">{prog.estimated_duration_hours}h est.</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competency">
          <Card>
            <CardContent className="pt-6 text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Competency checks and generalization probes</p>
              <p className="text-sm">Track caregiver skill acquisition across settings</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Session Dialog */}
      <Dialog open={showLogSession} onOpenChange={setShowLogSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Caregiver Training Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Caregiver Name *</Label>
                <Input value={caregiverName} onChange={e => setCaregiverName(e.target.value)} placeholder="Parent/caregiver name" />
              </div>
              <div>
                <Label>Relationship</Label>
                <Select value={caregiverRelationship} onValueChange={setCaregiverRelationship}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>BST Phase</Label>
                <Select value={bstPhase} onValueChange={v => setBstPhase(v as BSTPhase)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BST_PHASE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Competency Rating (%)</Label>
                <Input type="number" min="0" max="100" value={competencyRating} onChange={e => setCompetencyRating(e.target.value)} placeholder="0-100" />
              </div>
            </div>
            {programs.length > 0 && (
              <div>
                <Label>Training Program</Label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger><SelectValue placeholder="Optional - link to program" /></SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Session notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogSession(false)}>Cancel</Button>
            <Button onClick={handleLogSession}>Log Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
