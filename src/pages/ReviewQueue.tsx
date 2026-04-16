import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, MessageSquare, Settings2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SupervisorReviewDashboard } from "@/components/admin/SupervisorReviewDashboard";
import { SMSBehaviorQueue } from "@/components/sms/SMSBehaviorQueue.tsx";
import { SMSShortcodeSettings } from "@/components/sms/SMSShortcodeSettings.tsx";
import { SMSStudentCodeSettings } from "@/components/sms/SMSStudentCodeSettings.tsx";

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("notes");

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Review Queue
              </h1>
              <p className="text-xs text-muted-foreground">Session notes, SMS behavior entries, and data approvals</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 max-w-3xl">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1 text-xs gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" /> Session Notes
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex-1 text-xs gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> SMS Entries
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> SMS Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4">
            <SupervisorReviewDashboard />
          </TabsContent>

          <TabsContent value="sms" className="mt-4 space-y-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-xs space-y-1">
                <p>
                  <strong>Supported SMS formats:</strong>
                </p>
                <ul className="space-y-0.5 mt-1">
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL PA 3</code> — student + behavior + count
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL TANTRUM 2 30min</code> — with duration
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL PA 0</code> — observed zero
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL no behaviors today</code> — zero for all behaviors
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">PA 3</code> — system texts back asking which student
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL pushed peer after told to stop…</code> — ABC draft
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">KALEL PA 3 2:30PM</code> or{" "}
                    <code className="bg-muted px-1 rounded">2024-12-01</code> — with time/date
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
            <SMSBehaviorQueue />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            <SMSShortcodeSettings />
            <div className="border-t pt-4">
              <SMSStudentCodeSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
