import {
  LayoutDashboard, Users, Stethoscope, FileBarChart, Calendar,
  Brain, FileCheck, Inbox, FlaskConical, UserCheck, BookOpen,
  HardDrive, Briefcase, BrainCircuit, Target, GraduationCap,
  UserPlus, DollarSign, Shield, Building2, ClipboardCheck,
  BarChart3, FileText, CreditCard, LineChart, FolderOpen,
  User, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileBarChart,
  Calendar,
  Brain,
  FileCheck,
  Inbox,
  FlaskConical,
  UserCheck,
  BookOpen,
  HardDrive,
  Briefcase,
  BrainCircuit,
  Target,
  GraduationCap,
  UserPlus,
  DollarSign,
  Shield,
  Building2,
  ClipboardCheck,
  BarChart3,
  FileText,
  CreditCard,
  LineChart,
  FolderOpen,
  User,
};

export function getNavIcon(iconName: string | null): LucideIcon | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] || null;
}
