import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Video, IndianRupee, CheckCircle2 } from 'lucide-react'
import { getStudentDashboard } from '../../api/dashboard'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

function ProgressBar({ percent }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
    </div>
  )
}

export default function StudentDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: getStudentDashboard,
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
      <PageHeader title="Dashboard" description="Your progress, next class, and fee balance." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Enrolled courses" value={data.courseProgress.length} icon={BookOpen} accent="brand" />
        <StatCard
          label="Next live class"
          value={data.nextSession ? new Date(data.nextSession.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          icon={Video}
          accent="brand"
        />
        <StatCard
          label="Fees pending"
          value={`₹${data.pendingFees.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          accent={data.pendingFees > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Continue learning</h3>
          </CardHeader>
          <CardBody>
            {data.courseProgress.length === 0 ? (
              <EmptyState icon={BookOpen} title="Not enrolled in any course yet" />
            ) : (
              <ul className="space-y-4">
                {data.courseProgress.map((c) => (
                  <li key={c.id}>
                    <Link to={`/student/courses/${c.id}`} className="block group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[var(--color-text-heading)] group-hover:text-brand-600">
                          {c.title}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{c.percent}%</span>
                      </div>
                      <ProgressBar percent={c.percent} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Next live class</h3>
            </CardHeader>
            <CardBody>
              {data.nextSession ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-heading)]">{data.nextSession.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {data.nextSession.course_title} · {new Date(data.nextSession.starts_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={data.nextSession.join_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-[var(--radius-md)] bg-brand-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                  >
                    Join
                  </a>
                </div>
              ) : (
                <EmptyState icon={Video} title="Nothing scheduled" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Recently graded</h3>
            </CardHeader>
            <CardBody>
              {data.recentActivity.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No graded work yet" />
              ) : (
                <ul className="space-y-3">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text)]">{a.lesson_title}</span>
                      <span className="text-sm font-medium text-[var(--color-text-heading)] tabular-nums">{a.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
