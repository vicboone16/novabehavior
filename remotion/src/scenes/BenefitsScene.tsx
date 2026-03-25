import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "../constants";

const BENEFITS = [
  { icon: "⏱", label: "Save 45+ min/day", desc: "No more end-of-day data entry" },
  { icon: "📱", label: "Works on iPad", desc: "Designed for classroom & clinic" },
  { icon: "🔒", label: "HIPAA Secure", desc: "All data encrypted & compliant" },
  { icon: "⭐", label: "No Training Needed", desc: "Intuitive from day one" },
  { icon: "📊", label: "Real-Time Analytics", desc: "Graphs update automatically" },
  { icon: "🏢", label: "Multi-Site Ready", desc: "Scale across clinics & districts" },
];

export const BenefitsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const headerOp = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  const bgShift = Math.sin(frame * 0.012) * 5;

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(${140 + bgShift}deg, ${BRAND.dark}, #1a2744 50%, ${BRAND.darkMid})`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 80, gap: 48,
      }}>
        <div style={{ textAlign: "center", opacity: headerOp, transform: `translateY(${headerY}px)` }}>
          <h2 style={{
            fontSize: 52, fontWeight: 800, color: BRAND.white,
            fontFamily: "sans-serif", letterSpacing: -1,
          }}>
            Why Teams Love NovaTrack
          </h2>
          <p style={{
            fontSize: 22, color: BRAND.muted, fontFamily: "sans-serif",
            marginTop: 12,
          }}>
            Built for the speed of a real classroom and the rigor clinicians demand
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24, width: "100%", maxWidth: 1200,
        }}>
          {BENEFITS.map((b, i) => {
            const cardSpring = spring({ frame: frame - 40 - i * 10, fps, config: { damping: 15, stiffness: 120 } });
            const cardOp = interpolate(cardSpring, [0, 1], [0, 1]);
            const cardY = interpolate(cardSpring, [0, 1], [40, 0]);
            const cardScale = interpolate(cardSpring, [0, 1], [0.9, 1]);
            const float = Math.sin((frame + i * 20) * 0.02) * 3;

            return (
              <div key={b.label} style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 20, padding: "32px 28px",
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: 12,
                opacity: cardOp,
                transform: `translateY(${cardY + float}px) scale(${cardScale})`,
              }}>
                <div style={{
                  fontSize: 36, width: 64, height: 64, borderRadius: 16,
                  background: `${BRAND.primary}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {b.icon}
                </div>
                <span style={{
                  fontSize: 22, fontWeight: 700, color: BRAND.white,
                  fontFamily: "sans-serif",
                }}>{b.label}</span>
                <span style={{
                  fontSize: 16, color: BRAND.muted,
                  fontFamily: "sans-serif",
                }}>{b.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
