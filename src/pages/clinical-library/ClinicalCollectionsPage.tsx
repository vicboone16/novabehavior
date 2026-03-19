import { useNavigate } from 'react-router-dom';
import {
  Target, Sparkles, BookOpen, ClipboardList,
  FileText, FolderPlus, ExternalLink, Shield, GraduationCap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SECTIONS = [
  {
    key: 'goal-banks',
    label: 'Goal Banks',
    description: 'Goals organized by clinical domain — PECS, AAC, emotional regulation, and more.',
    icon: Target,
    route: '/clinical-library/clinical-collections/goal-banks',
  },
  {
    key: 'intervention-libraries',
    label: 'Intervention Libraries',
    description: 'Evidence-based protocols — reinforcement, prompting, antecedent strategies, AAC supports.',
    icon: Sparkles,
    route: null,
  },
  {
    key: 'behavior-reduction',
    label: 'Behavior Reduction',
    description: 'Function-based goals, replacement behaviors, intervention protocols & crisis plans.',
    icon: Shield,
    route: '/clinical-library/behavior-reduction',
  },
  {
    key: 'skill-acquisition',
    label: 'Skill Acquisition',
    description: 'Manding, tacting, listener responding, echoics, intraverbals, play, social, daily living.',
    icon: GraduationCap,
    route: null,
  },
  {
    key: 'assessments',
    label: 'Assessments',
    description: 'FBA, preference, and screening templates for clinical assessment.',
    icon: ClipboardList,
    route: null,
  },
  {
    key: 'templates',
    label: 'Templates',
    description: 'BIP, treatment plan, IEP, and progress report templates.',
    icon: FileText,
    route: null,
  },
  {
    key: 'custom-programs',
    label: 'Custom Programs',
    description: 'Organization-specific and user-created clinical programs.',
    icon: FolderPlus,
    route: null,
  },
];

export default function ClinicalCollectionsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Clinical Collections</h2>
        <p className="text-xs text-muted-foreground">Goal banks, interventions, templates & custom programs</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(section => (
          <Card
            key={section.key}
            className={`transition-all group ${
              section.route
                ? 'cursor-pointer hover:shadow-md hover:border-primary/40'
                : 'opacity-70'
            }`}
            onClick={() => section.route && navigate(section.route)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                {section.route && (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <h3 className="font-semibold text-sm mb-1">{section.label}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{section.description}</p>
              {!section.route && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming soon</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
