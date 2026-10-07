import DashboardShell from '../../pages/DashboardShell'

const nav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/trainers', label: 'Trainers' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/batches', label: 'Batches' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/reports', label: 'Reports' },
]

export default function AdminLayout() {
  return <DashboardShell title="Admin" nav={nav} />
}
