import { CalendarClock, Shield, AlertTriangle, TrendingUp, Radio, Zap, DollarSign, Activity, FileText, MessageSquare, Calendar, StickyNote, ClipboardList } from 'lucide-react';
import { NextUpWidgetContent } from './widgets/NextUpWidgetContent';
import { CaseloadRiskWidget } from './widgets/CaseloadRiskWidget';
import { AlertsFeedWidget } from './widgets/AlertsFeedWidget';
import { TrendingBehaviorsWidget } from './widgets/TrendingBehaviorsWidget';
import { ClassroomLiveWidget } from './widgets/ClassroomLiveWidget';
import { SupervisorSignalsWidget } from './widgets/SupervisorSignalsWidget';
import { BillingOverviewWidget } from './widgets/BillingOverviewWidget';
import { UtilizationWidget } from './widgets/UtilizationWidget';
import { RecentSessionNotesWidget } from './widgets/RecentSessionNotesWidget';
import { ParentCommsWidget } from './widgets/ParentCommsWidget';
import { ScheduleOverviewWidget } from './widgets/ScheduleOverviewWidget';
import { PersonalNotesWidget } from './widgets/PersonalNotesWidget';
import { ServiceRequestsWidget } from './ServiceRequestsWidget';
import type { ReactNode } from 'react';

interface WidgetComponent {
  component: () => ReactNode;
  icon: ReactNode;
}

export const WIDGET_COMPONENTS: Record<string, WidgetComponent> = {
  'next-up': {
    component: () => <NextUpWidgetContent />,
    icon: <CalendarClock className="w-4 h-4 text-primary" />,
  },
  'caseload-risk': {
    component: () => <CaseloadRiskWidget />,
    icon: <Shield className="w-4 h-4 text-orange-500" />,
  },
  'alerts-feed': {
    component: () => <AlertsFeedWidget />,
    icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
  },
  'trending-behaviors': {
    component: () => <TrendingBehaviorsWidget />,
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  },
  'classroom-live': {
    component: () => <ClassroomLiveWidget />,
    icon: <Radio className="w-4 h-4 text-blue-500" />,
  },
  'supervisor-signals': {
    component: () => <SupervisorSignalsWidget />,
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
  },
  'billing-overview': {
    component: () => <BillingOverviewWidget />,
    icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
  },
  'utilization': {
    component: () => <UtilizationWidget />,
    icon: <Activity className="w-4 h-4 text-primary" />,
  },
  'recent-notes': {
    component: () => <RecentSessionNotesWidget />,
    icon: <FileText className="w-4 h-4 text-blue-500" />,
  },
  'parent-comms': {
    component: () => <ParentCommsWidget />,
    icon: <MessageSquare className="w-4 h-4 text-violet-500" />,
  },
  'schedule-overview': {
    component: () => <ScheduleOverviewWidget />,
    icon: <Calendar className="w-4 h-4 text-primary" />,
  },
  'personal-notes': {
    component: () => <PersonalNotesWidget />,
    icon: <StickyNote className="w-4 h-4 text-amber-500" />,
  },
};
