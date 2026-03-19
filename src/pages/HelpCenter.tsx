/**
 * Help Center — Searchable FAQ, feature glossary, guides, troubleshooting, and release notes.
 */

import { useState, useEffect } from 'react';
import { Search, BookOpen, HelpCircle, AlertTriangle, Sparkles, ChevronRight, FileText, Zap, CreditCard, GraduationCap, Shield, Users, Book } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface GlossaryItem {
  id: string;
  feature_name: string;
  feature_slug: string;
  description: string;
  why_it_matters: string;
  where_it_lives: string;
  category: string;
  role_audience: string[];
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

const GLOSSARY_CATEGORY_LABELS: Record<string, string> = {
  getting_started: 'General',
  documentation: 'Documentation',
  assessments_fba: 'Assessments & FBA',
  billing: 'Billing',
  teacher_parent: 'Teacher / Parent',
};

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('faq');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [expandedGlossary, setExpandedGlossary] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: faqData }, { data: faqData2 }, { data: articleData }, { data: glossaryData }, { data: glossaryData2 }] = await Promise.all([
        supabase.from('help_faq_items' as any).select('*').eq('is_active', true).order('sort_order'),
        supabase.from('faq_items').select('*').eq('is_visible', true).order('display_order'),
        supabase.from('help_articles').select('*').eq('is_published', true).order('sort_order'),
        supabase.from('feature_inventory' as any).select('*').eq('status', 'active').order('sort_order'),
        supabase.from('glossary_terms').select('*').order('display_order'),
      ]);
      // Merge FAQ sources, dedup by question
      const allFaqs: FAQItem[] = [];
      const seenQ = new Set<string>();
      for (const item of [...(faqData || []), ...(faqData2 || [])] as any[]) {
        const q = (item.question || '').toLowerCase();
        if (!seenQ.has(q)) {
          seenQ.add(q);
          allFaqs.push({ id: item.id, question: item.question, answer: item.answer, category: item.category, sort_order: item.sort_order ?? item.display_order ?? 99 });
        }
      }
      setFaqs(allFaqs);
      if (articleData) setArticles(articleData as unknown as HelpArticle[]);
      // Merge glossary sources
      const allGlossary: GlossaryItem[] = [];
      const seenT = new Set<string>();
      for (const item of [...(glossaryData || []), ...(glossaryData2 || [])] as any[]) {
        const name = (item.feature_name || item.term || '').toLowerCase();
        if (!seenT.has(name)) {
          seenT.add(name);
          allGlossary.push({
            id: item.id,
            feature_name: item.feature_name || item.term,
            feature_slug: item.feature_slug || item.term?.toLowerCase().replace(/\s+/g, '-') || '',
            description: item.description || item.definition || '',
            why_it_matters: item.why_it_matters || '',
            where_it_lives: item.where_it_lives || item.category || '',
            category: item.category || 'general',
            role_audience: item.role_audience || [],
            sort_order: item.sort_order ?? item.display_order ?? 99,
          });
        }
      }
      setGlossary(allGlossary);
    };
    load();
  }, []);

  const q = searchQuery.toLowerCase();
  const filteredFaqs = faqs.filter(f => !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  const filteredArticles = articles.filter(a => !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
  const filteredGlossary = glossary.filter(g => !q || g.feature_name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));

  const faqsByCategory = HELP_CATEGORIES.map(cat => ({
    ...cat,
    items: filteredFaqs.filter(f => f.category === cat.slug),
  })).filter(cat => cat.items.length > 0);

  const guides = filteredArticles.filter(a => a.article_type === 'guide');
  const troubleshooting = filteredArticles.filter(a => a.article_type === 'troubleshooting');

  const glossaryByCategory = Object.entries(
    filteredGlossary.reduce<Record<string, GlossaryItem[]>>((acc, item) => {
      const cat = item.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {})
  );

  if (selectedArticle) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedArticle(null)} className="text-sm text-primary hover:underline flex items-center gap-1">
          ← Back to Help Center
        </button>
        <div>
          <Badge variant="outline" className="text-[10px] mb-2">{selectedArticle.article_type}</Badge>
          <h1 className="text-xl font-bold">{selectedArticle.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{selectedArticle.summary}</p>
        </div>
        <div className="prose prose-sm max-w-none text-foreground">
          {selectedArticle.content.split('\n').map((p, i) => (
            <p key={i} className="text-sm leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Help Center
        </h1>
        <p className="text-sm text-muted-foreground">Search FAQs, feature glossary, guides, and troubleshooting articles</p>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search help topics..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {!searchQuery && tab === 'faq' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HELP_CATEGORIES.slice(0, 4).map(cat => (
            <Card key={cat.slug} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSearchQuery(cat.label.split(' ')[0])}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cat.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-medium">{cat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="faq" className="text-xs">FAQ ({faqs.length})</TabsTrigger>
          <TabsTrigger value="glossary" className="text-xs">Glossary ({glossary.length})</TabsTrigger>
          <TabsTrigger value="guides" className="text-xs">Feature Guides ({guides.length})</TabsTrigger>
          <TabsTrigger value="troubleshooting" className="text-xs">Troubleshooting ({troubleshooting.length})</TabsTrigger>
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

        <TabsContent value="glossary" className="mt-4 space-y-4">
          {filteredGlossary.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Book className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No matching glossary terms found</p>
            </div>
          ) : (
            glossaryByCategory.map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {GLOSSARY_CATEGORY_LABELS[cat] || cat}
                </h3>
                <div className="space-y-1">
                  {items.map(item => (
                    <Collapsible key={item.id} open={expandedGlossary === item.id} onOpenChange={() => setExpandedGlossary(expandedGlossary === item.id ? null : item.id)}>
                      <CollapsibleTrigger className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedGlossary === item.id ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium">{item.feature_name}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">{item.where_it_lives}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-9 pb-3 pt-1 space-y-1.5">
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.why_it_matters && (
                          <p className="text-xs text-primary/80">
                            <span className="font-semibold">Why it matters:</span> {item.why_it_matters}
                          </p>
                        )}
                        {item.role_audience?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.role_audience.map(r => (
                              <Badge key={r} variant="secondary" className="text-[9px]">{r}</Badge>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          {guides.length > 0 ? (
            <div className="space-y-2">
              {guides.map(article => (
                <Card key={article.id} className="cursor-pointer hover:border-primary/50" onClick={() => setSelectedArticle(article)}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{article.summary}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Feature guides coming soon</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="troubleshooting" className="mt-4">
          {troubleshooting.length > 0 ? (
            <div className="space-y-2">
              {troubleshooting.map(article => (
                <Card key={article.id} className="cursor-pointer hover:border-primary/50" onClick={() => setSelectedArticle(article)}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{article.summary}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Troubleshooting articles coming soon</p>
            </div>
          )}
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
