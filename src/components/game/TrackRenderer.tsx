import { useMemo } from "react";
import type { GameTrack } from "@/hooks/useGameTracks";

interface TrackRendererProps {
  track: GameTrack;
  studentProgress?: { id: string; name: string; emoji?: string; progress: number }[];
  movementStyle?: string;
  className?: string;
}

/** Generate SVG path nodes for different track types */
function generateNodes(track: GameTrack, width: number, height: number) {
  const nodes = track.nodes_json;
  if (nodes.length > 0 && nodes[0]?.x !== undefined) {
    return nodes.map((n: any) => ({
      x: (n.x / 100) * width,
      y: (n.y / 100) * height,
      label: n.label || "",
    }));
  }

  // Generate default nodes based on track type
  const count = Math.min(track.total_steps, 20);
  const padding = 40;
  const w = width - padding * 2;
  const h = height - padding * 2;

  switch (track.track_type) {
    case "zigzag": {
      return Array.from({ length: count }, (_, i) => ({
        x: padding + (i / (count - 1)) * w,
        y: padding + (i % 2 === 0 ? 0 : h * 0.6) + Math.random() * h * 0.2,
        label: "",
      }));
    }
    case "lanes": {
      const laneH = h / 4;
      return Array.from({ length: count }, (_, i) => ({
        x: padding + (i / (count - 1)) * w,
        y: padding + laneH * 1.5,
        label: "",
      }));
    }
    case "board_nodes": {
      const cols = Math.ceil(Math.sqrt(count));
      return Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
        return {
          x: padding + (col / (cols - 1)) * w,
          y: padding + (row / Math.ceil(count / cols)) * h,
          label: `${i + 1}`,
        };
      });
    }
    case "map": {
      const angle = (i: number) => (i / count) * Math.PI * 2;
      const cx = width / 2;
      const cy = height / 2;
      const rx = w * 0.4;
      const ry = h * 0.35;
      return Array.from({ length: count }, (_, i) => ({
        x: cx + Math.cos(angle(i)) * rx,
        y: cy + Math.sin(angle(i)) * ry,
        label: "",
      }));
    }
    case "depth_track": {
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        const depth = 0.4 + t * 0.6; // near = small, far = big
        return {
          x: padding + t * w,
          y: padding + h * 0.5 + Math.sin(t * Math.PI * 2) * h * 0.3 * depth,
          label: "",
          scale: depth,
        };
      });
    }
    default: {
      // curved
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        return {
          x: padding + t * w,
          y: padding + h * 0.5 + Math.sin(t * Math.PI * 2) * h * 0.3,
          label: "",
        };
      });
    }
  }
}

