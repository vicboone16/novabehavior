import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameTrack {
  id: string;
  name: string;
  track_type: string;
  total_steps: number;
  nodes_json: any[];
  zones_json: any[];
  checkpoints_json: any[];
  theme_json: Record<string, any>;
  camera_style: string;
  is_active: boolean;
  sort_order: number;
  description: string | null;
}

export interface ClassroomGameSettings {
  id: string;
  classroom_id: string;
  track_id: string | null;
  game_mode: string;
  movement_style: string;
  track_theme: string;
  leaderboard_enabled: boolean;
  allow_team_mode: boolean;
  animations_enabled: boolean;
  allow_track_selection: boolean;
}

export const MOVEMENT_STYLES = [
  { value: "glide", label: "Smooth Glide", description: "Fluid, continuous motion" },
  { value: "bounce", label: "Bounce Hop", description: "Playful bouncing movement" },
  { value: "dash", label: "Boosted Dash", description: "Quick burst forward" },
  { value: "float", label: "Floating Drift", description: "Gentle floating motion" },
] as const;

export const TRACK_TYPE_LABELS: Record<string, string> = {
  curved: "Curved Race",
  zigzag: "Zig-Zag Path",
  map: "Island Map",
  board_nodes: "Board Game",
  lanes: "Lane Race",
  depth_track: "3D Depth",
};

export function useGameTracks() {
  const [tracks, setTracks] = useState<GameTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("game_tracks" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setTracks((data as any[]).map((t) => ({
        ...t,
        nodes_json: Array.isArray(t.nodes_json) ? t.nodes_json : [],
        zones_json: Array.isArray(t.zones_json) ? t.zones_json : [],
        checkpoints_json: Array.isArray(t.checkpoints_json) ? t.checkpoints_json : [],
        theme_json: t.theme_json || {},
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const updateClassroomSettings = async (classroomId: string, updates: Partial<ClassroomGameSettings>) => {
    const { error } = await supabase
      .from("classroom_game_settings" as any)
      .upsert({ classroom_id: classroomId, ...updates } as any, { onConflict: "classroom_id" });
    return !error;
  };

  const getClassroomSettings = async (classroomId: string): Promise<ClassroomGameSettings | null> => {
    const { data } = await supabase
      .from("classroom_game_settings" as any)
      .select("*")
      .eq("classroom_id", classroomId)
      .maybeSingle();
    return (data as any) || null;
  };

  return { tracks, loading, fetchTracks, updateClassroomSettings, getClassroomSettings };
}
