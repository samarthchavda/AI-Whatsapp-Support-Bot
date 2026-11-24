import {
  Code, Cpu, CreditCard, Flag, Gauge, HeartPulse, IndianRupee, KeyRound, Megaphone, Newspaper, Plug, Radio,
  ScrollText, Settings, Smartphone, TicketPercent, UserPlus, UserRound, Users, Webhook
} from 'lucide-react';

// Same sections, labels and paths as the super admin part of the current
// dashboard sidebar (frontend/src/components/layout/Sidebar.js). Pages not
// rebuilt yet open the current dashboard.
export const SUPER_ADMIN_NAV = [
  {
    label: 'Super admin',
    items: [
      { to: '/dashboard/super-admin', label: 'Merchants', icon: Users, end: true, ready: true, also: ['/dashboard/super-admin/merchants/', '/dashboard/super-admin/user/'] },
      { to: '/dashboard/super-admin/plans', label: 'Plans', icon: IndianRupee, ready: true },
      { to: '/dashboard/super-admin/coupons', label: 'Coupons and offers', icon: TicketPercent, ready: true },
      { to: '/dashboard/super-admin/permission-profiles', label: 'Permission profiles', icon: KeyRound },
      { to: '/dashboard/super-admin/customers/onboard', label: 'Onboard merchant', icon: UserPlus },
      { to: '/dashboard/super-admin/budget', label: 'AI budget', icon: Gauge },
      { to: '/dashboard/super-admin/system-health', label: 'System health', icon: HeartPulse },
      { to: '/dashboard/super-admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/dashboard/super-admin/blog', label: 'Blog manager', icon: Newspaper },
      { to: '/dashboard/super-admin/settings', label: 'System connection', icon: Settings },
      { to: '/dashboard/profile', label: 'Profile settings', icon: UserRound }
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/dashboard/super-admin/whatsapp-ops', label: 'WhatsApp operations', icon: Smartphone },
      { to: '/dashboard/super-admin/live-ops', label: 'Live operations', icon: Radio },
      { to: '/dashboard/super-admin/integration-health', label: 'Integration health', icon: Plug },
      { to: '/dashboard/super-admin/developer-api', label: 'Developer API', icon: Webhook }
    ]
  },
  { label: 'AI', items: [{ to: '/dashboard/super-admin/ai-usage', label: 'AI usage', icon: Cpu }] },
  { label: 'Finance', items: [{ to: '/dashboard/super-admin/billing-revenue', label: 'Billing and revenue', icon: CreditCard }] },
  { label: 'Security', items: [{ to: '/dashboard/super-admin/audit-logs', label: 'Audit logs', icon: ScrollText }] },
  { label: 'Platform', items: [{ to: '/dashboard/super-admin/feature-flags', label: 'Feature flags', icon: Flag }] }
];

export function findNavItem(pathname) {
  for (const section of SUPER_ADMIN_NAV) {
    for (const item of section.items) {
      if (item.also?.some((prefix) => pathname.startsWith(prefix))) return item;
      if (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)) return item;
    }
  }
  return null;
}

export const LEGACY_DASHBOARD_URL = (import.meta.env.VITE_LEGACY_DASHBOARD_URL || '').replace(/\/$/, '');
