import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { BenefitsScene } from "./scenes/BenefitsScene";
import { OutroScene } from "./scenes/OutroScene";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Scene 1: Intro (6s) */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 2: 2-Tap Tracking (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <FeatureScene
            image="teacher-tracking.jpg"
            title="2-Tap Classroom Tracking"
            subtitle="Large touch-friendly buttons let teachers log behaviors in real-time without leaving the moment. Designed for iPads and classroom speed."
            highlights={["No training required", "Works on any tablet", "Under 2 seconds per entry"]}
            badge="Teacher Favorite"
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 3: Classroom View (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <FeatureScene
            image="classroom-view.jpg"
            title="Classroom Command Center"
            subtitle="Student cards with live behavior counts, token progress, and prompt status. One screen to manage your whole classroom."
            highlights={["Live behavior badges", "Token economy built-in", "Color-coded alerts"]}
            badge="Teacher Favorite"
            flipLayout
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 4: Analytics (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <FeatureScene
            image="analytics-dashboard.jpg"
            title="Automatic Analytics"
            subtitle="Frequency charts, trend lines, and category breakdowns update in real-time. No manual graphing. No spreadsheets."
            highlights={["Auto-generated graphs", "Cross-student comparisons", "Export-ready reports"]}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 5: Student Profiles (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <FeatureScene
            image="student-profile.jpg"
            title="Complete Student Profiles"
            subtitle="Behavior plans, clinical notes, goal tracking, and progress history — all linked to each student."
            highlights={["Behavior intervention plans", "Goal mastery tracking", "Clinical documentation"]}
            flipLayout
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 6: Reports (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <FeatureScene
            image="reports-view.jpg"
            title="One-Click Reports"
            subtitle="Generate progress reports, clinical summaries, and IEP data automatically from collected behavior data."
            highlights={["Auto-narrative summaries", "Chart-embedded PDFs", "Insurance-ready billing data"]}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 7: Benefits (18s) */}
        <TransitionSeries.Sequence durationInFrames={540}>
          <BenefitsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 8: Outro (16s) */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
