import { Link } from "react-router-dom";
import { WelcomeNav } from "@/components/welcome/WelcomeNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Brain, Activity, BarChart3,
  CheckCircle, Sparkles, Layers,
  Zap, Star, Bell, BookOpen, FlaskConical, Lightbulb,
  GitBranch, BarChart, AlertTriangle, Trophy,
} from "lucide-react";

const BEACON_FEATURES = [
  {
    icon: Star,
    title: "Points Ledger",
    desc: "Award, deduct, and track behavior points for each student in real time from the classroom.",
  },
  {
    icon: Trophy,
    title: "Reward Store",
    desc: "Students redeem earned points for custom rewards set by teachers — from extra free time to prizes.",
  },
  {
    icon: Brain,
    title: "AI Behavior Suggestions",
    desc: "Beacon's AI surfaces proactive suggestions when patterns indicate a student may need support.",
  },
  {
    icon: AlertTriangle,
    title: "Mayday Alerts",
    desc: "One-tap mayday alerts instantly notify the clinical team when a student escalates.",
  },
  {
    icon: BookOpen,
    title: "Shared Classroom Plans",
    desc: "Teachers access the clinical behavior plan directly — no more emailing PDFs back and forth.",
  },
  {
    icon: BarChart,
    title: "Activity KPIs",
    desc: "Track daily classroom engagement metrics, point distribution, and alert frequency.",
  },
];

const BEACON_FOR = [
  "Special Day Class (SDC) teachers",
  "Paraprofessionals & support aides",
  "Inclusion & resource specialists",
  "School-based behavior technicians",
];

const BEHAVIOR_FEATURES = [
  {
    icon: FlaskConical,
    title: "BehaviorLab",
    desc: "Interactive simulations and case studies that train clinicians on FBA methodology and behavior protocols.",
  },
  {
    icon: GitBranch,
    title: "Intervention Builder",
    desc: "Build structured behavior intervention plans (BIPs) with goal chaining, strategies, and crisis protocols.",
  },
  {
    icon: Lightbulb,
    title: "Strategy Library",
    desc: "A curated library of evidence-based behavior reduction and replacement strategies, indexed by function.",
  },
  {
    icon: Sparkles,
    title: "AI Recommendations",
    desc: "AI-generated intervention recommendations based on the learner's data history and behavior profile.",
  },
  {
    icon: Activity,
    title: "Advanced Analytics",
    desc: "Trend analysis, phase-change markers, and behavioral pattern detection across your entire caseload.",
  },
  {
    icon: BarChart3,
    title: "Extended Reports",
    desc: "Generate comprehensive behavior analytics reports, staff performance summaries, and program reviews.",
  },
];

const BEHAVIOR_FOR = [
  "BCBAs and behavior supervisors",
  "Clinical directors and program leads",
  "Advanced clinicians building complex BIPs",
  "Agencies seeking data-driven program review",
];

const COMPARE_ROWS = [
  { feature: "ABC Data Collection", base: true, beacon: false, behavior: false },
  { feature: "Skill Acquisition & DTT", base: true, beacon: false, behavior: false },
  { feature: "FBA Report Generation", base: true, beacon: false, behavior: false },
  { feature: "Parent Portal & Training", base: true, beacon: false, behavior: false },
  { feature: "NovaAI Copilot (basic)", base: true, beacon: false, behavior: false },
  { feature: "Classroom Points & Rewards", base: false, beacon: true, behavior: false },
  { feature: "Mayday Alerts", base: false, beacon: true, behavior: false },
  { feature: "Shared Behavior Plans", base: false, beacon: true, behavior: false },
  { feature: "AI Classroom Suggestions", base: false, beacon: true, behavior: false },
  { feature: "BehaviorLab Simulations", base: false, beacon: false, behavior: true },
  { feature: "Intervention Builder", base: false, beacon: false, behavior: true },
  { feature: "Advanced Trend Analytics", base: false, beacon: false, behavior: true },
  { feature: "AI Behavior Recommendations", base: false, beacon: false, behavior: true },
];

