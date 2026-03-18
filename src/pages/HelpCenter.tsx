/**
 * Help Center — Searchable FAQ, feature guides, troubleshooting, and release notes.
 */

import { useState, useEffect } from 'react';
import { Search, BookOpen, HelpCircle, AlertTriangle, Sparkles, ChevronRight, FileText, Zap, CreditCard, GraduationCap, Shield, Users } from 'lucide-react';
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

const HELP_CATEGORIES = [
  { slug: 'getting_started', label: 'Getting Started', icon: Sparkles },
  { slug: 'documentation', label: 'Clinical Documentation', icon: FileText },
  { slug: 'assessments_fba', label: 'Assessments + FBA/BIP', icon: BookOpen },
  { slug: 'billing', label: 'Billing + Authorizations', icon: CreditCard },
  { slug: 'teacher_parent', label: 'Teacher / Parent Workflows', icon: GraduationCap },
  { slug: 'permissions', label: 'Permissions + Visibility', icon: Shield },
  { slug: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('faq');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: faqData }, { data: articleData }] = await Promise.all([
        supabase.from('help_faq_items' as any).select('*').eq('is_active', true).order('sort_order'),
        supabase.from('help_articles' as any).select('*').eq('is_published', true).order('sort_order'),
      ]);
      if (faqData) setFaqs(faqData as unknown as FAQItem[]);
      if (articleData) setArticles(articleData as unknown as HelpArticle[]);
    };
    load();
  }, []);

  const q = searchQuery.toLowerCase();
  const filteredFaqs = faqs.filter(f => !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  const filteredArticles = articles.filter(a => !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));

  const faqsByCategory = HELP_CATEGORIES.map(cat => ({
    ...cat,
    items: filteredFaqs.filter(f => f.category === cat.slug),
  })).filter(cat => cat.items.length > 0);

  const guides = filteredArticles.filter(a => a.article_type === 'guide');
  const troubleshooting = filteredArticles.filter(a => a.article_type === 'troubleshooting');

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
        <p className="text-sm text-muted-foreground">Search FAQs, feature guides, and troubleshooting articles</p>
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
