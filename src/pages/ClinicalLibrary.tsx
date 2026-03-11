import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Activity, Layers, Target, FileText, Settings2, Heart, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import IEPLibrary from './IEPLibrary';
import BehaviorLibrary from './BehaviorLibrary';
import { CurriculumSystemManager } from '@/components/clinical-library/CurriculumSystemManager';
import { DomainManager } from '@/components/clinical-library/DomainManager';
import { GoalTemplateManager } from '@/components/clinical-library/GoalTemplateManager';
import { CurriculumItemManager } from '@/components/clinical-library/CurriculumItemManager';
import { CaregiverCurriculumLibrary } from '@/components/clinical-library/CaregiverCurriculumLibrary';
import { useAuth } from '@/contexts/AuthContext';

const TABS = [
  { value: 'iep', label: 'IEP Supports', icon: BookOpen },
  { value: 'behavior', label: 'Behavior Bank', icon: Activity },
  { value: 'caregiver', label: 'Caregiver Curriculum', icon: Heart },
  { value: 'curricula', label: 'Curricula', icon: Settings2 },
  { value: 'domains', label: 'Domains', icon: Layers },
  { value: 'items', label: 'Skill Items', icon: FileText },
  { value: 'templates', label: 'Goal Templates', icon: Target },
];

type LibraryScope = 'personal' | 'organization';

export default function ClinicalLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'iep';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [libraryScope, setLibraryScope] = useState<LibraryScope>(
    (searchParams.get('scope') as LibraryScope) || 'organization'
  );
  const { userRole } = useAuth();

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

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
            {/* Library Scope Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={libraryScope === 'personal' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none gap-1.5 text-xs"
                  onClick={() => setLibraryScope('personal')}
                >
                  <User className="w-3.5 h-3.5" />
                  My Library
                </Button>
                <Button
                  variant={libraryScope === 'organization' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none gap-1.5 text-xs"
                  onClick={() => setLibraryScope('organization')}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Organization
                </Button>
              </div>
              {libraryScope === 'personal' && !isAdmin && (
                <Badge variant="secondary" className="text-[10px]">
                  Submit items for org review
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  Admin: Direct publish
                </Badge>
              )}
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
        {libraryScope === 'personal' && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <strong>Personal Clinical Library</strong> — Items you create here are private to you.
              {!isAdmin && ' You can submit items for admin review to be published to the Organization Library.'}
              {isAdmin && ' As an admin, you can also publish items directly to the Organization Library.'}
            </p>
          </div>
        )}
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
