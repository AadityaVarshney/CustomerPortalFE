import {
  LayoutDashboard,
  Ticket,
  Users,
  BarChart3,
  BookOpen,
  Settings,
  Bell,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'

const INTERNAL_NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/internal/dashboard', icon: LayoutDashboard },
  { key: 'tickets', label: 'All Tickets', to: '/internal/tickets', icon: Ticket },
  { key: 'customers', label: 'Customers', to: '/internal/customers', icon: Users },
  { key: 'analytics', label: 'Analytics', to: '/internal/analytics', icon: BarChart3 },
  { key: 'divider-2', divider: true, label: 'Resources' },
  { key: 'kb', label: 'Knowledge Base', to: '/internal/knowledge-base', icon: BookOpen },
  { key: 'notifications', label: 'Notifications', to: '/internal/notifications', icon: Bell },
  { key: 'settings', label: 'Settings', to: '/internal/settings', icon: Settings },
]

export default function InternalLayout() {
  const role = useAuthStore((s) => s.role)
  const navItems =
    role !== '3sc_admin'
      ? INTERNAL_NAV.filter((i) => i.key !== 'settings')
      : INTERNAL_NAV

  return <AppShell navItems={navItems} role={role} />
}
