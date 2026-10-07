import DashboardShell from '../../pages/DashboardShell'

const nav = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/courses', label: 'My Courses' },
  { to: '/student/assignments', label: 'Assignments' },
  { to: '/student/quizzes', label: 'Quizzes' },
  { to: '/student/live', label: 'Live Classes' },
  { to: '/student/certificates', label: 'Certificates' },
  { to: '/student/fees', label: 'Fees' },
  { to: '/student/profile', label: 'Profile' },
]

export default function StudentLayout() {
  return <DashboardShell title="Student" nav={nav} />
}