export default function WelcomeAddOns() {
  return (
    <div className="min-h-screen bg-background">
      <WelcomeNav />

      {/* Page header */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <Badge className="mb-4 bg-accent text-antecedent border-0">
            <Layers className="w-3 h-3 mr-1" />
            Optional Add-ons
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Extend your NovaTrack platform
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The core platform covers your full clinical workflow. Add Beacon or Behavior+ when
            your team is ready for specialized classroom and analytics capabilities.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">

        {/* ── Beacon Add-on ── */}
        <section id="beacon">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-display text-2xl font-bold text-foreground">Beacon</h2>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Add-on</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Classroom intelligence for teachers &amp; support staff
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* CTA card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex flex-col">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                Bring behavior support into the classroom
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                Beacon gives teachers a simple, engaging way to reinforce positive behavior through
                points and rewards — while keeping the clinical team in the loop with real-time
                alerts and shared behavior plans.
              </p>
              <p className="text-sm font-semibold text-foreground mb-3">Best for:</p>
              <ul className="space-y-2 mb-6 flex-1">
                {BEACON_FOR.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  Add Beacon to My Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Feature grid */}
            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4 content-start">
              {BEACON_FEATURES.map((f) => (
                <Card key={f.title} className="border shadow-card hover:shadow-soft transition-shadow">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-[18px] h-[18px] text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* ── Behavior+ Add-on ── */}
        <section id="behavior-plus">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
              <Activity className="w-6 h-6 text-antecedent" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-display text-2xl font-bold text-foreground">Behavior+</h2>
                <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Add-on</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Advanced behavior analytics &amp; clinical tools for specialists
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* CTA card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 flex flex-col">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                Power up your clinical analytics
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                Behavior+ unlocks advanced tools for clinicians who need deeper analytics,
                AI-driven recommendations, interactive training simulations, and a full
                intervention planning suite.
              </p>
              <p className="text-sm font-semibold text-foreground mb-3">Best for:</p>
              <ul className="space-y-2 mb-6 flex-1">
                {BEHAVIOR_FOR.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-antecedent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
                  Add Behavior+ to My Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Feature grid */}
            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4 content-start">
              {BEHAVIOR_FEATURES.map((f) => (
                <Card key={f.title} className="border shadow-card hover:shadow-soft transition-shadow">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-[18px] h-[18px] text-antecedent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison table ── */}
        <section>
          <h3 className="font-display text-2xl font-bold text-foreground mb-6 text-center">
            What's included in each plan
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-5 py-3.5 font-semibold text-foreground w-1/2">
                    Feature
                  </th>
                  <th className="text-center px-4 py-3.5 font-semibold text-foreground">Core</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-amber-600">
                    + Beacon
                  </th>
                  <th className="text-center px-4 py-3.5 font-semibold text-antecedent">
                    + Behavior+
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border/60 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-5 py-3 text-foreground">{row.feature}</td>
                    <td className="text-center px-4 py-3">
                      {row.base ? (
                        <CheckCircle className="w-4 h-4 text-sidebar-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/40 text-base">—</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {row.beacon ? (
                        <CheckCircle className="w-4 h-4 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/40 text-base">—</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {row.behavior ? (
                        <CheckCircle className="w-4 h-4 text-antecedent mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/40 text-base">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Add-ons can be enabled for individual users or agency-wide. Contact us for pricing details.
          </p>
        </section>

      </div>

      {/* CTA */}
      <section className="gradient-hero py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Not sure which add-on is right for you?
          </h2>
          <p className="text-white/80 mb-8">
            Book a 30-minute demo and we'll walk you through the options based on your team's needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-sidebar-primary hover:bg-white/90 font-semibold px-8">
                Book a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white bg-transparent hover:bg-white/10 px-8"
              >
                Try the Core Platform Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white/55 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sidebar-primary" />
            <span className="font-display font-bold text-white">NovaTrack Behavior</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/welcome" className="hover:text-white transition-colors">Overview</Link>
            <Link to="/welcome/features" className="hover:text-white transition-colors">Features</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
