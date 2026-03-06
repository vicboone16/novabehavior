import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, CheckCircle2, Circle, Eye } from 'lucide-react';
import { useSDCTraining, type SDCCertificationProgress } from '@/hooks/useSDCTraining';
import { supabase } from '@/integrations/supabase/client';

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info/10 text-info' },
  pending_observation: { label: 'Pending Observation', color: 'bg-warning/10 text-warning' },
  certified: { label: 'Certified', color: 'bg-success/10 text-success' },
  expired: { label: 'Expired', color: 'bg-destructive/10 text-destructive' },
};

export default function SDCCertificationTracker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const certId = searchParams.get('id');
  const {
    certifications, requirements, certProgress, isLoading, isAdmin,
    fetchAll, fetchCertProgress, completeRequirement,
  } = useSDCTraining();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (certId) {
      fetchCertProgress(certId);
      const cert = certifications.find(c => c.id === certId);
      if (cert) {
        supabase.from('profiles').select('full_name, email').eq('id', cert.user_id).single().then(({ data }) => setProfile(data));
      }
    }
  }, [certId, certifications, fetchCertProgress]);

  const cert = certifications.find(c => c.id === certId);
  const cfg = cert ? (statusConfig[cert.status] || statusConfig.not_started) : statusConfig.not_started;

  const isReqComplete = (reqId: string) =>
    certProgress.some(p => p.requirement_id === reqId && p.completed);

  const completedCount = requirements.filter(r => isReqComplete(r.id)).length;
  const totalCount = requirements.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sdc-training')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to SDC Training
          </Button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">SDC Certification Tracker</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!certId ? (
          // List all certifications
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">All Certifications</h2>
            {certifications.length === 0 ? (
              <p className="text-muted-foreground">No certifications assigned yet.</p>
            ) : (
              <div className="grid gap-3">
                {certifications.map((c) => {
                  const s = statusConfig[c.status] || statusConfig.not_started;
                  return (
                    <Card key={c.id} className="cursor-pointer hover:shadow-sm"
                      onClick={() => navigate(`/sdc-training/certification?id=${c.id}`)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <span className="font-medium text-foreground">Staff: {c.user_id.slice(0, 8)}...</span>
                        <Badge className={s.color}>{s.label}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Detail view
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{profile?.full_name || profile?.email || 'Staff Member'}</h2>
                    <p className="text-sm text-muted-foreground">Assigned: {cert ? new Date(cert.assigned_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Progress: {completedCount} / {totalCount} requirements complete
                </p>
              </CardContent>
            </Card>

            <h3 className="font-semibold text-foreground">Requirements</h3>
            {requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No certification requirements defined yet.</p>
            ) : (
              <div className="space-y-2">
                {requirements.map((req) => {
                  const done = isReqComplete(req.id);
                  return (
                    <Card key={req.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {done
                            ? <CheckCircle2 className="w-5 h-5 text-success" />
                            : <Circle className="w-5 h-5 text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-medium text-foreground">{req.description || req.requirement_type}</p>
                            {req.module_title && (
                              <p className="text-xs text-muted-foreground">Module: {req.module_title}</p>
                            )}
                            <Badge variant="secondary" className="text-xs mt-0.5">{req.requirement_type}</Badge>
                          </div>
                        </div>
                        {!done && isAdmin && (
                          <Button size="sm" variant="outline"
                            onClick={() => completeRequirement(certId!, req.id)}>
                            Mark Complete
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
