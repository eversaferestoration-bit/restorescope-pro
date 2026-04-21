import {
  LayoutDashboard,
  FolderOpen,
  Plus,
  Settings,
  CreditCard,
  Users,
  FileText,
  Tag,
  ClipboardList,
  BarChart3,
  Building2,
  TrendingUp,
  Shield,
  FlaskConical,
} from 'lucide-react';

export const primaryNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
];

export const secondaryNavItems = [
  { label: 'Enterprise', path: '/enterprise', icon: Building2, adminOnly: true },
  { label: 'Templates', path: '/templates', icon: FileText, adminOnly: false },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: false },
  { label: 'Team Performance', path: '/team-performance', icon: TrendingUp, adminOnly: true },
  { label: 'Dominance Validation', path: '/dominance-validation', icon: Shield, adminOnly: true },
  { label: 'Enterprise', path: '/enterprise-settings', icon: Building2, adminOnly: true },
  { label: 'Pricing', path: '/pricing-profiles', icon: Tag, adminOnly: true },
  { label: 'Team', path: '/users', icon: Users, adminOnly: true },
  { label: 'Audit Log', path: '/audit-log', icon: ClipboardList, adminOnly: true },
  { label: 'Beta Access', path: '/beta-admin', icon: FlaskConical, adminOnly: true },
];

export const settingsNavItems = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Billing', path: '/billing', icon: CreditCard, adminOnly: true },
  { label: 'Beta Users', path: '/beta-users', icon: FlaskConical, adminOnly: true },
];

export const mobileNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
  { label: 'New Job', path: '/jobs/new', icon: Plus },
  { label: 'Settings', path: '/settings', icon: Settings },
];