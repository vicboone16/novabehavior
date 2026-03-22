import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBopsDomains, useBopsArchetypes, useBopsConstellations, useBopsQuestions, useBopsClassroomTypes } from '@/hooks/useBopsData';
import { Loader2 } from 'lucide-react';

export function BopsFrameworkSetup() {
  const [sub, setSub] = useState('domains');
  const { data: domains, isLoading: dLoading } = useBopsDomains();
  const { data: archetypes, isLoading: aLoading } = useBopsArchetypes();
  const { data: constellations, isLoading: cLoading } = useBopsConstellations();
  const { data: questions, isLoading: qLoading } = useBopsQuestions();
  const { data: classrooms, isLoading: clLoading } = useBopsClassroomTypes();

  return (
    <Card>
      <CardHeader>
        <CardTitle>BOPS Framework Registry</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={sub} onValueChange={setSub}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="domains">Domains ({domains?.length || 0})</TabsTrigger>
            <TabsTrigger value="archetypes">Archetypes ({archetypes?.length || 0})</TabsTrigger>
            <TabsTrigger value="constellations">Constellations ({constellations?.length || 0})</TabsTrigger>
            <TabsTrigger value="questions">Questions ({questions?.length || 0})</TabsTrigger>
            <TabsTrigger value="cfi">CFI Classrooms ({classrooms?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="domains">
            {dLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-3">
                  {domains?.map(d => (
                    <Card key={d.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{d.display_name}</p>
                          <p className="text-xs text-muted-foreground">{d.clinical_description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{d.aka_archetype}</Badge>
                          {d.is_meta && <Badge variant="secondary">Meta</Badge>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="archetypes">
            {aLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-3">
                  {archetypes?.map(a => (
                    <Card key={a.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{a.archetype}</p>
                          <p className="text-xs text-muted-foreground">{a.clinical_name}</p>
                        </div>
                        <Badge variant="outline">{a.linked_domain}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="constellations">
            {cLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-3">
                  {constellations?.map(c => (
                    <Card key={c.id} className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{c.training_name}</p>
                          {c.nickname && <Badge variant="secondary" className="text-xs">{c.nickname}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.clinical_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">Esc: {String(c.escalation_multiplier)}</Badge>
                          <Badge variant="outline" className="text-xs">Hidden: {String(c.hidden_need_multiplier)}</Badge>
                          <Badge variant="outline" className="text-xs">Recovery: {String(c.recovery_multiplier)}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="questions">
            {qLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <ScrollArea className="h-[500px]">
                <div className="grid gap-2">
                  {questions?.map(q => (
                    <div key={q.id} className="flex items-start gap-3 py-2 border-b text-sm">
                      <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">Q{q.item_number}</span>
                      <span className="flex-1">{q.item_text}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{q.linked_domain}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="cfi">
            {clLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <div className="grid gap-3">
                {classrooms?.map(c => (
                  <Card key={c.id} className="p-3">
                    <p className="font-semibold">{c.classroom_name}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">Support: {c.support_level}</Badge>
                      <Badge variant="outline">Flexibility: {c.flexibility_level}</Badge>
                      <Badge variant="outline">Demand: {c.demand_level}</Badge>
                      <Badge variant="outline">Authority: {c.authority_intensity}</Badge>
                      <Badge variant="secondary">Modifier: {String(c.default_modifier)}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
