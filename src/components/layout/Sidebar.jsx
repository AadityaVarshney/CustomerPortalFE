import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Settings } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { cn } from '@/lib/utils'
import { disconnectSocket } from '@/lib/socket'

export function Sidebar({ navItems = [] }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const navigate = useNavigate()

  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-30 flex flex-col',
        'border-r border-white/[0.06] bg-card/80 backdrop-blur-xl',
        'transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0 shadow-glow">
              <span className="text-white font-display font-bold text-sm">CP</span>
            </div>
            <span className="font-display font-semibold text-foreground truncate">
              Customer Portal
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center mx-auto shadow-glow">
            <span className="text-white font-display font-bold text-sm">CP</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          if (item.divider) {
            return sidebarOpen ? (
              <div key={item.key} className="px-3 pt-4 pb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {item.label}
                </p>
              </div>
            ) : <div key={item.key} className="my-2 border-t border-white/[0.06]" />
          }

          const Icon = item.icon
          const isNotif = item.key === 'notifications'

          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'nav-item',
                  isActive && 'active',
                  !sidebarOpen && 'justify-center px-0',
                )
              }
              title={!sidebarOpen ? item.label : undefined}
            >
              <div className="relative shrink-0">
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-3">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full border border-white/[0.1]',
          'bg-card flex items-center justify-center z-10',
          'text-muted-foreground hover:text-foreground transition-colors shadow-glass-sm',
        )}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
    </aside>
  )
}
