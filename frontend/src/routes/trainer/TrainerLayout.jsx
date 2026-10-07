import DashboardShell from '../../pages/DashboardShell'

const nav = [
  { to: '/trainer', label: 'Dashboard', end: true },
  { to: '/trainer/batches', label: 'My Batches' },
  { to: '/trainer/content', label: 'Content' },
  { to: '/trainer/grading', label: 'Grading Queue' },
  { to: '/trainer/live', label: 'Live Classes & Attendance' },
]

export default function TrainerLayout() {
  return <DashboardShell title="Trainer" nav={nav} />
}
