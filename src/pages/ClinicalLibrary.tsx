import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, Settings2, User, Building2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CurriculumSystemManager } from '@/components/clinical-library/CurriculumSystemManager';
import { ClinicalCollectionsLanding } from '@/components/clinical-library/ClinicalCollectionsLanding';
import { UnifiedDomainsBrowser } from '@/components/clinical-library/UnifiedDomainsBrowser';

type LibraryScope = 'personal' | 'organization';
type ActiveSection = null | 'curriculum_systems' | 'clinical_collections' | 'unified_domains';

export default function ClinicalLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('section') as ActiveSection;
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
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
              <Button variant="ghost" size="icon" onClick={() => {
                if (activeSection) {
                  setActiveSection(null);
                } else {
                  navigate('/');
                }
              }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Clinical Library</h1>
                <p className="text-xs text-muted-foreground">
                  {activeSection === 'curriculum_systems'
                    ? 'Standardized curriculum frameworks & formal assessment systems'
                    : activeSection === 'clinical_collections'
                    ? 'Goal banks, interventions, templates & custom programs'
                    : activeSection === 'unified_domains'
                    ? 'Cross-framework clinical domain alignment system'
                    : 'Curriculum systems, goal banks, interventions & clinical resources'}
                </p>
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

        {/* Top-level landing: three pathway cards */}
        {!activeSection && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto mt-4">
            <Card
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => setActiveSection('curriculum_systems')}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Settings2 className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Curriculum Systems</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Formal, standardized curriculum frameworks and assessment systems.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['VB-MAPP', 'ABLLS-R', 'AFLS', 'EFL'].map(name => (
                    <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => setActiveSection('clinical_collections')}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Layers className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Clinical Collections</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Goal banks, intervention libraries, behavior reduction, templates & custom programs.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Goal Banks', 'Interventions', 'Behavior Reduction', 'Skill Acquisition', 'Templates'].map(name => (
                    <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => setActiveSection('unified_domains')}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Brain className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1">Unified Clinical Domains</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Cross-framework alignment — map goals across VB-MAPP, ABLLS-R, PEAK, Vineland-3, SRS-2 & more.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['9 Frameworks', '10 Domains', 'Curriculum', 'Assessment', 'Adaptive'].map(name => (
                    <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Curriculum Systems drill-down */}
        {activeSection === 'curriculum_systems' && (
          <CurriculumSystemManager />
        )}

        {/* Clinical Collections drill-down */}
        {activeSection === 'clinical_collections' && (
          <ClinicalCollectionsLanding onBack={() => setActiveSection(null)} />
        )}
      </div>
    </div>
  );
}
