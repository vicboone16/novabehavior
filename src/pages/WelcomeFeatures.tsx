import { Link } from "react-router-dom";
import { WelcomeNav } from "@/components/welcome/WelcomeNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Brain, Activity, Users, BookOpen, BarChart3,
  Shield, School, Heart, Sparkles, Layers,
  Target, ClipboardList, GraduationCap, Zap,
  Bell, MessageSquare, FileText, Calendar, CreditCard, UserCheck,
  FlaskConical, Lightbulb, GitBranch, Mic,
} from "lucide-react";

const FEATURE_CATEGORIES = [
  {
    id: "data",
    icon: ClipboardList,
    color: "text-behavior",
    bg: "bg-blue-50",
    title: "Behavior Data Collection",
    desc: "Capture every data point that matters — on any device, in any setting.",
    features: [
      {
        icon: Activity,
        title: "ABC Data Capture",
        desc: "Log antecedents, behaviors, and consequences in real time with configurable behavior codes.",
      },
      {
        icon: Target,
        title: "Frequency & Duration Tracking",
        desc: "Count occurrences, measure durations, and record intensity — including interval recording.",
      },
      {
        icon: ClipboardList,
        title: "Behavior Library",
        desc: "Choose from 200+ predefined behaviors or create your agency's own custom library.",
      },
      {
        icon: Bell,
        title: "Incident Logs",
        desc: "Document and categorize behavioral incidents with severity ratings and staff notes.",
      },
    ],
  },
  {
    id: "clinical",
    icon: Shield,
    color: "text-antecedent",
    bg: "bg-accent",
    title: "Clinical & Assessment",
    desc: "Comprehensive tools for BCBAs and clinical supervisors to manage programs end-to-end.",
    features: [
      {
        icon: BookOpen,
        title: "Skill Acquisition",
        desc: "Run DTT, naturalistic teaching, and task analysis programs with trial-by-trial recording.",
      },
      {
        icon: Target,
        title: "Goal Management",
        desc: "Set, monitor, and adjust IEP and ABA goals across all learners with mastery criteria tracking.",
      },
      {
        icon: FileText,
        title: "FBA & Report Generation",
        desc: "Auto-generate NYDOE-compliant FBAs, progress notes, and clinical summaries in minutes.",
      },
      {
        icon: UserCheck,
        title: "Assessment Dashboards",
        desc: "Review standardized assessments, track pre/post data, and export for insurance.",
      },
    ],
  },
  {
    id: "ai",
    icon: Brain,
    color: "text-sidebar-primary",
    bg: "bg-success-soft",
    title: "AI & Intelligence",
    desc: "NovaAI brings clinical reasoning power to every decision you make.",
    features: [
      {
        icon: Sparkles,
        title: "NovaAI Copilot",
        desc: "Chat with your data — ask about trends, get goal suggestions, and draft session notes instantly.",
      },
      {
        icon: Lightbulb,
        title: "Behavior Recommendations",
        desc: "AI-generated intervention strategies based on the learner's specific behavior profile.",
      },
      {
        icon: BarChart3,
        title: "District Intelligence",
        desc: "Aggregate cross-agency analytics for district administrators and program leads.",
      },
      {
        icon: Mic,
        title: "Voice Capture",
        desc: "Dictate session notes and observations with ElevenLabs-powered voice transcription.",
      },
    ],
  },
  {
    id: "team",
    icon: Users,
    color: "text-warning",
    bg: "bg-warning-soft",
    title: "Team & Operations",
    desc: "Manage your whole clinical operation from one administrative hub.",
    features: [
      {
        icon: Users,
        title: "Staff Management",
        desc: "Manage caseloads, credentials, supervision requirements, and shift scheduling.",
      },
      {
        icon: Calendar,
        title: "Scheduling",
        desc: "Schedule sessions, track authorizations, and avoid conflicts with a built-in calendar.",
      },
      {
        icon: CreditCard,
        title: "Billing & Payers",
        desc: "Multi-payer billing lifecycle management with claim tracking and export-ready timesheets.",
      },
      {
        icon: GitBranch,
        title: "Supervision Workflows",
        desc: "Track observation hours, approve session notes, and manage RBT competency assessments.",
      },
    ],
  },
  {
    id: "engagement",
    icon: Heart,
    color: "text-consequence",
    bg: "bg-success-soft",
    title: "Engagement & Communication",
    desc: "Keep families, teachers, and clinicians aligned every step of the way.",
    features: [
      {
        icon: Heart,
        title: "Parent Portal",
        desc: "Parents access progress reports, session summaries, and home training recommendations.",
      },
      {
        icon: GraduationCap,
        title: "Training Academy",
        desc: "Staff and parent training modules with built-in LMS, video content, and certification tracking.",
      },
      {
        icon: MessageSquare,
        title: "Teacher Comms",
        desc: "Secure messaging between classroom staff and the clinical team, with alert escalation.",
      },
      {
        icon: School,
        title: "Classroom Forms",
        desc: "Teachers complete digital observation forms and questionnaires that flow into clinical records.",
      },
    ],
  },
];

export default function WelcomeFeatures() {
  return (
    <div className="min-h-screen bg-background">
      <WelcomeNav />

      {/* Page header */}
      <section className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <Badge className="mb-4 bg-accent text-antecedent border-0">
            <Layers className="w-3 h-3 mr-1" />
            Platform Features
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Every tool your team needs
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From first data point to final report — NovaTrack Behavior covers every part of
            the ABA and school-based support workflow.
          </p>
        </div>
      </section>

      {/* Feature categories */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {FEATURE_CATEGORIES.map((cat, idx) => (
          <section key={cat.id}>
            <div
              className={`flex flex-col md:flex-row ${
                idx % 2 !== 0 ? "md:flex-row-reverse" : ""
              } gap-10 items-start`}
            >
              {/* Category label */}
              <div className="md:w-64 shrink-0">
                <div
                  className={`w-14 h-14 rounded-2xl ${cat.bg} flex items-center justify-center mb-4`}
                >
                  <cat.icon className={`w-7 h-7 ${cat.color}`} />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  {cat.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{cat.desc}</p>
              </div>

              {/* Feature cards */}
              <div className="flex-1 grid sm:grid-cols-2 gap-4">
                {cat.features.map((f) => (
                  <Card
                    key={f.title}
                    className="border shadow-card hover:shadow-soft transition-shadow"
                  >
                    <CardContent className="p-4 flex gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <f.icon className={`w-[18px] h-[18px] ${cat.color}`} />
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
            {idx < FEATURE_CATEGORIES.length - 1 && (
              <hr className="mt-20 border-border" />
            )}
          </section>
        ))}
      </div>

      {/* Add-ons callout */}
      <section className="bg-accent/30 border-y border-border py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FlaskConical className="w-8 h-8 text-antecedent mx-auto mb-3" />
          <h3 className="font-display text-2xl font-bold text-foreground mb-3">
            Want even more? Check out our add-ons.
          </h3>
          <p className="text-muted-foreground mb-6">
            Beacon (classroom intelligence) and Behavior+ (advanced analytics) extend the platform
            for specialized use cases.
          </p>
          <Link to="/welcome/add-ons">
            <Button className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
              Explore Add-ons
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Start using these features today
          </h2>
          <p className="text-white/80 mb-8">
            No setup fees. No long contracts. Get your team running in days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-white text-sidebar-primary hover:bg-white/90 font-semibold px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/demo">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white bg-transparent hover:bg-white/10 px-8"
              >
                Book a Demo
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
            <Link to="/welcome/add-ons" className="hover:text-white transition-colors">Add-ons</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
