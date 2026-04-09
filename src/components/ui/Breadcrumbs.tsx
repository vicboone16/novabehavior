import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Static label overrides for known route segments */
const SEGMENT_LABELS: Record<string, string> = {
  students: 'Students',
  'clinical-library': 'Clinical Library',
  'clinical-collections': 'Clinical Collections',
  'goal-banks': 'Goal Banks',
  'behavior-bank': 'Behavior Bank',
  'behavior-reduction': 'Behavior Reduction',
  'curriculum-systems': 'Curriculum Systems',
  'library-registry': 'Library Registry',
  'goal-builder': 'Goal Builder',
  'domain-migration': 'Domain Migration',
  admin: 'Admin',
  profile: 'Profile',
  analytics: 'Analytics',
  billing: 'Billing',
  supervision: 'Supervision',
  operations: 'Operations',
  inbox: 'Inbox',
  reports: 'Reports',
  notifications: 'Notifications',
  'shared-library': 'Shared Library',
  'resource-hub': 'Resource Hub',
  referrals: 'Referrals',
  recruiting: 'Recruiting',
  lms: 'Training',
  'parent-training': 'Parent Training',
  'iep-library': 'IEP Library',
  payers: 'Payers',
  services: 'Services',
  'export-hours': 'Export Hours',
  policy: 'Policy',
  security: 'Security',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolvedNames {
  [id: string]: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const [resolvedNames, setResolvedNames] = useState<ResolvedNames>({});

  const segments = location.pathname.split('/').filter(Boolean);

  // Don't render for shallow routes (0 or 1 segment)
  if (segments.length < 2) return null;

  // Resolve UUIDs to entity names
  useEffect(() => {
    const uuids = segments.filter(s => UUID_RE.test(s));
    if (uuids.length === 0) return;

    const resolve = async () => {
      const names: ResolvedNames = {};

      for (const id of uuids) {
        // Try students first
        const { data: student } = await supabase
          .from('students')
          .select('first_name, last_name, display_name')
          .eq('id', id)
          .maybeSingle();

        if (student) {
          names[id] = student.display_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || id.slice(0, 8);
          continue;
        }

        // Try profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name, last_name')
          .eq('user_id', id)
          .maybeSingle();

        if (profile) {
          names[id] = profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || id.slice(0, 8);
          continue;
        }

        // Fallback
        names[id] = id.slice(0, 8) + '…';
      }

      setResolvedNames(names);
    };

    resolve();
  }, [location.pathname]);

  const getLabel = (segment: string): string => {
    if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
    if (UUID_RE.test(segment)) return resolvedNames[segment] || segment.slice(0, 8) + '…';
    // Convert kebab-case to Title Case
    return segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const buildPath = (index: number): string => {
    return '/' + segments.slice(0, index + 1).join('/');
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground py-2 overflow-x-auto">
      <Link to="/" className="flex items-center hover:text-foreground transition-colors shrink-0">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const label = getLabel(segment);
        const path = buildPath(index);

        return (
          <span key={path} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors truncate max-w-[200px]">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
