import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Package, Plus, FileText, Loader2, Send, Clock } from 'lucide-react';
import { useIntakeFormsEngine, type FormTemplate, type FormPacket } from '@/hooks/useIntakeFormsEngine';
import { toast } from 'sonner';

interface Props {
  packets: (FormPacket & { form_packet_items: any[] })[];
  templates: FormTemplate[];
  isLoading: boolean;
  linkedEntityId?: string;
  linkedEntityType?: string;
}

export function IntakePacketBuilder({ packets, templates, isLoading, linkedEntityId, linkedEntityType }: Props) {
  const engine = useIntakeFormsEngine();
  const [isOpen, setIsOpen] = useState(false);
  const [packetName, setPacketName] = useState('');
  const [selectedTemplateCodes, setSelectedTemplateCodes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!packetName.trim() || selectedTemplateCodes.length === 0 || !linkedEntityId) return;
    setIsCreating(true);
    try {
      await engine.createPacket.mutateAsync({
        packetName,
        linkedEntityId,
        linkedEntityType: linkedEntityType || 'student',
        templateCodes: selectedTemplateCodes,
      });
      setIsOpen(false);
      setPacketName('');
      setSelectedTemplateCodes([]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async (packetId: string) => {
    try {
      await engine.markPacketSent.mutateAsync({ packetId });
    } catch {
      // error handled by mutation
    }
  };

  const toggleTemplate = (code: string) => {
    setSelectedTemplateCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Form Packets</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Packet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Form Packet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Packet Name</Label>
                <Input
                  value={packetName}
                  onChange={e => setPacketName(e.target.value)}
                  placeholder="e.g., New Student Intake Bundle"
                />
              </div>
              <div>
                <Label className="mb-2 block">Select Forms</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {templates.map(t => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTemplateCodes.includes(t.code)}
                        onCheckedChange={() => toggleTemplate(t.code)}
                      />
                      <span className="text-sm">{t.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{t.category}</Badge>
                    </label>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No templates available</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating || !packetName.trim() || selectedTemplateCodes.length === 0}>
                {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Packet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : packets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No packets created yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bundle multiple forms into a single packet for streamlined delivery
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {packets.map(packet => (
            <Card key={packet.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {packet.packet_name}
                  </CardTitle>
                  <Badge variant={packet.status === 'sent' ? 'default' : 'outline'}>
                    {packet.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <FileText className="h-3 w-3" />
                  {packet.form_packet_items?.length || 0} forms
                  {packet.due_at && (
                    <>
                      <Clock className="h-3 w-3 ml-2" />
                      Due {new Date(packet.due_at).toLocaleDateString()}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">View</Button>
                  {packet.status === 'draft' && (
                    <Button size="sm" className="flex-1" onClick={() => handleSend(packet.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
