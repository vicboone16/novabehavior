import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { SendToTeacherDialog } from "./SendToTeacherDialog";
import type { MessageType } from "@/hooks/useStaffMessages";

interface ShareWithTeacherButtonProps {
  studentId: string;
  studentName: string;
  messageType?: MessageType;
  prefillSubject?: string;
  prefillContent?: string;
  prefillMetadata?: Record<string, any>;
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

export function ShareWithTeacherButton({
  studentId,
  studentName,
  messageType = "message",
  prefillSubject,
  prefillContent,
  prefillMetadata,
  variant = "icon",
  size = "sm",
}: ShareWithTeacherButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send to Teacher</TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="outline" size={size} onClick={() => setOpen(true)}>
          <Send className="h-3.5 w-3.5 mr-1" />
          Send to Teacher
        </Button>
      )}

      <SendToTeacherDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        prefillType={messageType}
        prefillSubject={prefillSubject}
        prefillContent={prefillContent}
        prefillMetadata={prefillMetadata}
      />
    </>
  );
}
