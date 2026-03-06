import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, CheckCircle2, Circle, Clock, Eye } from 'lucide-react';
import type { SDCCertification, SDCCertificationRequirement, SDCCertificationProgress } from '@/hooks/useSDCTraining';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  certifications: SDCCertification[];
  requirements: SDCCertificationRequirement[];
  isAdmin: boolean;
  onViewDetails: (certId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-info/10 text-info' },
  pending_observation: { label: 'Pending Observation', color: 'bg-warning/10 text-warning' },
  certified: { label: 'Certified', color: 'bg-success/10 text-success' },
  expired: { label: 'Expired', color: 'bg-destructive/10 text-destructive' },
};

export function CertificationTab({ certifications, requirements, isAdmin, onViewDetails }: Props) {
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const userIds = [...new Set(certifications.map(c => c.user_id))];
    if (userIds.length === 0) return;
    supabase.from('profiles').select('id, full_name, email').in('id', userIds).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || p.email || 'Unknown'; });
      setProfiles(map);
    });
  }, [certifications]);

  if (certifications.length === 0) {
    return (
      <div className="text-center py-16">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Certifications Assigned</h3>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Assign SDC certification to staff to track their progress.' : 'You have not been assigned SDC certification yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Certification Tracker</h2>
        <p className="text-sm text-muted-foreground">Track SDC training certification status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {certifications.map((cert) => {
          const cfg = statusConfig[cert.status] || statusConfig.not_started;
          return (
            <Card key={cert.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{profiles[cert.user_id] || 'Loading...'}</span>
                  </div>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Assigned: {new Date(cert.assigned_at).toLocaleDateString()}</p>
                  {cert.certified_at && <p>Certified: {new Date(cert.certified_at).toLocaleDateString()}</p>}
                  {cert.renewal_date && <p>Renewal: {new Date(cert.renewal_date).toLocaleDateString()}</p>}
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onViewDetails(cert.id)}>
                  <Eye className="w-3 h-3 mr-2" /> View Progress
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
