import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useObservationRequests } from '@/hooks/useObservationRequests';
import { REQUEST_TYPE_LABELS } from '@/types/observationRequest';
import { Student } from '@/types/behavior';
import { Send, Loader2 } from 'lucide-react';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  onCreated?: () => void;
}

export function CreateRequestDialog({
  open,
  onOpenChange,
  student,
  onCreated,
}: CreateRequestDialogProps) {
  const { createRequest, sendRequest } = useObservationRequests(student.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    request_type: 'behavior_observation',
    recipient_name: '',
    recipient_email: '',
    recipient_role: 'teacher',
    instructions: '',
    target_behaviors: [] as string[],
    sendImmediately: true,
  });

  const handleBehaviorToggle = (behaviorId: string) => {
    setFormData(prev => ({
      ...prev,
      target_behaviors: prev.target_behaviors.includes(behaviorId)
        ? prev.target_behaviors.filter(id => id !== behaviorId)
        : [...prev.target_behaviors, behaviorId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.recipient_name.trim() || !formData.recipient_email.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const request = await createRequest({
        student_id: student.id,
        request_type: formData.request_type,
        recipient_name: formData.recipient_name.trim(),
        recipient_email: formData.recipient_email.trim(),
        recipient_role: formData.recipient_role,
        instructions: formData.instructions.trim() || undefined,
        target_behaviors: formData.target_behaviors.length > 0 ? formData.target_behaviors : undefined,
      });

      if (request && formData.sendImmediately) {
        await sendRequest(request.id);
      }

      // Reset form
      setFormData({
        request_type: 'behavior_observation',
        recipient_name: '',
        recipient_email: '',
        recipient_role: 'teacher',
        instructions: '',
        target_behaviors: [],
        sendImmediately: true,
      });

      onOpenChange(false);
      onCreated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Teacher Observation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: student.color }}
              >
                {student.name.charAt(0)}
              </div>
              <span className="font-medium">{student.name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select
              value={formData.request_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input
                value={formData.recipient_name}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                placeholder="Ms. Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.recipient_role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, recipient_role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="aide">Aide</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={formData.recipient_email}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_email: e.target.value }))}
              placeholder="teacher@school.edu"
            />
          </div>

          {student.behaviors.length > 0 && (
            <div className="space-y-2">
              <Label>Target Behaviors (optional)</Label>
              <div className="flex flex-wrap gap-1">
                {student.behaviors.map(behavior => (
                  <Badge
                    key={behavior.id}
                    variant={formData.target_behaviors.includes(behavior.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleBehaviorToggle(behavior.id)}
                  >
                    {behavior.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Instructions (optional)</Label>
            <Textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Please observe during morning transition..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sendImmediately"
              checked={formData.sendImmediately}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, sendImmediately: checked === true }))
              }
            />
            <Label htmlFor="sendImmediately" className="text-sm cursor-pointer">
              Send email immediately
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.recipient_name.trim() || !formData.recipient_email.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {formData.sendImmediately ? 'Create & Send' : 'Create Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
