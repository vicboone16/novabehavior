import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Send, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type VideoProvider = 'zoom' | 'whereby';

interface SendTelehealthLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  staffName?: string;
  scheduledTime?: string;
  defaultProvider?: VideoProvider;
  timezone?: string;
}

export function SendTelehealthLinkDialog({
  open,
  onOpenChange,
  studentName,
  staffName,
  scheduledTime,
  defaultProvider = 'whereby',
  timezone,
}: SendTelehealthLinkDialogProps) {
  const [provider, setProvider] = useState<VideoProvider>(defaultProvider);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail.trim() || !meetingLink.trim()) {
      toast.error('Please enter recipient email and meeting link');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-telehealth-link', {
        body: {
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || recipientEmail.trim(),
          studentName,
          provider,
          meetingLink: meetingLink.trim(),
          meetingPassword: meetingPassword.trim() || undefined,
          scheduledTime,
          staffName,
          notes: notes.trim() || undefined,
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Telehealth link sent successfully');
      handleClose();
    } catch (error: any) {
      console.error('Error sending telehealth link:', error);
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!meetingLink.trim()) return;
    await navigator.clipboard.writeText(meetingLink.trim());
    setCopied(true);
    toast.success('Meeting link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setRecipientEmail('');
    setRecipientName('');
    setMeetingLink('');
    setMeetingPassword('');
    setNotes('');
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Send Telehealth Link
          </DialogTitle>
          <DialogDescription>
            Send a video session link to a parent, teacher, or caregiver for {studentName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider selection */}
          <Tabs value={provider} onValueChange={(v) => setProvider(v as VideoProvider)}>
            <TabsList className="w-full">
              <TabsTrigger value="zoom" className="flex-1">Zoom</TabsTrigger>
              <TabsTrigger value="whereby" className="flex-1">Whereby</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label>Meeting Link *</Label>
            <div className="flex gap-2">
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder={provider === 'zoom' ? 'https://zoom.us/j/...' : 'https://whereby.com/your-room'}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                disabled={!meetingLink.trim()}
                title="Copy link"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Zoom password */}
          {provider === 'zoom' && (
            <div className="space-y-2">
              <Label>Meeting Password</Label>
              <Input
                value={meetingPassword}
                onChange={(e) => setMeetingPassword(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="parent@email.com"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions for the recipient..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !recipientEmail.trim() || !meetingLink.trim()}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