function buildPath(nodes: { x: number; y: number }[]) {
  if (nodes.length < 2) return "";
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cx} ${(prev.y + curr.y) / 2}`;
  }
  const last = nodes[nodes.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

const MOVEMENT_ANIM: Record<string, string> = {
  glide: "transition-all duration-700 ease-in-out",
  bounce: "transition-all duration-500 ease-bounce",
  dash: "transition-all duration-300 ease-out",
  float: "transition-all duration-1000 ease-in-out",
};

export function TrackRenderer({ track, studentProgress = [], movementStyle = "glide", className }: TrackRendererProps) {
  const W = 800;
  const H = 400;
  const nodes = useMemo(() => generateNodes(track, W, H), [track]);
  const pathD = useMemo(() => buildPath(nodes), [nodes]);

  const theme = track.theme_json || {};
  const trackColor = theme.trackColor || "hsl(var(--primary) / 0.3)";
  const nodeColor = theme.nodeColor || "hsl(var(--primary))";
  const bgColor = theme.bgColor || "hsl(var(--muted) / 0.3)";

  // Zone rendering
  const zones = track.zones_json || [];

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border bg-card ${className || ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ background: bgColor }}>
        {/* Zones */}
        {zones.map((zone: any, i: number) => {
          const startIdx = Math.floor((zone.start_pct || 0) / 100 * (nodes.length - 1));
          const endIdx = Math.floor((zone.end_pct || 100) / 100 * (nodes.length - 1));
          const zoneNodes = nodes.slice(startIdx, endIdx + 1);
          if (zoneNodes.length < 2) return null;
          const zoneColor = zone.type === "boost" ? "rgba(34,197,94,0.1)" : zone.type === "slow" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)";
          return (
            <rect
              key={i}
              x={Math.min(...zoneNodes.map((n: any) => n.x)) - 10}
              y={Math.min(...zoneNodes.map((n: any) => n.y)) - 20}
              width={Math.max(...zoneNodes.map((n: any) => n.x)) - Math.min(...zoneNodes.map((n: any) => n.x)) + 20}
              height={Math.max(...zoneNodes.map((n: any) => n.y)) - Math.min(...zoneNodes.map((n: any) => n.y)) + 40}
              rx={8}
              fill={zoneColor}
              stroke={zoneColor.replace("0.1", "0.3")}
              strokeWidth={1}
            />
          );
        })}

        {/* Track path */}
        <path d={pathD} fill="none" stroke={trackColor} strokeWidth={6} strokeLinecap="round" />
        <path d={pathD} fill="none" stroke={nodeColor} strokeWidth={2} strokeLinecap="round" strokeDasharray="8 4" opacity={0.5} />

        {/* Nodes */}
        {nodes.map((node: any, i: number) => {
          const scale = node.scale || 1;
          const isCheckpoint = (track.checkpoints_json || []).some((c: any) =>
            Math.abs((c.step_index || 0) - i) < 1
          );
          return (
            <g key={i}>
              {/* Depth shadow for depth_track */}
              {track.track_type === "depth_track" && (
                <ellipse cx={node.x} cy={node.y + 8 * scale} rx={6 * scale} ry={2 * scale} fill="rgba(0,0,0,0.15)" />
              )}
              <circle
                cx={node.x} cy={node.y}
                r={isCheckpoint ? 8 * scale : 5 * scale}
                fill={isCheckpoint ? "hsl(var(--primary))" : nodeColor}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                opacity={0.8 + scale * 0.2}
              />
              {isCheckpoint && (
                <text x={node.x} y={node.y - 12} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={9} fontWeight="bold">
                  🏁
                </text>
              )}
              {node.label && (
                <text x={node.x} y={node.y + 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={8}>
                  {node.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Student avatars */}
        {studentProgress.map((s) => {
          const nodeIdx = Math.min(
            Math.floor((s.progress / 100) * (nodes.length - 1)),
            nodes.length - 1
          );
          const node = nodes[Math.max(0, nodeIdx)];
          if (!node) return null;
          const scale = node.scale || 1;
          return (
            <g key={s.id} className={MOVEMENT_ANIM[movementStyle] || MOVEMENT_ANIM.glide}>
              {/* Shadow */}
              <ellipse cx={node.x} cy={node.y + 14 * scale} rx={10 * scale} ry={3 * scale} fill="rgba(0,0,0,0.2)" />
              {/* Avatar circle */}
              <circle cx={node.x} cy={node.y - 6} r={12 * scale} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />
              <text x={node.x} y={node.y - 2} textAnchor="middle" fontSize={12 * scale}>
                {s.emoji || "🧑"}
              </text>
              <text x={node.x} y={node.y + 22} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={8} fontWeight="500">
                {s.name.split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* Start/Finish labels */}
        {nodes.length > 1 && (
          <>
            <text x={nodes[0].x} y={nodes[0].y - 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10} fontWeight="bold">START</text>
            <text x={nodes[nodes.length - 1].x} y={nodes[nodes.length - 1].y - 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10} fontWeight="bold">FINISH</text>
          </>
        )}
      </svg>
    </div>
  );
}
