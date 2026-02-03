import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Clock, CheckCircle, AlertTriangle, XCircle, 
  TrendingUp, Users, Calendar, DollarSign, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, differenceInDays } from 'date-fns';

interface DashboardStats {
  sessionsMissingNotes: number;
  sessionsPendingReview: number;
  sessionsRejected: number;
  authExpiring14Days: number;
  authExpiring30Days: number;
  clientsAtRisk: number;
}

export function ARReadinessDashboard() {
  const [activeTab, setActiveTab] = useState('ops');
  const [stats, setStats] = useState<DashboardStats>({
    sessionsMissingNotes: 0,
    sessionsPendingReview: 0,
    sessionsRejected: 0,
    authExpiring14Days: 0,
    authExpiring30Days: 0,
    clientsAtRisk: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const in14Days = format(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const in30Days = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Get sessions needing notes (completed without notes)
      const { count: missingNotes } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .is('clinical_note_id', null);

      // Get sessions pending review
      const { count: pendingReview } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review');

      // Get rejected sessions
      const { count: rejected } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Get authorizations expiring in 14 days
      const { count: auth14 } = await supabase
        .from('authorizations')
        .select('id', { count: 'exact', head: true })
        .lte('end_date', in14Days)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .eq('status', 'active');

      // Get authorizations expiring in 30 days
      const { count: auth30 } = await supabase
        .from('authorizations')
        .select('id', { count: 'exact', head: true })
        .lte('end_date', in30Days)
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .eq('status', 'active');

      setStats({
        sessionsMissingNotes: missingNotes || 0,
        sessionsPendingReview: pendingReview || 0,
        sessionsRejected: rejected || 0,
        authExpiring14Days: auth14 || 0,
        authExpiring30Days: auth30 || 0,
        clientsAtRisk: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AR Readiness Dashboard</h2>
          <p className="text-muted-foreground">Revenue readiness and leakage prevention</p>
        </div>
        <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={stats.sessionsMissingNotes > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing Notes</p>
                <p className="text-3xl font-bold">{stats.sessionsMissingNotes}</p>
              </div>
              <FileText className={`h-8 w-8 ${stats.sessionsMissingNotes > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.sessionsPendingReview > 0 ? 'border-blue-300' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold">{stats.sessionsPendingReview}</p>
              </div>
              <Clock className={`h-8 w-8 ${stats.sessionsPendingReview > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.sessionsRejected > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold">{stats.sessionsRejected}</p>
              </div>
              <XCircle className={`h-8 w-8 ${stats.sessionsRejected > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.authExpiring14Days > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auth Expiring (14d)</p>
                <p className="text-3xl font-bold">{stats.authExpiring14Days}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${stats.authExpiring14Days > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ops">Ops Dashboard</TabsTrigger>
          <TabsTrigger value="supervisor">Supervisor</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
        </TabsList>

        <TabsContent value="ops" className="space-y-4 mt-4">
          <OpsDashboard stats={stats} />
        </TabsContent>

        <TabsContent value="supervisor" className="space-y-4 mt-4">
          <SupervisorDashboard />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 mt-4">
          <StaffDashboard />
        </TabsContent>

        <TabsContent value="client" className="space-y-4 mt-4">
          <ClientDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OpsDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions Needing Attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Missing Notes</span>
            <Badge variant={stats.sessionsMissingNotes > 0 ? 'destructive' : 'secondary'}>
              {stats.sessionsMissingNotes}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pending Review</span>
            <Badge variant={stats.sessionsPendingReview > 0 ? 'default' : 'secondary'}>
              {stats.sessionsPendingReview}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Rejected (Need Fix)</span>
            <Badge variant={stats.sessionsRejected > 0 ? 'destructive' : 'secondary'}>
              {stats.sessionsRejected}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authorization Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Expiring in 14 days</span>
            <Badge variant={stats.authExpiring14Days > 0 ? 'destructive' : 'secondary'}>
              {stats.authExpiring14Days}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Expiring in 30 days</span>
            <Badge variant={stats.authExpiring30Days > 0 ? 'default' : 'secondary'}>
              {stats.authExpiring30Days}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SupervisorDashboard() {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    const { data } = await supabase
      .from('sessions')
      .select(`
        id,
        session_date,
        student:student_id (name),
        user:user_id (display_name, first_name, last_name)
      `)
      .eq('status', 'pending_review')
      .order('session_date', { ascending: false })
      .limit(10);

    setPendingReviews(data || []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReviews.length > 0 ? (
            <div className="space-y-3">
              {pendingReviews.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{session.student?.name || 'Unknown Client'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.session_date), 'MMM d, yyyy')} • 
                      {session.user?.display_name || 
                       `${session.user?.first_name || ''} ${session.user?.last_name || ''}`.trim() ||
                       'Unknown Staff'}
                    </p>
                  </div>
                  <Button size="sm">Review</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No sessions pending review</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Quality Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm">High similarity notes detected</span>
              </div>
              <Badge variant="outline">0 flagged</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm">Missing rationale indicators</span>
              </div>
              <Badge variant="outline">0 flagged</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffDashboard() {
  const [mySessionsNeedingNotes, setMySessionsNeedingNotes] = useState<any[]>([]);
  const [myRejectedNotes, setMyRejectedNotes] = useState<any[]>([]);

  useEffect(() => {
    loadMyData();
  }, []);

  const loadMyData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: needingNotes } = await supabase
      .from('sessions')
      .select('id, session_date, student:student_id (name)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .is('clinical_note_id', null)
      .order('session_date', { ascending: false })
      .limit(10);

    const { data: rejected } = await supabase
      .from('sessions')
      .select('id, session_date, student:student_id (name)')
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .order('session_date', { ascending: false })
      .limit(10);

    setMySessionsNeedingNotes(needingNotes || []);
    setMyRejectedNotes(rejected || []);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Sessions Needing Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mySessionsNeedingNotes.length > 0 ? (
            <div className="space-y-2">
              {mySessionsNeedingNotes.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{session.student?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(session.session_date), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground text-sm">
              All caught up! No notes pending.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            Rejected Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myRejectedNotes.length > 0 ? (
            <div className="space-y-2">
              {myRejectedNotes.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <span className="text-sm">{session.student?.name}</span>
                  <Button size="sm" variant="outline">Fix</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground text-sm">
              No rejected notes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client View</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Select a client to view their authorization status and session completion rates.
        </p>
      </CardContent>
    </Card>
  );
}
