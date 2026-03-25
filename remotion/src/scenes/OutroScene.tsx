import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "../constants";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 100 } });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleScale = interpolate(titleSpring, [0, 1], [0.85, 1]);

  const subSpring = spring({ frame: frame - 50, fps, config: { damping: 20 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);

  const urlSpring = spring({ frame: frame - 80, fps, config: { damping: 18 } });
  const urlOp = interpolate(urlSpring, [0, 1], [0, 1]);
  const urlY = interpolate(urlSpring, [0, 1], [20, 0]);

  const bgShift = Math.sin(frame * 0.01) * 8;
  const float1 = Math.sin(frame * 0.02) * 10;
  const float2 = Math.cos(frame * 0.018) * 12;

  // Fade out at the end
  const fadeOut = interpolate(frame, [420, 480], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(${150 + bgShift}deg, ${BRAND.dark} 0%, #1a2d50 50%, ${BRAND.darkMid} 100%)`,
      }} />

      {/* Decorative elements */}
      <div style={{
        position: "absolute", right: 150, top: 200,
        width: 350, height: 350, borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.primary}20, transparent)`,
        transform: `translateY(${float1}px)`,
      }} />
      <div style={{
        position: "absolute", left: 200, bottom: 150,
        width: 250, height: 250, borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.accent}15, transparent)`,
        transform: `translateY(${float2}px)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 32,
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: titleOp, transform: `scale(${titleScale})`,
          boxShadow: `0 20px 60px ${BRAND.primary}44`,
        }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: BRAND.white, fontFamily: "sans-serif" }}>N</span>
        </div>

        <h2 style={{
          fontSize: 64, fontWeight: 800, color: BRAND.white,
          fontFamily: "sans-serif", letterSpacing: -2,
          opacity: titleOp, transform: `scale(${titleScale})`,
        }}>
          Ready to simplify ABA?
        </h2>

        <p style={{
          fontSize: 24, color: BRAND.muted, fontFamily: "sans-serif",
          textAlign: "center", maxWidth: 600,
          opacity: subOp,
        }}>
          Join hundreds of agencies, clinicians, and school districts already using NovaTrack.
        </p>

        <div style={{
          display: "flex", gap: 20, marginTop: 8,
          opacity: urlOp, transform: `translateY(${urlY}px)`,
        }}>
          <div style={{
            padding: "14px 40px", borderRadius: 14,
            background: `linear-gradient(135deg, ${BRAND.primary}, #3b82f6)`,
            color: BRAND.white, fontSize: 22, fontWeight: 700,
            fontFamily: "sans-serif",
            boxShadow: `0 8px 30px ${BRAND.primary}55`,
          }}>
            Try the Live Demo →
          </div>
        </div>

        <p style={{
          fontSize: 18, color: `${BRAND.muted}88`, fontFamily: "sans-serif",
          opacity: urlOp,
        }}>
          novabehavior.lovable.app
        </p>
      </div>
    </AbsoluteFill>
  );
};
