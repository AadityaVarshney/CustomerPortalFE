import { Bell, Search, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function getBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, i) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    to: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const crumbs = getBreadcrumb(pathname)

  return (
    <header className="h-16 flex items-center px-6 border-b border-white/[0.06] bg-card/50 backdrop-blur-sm shrink-0">
      {/* Mobile menu */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden mr-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={crumb.to} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            <Link
              to={crumb.to}
              className={cn(
                'truncate transition-colors',
                i === crumbs.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 border border-white/[0.06] text-muted-foreground hover:text-foreground text-sm transition-colors">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted border border-white/[0.06]">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <Link
          to="notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </Link>

        {/* Avatar */}
        <UserAvatar user={user} size="sm" className="cursor-pointer" />
      </div>
    </header>
  )
}
