import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Search, BookOpen, Target, Shield, Sparkles,
  ClipboardList, FileText, FolderPlus, Layers, ExternalLink, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CollectionBrowser } from './CollectionBrowser';

/* ── Section definitions ─────────────────────────────────────────────── */

interface SectionDef {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  /** Filter: collection keys that belong to this section */
  collectionKeys?: string[];
  /** If true, this section has no existing collection data yet – placeholder */
  placeholder?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'goal_banks',
    label: 'Goal Banks',
    description: 'Goals organized by clinical domain — communication, social, emotional regulation, AAC, and more.',
    icon: Target,
    collectionKeys: ['emotional_regulation', 'adhd', 'pda', 'sib', 'sexualized_communication', 'elopement', 'verbal_aggression', 'aggression', 'aac'],
  },
  {
    key: 'intervention_libraries',
    label: 'Intervention Libraries',
    description: 'Evidence-based protocols — reinforcement, prompting, FCT, antecedent strategies, AAC supports.',
    icon: Sparkles,
    collectionKeys: ['aac_supports'],
  },
  {
    key: 'behavior_reduction',
    label: 'Behavior Reduction',
    description: 'Behavior-specific goal banks and strategies for aggression, elopement, SIB, noncompliance, and more.',
    icon: Shield,
    collectionKeys: ['aggression', 'elopement', 'sib', 'verbal_aggression', 'pda', 'sexualized_communication'],
  },
  {
    key: 'skill_acquisition',
    label: 'Skill Acquisition',
    description: 'Manding, tacting, listener responding, echoics, intraverbals, play, social, daily living.',
    icon: BookOpen,
    placeholder: true,
  },
  {
    key: 'assessments',
    label: 'Assessments',
    description: 'FBA, preference, and screening templates for clinical assessment.',
    icon: ClipboardList,
    placeholder: true,
  },
  {
    key: 'templates',
    label: 'Templates',
    description: 'BIP, treatment plan, IEP, and progress report templates.',
    icon: FileText,
    placeholder: true,
  },
  {
    key: 'custom_programs',
    label: 'Custom Programs',
    description: 'Organization-specific and user-created clinical programs.',
    icon: FolderPlus,
    placeholder: true,
  },
];

/* ── Types ────────────────────────────────────────────────────────────── */

interface ClinicalCollection {
  id: string;
  key: string;
  title: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  domain_count?: number;
  goal_count?: number;
}

interface Props {
  onBack: () => void;
}

/* ── Component ────────────────────────────────────────────────────────── */

export function ClinicalCollectionsLanding({ onBack }: Props) {
  const [collections, setCollections] = useState<ClinicalCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [browsingCollection, setBrowsingCollection] = useState<ClinicalCollection | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const [{ data: cols }, { data: dCounts }, { data: gData }, { data: dAll }] = await Promise.all([
      supabase.from('clinical_curricula_collections').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('clinical_curricula_domains').select('collection_id'),
      supabase.from('clinical_curricula_goals').select('domain_id').eq('is_active', true),
      supabase.from('clinical_curricula_domains').select('id, collection_id'),
    ]);

    if (cols) {
      const collsWithCounts = (cols as any[]).map(c => ({ ...c, domain_count: 0, goal_count: 0 }));

      if (dCounts && dAll) {
        const domainCountMap = new Map<string, number>();
        dCounts.forEach((d: any) => {
          domainCountMap.set(d.collection_id, (domainCountMap.get(d.collection_id) || 0) + 1);
        });

        const domainToCollection = new Map<string, string>();
        dAll.forEach((d: any) => domainToCollection.set(d.id, d.collection_id));

        const goalCountMap = new Map<string, number>();
        if (gData) {
          gData.forEach((g: any) => {
            const colId = domainToCollection.get(g.domain_id);
            if (colId) goalCountMap.set(colId, (goalCountMap.get(colId) || 0) + 1);
          });
        }

        collsWithCounts.forEach(c => {
          c.domain_count = domainCountMap.get(c.id) || 0;
          c.goal_count = goalCountMap.get(c.id) || 0;
        });
      }

      // Exclude VB-MAPP (it belongs under Curriculum Systems)
      setCollections(collsWithCounts.filter((c: any) => c.key !== 'vbmapp') as ClinicalCollection[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  /* ── Browsing a specific collection ─────────────────────────────────── */
  if (browsingCollection) {
    return (
      <CollectionBrowser
        collectionId={browsingCollection.id}
        collectionTitle={browsingCollection.title}
        onBack={() => { setBrowsingCollection(null); fetchCollections(); }}
      />
    );
  }

  /* ── Section drill-down ─────────────────────────────────────────────── */
  if (activeSection) {
    const section = SECTIONS.find(s => s.key === activeSection)!;
    const sectionCollections = collections.filter(
      c => section.collectionKeys?.includes(c.key)
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <section.icon className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold">{section.label}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
        </div>

        {sectionCollections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <section.icon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-medium text-muted-foreground">No content yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Content for {section.label} will appear here as it is added.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectionCollections.map(col => (
              <Card
                key={col.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => setBrowsingCollection(col)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{col.title}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {col.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{col.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{col.domain_count || 0} domains</Badge>
                    <Badge variant="secondary" className="text-[10px]">{col.goal_count || 0} goals</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Main landing: section cards ────────────────────────────────────── */
  const filteredSections = SECTIONS.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Layers className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Clinical Collections</h2>
          <p className="text-xs text-muted-foreground">Goal banks, interventions, templates & custom programs</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sections..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map(section => {
            const sectionCollections = collections.filter(
              c => section.collectionKeys?.includes(c.key)
            );
            const totalGoals = sectionCollections.reduce((s, c) => s + (c.goal_count || 0), 0);
            const totalDomains = sectionCollections.reduce((s, c) => s + (c.domain_count || 0), 0);

            return (
              <Card
                key={section.key}
                className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => setActiveSection(section.key)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{section.label}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{section.description}</p>
                  <div className="flex items-center gap-2">
                    {section.placeholder ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming soon</Badge>
                    ) : (
                      <>
                        {totalDomains > 0 && <Badge variant="outline" className="text-[10px]">{totalDomains} domains</Badge>}
                        {totalGoals > 0 && <Badge variant="secondary" className="text-[10px]">{totalGoals} goals</Badge>}
                        {sectionCollections.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{sectionCollections.length} collections</Badge>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
