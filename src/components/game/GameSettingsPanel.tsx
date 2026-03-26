import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGameTracks, MOVEMENT_STYLES, TRACK_TYPE_LABELS } from "@/hooks/useGameTracks";
import type { ClassroomGameSettings } from "@/hooks/useGameTracks";
import { TrackRenderer } from "./TrackRenderer";

interface GameSettingsPanelProps {
  classroomId: string;
}

export function GameSettingsPanel({ classroomId }: GameSettingsPanelProps) {
  const { tracks, loading, updateClassroomSettings, getClassroomSettings } = useGameTracks();
  const [settings, setSettings] = useState<Partial<ClassroomGameSettings>>({
    track_id: null,
    game_mode: "race",
    movement_style: "glide",
    track_theme: "default",
    leaderboard_enabled: true,
    allow_team_mode: true,
    animations_enabled: true,
    allow_track_selection: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classroomId) return;
    getClassroomSettings(classroomId).then((s) => {
      if (s) setSettings(s);
    });
  }, [classroomId]);

  const selectedTrack = tracks.find((t) => t.id === settings.track_id) || tracks[0];

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateClassroomSettings(classroomId, settings);
    setSaving(false);
    if (ok) toast.success("Game settings saved");
    else toast.error("Failed to save settings");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" /> Game Board Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Track preview */}
        {selectedTrack && (
          <TrackRenderer
            track={selectedTrack}
            movementStyle={settings.movement_style || "glide"}
            studentProgress={[
              { id: "demo1", name: "Student A", emoji: "🧒", progress: 30 },
              { id: "demo2", name: "Student B", emoji: "👧", progress: 65 },
            ]}
          />
        )}

        {/* Track selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Track</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setSettings((s) => ({ ...s, track_id: t.id }))}
                className={`text-left p-3 rounded-lg border transition-all text-xs ${
                  settings.track_id === t.id || (!settings.track_id && t.id === tracks[0]?.id)
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="font-medium truncate">{t.name}</p>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {TRACK_TYPE_LABELS[t.track_type] || t.track_type}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Movement style */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Movement Style</Label>
          <Select value={settings.movement_style || "glide"} onValueChange={(v) => setSettings((s) => ({ ...s, movement_style: v }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOVEMENT_STYLES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label} — <span className="text-muted-foreground">{m.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Game mode */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Game Mode</Label>
          <Select value={settings.game_mode || "race"} onValueChange={(v) => setSettings((s) => ({ ...s, game_mode: v }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="race">Race</SelectItem>
              <SelectItem value="level">Level Up</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Leaderboard visible</Label>
            <Switch checked={settings.leaderboard_enabled ?? true} onCheckedChange={(v) => setSettings((s) => ({ ...s, leaderboard_enabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Team mode</Label>
            <Switch checked={settings.allow_team_mode ?? true} onCheckedChange={(v) => setSettings((s) => ({ ...s, allow_team_mode: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Animations</Label>
            <Switch checked={settings.animations_enabled ?? true} onCheckedChange={(v) => setSettings((s) => ({ ...s, animations_enabled: v }))} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
