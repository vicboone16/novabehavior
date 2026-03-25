import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CreateRewardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (reward: {
    name: string; emoji?: string; description?: string;
    cost: number; reward_type?: string; tier?: string;
    dynamic_pricing_enabled?: boolean; inventory_enabled?: boolean;
  }) => void;
}

const EMOJI_OPTIONS = ["🎮", "⚽", "🍕", "📱", "🎨", "🎵", "📚", "🏆", "⭐", "🎁", "🍦", "🎪", "🎯", "💎", "🦄", "🚀"];

export function CreateRewardDialog({ open, onClose, onCreate }: CreateRewardDialogProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("5");
  const [rewardType, setRewardType] = useState("individual");
  const [tier, setTier] = useState("standard");
  const [dynamicPricing, setDynamicPricing] = useState(true);

  const handleCreate = () => {
    if (!name || !cost) return;
    onCreate({
      name, emoji, description: description || undefined,
      cost: parseInt(cost), reward_type: rewardType, tier,
      dynamic_pricing_enabled: dynamicPricing,
    });
    setName(""); setDescription(""); setCost("5"); setEmoji("🎁");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reward</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Emoji picker */}
          <div>
            <Label className="text-xs">Emoji</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-md transition-colors ${emoji === e ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-muted"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Extra Break" className="h-9" />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="5 extra minutes of free time" className="h-9" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Base Cost</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={rewardType} onValueChange={setRewardType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="schoolwide">Schoolwide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Dynamic pricing</Label>
            <Switch checked={dynamicPricing} onCheckedChange={setDynamicPricing} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!name || !cost} onClick={handleCreate}>Create Reward</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
