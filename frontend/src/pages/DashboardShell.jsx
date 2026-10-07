import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import NotificationBell from './NotificationBell'
import Avatar from '../components/ui/Avatar'
import ErrorBoundary from '../components/ErrorBoundary'

function SidebarContent({ title, nav, user, logout, onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-2 px-2 mb-6">
        <img src="/images/infinity_logo.jpg" alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-heading)] leading-tight">Infinity LMS</p>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">{title}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-heading)]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[var(--color-border)] pt-3 mt-3">
        <div className="flex items-center gap-2 px-2 mb-1">
          <Avatar name={user?.name || user?.email} size={28} />
          <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-heading)]"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </>
  )
}

export default function DashboardShell({ title, nav }) {
  const { user, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[var(--color-surface-sunken)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex-col">
        <SidebarContent title={title} nav={nav} user={user} logout={logout} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[var(--color-surface)] p-4 flex flex-col shadow-[var(--shadow-popover)]">
            <button
              onClick={() => setDrawerOpen(false)}
              className="self-end mb-2 rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarContent title={title} nav={nav} user={user} logout={logout} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 md:px-6 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
