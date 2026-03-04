import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2,
  ClipboardList,
  FileText,
  BarChart3,
  Inbox,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffMessages, useSendStaffMessage, useMarkMessageRead, StaffMessage } from "@/hooks/useStaffMessages";
import { useStudentTeachers, AssignedTeacher } from "@/hooks/useStudentTeachers";
import { useToast } from "@/hooks/use-toast";
import { useAgencyContext } from "@/hooks/useAgencyContext";

interface StaffMessageThreadProps {
  studentId: string;
  studentName: string;
}

const typeIcons: Record<string, React.ElementType> = {
  message: MessageSquare,
  task_assignment: ClipboardList,
  data_share: BarChart3,
  pdf_share: FileText,
  summary: FileText,
};

const typeLabels: Record<string, string> = {
  message: "Message",
  task_assignment: "Task",
  data_share: "Data",
  pdf_share: "PDF",
  summary: "Summary",
};

export function StaffMessageThread({ studentId, studentName }: StaffMessageThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentAgency } = useAgencyContext();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const recipientFilter = selectedTeacher === "all" ? undefined : selectedTeacher;
  const { data: messages, isLoading } = useStaffMessages(studentId, recipientFilter);
  const { data: teachers } = useStudentTeachers(studentId);
  const sendMessage = useSendStaffMessage();
  const markRead = useMarkMessageRead();

  // Mark unread messages as read
  useEffect(() => {
    if (!messages || !user) return;
    messages
      .filter((m) => m.recipient_id === user.id && !m.is_read)
      .forEach((m) => markRead.mutate({ messageId: m.id, table: m._table || "staff_messages" }));
  }, [messages, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleReply = async (recipientId: string, parentId?: string) => {
    if (!replyContent.trim()) return;
    try {
      await sendMessage.mutateAsync({
        studentId,
        recipientId,
        messageType: "message",
        content: replyContent.trim(),
        parentMessageId: parentId,
        agencyId: currentAgency?.id,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast({ title: "Reply sent" });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  const unreadCount = messages?.filter((m) => m.recipient_id === user?.id && !m.is_read).length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left group">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Teacher Messages
          </h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {unreadCount} new
            </Badge>
          )}
          <Badge variant="outline" className="ml-auto text-xs">
            {messages?.length || 0} messages
          </Badge>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-3">
        {/* Teacher filter */}
        {teachers && teachers.length > 1 && (
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.user_id} value={t.user_id}>
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
          </div>
        ) : !messages?.length ? (
          <p className="text-sm text-muted-foreground py-2">No messages yet for {studentName}.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const Icon = typeIcons[msg.message_type] || MessageSquare;

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <Card className={`max-w-[85%] ${isMine ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}>
                    <CardHeader className="pb-1 pt-2 px-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{msg.sender_name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Icon className="h-2.5 w-2.5 mr-0.5" />
                          {typeLabels[msg.message_type]}
                        </Badge>
                        <span>{format(new Date(msg.created_at), "MMM d, h:mm a")}</span>
                        {isMine && msg.is_read && (
                          <CheckCheck className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {msg.subject && (
                        <CardTitle className="text-sm mt-0.5">{msg.subject}</CardTitle>
                      )}
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-1 text-xs text-primary">
                              <FileText className="h-3 w-3" />
                              {att.file_url ? (
                                <a href={att.file_url} target="_blank" rel="noreferrer" className="underline">
                                  {att.file_name}
                                </a>
                              ) : (
                                <span>{att.file_name}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!isMine && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-6 text-xs px-2"
                          onClick={() => setReplyingTo(replyingTo === msg.id ? null : msg.id)}
                        >
                          Reply
                        </Button>
                      )}

                      {replyingTo === msg.id && (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            placeholder="Type your reply…"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!replyContent.trim() || sendMessage.isPending}
                              onClick={() => handleReply(msg.sender_id, msg.id)}
                            >
                              {sendMessage.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
