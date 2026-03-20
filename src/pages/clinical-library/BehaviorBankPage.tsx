import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Zap, BookOpen } from 'lucide-react';
import BehaviorLibrary from '@/pages/BehaviorLibrary';
import BehaviorLibraryFull from '@/pages/BehaviorLibraryFull';
import BehaviorReductionStrategiesTab from './BehaviorReductionStrategiesTab';

export default function BehaviorBankPage() {
  const [activeTab, setActiveTab] = useState<string>('definitions');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Behavior Bank</h2>
        <p className="text-xs text-muted-foreground">
          Behaviors & definitions, reduction strategies, and intervention protocols
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="definitions" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Behaviors & Definitions
          </TabsTrigger>
          <TabsTrigger value="reduction" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Behavior Reduction Strategies
          </TabsTrigger>
          <TabsTrigger value="interventions" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Behavior Interventions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="mt-4">
          <BehaviorLibrary embedded />
        </TabsContent>

        <TabsContent value="reduction" className="mt-4">
          <BehaviorReductionStrategiesTab />
        </TabsContent>

        <TabsContent value="interventions" className="mt-4">
          <BehaviorLibraryFull embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
