import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, Users, ClipboardCheck, Video } from 'lucide-react'
import { getTrainerDashboard } from '../../api/dashboard'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function TrainerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'trainer'],
    queryFn: getTrainerDashboard,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger-500">Could not load dashboard data.</p>
  if (!data) return null

  return (
    <div>
      <PageHeader title="Dashboard" description="Your batches, students, and grading queue." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="My batches" value={data.batchCount} icon={Layers} accent="brand" />
        <StatCard label="Enrolled students" value={data.studentCount} icon={Users} accent="brand" />
        <StatCard
          label="Pending grading"
          value={data.pendingGrading}
          icon={ClipboardCheck}
          accent={data.pendingGrading > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Upcoming live classes</h3>
            <Link to="/trainer/live" className="text-xs text-brand-600 hover:text-brand-700">View all</Link>
          </CardHeader>
          <CardBody>
            {data.upcomingSessions.length === 0 ? (
              <EmptyState icon={Video} title="Nothing scheduled" />
            ) : (
              <ul className="space-y-3">
                {data.upcomingSessions.map((s) => (
                  <li key={s.id}>
                    <p className="text-sm font-medium text-[var(--color-text-heading)]">{s.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {s.batch_name} · {new Date(s.starts_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Awaiting your review</h3>
            <Link to="/trainer/grading" className="text-xs text-brand-600 hover:text-brand-700">Grading queue</Link>
          </CardHeader>
          <CardBody>
            {data.recentSubmissions.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="All caught up" description="No submissions pending review." />
            ) : (
              <ul className="space-y-3">
                {data.recentSubmissions.map((s) => (
                  <li key={s.id}>
                    <p className="text-sm font-medium text-[var(--color-text-heading)]">{s.student_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{s.lesson_title}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
