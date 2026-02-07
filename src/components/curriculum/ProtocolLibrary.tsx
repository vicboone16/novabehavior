import { useState } from 'react';
import { BookOpen, Search, Plus, Filter, ChevronRight, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProtocols } from '@/hooks/useProtocols';
import { CURRICULUM_SYSTEMS, ProtocolTemplate } from '@/types/protocol';
import { ProtocolTemplateBuilder } from './ProtocolTemplateBuilder';
import { ProtocolViewer } from './ProtocolViewer';

export function ProtocolLibrary() {
  const { templates, isLoading } = useProtocols();
  const [search, setSearch] = useState('');
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolTemplate | null>(null);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesSystem = filterSystem === 'all' || t.curriculum_system === filterSystem;
    return matchesSearch && matchesSystem;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Protocol Library
          </h2>
          <p className="text-sm text-muted-foreground">Browse and manage teaching protocols across curriculum frameworks</p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Protocol
        </Button>
      </div>

      {/* Curriculum System Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CURRICULUM_SYSTEMS.map((sys) => {
          const count = templates.filter(t => t.curriculum_system === sys.id).length;
          return (
            <Card
              key={sys.id}
              className={`cursor-pointer transition-all hover:shadow-md ${filterSystem === sys.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterSystem(filterSystem === sys.id ? 'all' : sys.id)}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <p className="font-bold text-sm">{sys.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{sys.type}</p>
                <Badge variant="secondary" className="mt-1 text-xs">{count} protocols</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search protocols..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSystem} onValueChange={setFilterSystem}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Systems" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Systems</SelectItem>
            {CURRICULUM_SYSTEMS.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Protocol Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No protocols found</p>
          <p className="text-sm">Create a new protocol or adjust your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((protocol) => (
            <Card key={protocol.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedProtocol(protocol)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{protocol.title}</CardTitle>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                <CardDescription className="line-clamp-2">{protocol.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {protocol.curriculum_system && <Badge variant="outline" className="text-xs">{protocol.curriculum_system}</Badge>}
                  {protocol.domain && <Badge variant="secondary" className="text-xs">{protocol.domain}</Badge>}
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Target className="w-3 h-3" /> {protocol.steps.length} steps
                  </Badge>
                  {protocol.estimated_duration_minutes && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="w-3 h-3" /> {protocol.estimated_duration_minutes}min
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Protocol Viewer */}
      {selectedProtocol && (
        <ProtocolViewer protocol={selectedProtocol} open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)} />
      )}

      {/* Protocol Builder */}
      {showBuilder && (
        <ProtocolTemplateBuilder open={showBuilder} onOpenChange={setShowBuilder} />
      )}
    </div>
  );
}
