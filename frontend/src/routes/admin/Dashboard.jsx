import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Users, UserCog, BookOpen, Layers, IndianRupee, AlertTriangle } from 'lucide-react'
import { getAdminDashboard } from '../../api/dashboard'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'

function formatMonth(ym) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

function CollectionsChart({ series }) {
  if (!series || series.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">No payments recorded yet.</p>
  }
  const data = series.map((s) => ({ month: formatMonth(s.month), total: s.total }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="collectionsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${v / 1000}k`}
          width={48}
        />
        <Tooltip
          formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Collected']}
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Area type="monotone" dataKey="total" stroke="var(--color-brand-500)" strokeWidth={2} fill="url(#collectionsFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: getAdminDashboard,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger-500">Could not load dashboard data.</p>
  if (!data) return null

  return (
    <div>
      <PageHeader title="Dashboard" description="Institute-wide overview." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active students" value={data.studentCount} icon={Users} accent="brand" />
        <StatCard label="Trainers" value={data.trainerCount} icon={UserCog} accent="brand" />
        <StatCard label="Published courses" value={data.courseCount} icon={BookOpen} accent="brand" />
        <StatCard label="Batches" value={data.batchCount} icon={Layers} accent="brand" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Collected this month"
          value={`₹${data.collectionsThisMonth.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          accent="success"
        />
        <StatCard
          label="Pending fees"
          value={`₹${data.pendingFees.toLocaleString('en-IN')}`}
          icon={AlertTriangle}
          accent={data.pendingFees > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Collections trend</h3>
          </CardHeader>
          <CardBody>
            <CollectionsChart series={data.collectionsSeries} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Recent enrollments</h3>
          </CardHeader>
          <CardBody>
            {data.recentEnrollments.length === 0 ? (
              <EmptyState title="No enrollments yet" />
            ) : (
              <ul className="space-y-3">
                {data.recentEnrollments.map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5">
                    <Avatar name={e.student_name} size={28} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-heading)] truncate">{e.student_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{e.batch_name}</p>
                    </div>
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
