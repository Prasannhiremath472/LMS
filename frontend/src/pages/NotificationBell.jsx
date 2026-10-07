import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { listNotifications, markNotificationRead } from '../api/notifications'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: 60_000,
  })

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-[var(--radius-md)] p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-heading)]"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-popover)]">
            <div className="max-h-96 overflow-y-auto">
              {(!notifications || notifications.length === 0) && (
                <p className="p-4 text-sm text-[var(--color-text-muted)]">No notifications yet.</p>
              )}
              {notifications?.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read_at && readMutation.mutate(n.id)}
                  className={`block w-full text-left px-4 py-3 text-sm border-b border-[var(--color-border)] last:border-0 ${
                    n.read_at ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-heading)] bg-brand-50/60 dark:bg-brand-950/30'
                  }`}
                >
                  <p>{n.payload?.message}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
