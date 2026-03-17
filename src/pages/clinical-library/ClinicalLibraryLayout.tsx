import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings2, Layers, User, Building2, Shield, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

type LibraryScope = 'personal' | 'organization';

export default function ClinicalLibraryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const [libraryScope, setLibraryScope] = useState<LibraryScope>('organization');

  const isRoot = location.pathname === '/clinical-library';
  const isCollections = location.pathname.startsWith('/clinical-library/clinical-collections');
  const isCurriculum = location.pathname.startsWith('/clinical-library/curriculum-systems');
  const isBehavior = location.pathname.startsWith('/clinical-library/behavior-reduction');
  const isRegistry = location.pathname.startsWith('/clinical-library/library-registry');

  const subtitle = isRegistry
    ? 'Assessments, curricula, intervention libraries & crosswalk rules'
    : isBehavior
    ? 'Function-based goals, intervention protocols & replacement behaviors'
    : isCurriculum
    ? 'Standardized curriculum frameworks & formal assessment systems'
    : isCollections
    ? 'Goal banks, interventions, templates & custom programs'
    : 'Curriculum systems, goal banks, interventions & clinical resources';

  const handleBack = () => {
    if (isRoot) {
      navigate('/');
    } else {
      // Go up one segment
      const segments = location.pathname.split('/').filter(Boolean);
      segments.pop();
      navigate('/' + segments.join('/'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Clinical Library</h1>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
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
                <Badge variant="secondary" className="text-[10px]">Submit items for org review</Badge>
              )}
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Admin: Direct publish</Badge>
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

        {/* Root landing shows two cards */}
        {isRoot ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto mt-4">
            <Card
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => navigate('/clinical-library/curriculum-systems')}
            >
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <Settings2 className="w-7 h-7 text-primary" />
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
              onClick={() => navigate('/clinical-library/clinical-collections')}
            >
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <Layers className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-1">Clinical Collections</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Goal banks, intervention libraries, templates & custom programs.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Goal Banks', 'Interventions', 'Skill Acquisition', 'Templates'].map(name => (
                    <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => navigate('/clinical-library/behavior-reduction')}
            >
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-destructive/10 w-fit mb-4">
                  <Shield className="w-7 h-7 text-destructive" />
                </div>
                <h2 className="text-lg font-bold mb-1">Behavior Reduction & Interventions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Function-based goals, intervention protocols, replacement behaviors & crisis plans.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['FCT', 'DRA/DRO', 'Crisis Plans', 'Strategies'].map(name => (
                    <Badge key={name} variant="outline" className="text-[10px] border-destructive/30 text-destructive">{name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
