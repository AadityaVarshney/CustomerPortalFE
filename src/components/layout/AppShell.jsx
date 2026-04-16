import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ToastContainer } from '@/components/shared/Toast'
import { useUIStore } from '@/stores/uiStore'
import { useSocket } from '@/hooks/useSocket'
import { cn } from '@/lib/utils'

export function AppShell({ navItems, role }) {
  useSocket()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar navItems={navItems} role={role} />

      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16',
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
