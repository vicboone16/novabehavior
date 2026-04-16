import { Link } from "react-router-dom";
import { WelcomeNav } from "@/components/welcome/WelcomeNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Brain, Activity, Users, BarChart3,
  Shield, CheckCircle, School, Heart, Sparkles, Layers,
  TrendingUp, Target, ClipboardList, GraduationCap, Zap,
} from "lucide-react";

const STATS = [
  { value: "2,500+", label: "Learners Tracked" },
  { value: "150+", label: "Agencies & Schools" },
  { value: "98%", label: "Clinician Satisfaction" },
  { value: "40%", label: "Time Saved on Reports" },
];

const PERSONAS = [
  {
    icon: Shield,
    color: "text-antecedent",
    bg: "bg-accent",
    title: "Clinicians & BCBAs",
    desc: "Run FBAs, manage skill acquisition programs, generate clinical reports, and supervise staff — all from one streamlined platform.",
    features: ["Behavior & skill tracking", "FBA + report generation", "Supervision tools", "AI-powered insights"],
  },
  {
    icon: School,
    color: "text-behavior",
    bg: "bg-blue-50",
    title: "Teachers & Support Staff",
    desc: "Monitor classroom behavior in real time, earn Beacon points, and stay connected with the clinical team without extra paperwork.",
    features: ["Beacon classroom system", "Real-time behavior logging", "Mayday alerts", "Teacher–clinician comms"],
  },
  {
    icon: Heart,
    color: "text-consequence",
    bg: "bg-success-soft",
    title: "Parents & Caregivers",
    desc: "Stay informed with progress updates, complete training modules, and actively participate in your child's behavior support plan.",
    features: ["Parent progress portal", "Home training videos", "Consent & questionnaires", "Session summaries"],
  },
];

const HIGHLIGHTS = [
  {
    icon: ClipboardList,
    title: "ABC Data Collection",
    desc: "Capture antecedent, behavior, and consequence data in real time — on any device.",
  },
  {
    icon: Target,
    title: "Goal & Skill Tracking",
    desc: "Track IEP goals and skill acquisition programs with DTT and trial-by-trial precision.",
  },
  {
    icon: Brain,
    title: "NovaAI Copilot",
    desc: "Get AI-generated clinical recommendations, session summaries, and goal suggestions.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Auto-generate FBA reports, progress notes, and district-level intelligence dashboards.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Manage staff assignments, supervision hours, scheduling, and role-based access.",
  },
  {
    icon: GraduationCap,
    title: "Training Academy",
    desc: "Onboard staff and parents with built-in training modules, LMS content, and certifications.",
  },
];

const ADDONS = [
  {
    icon: Zap,
    colorIcon: "text-amber-500",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    badge: "Beacon",
    badgeClass: "bg-amber-100 text-amber-700",
    title: "Beacon — Classroom Intelligence",
    desc: "A points-based behavior management system built for teachers. Reward positive behavior, send mayday alerts, and connect classrooms to clinical data.",
    to: "/welcome/add-ons",
  },
  {
    icon: Activity,
    colorIcon: "text-antecedent",
    bg: "from-purple-50 to-violet-50",
    border: "border-purple-200",
    badge: "Behavior+",
    badgeClass: "bg-purple-100 text-purple-700",
    title: "Behavior+ — Advanced Analytics",
    desc: "Unlock BehaviorLab simulations, the full intervention builder, AI-powered behavior recommendations, and advanced clinical analytics.",
    to: "/welcome/add-ons",
  },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-background">
      <WelcomeNav />

      {/* Hero */}
      <section className="gradient-hero text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/25">
            <Sparkles className="w-3 h-3 mr-1" />
            Now with AI-powered clinical insights
          </Badge>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
            Behavior Support,<br />Built for the Real World
          </h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-10 leading-relaxed">
            NovaTrack Behavior is the all-in-one platform for ABA agencies and schools to collect data,
            manage clinical programs, and engage every member of a learner's support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-white text-sidebar-primary hover:bg-white/90 font-semibold px-8">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white bg-transparent hover:bg-white/10 px-8"
              >
                Book a Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-foreground">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-sm text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for your team */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for everyone on your team
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            One platform connecting clinicians, educators, and families around every learner.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map((p) => (
            <Card key={p.title} className="border shadow-card hover:shadow-soft transition-shadow">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mb-4`}>
                  <p.icon className={`w-6 h-6 ${p.color}`} />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-sidebar-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Platform highlights */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Purpose-built for ABA and school-based behavior support — not a generic practice management tool.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HIGHLIGHTS.map((h) => (
              <Card key={h.title} className="bg-card border shadow-card hover:shadow-soft transition-shadow">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <h.icon className="w-5 h-5 text-antecedent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{h.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/welcome/features">
              <Button variant="outline" size="lg">
                See all features
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Add-ons teaser */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-accent text-antecedent border-0">
            <Layers className="w-3 h-3 mr-1" />
            Optional Add-ons
          </Badge>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Extend your platform
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Unlock specialized tools for classroom management and advanced behavior analytics.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {ADDONS.map((a) => (
            <Card key={a.title} className={`border ${a.border} overflow-hidden hover:shadow-soft transition-shadow`}>
              <div className={`bg-gradient-to-br ${a.bg} p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${a.badgeClass}`}>{a.badge}</span>
                  <a.icon className={`w-6 h-6 ${a.colorIcon}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{a.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{a.desc}</p>
                <Link to={a.to}>
                  <Button variant="outline" size="sm" className="border-foreground/20">
                    Learn more
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="gradient-hero py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <TrendingUp className="w-10 h-10 text-white/70 mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform behavior support at your organization?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join hundreds of agencies and schools already using NovaTrack Behavior to improve outcomes.
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
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white/55 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sidebar-primary" />
            <span className="font-display font-bold text-white">NovaTrack Behavior</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/demo" className="hover:text-white transition-colors">Demo</Link>
            <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p>© 2025 NovaBehavior. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
