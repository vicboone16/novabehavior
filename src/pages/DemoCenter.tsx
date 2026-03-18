/**
 * Demo Center — Entry point for the master demo tenant ecosystem.
 * Explore by role, learner, workflow, or payer type.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DemoCenterHeader } from '@/components/demo-center/DemoCenterHeader';
import { DemoBanner } from '@/components/demo-center/DemoBanner';
import { DemoCenterTabs } from '@/components/demo-center/DemoCenterTabs';

export interface DemoLearner {
  id: string;
  learner_name: string;
  age: number;
  grade: string | null;
  diagnosis: string;
  setting: string;
  funding_source: string;
  purpose: string;
  assigned_bcba: string;
  assigned_rbt: string | null;
  caregiver_name: string;
  teacher_name: string | null;
  scenario_data: Record<string, any>;
}

export interface DemoStaff {
  id: string;
  display_name: string;
  role_label: string;
  credential: string | null;
  persona_type: string;
  profile_data: Record<string, any>;
}

export default function DemoCenter() {
  const [tab, setTab] = useState('overview');
  const [learners, setLearners] = useState<DemoLearner[]>([]);
  const [staff, setStaff] = useState<DemoStaff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: s }] = await Promise.all([
        supabase.from('demo_learner_scenarios' as any).select('*').order('sort_order'),
        supabase.from('demo_staff_personas' as any).select('*').order('sort_order'),
      ]);
      if (l) setLearners(l as unknown as DemoLearner[]);
      if (s) setStaff(s as unknown as DemoStaff[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <DemoCenterHeader />
      <DemoBanner />
      <DemoCenterTabs
        tab={tab}
        setTab={setTab}
        learners={learners}
        staff={staff}
        loading={loading}
      />
    </div>
  );
}
