/**
 * Help Center — Searchable FAQ, feature guides, troubleshooting, and release notes.
 */

import { useState, useEffect } from 'react';
import { Search, BookOpen, HelpCircle, AlertTriangle, Sparkles, ChevronRight, FileText, Zap, CreditCard, GraduationCap, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  article_type: string;
  sort_order: number;
}

const HELP_CATEGORIES = [
  { slug: 'getting_started', label: 'Getting Started', icon: Sparkles },
  { slug: 'documentation', label: 'Clinical Documentation', icon: FileText },
  { slug: 'assessments_fba', label: 'Assessments + FBA/BIP', icon: BookOpen },
  { slug: 'billing', label: 'Billing + Authorizations', icon: CreditCard },
  { slug: 'teacher_parent', label: 'Teacher / Parent Workflows', icon: GraduationCap },
  { slug: 'permissions', label: 'Permissions + Visibility', icon: Shield },
  { slug: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
];

// Static seed FAQ for immediate use before DB is populated
const SEED_FAQS: FAQItem[] = [
  { id: '1', question: 'What is the Demo Workspace?', answer: 'A fully populated fake agency environment with realistic data across school, clinic, billing, and caregiver workflows. All records are clearly labeled DEMO and isolated from live data.', category: 'getting_started', sort_order: 1 },
  { id: '2', question: 'What is the difference between a session note and a narrative note?', answer: 'Session notes document a specific service session (date, time, activities, data). Narrative notes are longer clinical summaries that may cover progress across multiple sessions, treatment updates, or clinical reasoning.', category: 'documentation', sort_order: 1 },
  { id: '3', question: 'What is a SOAP note?', answer: 'SOAP = Subjective, Objective, Assessment, Plan. A structured clinical note format commonly used in ABA and healthcare documentation.', category: 'documentation', sort_order: 2 },
  { id: '4', question: 'What is an authorization?', answer: 'An authorization is approval from a payer (insurance, regional center, etc.) for a specific number of service units over a defined period. Services must stay within authorized limits.', category: 'billing', sort_order: 1 },
  { id: '5', question: 'What does "units remaining" mean?', answer: 'Units remaining shows how many approved service units are left in the current authorization period. When units run low, the system alerts supervisors.', category: 'billing', sort_order: 2 },
  { id: '6', question: 'Where do teacher summaries go after submission?', answer: 'Teacher summaries from the Teacher app flow into the Core app and appear on the learner\'s Teacher Data Hub tab. BCBAs can review, annotate, and use them in school consults, FBAs, and assessments.', category: 'teacher_parent', sort_order: 1 },
  { id: '7', question: 'How does Behavior Decoded connect to core?', answer: 'Behavior Decoded (the parent/caregiver app) submits home behavior logs and caregiver summaries. These flow into the Core app for clinical review and can be used in parent training, assessments, and recommendations.', category: 'teacher_parent', sort_order: 2 },
  { id: '8', question: 'Why is a claim denied?', answer: 'Claims can be denied for missing documentation, expired authorization, incorrect codes, duplicate submission, or payer-specific requirements. Check the billing dashboard for denial reason details.', category: 'troubleshooting', sort_order: 1 },
  { id: '9', question: 'Why is a note still marked draft?', answer: 'Notes remain in draft until they are reviewed, signed, and finalized. Check for missing fields, pending supervisor review, or unsigned status.', category: 'troubleshooting', sort_order: 2 },
  { id: '10', question: 'What is the difference between teacher mode and the Teacher app?', answer: 'Teacher Mode in Core lets BCBAs/consultants enter school observations directly. The Teacher App is a separate app used by teachers themselves to submit classroom data. Both sources appear in Core with different source labels.', category: 'teacher_parent', sort_order: 3 },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('faq');
  const [faqs, setFaqs] = useState<FAQItem[]>(SEED_FAQS);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Try to load from DB, fall back to seeds
  useEffect(() => {
    const loadContent = async () => {
      const { data: faqData } = await supabase
        .from('help_faq_items' as any)
        .select('*')
        .order('sort_order');
      if (faqData && (faqData as any[]).length > 0) {
        setFaqs(faqData as unknown as FAQItem[]);
      }

      const { data: articleData } = await supabase
        .from('help_articles' as any)
        .select('*')
        .order('sort_order');
      if (articleData && (articleData as any[]).length > 0) {
        setArticles(articleData as unknown as HelpArticle[]);
      }
    };
    loadContent();
  }, []);

  const filteredFaqs = faqs.filter(f =>
    !searchQuery ||
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const faqsByCategory = HELP_CATEGORIES.map(cat => ({
    ...cat,
    items: filteredFaqs.filter(f => f.category === cat.slug),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Help Center
        </h1>
        <p className="text-sm text-muted-foreground">Search FAQs, feature guides, and troubleshooting articles</p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help topics..."
          className="pl-10"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Cards */}
      {!searchQuery && tab === 'faq' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HELP_CATEGORIES.slice(0, 4).map(cat => (
            <Card key={cat.slug} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSearchQuery(cat.label.split(' ')[0])}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
          <TabsTrigger value="guides" className="text-xs">Feature Guides</TabsTrigger>
          <TabsTrigger value="troubleshooting" className="text-xs">Troubleshooting</TabsTrigger>
          <TabsTrigger value="updates" className="text-xs">What's New</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4 space-y-4">
          {faqsByCategory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No matching FAQ items found</p>
            </div>
          ) : (
            faqsByCategory.map(cat => (
              <div key={cat.slug}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </h3>
                <div className="space-y-1">
                  {cat.items.map(faq => (
                    <Collapsible key={faq.id} open={expandedFaq === faq.id} onOpenChange={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                      <CollapsibleTrigger className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedFaq === faq.id ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium">{faq.question}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-9 pb-3 pt-1">
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          {articles.filter(a => a.article_type === 'guide').length > 0 ? (
            <div className="space-y-2">
              {articles.filter(a => a.article_type === 'guide').map(article => (
                <Card key={article.id} className="cursor-pointer hover:border-primary/50">
                  <CardContent className="py-3">
                    <p className="text-sm font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{article.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Feature guides coming soon</p>
              <p className="text-xs mt-1">Detailed walkthroughs for every major workflow</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="troubleshooting" className="mt-4">
          <div className="space-y-2">
            {[
              'A session note is missing',
              'A note is unsigned or stuck in draft',
              'Teacher summary not visible in core',
              'Assessment response not linked to learner',
              'Units remaining look incorrect',
              'Claim is blocked or denied',
              'Auth expiration warning is active',
              'Dashboard metric seems stale',
            ].map((item, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm">{item}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Release notes and updates will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
