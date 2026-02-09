import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IEPLibrary from './IEPLibrary';
import BehaviorLibrary from './BehaviorLibrary';

export default function ClinicalLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'iep';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Clinical Library</h1>
                <p className="text-xs text-muted-foreground">IEP supports and behavior intervention resources</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-12 bg-transparent border-none">
              <TabsTrigger value="iep" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <BookOpen className="w-4 h-4" />
                IEP Supports
              </TabsTrigger>
              <TabsTrigger value="behavior" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Activity className="w-4 h-4" />
                Behavior Bank
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'iep' ? <IEPLibraryContent /> : <BehaviorLibraryContent />}
    </div>
  );
}

// Wrapper that renders IEPLibrary content without its own header/nav
function IEPLibraryContent() {
  return <IEPLibrary />;
}

// Wrapper that renders BehaviorLibrary content without its own header/nav
function BehaviorLibraryContent() {
  return <BehaviorLibrary embedded />;
}
