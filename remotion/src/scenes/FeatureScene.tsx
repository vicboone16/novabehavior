import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { BRAND } from "../constants";

interface FeatureSceneProps {
  image: string;
  title: string;
  subtitle: string;
  highlights: string[];
  badge?: string;
  flipLayout?: boolean;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  image, title, subtitle, highlights, badge, flipLayout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image entrance - scale + slide
  const imgSpring = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 100 } });
  const imgScale = interpolate(imgSpring, [0, 1], [1.1, 1]);
  const imgX = interpolate(imgSpring, [0, 1], [flipLayout ? -60 : 60, 0]);
  const imgOp = interpolate(imgSpring, [0, 1], [0, 1]);

  // Text entrance
  const titleSpring = spring({ frame: frame - 30, fps, config: { damping: 15 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  const subSpring = spring({ frame: frame - 45, fps, config: { damping: 20 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [30, 0]);

  // Highlights stagger
  const getHighlightSpring = (i: number) => {
    const s = spring({ frame: frame - 65 - i * 12, fps, config: { damping: 18 } });
    return {
      opacity: interpolate(s, [0, 1], [0, 1]),
      x: interpolate(s, [0, 1], [30, 0]),
    };
  };

  // Subtle Ken Burns on screenshot
  const kenBurns = interpolate(frame, [0, 480], [1, 1.05], { extrapolateRight: "clamp" });

  // Badge
  const badgeSpring = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOp = interpolate(badgeSpring, [0, 1], [0, 1]);

  // Gentle BG movement
  const bgShift = Math.sin(frame * 0.015) * 5;

  const imageEl = (
    <div style={{
      flex: 1, position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 40,
    }}>
      <div style={{
        width: "100%", maxWidth: 880,
        borderRadius: 20, overflow: "hidden",
        boxShadow: `0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)`,
        transform: `scale(${imgScale}) translateX(${imgX}px)`,
        opacity: imgOp,
      }}>
        <Img src={staticFile(`images/${image}`)} style={{
          width: "100%", display: "block",
          transform: `scale(${kenBurns})`,
        }} />
      </div>
      {badge && (
        <div style={{
          position: "absolute", top: 60, left: flipLayout ? "auto" : 60, right: flipLayout ? 60 : "auto",
          background: BRAND.emerald, color: BRAND.white,
          padding: "8px 20px", borderRadius: 100,
          fontSize: 16, fontWeight: 700, fontFamily: "sans-serif",
          transform: `scale(${badgeScale})`, opacity: badgeOp,
          boxShadow: `0 4px 20px ${BRAND.emerald}66`,
        }}>
          ⭐ {badge}
        </div>
      )}
    </div>
  );

  const textEl = (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "60px 80px",
      gap: 20,
    }}>
      <h2 style={{
        fontSize: 52, fontWeight: 800, color: BRAND.white,
        fontFamily: "sans-serif", lineHeight: 1.1, letterSpacing: -1,
        transform: `translateY(${titleY}px)`, opacity: titleOp,
      }}>
        {title}
      </h2>
      <p style={{
        fontSize: 22, color: BRAND.muted, fontFamily: "sans-serif",
        lineHeight: 1.5, maxWidth: 480,
        transform: `translateY(${subY}px)`, opacity: subOp,
      }}>
        {subtitle}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        {highlights.map((h, i) => {
          const hs = getHighlightSpring(i);
          return (
            <div key={h} style={{
              display: "flex", alignItems: "center", gap: 14,
              opacity: hs.opacity,
              transform: `translateX(${hs.x}px)`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `${BRAND.emerald}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ color: BRAND.emerald, fontSize: 16 }}>✓</span>
              </div>
              <span style={{
                fontSize: 20, color: BRAND.light, fontFamily: "sans-serif",
                fontWeight: 500,
              }}>
                {h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(${155 + bgShift}deg, ${BRAND.dark}, ${BRAND.darkMid} 60%, #162033)`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "row",
      }}>
        {flipLayout ? <>{textEl}{imageEl}</> : <>{imageEl}{textEl}</>}
      </div>
    </AbsoluteFill>
  );
};
