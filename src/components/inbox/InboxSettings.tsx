import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  Copy, 
  ExternalLink,
  Settings,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export function InboxSettings() {
  // These would typically come from org settings
  const faxNumber = '+1 (555) 123-4567';
  const intakeEmail = 'intake@yourdomain.com';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Fax Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Fax Receiving (MetroFax)</CardTitle>
          </div>
          <CardDescription>
            Configure MetroFax to forward incoming faxes to this system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Your Fax Number</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={faxNumber} readOnly className="font-mono" />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(faxNumber, 'Fax number')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Setup Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Log into your MetroFax account</li>
              <li>Go to Settings → Email Notifications</li>
              <li>Enable "Email faxes as PDF attachments"</li>
              <li>Set the forwarding email to: <code className="bg-muted px-1 rounded">{intakeEmail}</code></li>
              <li>Save your settings</li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-700">
              Incoming faxes will be automatically processed and appear in your inbox queue.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email Receiving</CardTitle>
          </div>
          <CardDescription>
            Documents sent to this email will appear in your inbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Intake Email Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={intakeEmail} readOnly className="font-mono" />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(intakeEmail, 'Email address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Supported Attachments</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">JPG/PNG</Badge>
              <Badge variant="outline">TIFF</Badge>
              <Badge variant="outline">DOC/DOCX</Badge>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-700">
              Email parsing requires additional configuration. Contact support for setup assistance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Routing Rules */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Auto-Routing Rules</CardTitle>
          </div>
          <CardDescription>
            Configure automatic routing based on sender or document content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Coming Soon</p>
            <p className="text-sm">
              Auto-routing rules will allow you to automatically assign documents based on sender, 
              keywords, or document type.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
