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
} from 'lucide-react';

export const primaryNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
];

export const secondaryNavItems = [
  { label: 'Templates', path: '/templates', icon: FileText, adminOnly: false },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: false },
  { label: 'Pricing', path: '/pricing-profiles', icon: Tag, adminOnly: true },
  { label: 'Team', path: '/users', icon: Users, adminOnly: true },
  { label: 'Audit Log', path: '/audit-log', icon: ClipboardList, adminOnly: true },
];

export const settingsNavItems = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Billing', path: '/billing', icon: CreditCard, adminOnly: true },
];

export const mobileNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
  { label: 'New Job', path: '/jobs/new', icon: Plus },
  { label: 'Settings', path: '/settings', icon: Settings },
];