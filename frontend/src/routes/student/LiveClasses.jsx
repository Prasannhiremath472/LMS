import { useQuery } from '@tanstack/react-query'
import { Video, ExternalLink } from 'lucide-react'
import { listUpcomingLiveSessions } from '../../api/liveSessions'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function StudentLiveClasses() {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['upcomingLiveSessions'],
    queryFn: listUpcomingLiveSessions,
  })

  return (
    <div>
      <PageHeader title="Live Classes" description="Upcoming sessions across your enrolled courses." />

      {error && <p className="text-sm text-danger-500">Could not load live classes.</p>}

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && sessions && sessions.length === 0 && (
        <EmptyState icon={Video} title="No upcoming live classes" description="Scheduled sessions will appear here as soon as your trainer sets one up." />
      )}

      <div className="space-y-3">
        {sessions?.map((s) => (
          <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-heading)]">{s.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {s.course_title} · {s.batch_name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {new Date(s.starts_at).toLocaleString()} · {s.duration_minutes} min · {s.platform}
              </p>
            </div>
            <a
              href={s.join_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-brand-600 text-white text-sm font-medium px-3.5 py-2 hover:bg-brand-700"
            >
              Join <ExternalLink size={14} />
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}
