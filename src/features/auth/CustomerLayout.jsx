import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  BookOpen,
  Bell,
  Settings,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'

const CUSTOMER_NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/customer/dashboard', icon: LayoutDashboard },
  { key: 'tickets', label: 'My Tickets', to: '/customer/tickets', icon: Ticket },
  { key: 'projects', label: 'Projects', to: '/customer/projects', icon: FolderOpen },
  { key: 'kb', label: 'Knowledge Base', to: '/customer/knowledge-base', icon: BookOpen },
  { key: 'divider-2', divider: true, label: 'Account' },
  { key: 'notifications', label: 'Notifications', to: '/customer/notifications', icon: Bell },
  { key: 'settings', label: 'Settings', to: '/customer/settings', icon: Settings },
]

export default function CustomerLayout() {
  const role = useAuthStore((s) => s.role)
  const navItems =
    role === 'customer_user'
      ? CUSTOMER_NAV.filter((i) => i.key !== 'settings')
      : CUSTOMER_NAV

  return <AppShell navItems={navItems} role={role} />
}
