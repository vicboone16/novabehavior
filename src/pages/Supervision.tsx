import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { SupervisionDashboard } from '@/components/supervision/SupervisionDashboard';
import { FieldworkTracker } from '@/components/supervision/FieldworkTracker';
import { SupervisionLogDialog } from '@/components/supervision/SupervisionLogDialog';

export default function Supervision() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogDialog, setShowLogDialog] = useState(false);

  const canManageSupervision = userRole === 'admin' || userRole === 'super_admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Supervision Tracking</h1>
                <p className="text-xs text-muted-foreground">BCBA/RBT supervision logs & compliance</p>
              </div>
            </div>
            <Button onClick={() => setShowLogDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Log Supervision
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <Users className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="fieldwork" className="gap-2">
              <Clock className="w-4 h-4" />
              Fieldwork Hours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SupervisionDashboard />
          </TabsContent>

          <TabsContent value="fieldwork">
            <FieldworkTracker />
          </TabsContent>
        </Tabs>
      </main>

      {/* Log Supervision Dialog */}
      <SupervisionLogDialog 
        open={showLogDialog} 
        onOpenChange={setShowLogDialog}
        onSuccess={() => {
          setShowLogDialog(false);
          // Refresh data
        }}
      />
    </div>
  );
}
