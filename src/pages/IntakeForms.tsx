import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Plus, FileText, Package, Send, CheckCircle, PenTool, Wrench, ArrowRight, Clock, Filter, ClipboardList } from 'lucide-react';
import { useIntakeFormsEngine, type IntakeTabKey } from '@/hooks/useIntakeFormsEngine';
import { IntakeTemplateLibrary } from '@/components/intake-forms/IntakeTemplateLibrary';
import { IntakeInstancesList } from '@/components/intake-forms/IntakeInstancesList';
import { IntakePacketBuilder } from '@/components/intake-forms/IntakePacketBuilder';
import { IntakeFormRenderer } from '@/components/intake-forms/IntakeFormRenderer';
import { ClinicalFormsPanel } from '@/components/clinical-forms/ClinicalFormsPanel';

type ExtendedTabKey = IntakeTabKey | 'clinical';

export default function IntakeForms() {
  const [activeTab, setActiveTab] = useState<ExtendedTabKey>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const engine = useIntakeFormsEngine();

  if (selectedInstanceId) {
    return (
      <IntakeFormRenderer
        instanceId={selectedInstanceId}
        onBack={() => setSelectedInstanceId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intake & Forms</h1>
          <p className="text-sm text-muted-foreground">
            Create, assign, and manage intake questionnaires and form packets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={FileText} label="Templates" count={engine.templates.length} color="text-primary" />
        <StatCard icon={Clock} label="Drafts" count={engine.draftInstances.length} color="text-amber-500" />
        <StatCard icon={Send} label="Pending" count={engine.pendingInstances.length} color="text-blue-500" />
        <StatCard icon={CheckCircle} label="Submitted" count={engine.submittedInstances.length} color="text-emerald-500" />
        <StatCard icon={PenTool} label="Signed" count={engine.signedInstances.length} color="text-violet-500" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ExtendedTabKey)}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="clinical" className="gap-1">
            <ClipboardList className="w-3 h-3" />
            Clinical Forms
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned
            {engine.draftInstances.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{engine.draftInstances.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {engine.pendingInstances.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{engine.pendingInstances.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="packets">Packets</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="routing">Routing Log</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <IntakeTemplateLibrary
            templates={engine.templates}
            searchQuery={searchQuery}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="clinical" className="mt-4">
          <ClinicalFormsPanel />
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          <IntakeInstancesList
            instances={engine.draftInstances}
            title="Assigned & In-Progress Forms"
            emptyMessage="No assigned forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <IntakeInstancesList
            instances={engine.pendingInstances}
            title="Pending (Sent to Parent/Staff)"
            emptyMessage="No forms pending completion"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="submitted" className="mt-4">
          <IntakeInstancesList
            instances={engine.submittedInstances}
            title="Submitted Forms"
            emptyMessage="No submitted forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="signatures" className="mt-4">
          <IntakeInstancesList
            instances={engine.signedInstances}
            title="Forms with Signatures"
            emptyMessage="No signed forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="packets" className="mt-4">
          <IntakePacketBuilder
            packets={engine.packets}
            templates={engine.templates}
            isLoading={engine.isLoading}
          />
        </TabsContent>

        <TabsContent value="builder" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Form Builder
              </CardTitle>
              <CardDescription>
                Create and customize dynamic form templates with sections, conditional logic, and field mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The form builder allows you to create unlimited templates with drag-and-drop sections,
                field types (text, date, signature, repeater, AI-filled, and more), conditional visibility rules,
                and profile mapping for automatic data ingestion.
              </p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Routing & Delivery Log</CardTitle>
              <CardDescription>Track form delivery, reminders, and completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <RoutingLog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{count}</p>
    </Card>
  );
}

function RoutingLog() {
  const [logs, setLogs] = useState<any[]>([]);

  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No delivery logs yet</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <span>{log.action}</span>
            <Badge>{log.status}</Badge>
          </div>
        ))
      )}
    </div>
  );
}
