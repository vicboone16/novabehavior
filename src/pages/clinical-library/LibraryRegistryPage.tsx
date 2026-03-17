import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, GitBranch } from 'lucide-react';
import { LibraryRegistryBrowser } from '@/components/clinical-library/LibraryRegistryBrowser';
import { CrosswalkRecommendations } from '@/components/clinical-library/CrosswalkRecommendations';

export default function LibraryRegistryPage() {
  const [tab, setTab] = useState('libraries');

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="libraries" className="text-xs gap-1">
            <BookOpen className="w-3.5 h-3.5" /> All Libraries
          </TabsTrigger>
          <TabsTrigger value="crosswalks" className="text-xs gap-1">
            <GitBranch className="w-3.5 h-3.5" /> Crosswalk Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="libraries" className="mt-4">
          <LibraryRegistryBrowser />
        </TabsContent>

        <TabsContent value="crosswalks" className="mt-4">
          <CrosswalkRecommendations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
