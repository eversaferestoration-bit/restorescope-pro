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
} from 'lucide-react';

export const primaryNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
  { label: 'New Job', path: '/jobs/new', icon: Plus },
];

export const secondaryNavItems = [
  { label: 'Templates', path: '/templates', icon: FileText },
  { label: 'Pricing Profiles', path: '/pricing-profiles', icon: Tag },
  { label: 'Team', path: '/users', icon: Users },
  { label: 'Audit Log', path: '/audit-log', icon: ClipboardList },
];

export const settingsNavItems = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Billing', path: '/billing', icon: CreditCard },
];

export const mobileNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: FolderOpen },
  { label: 'New Job', path: '/jobs/new', icon: Plus },
  { label: 'Settings', path: '/settings', icon: Settings },
];