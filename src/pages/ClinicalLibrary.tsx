import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Activity, Layers, Target, FileText, Settings2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IEPLibrary from './IEPLibrary';
import BehaviorLibrary from './BehaviorLibrary';
import { CurriculumSystemManager } from '@/components/clinical-library/CurriculumSystemManager';
import { DomainManager } from '@/components/clinical-library/DomainManager';
import { GoalTemplateManager } from '@/components/clinical-library/GoalTemplateManager';
import { CurriculumItemManager } from '@/components/clinical-library/CurriculumItemManager';
import { CaregiverCurriculumLibrary } from '@/components/clinical-library/CaregiverCurriculumLibrary';

const TABS = [
  { value: 'iep', label: 'IEP Supports', icon: BookOpen },
  { value: 'behavior', label: 'Behavior Bank', icon: Activity },
  { value: 'caregiver', label: 'Caregiver Curriculum', icon: Heart },
  { value: 'curricula', label: 'Curricula', icon: Settings2 },
  { value: 'domains', label: 'Domains', icon: Layers },
  { value: 'items', label: 'Skill Items', icon: FileText },
  { value: 'templates', label: 'Goal Templates', icon: Target },
];

export default function ClinicalLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'iep';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Clinical Library</h1>
                <p className="text-xs text-muted-foreground">IEP supports, behavior interventions, caregiver curriculum & skill building</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-12 bg-transparent border-none flex-wrap">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container py-6">
        {activeTab === 'iep' && <IEPLibrary />}
        {activeTab === 'behavior' && <BehaviorLibrary embedded />}
        {activeTab === 'caregiver' && <CaregiverCurriculumLibrary />}
        {activeTab === 'curricula' && <CurriculumSystemManager />}
        {activeTab === 'domains' && <DomainManager />}
        {activeTab === 'items' && <CurriculumItemManager />}
        {activeTab === 'templates' && <GoalTemplateManager />}
      </div>
    </div>
  );
}