import { useState } from 'react';
import { Search, BookOpen, FlaskConical, Layers, Target, ChevronRight, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLibraryRegistry, type LibraryRegistryEntry } from '@/hooks/useLibraryRegistry';
import { LibraryDetailView } from './LibraryDetailView';

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  scored_assessment: { label: 'Scored Assessment', icon: FlaskConical, color: 'text-primary' },
  curriculum: { label: 'Curriculum', icon: BookOpen, color: 'text-emerald-600' },
  intervention_library: { label: 'Intervention Library', icon: Target, color: 'text-amber-600' },
  goal_bank: { label: 'Goal Bank', icon: Layers, color: 'text-violet-600' },
};

export function LibraryRegistryBrowser() {
  const { data: libraries = [], isLoading } = useLibraryRegistry();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryRegistryEntry | null>(null);

  const filtered = libraries.filter(lib => {
    const matchesSearch = !search ||
      lib.library_name.toLowerCase().includes(search.toLowerCase()) ||
      lib.library_key.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || lib.library_type === activeTab;
    return matchesSearch && matchesTab;
  });

  if (selectedLibrary) {
    return (
      <LibraryDetailView
        library={selectedLibrary}
        onBack={() => setSelectedLibrary(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search libraries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="scored_assessment" className="text-xs">Assessments</TabsTrigger>
          <TabsTrigger value="curriculum" className="text-xs">Curricula</TabsTrigger>
          <TabsTrigger value="intervention_library" className="text-xs">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading libraries…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No libraries found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(lib => {
                const meta = TYPE_META[lib.library_type] ?? TYPE_META.goal_bank;
                const Icon = meta.icon;
                return (
                  <Card
                    key={lib.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                    onClick={() => setSelectedLibrary(lib)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg bg-muted ${meta.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-semibold text-sm mb-0.5">{lib.library_name}</h3>
                      <Badge variant="secondary" className="text-[10px] mb-2">{meta.label}</Badge>
                      {lib.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{lib.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lib.supports_item_scoring && <Badge variant="outline" className="text-[9px]">Scoring</Badge>}
                        {lib.supports_reports && <Badge variant="outline" className="text-[9px]">Reports</Badge>}
                        {lib.supports_goal_mapping && <Badge variant="outline" className="text-[9px]">Goals</Badge>}
                        {lib.supports_exports && <Badge variant="outline" className="text-[9px]">Export</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
