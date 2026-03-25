// Shared constants for the video
export const BRAND = {
  primary: "#2563eb",      // Blue
  accent: "#f59e0b",       // Amber/gold
  dark: "#0f172a",         // Slate 900
  darkMid: "#1e293b",      // Slate 800
  light: "#f8fafc",        // Slate 50
  muted: "#94a3b8",        // Slate 400
  emerald: "#10b981",      // Green for checkmarks
  white: "#ffffff",
};

export const SCENES = {
  intro: { start: 0, dur: 180 },           // 0-6s
  tracking: { start: 180, dur: 480 },      // 6-22s
  classroom: { start: 660, dur: 480 },     // 22-38s
  analytics: { start: 1140, dur: 480 },    // 38-54s
  profiles: { start: 1620, dur: 480 },     // 54-70s
  reports: { start: 2100, dur: 480 },      // 70-86s
  benefits: { start: 2580, dur: 540 },     // 86-104s
  outro: { start: 3120, dur: 480 },        // 104-120s
} as const;
