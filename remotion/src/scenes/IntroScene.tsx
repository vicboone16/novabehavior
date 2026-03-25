import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img, Sequence } from "remotion";
import { BRAND } from "../constants";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background gradient animation
  const bgShift = interpolate(frame, [0, 180], [0, 20]);

  // Logo/title entrance
  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 120 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle
  const subSpring = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [40, 0]);

  // Tagline
  const tagSpring = spring({ frame: frame - 65, fps, config: { damping: 20 } });
  const tagOp = interpolate(tagSpring, [0, 1], [0, 1]);

  // Decorative circles
  const c1Scale = spring({ frame: frame - 5, fps, config: { damping: 30 } });
  const c2Scale = spring({ frame: frame - 20, fps, config: { damping: 25 } });

  // Gentle float
  const float1 = Math.sin(frame * 0.03) * 8;
  const float2 = Math.cos(frame * 0.025) * 10;

  return (
    <AbsoluteFill>
      {/* Gradient BG */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(${135 + bgShift}deg, ${BRAND.dark} 0%, ${BRAND.darkMid} 40%, #1a365d 100%)`,
      }} />

      {/* Decorative circles */}
      <div style={{
        position: "absolute", right: 200, top: 150,
        width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.primary}22, transparent)`,
        transform: `scale(${c1Scale}) translateY(${float1}px)`,
      }} />
      <div style={{
        position: "absolute", left: 100, bottom: 100,
        width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.accent}18, transparent)`,
        transform: `scale(${c2Scale}) translateY(${float2}px)`,
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 24,
      }}>
        {/* Nova logo mark */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          boxShadow: `0 20px 60px ${BRAND.primary}44`,
        }}>
          <span style={{ fontSize: 40, fontWeight: 900, color: BRAND.white, fontFamily: "sans-serif" }}>N</span>
        </div>

        <h1 style={{
          fontSize: 82, fontWeight: 800, color: BRAND.white,
          fontFamily: "sans-serif", letterSpacing: -3, lineHeight: 1,
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          textAlign: "center",
        }}>
          NovaTrack
        </h1>

        <p style={{
          fontSize: 32, color: BRAND.muted, fontFamily: "sans-serif",
          fontWeight: 400, maxWidth: 700, textAlign: "center",
          transform: `translateY(${subY}px)`,
          opacity: subOp,
          lineHeight: 1.4,
        }}>
          Behavior tracking built for classrooms, powered by clinical rigor
        </p>

        <div style={{
          display: "flex", gap: 32, marginTop: 16,
          opacity: tagOp,
        }}>
          {["ABA Agencies", "School Districts", "Clinical Teams"].map((t, i) => (
            <div key={t} style={{
              padding: "10px 24px",
              borderRadius: 100,
              border: `1px solid ${BRAND.muted}44`,
              color: BRAND.muted,
              fontSize: 18,
              fontFamily: "sans-serif",
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
