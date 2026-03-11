import { useState } from 'react';
import { 
  Plus, Search, Filter, ClipboardList, AlertTriangle, Clock, 
  CheckCircle, XCircle, Users, Inbox, RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceRequests, STATUSES, PRIORITIES, REQUEST_TYPES, type SRFilter } from '@/hooks/useServiceRequests';
import { ServiceRequestForm } from './ServiceRequestForm';
import { ServiceRequestDetail } from './ServiceRequestDetail';
import { format } from 'date-fns';

const FILTER_TABS: { value: SRFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { value: 'my_requests', label: 'My Requests', icon: <Inbox className="w-3.5 h-3.5" /> },
  { value: 'team_queue', label: 'Team Queue', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'urgent', label: 'Urgent', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { value: 'unassigned', label: 'Unassigned', icon: <Inbox className="w-3.5 h-3.5" /> },
  { value: 'in_progress', label: 'In Progress', icon: <RotateCw className="w-3.5 h-3.5" /> },
  { value: 'waiting', label: 'Waiting', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { value: 'closed', label: 'Closed', icon: <XCircle className="w-3.5 h-3.5" /> },
];

export function ServiceRequestsPanel() {
  const [activeFilter, setActiveFilter] = useState<SRFilter>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const { requests, loading, refresh, createRequest, updateRequest, getActivities } = useServiceRequests(activeFilter);

  const filtered = requests.filter(r => {
    const matchesSearch = !search || 
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || r.request_type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return <Badge variant="secondary" className={`text-[10px] ${s?.color || ''}`}>{s?.label || status}</Badge>;
  };

  const getPriorityLabel = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return <span className={`text-xs font-medium ${p?.color || ''}`}>{p?.label || priority}</span>;
  };

  const getTypeLabel = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type)?.label || type;
  };

  if (showNewForm) {
    return (
      <ServiceRequestForm 
        onSubmit={async (data) => {
          await createRequest(data);
          setShowNewForm(false);
        }}
        onCancel={() => setShowNewForm(false)}
      />
    );
  }

  if (selectedRequest) {
    const req = requests.find(r => r.id === selectedRequest);
    if (req) {
      return (
        <ServiceRequestDetail
          request={req}
          onBack={() => setSelectedRequest(null)}
          onUpdate={async (updates) => {
            await updateRequest(req.id, updates);
          }}
          getActivities={() => getActivities(req.id)}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Service Requests</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowNewForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Filter Tabs - scrollable */}
      <div className="overflow-x-auto -mx-2 px-2">
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as SRFilter)}>
          <TabsList className="h-9 bg-transparent border-none flex-nowrap w-max">
            {FILTER_TABS.map(tab => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="gap-1 text-[11px] data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Request List */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading requests...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No requests found</h3>
            <p className="text-sm text-muted-foreground">Create a new request to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <Card 
              key={req.id} 
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedRequest(req.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getPriorityLabel(req.priority)}
                      <span className="text-sm font-medium truncate">{req.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{getTypeLabel(req.request_type)}</Badge>
                      {getStatusBadge(req.status)}
                      {req.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Due {format(new Date(req.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(req.created_at), 'MMM d')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
