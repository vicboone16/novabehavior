import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, FileText, ClipboardList, BarChart3, MessageSquare, Loader2 } from "lucide-react";
import { useStudentTeachers } from "@/hooks/useStudentTeachers";
import { useSendStaffMessage, MessageType } from "@/hooks/useStaffMessages";
import { useToast } from "@/hooks/use-toast";
import { useAgencyContext } from "@/hooks/useAgencyContext";

interface SendToTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  prefillType?: MessageType;
  prefillSubject?: string;
  prefillContent?: string;
  prefillMetadata?: Record<string, any>;
}

const typeOptions: { value: MessageType; label: string; icon: React.ElementType }[] = [
  { value: "message", label: "Message", icon: MessageSquare },
  { value: "task_assignment", label: "Task Assignment", icon: ClipboardList },
  { value: "data_share", label: "Data Summary", icon: BarChart3 },
  { value: "pdf_share", label: "PDF / Report", icon: FileText },
];

export function SendToTeacherDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  prefillType = "message",
  prefillSubject = "",
  prefillContent = "",
  prefillMetadata,
}: SendToTeacherDialogProps) {
  const { data: teachers, isLoading: loadingTeachers } = useStudentTeachers(studentId);
  const sendMessage = useSendStaffMessage();
  const { toast } = useToast();
  const { currentAgency } = useAgencyContext();

  const [recipientId, setRecipientId] = useState<string>("");
  const [messageType, setMessageType] = useState<MessageType>(prefillType);
  const [subject, setSubject] = useState(prefillSubject);
  const [content, setContent] = useState(prefillContent);

  const handleSend = async () => {
    if (!recipientId || !content.trim()) return;

    try {
      await sendMessage.mutateAsync({
        studentId,
        recipientId,
        messageType,
        subject: subject.trim() || undefined,
        content: content.trim(),
        metadata: prefillMetadata,
        agencyId: currentAgency?.id,
      });

      toast({
        title: "Sent to teacher",
        description: `Message sent for ${studentName}`,
      });

      // Reset
      setRecipientId("");
      setSubject("");
      setContent("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send to Teacher
          </DialogTitle>
          <DialogDescription>
            Share content with an assigned teacher for <strong>{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="space-y-1.5">
            <Label className="text-sm">Recipient</Label>
            {loadingTeachers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading teachers…
              </div>
            ) : !teachers?.length ? (
              <p className="text-sm text-muted-foreground">No teachers assigned to this student.</p>
            ) : (
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.full_name} {t.email && <span className="text-muted-foreground">({t.email})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm">Type</Label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = messageType === opt.value;
                return (
                  <Badge
                    key={opt.value}
                    variant={isActive ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setMessageType(opt.value)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {opt.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-sm">Subject (optional)</Label>
            <Input
              placeholder={messageType === "task_assignment" ? "e.g. Complete frequency count for hand-raising" : "e.g. Weekly data summary"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              {messageType === "task_assignment" ? "Task Details" : "Message"}
            </Label>
            <Textarea
              placeholder={
                messageType === "task_assignment"
                  ? "Describe what you'd like the teacher to do…"
                  : "Write your message…"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {prefillMetadata && (
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              📎 Attached: {prefillMetadata.attachment_name || "Report data"}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!recipientId || !content.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
