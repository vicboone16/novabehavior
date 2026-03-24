/**
 * FeatureTour — visual walkthrough of platform features
 * with real screenshots, teacher emphasis, and mini demo video.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone, BarChart3, Users, FileText, Zap,
  ChevronLeft, ChevronRight, Play, CheckCircle2,
  LogIn, ArrowRight, Star, Clock, Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import classroomView from '@/assets/tour/classroom-view.jpg';
import analyticsDashboard from '@/assets/tour/analytics-dashboard.jpg';
import teacherTracking from '@/assets/tour/teacher-tracking.jpg';
import studentProfile from '@/assets/tour/student-profile.jpg';
import reportsView from '@/assets/tour/reports-view.jpg';

interface FeatureSlide {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  highlights: string[];
  teacherFriendly?: boolean;
  icon: React.ElementType;
}

const SLIDES: FeatureSlide[] = [
  {
    title: '2-Tap Classroom Tracking',
    subtitle: 'Built for teachers, not technicians',
    description: 'Large touch-friendly buttons let teachers log behaviors in real-time without leaving the moment. Designed for iPads and classroom speed.',
    image: teacherTracking,
    highlights: ['No training required', 'Works on any tablet', 'Under 2 seconds per entry'],
    teacherFriendly: true,
    icon: Smartphone,
  },
  {
    title: 'Classroom Command Center',
    subtitle: 'See every student at a glance',
    description: 'Student cards with live behavior counts, token progress, and prompt status. One screen to manage your whole classroom.',
    image: classroomView,
    highlights: ['Live behavior badges', 'Token economy built-in', 'Color-coded alerts'],
    teacherFriendly: true,
    icon: Users,
  },
  {
    title: 'Automatic Analytics',
    subtitle: 'Data turns into insights — automatically',
    description: 'Frequency charts, trend lines, and category breakdowns update in real-time. No manual graphing. No spreadsheets.',
    image: analyticsDashboard,
    highlights: ['Auto-generated graphs', 'Cross-student comparisons', 'Export-ready reports'],
    icon: BarChart3,
  },
  {
    title: 'Complete Student Profiles',
    subtitle: 'Everything in one place',
    description: 'Behavior plans, clinical notes, goal tracking, and progress history — all linked to each student. BCBAs and teachers share one source of truth.',
    image: studentProfile,
    highlights: ['Behavior intervention plans', 'Goal mastery tracking', 'Clinical documentation'],
    icon: FileText,
  },
  {
    title: 'One-Click Reports',
    subtitle: 'From data collection to documentation',
    description: 'Generate progress reports, clinical summaries, and IEP data automatically from collected behavior data. Print-ready, every time.',
    image: reportsView,
    highlights: ['Auto-narrative summaries', 'Chart-embedded PDFs', 'Insurance-ready billing data'],
    icon: Zap,
  },
];

const TEACHER_BENEFITS = [
  { icon: Clock, label: 'Save 45+ min/day', desc: 'No more end-of-day data entry' },
  { icon: Smartphone, label: 'Works on iPad', desc: 'Designed for classroom tablets' },
  { icon: Shield, label: 'HIPAA Secure', desc: 'All data encrypted & compliant' },
  { icon: Star, label: 'No Training Needed', desc: 'Intuitive from day one' },
];

export function FeatureTour() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = SLIDES[activeSlide];

  const next = () => setActiveSlide(i => (i + 1) % SLIDES.length);
  const prev = () => setActiveSlide(i => (i - 1 + SLIDES.length) % SLIDES.length);

  return (
    <div className="space-y-10">
      {/* ── Section Header ── */}
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-demo-accent border-demo-accent/30 mb-2">
          <Play className="w-3 h-3 mr-1" /> Feature Tour
        </Badge>
        <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
          See What NovaTrack Can Do
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Built by BCBAs for teachers, aides, and clinical teams. Every feature designed for the speed of a real classroom.
        </p>
      </div>

      {/* ── Feature Slideshow ── */}
      <Card className="overflow-hidden rounded-2xl border-2 border-border/50 shadow-lg">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1fr_420px]">
            {/* Image side */}
            <div className="relative bg-muted/30 overflow-hidden">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover min-h-[300px] lg:min-h-[420px]"
                loading="lazy"
                width={1280}
                height={720}
              />
              {/* Nav arrows */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm" onClick={prev}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm" onClick={next}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {/* Slide counter */}
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                {activeSlide + 1} / {SLIDES.length}
              </div>
              {slide.teacherFriendly && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-emerald-500/90 text-white border-0 gap-1">
                    <Star className="w-3 h-3" /> Teacher Favorite
                  </Badge>
                </div>
              )}
            </div>

            {/* Info side */}
            <div className="p-6 lg:p-8 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-demo-surface flex items-center justify-center">
                  <slide.icon className="w-5 h-5 text-demo-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{slide.title}</h3>
                  <p className="text-xs text-muted-foreground">{slide.subtitle}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
              <ul className="space-y-2">
                {slide.highlights.map(h => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>

              {/* Slide dots */}
              <div className="flex gap-1.5 pt-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === activeSlide ? 'w-6 bg-demo-accent' : 'w-2 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Mini Demo Video Section ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-8 lg:p-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Badge variant="outline" className="text-white border-white/20">
              <Play className="w-3 h-3 mr-1" /> Watch Demo
            </Badge>
            <h3 className="text-2xl font-display font-bold text-white">
              See It In Action
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Watch a 2-minute walkthrough showing how a teacher can start tracking behaviors,
              view real-time data, and generate reports — all from a single iPad.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="bg-demo-accent hover:bg-demo-accent/90 text-white gap-2 rounded-xl"
                onClick={() => navigate('/demo-center')}
              >
                <Play className="w-4 h-4" /> Try the Live Demo
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 gap-2 rounded-xl"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="w-4 h-4" /> Sign In
              </Button>
            </div>
          </div>
          {/* Video placeholder with animated preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl cursor-pointer group"
               onClick={() => navigate('/demo-center')}>
            <img
              src={classroomView}
              alt="Demo preview"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
              loading="lazy"
              width={1280}
              height={720}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="text-xs text-white/70">Live interactive demo</span>
              <span className="text-xs text-white/70">~2 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Teacher Benefits Strip ── */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-display font-bold">Why Teachers Love NovaTrack</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TEACHER_BENEFITS.map(b => (
            <Card key={b.label} className="rounded-2xl border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="py-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold">{b.label}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── CTA / Login Bar ── */}
      <Card className="rounded-2xl bg-gradient-to-r from-demo-surface to-background border-demo-accent/20">
        <CardContent className="py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Ready to get started?</p>
            <p className="text-sm text-muted-foreground">Sign in to your account or explore the interactive demo.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate('/demo-center')}>
              <Play className="w-4 h-4" /> Explore Demo
            </Button>
            <Button className="bg-demo-accent hover:bg-demo-accent/90 text-demo-foreground rounded-xl gap-2" onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4" /> Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
