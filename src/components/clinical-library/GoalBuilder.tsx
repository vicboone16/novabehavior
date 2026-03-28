import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Sparkles, Copy, Check } from 'lucide-react';
import { useProgramDomains, useProgramSubdomains } from '@/hooks/useProgramDomains';

const STARTER_GOALS: Record<string, string> = {
  communication: 'Student will request preferred items using a functional communication response with at least 80% independence across 3 consecutive sessions.',
  'social-play': 'Student will engage in reciprocal play with a peer for 5 minutes with no more than 2 prompts across 3 consecutive sessions.',
  'learning-engagement': 'Student will follow 1-step adult directions with 80% independence across 3 consecutive sessions.',
  'behavior-regulation': 'Student will demonstrate a taught replacement behavior instead of escalation in 4 out of 5 opportunities across 3 consecutive sessions.',
  'adaptive-living': 'Student will complete the identified self-care routine with no more than 1 prompt across 5 consecutive opportunities.',
  'academic-pre-academic': 'Student will complete targeted academic tasks with 80% accuracy across 3 consecutive sessions.',
  'safety-independence': 'Student will respond to a safety instruction within 3 seconds in 4 out of 5 opportunities across 3 consecutive sessions.',
  motor: 'Student will complete the target motor action with 80% independence across 3 consecutive sessions.',
};

const DOMAIN_TEMPLATES: Record<string, { label: string; fields: string[] }> = {
  communication: {
    label: 'Communication',
    fields: ['Target Skill', 'SD (Discriminative Stimulus)', 'Expected Response', 'Prompt Hierarchy', 'Reinforcement', 'Data Collection Method', 'Generalization Settings', 'Mastery Criteria', 'Verbal Operant Type'],
  },
  'social-play': {
    label: 'Social & Play',
    fields: ['Target Skill', 'Peer / Adult Context', 'Setting', 'Prompt Hierarchy', 'Reinforcement', 'Generalization Plan', 'Mastery Criteria'],
  },
  'learning-engagement': {
    label: 'Learning & Engagement',
    fields: ['Task', 'SD', 'Expected Response', 'Prompt Hierarchy', 'Reinforcement', 'Error Correction', 'Mastery Criteria', 'Engagement Target', 'Generalization Setting'],
  },
  'behavior-regulation': {
    label: 'Behavior & Regulation',
    fields: ['Target Behavior', 'Hypothesized Function', 'Replacement Behavior', 'Antecedent Supports', 'Teaching Strategy', 'Reinforcement Plan', 'Response Strategy', 'Crisis / Escalation Notes', 'Mastery Criteria'],
  },
  'adaptive-living': {
    label: 'Adaptive Living',
    fields: ['Routine or Skill', 'Task Analysis', 'Prompt Hierarchy', 'Independence Goal', 'Reinforcement', 'Setting', 'Caregiver / Staff Generalization', 'Mastery Criteria'],
  },
  'academic-pre-academic': {
    label: 'Academic & Pre-Academic',
    fields: ['Target Academic Skill', 'Instructional Format', 'Prompt Hierarchy', 'Reinforcement', 'Accuracy Target', 'Fluency Target', 'Generalization', 'Mastery Criteria'],
  },
  'safety-independence': {
    label: 'Safety & Independence',
    fields: ['Target Safety Skill', 'Context', 'Expected Response', 'Prompt Hierarchy', 'Reinforcement', 'Mastery Standard', 'Generalization Across Environments'],
  },
  motor: {
    label: 'Motor',
    fields: ['Motor Skill', 'Materials', 'Prompt Hierarchy', 'Support Level', 'Repetition Target', 'Independence Target', 'Mastery Criteria'],
  },
};

export function GoalBuilder() {
  const [step, setStep] = useState(1);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSubdomainId, setSelectedSubdomainId] = useState('');
  const [goalText, setGoalText] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const { data: domains = [] } = useProgramDomains();
  const { data: subdomains = [] } = useProgramSubdomains(selectedDomainId || undefined);

  const selectedDomain = domains.find(d => d.id === selectedDomainId);
  const selectedSubdomain = subdomains.find(s => s.id === selectedSubdomainId);
  const template = selectedDomain ? DOMAIN_TEMPLATES[selectedDomain.slug] : null;
  const starterGoal = selectedDomain ? STARTER_GOALS[selectedDomain.slug] : '';

  const handleDomainSelect = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedSubdomainId('');
    setStep(2);
    const domain = domains.find(d => d.id === domainId);
    if (domain) {
      setGoalText(STARTER_GOALS[domain.slug] || '');
    }
    setFieldValues({});
  };

  const handleSubdomainSelect = (subId: string) => {
    setSelectedSubdomainId(subId);
    setStep(3);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(goalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedDomainId('');
    setSelectedSubdomainId('');
    setGoalText('');
    setFieldValues({});
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <button onClick={handleReset} className="hover:text-foreground transition-colors font-medium">
          Goal Builder
        </button>
        {selectedDomain && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => setStep(2)} className="hover:text-foreground transition-colors">
              {selectedDomain.name}
            </button>
          </>
        )}
        {selectedSubdomain && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{selectedSubdomain.name}</span>
          </>
        )}
      </div>

      {/* Step 1: Choose Domain */}
      {step === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {domains.map(d => (
            <Card
              key={d.id}
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
              onClick={() => handleDomainSelect(d.id)}
            >
              <CardContent className="p-3 text-center">
                <span className="text-sm font-medium">{d.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Choose Subdomain */}
      {step === 2 && subdomains.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Select Subdomain</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Card
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => { setSelectedSubdomainId(''); setStep(3); }}
            >
              <CardContent className="p-2.5 text-center">
                <span className="text-xs text-muted-foreground">Skip (General)</span>
              </CardContent>
            </Card>
            {subdomains.map(s => (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                onClick={() => handleSubdomainSelect(s.id)}
              >
                <CardContent className="p-2.5 text-center">
                  <span className="text-xs font-medium">{s.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 fallback if no subdomains */}
      {step === 2 && subdomains.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No subdomains for this domain</p>
          <Button size="sm" onClick={() => setStep(3)}>Continue to Goal</Button>
        </div>
      )}

      {/* Step 3: Goal & Template */}
      {step >= 3 && template && (
        <div className="space-y-4">
          {/* Starter Goal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Draft Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                rows={3}
                className="text-sm"
                placeholder="Edit the auto-generated goal..."
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setGoalText(starterGoal)}>
                  Reset to Starter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Template Fields */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{template.label} Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {template.fields.map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{field}</Label>
                    <Input
                      value={fieldValues[field] || ''}
                      onChange={e => setFieldValues(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={`Enter ${field.toLowerCase()}...`}
                      className="text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={handleReset}>Start Over</Button>
            <Button size="sm" onClick={() => {
              // For now, copy the goal - future: save to program
              navigator.clipboard.writeText(goalText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
              {copied ? 'Copied!' : 'Copy Goal'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
