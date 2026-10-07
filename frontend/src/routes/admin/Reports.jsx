import { useQuery } from '@tanstack/react-query'
import { getProgressReport, getPaymentsReport, getAttendanceReport } from '../../api/notifications'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import EmptyState from '../../components/ui/EmptyState'
import { FileBarChart } from 'lucide-react'

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">{title}</h2>
      {children}
    </div>
  )
}

function ReportTable({ columns, rows, renderRow }) {
  if (!rows) return null
  if (rows.length === 0) {
    return <EmptyState icon={FileBarChart} title="No data yet" description="This report will populate as activity comes in." />
  }
  return (
    <Table>
      <Thead>
        <Tr>
          {columns.map((c) => <Th key={c}>{c}</Th>)}
        </Tr>
      </Thead>
      <Tbody>{rows.map(renderRow)}</Tbody>
    </Table>
  )
}

export default function AdminReports() {
  const { data: progress } = useQuery({ queryKey: ['reportProgress'], queryFn: getProgressReport })
  const { data: payments } = useQuery({ queryKey: ['reportPayments'], queryFn: getPaymentsReport })
  const { data: attendance } = useQuery({ queryKey: ['reportAttendance'], queryFn: getAttendanceReport })

  return (
    <div>
      <PageHeader title="Reports" description="Progress, collections, and attendance across your institute." />

      <Section title="Course progress by batch">
        <ReportTable
          columns={['Batch', 'Course', 'Students', 'Completion']}
          rows={progress}
          renderRow={(r) => (
            <Tr key={r.batch_id}>
              <Td className="font-medium text-[var(--color-text-heading)]">{r.batch_name}</Td>
              <Td>{r.course_title}</Td>
              <Td>{r.enrolled_students}</Td>
              <Td>{r.completion_percent}%</Td>
            </Tr>
          )}
        />
      </Section>

      <Section title="Collections by course">
        <ReportTable
          columns={['Course', 'Invoices', 'Billed', 'Collected', 'Pending']}
          rows={payments}
          renderRow={(r) => (
            <Tr key={r.course_id}>
              <Td className="font-medium text-[var(--color-text-heading)]">{r.course_title}</Td>
              <Td>{r.invoice_count}</Td>
              <Td>₹{Number(r.total_billed).toLocaleString('en-IN')}</Td>
              <Td className="text-success-600">₹{Number(r.total_collected).toLocaleString('en-IN')}</Td>
              <Td className="text-warning-600">₹{Number(r.total_pending).toLocaleString('en-IN')}</Td>
            </Tr>
          )}
        />
      </Section>

      <Section title="Attendance by batch">
        <ReportTable
          columns={['Batch', 'Sessions', 'Attendance rate']}
          rows={attendance}
          renderRow={(r) => (
            <Tr key={r.batch_id}>
              <Td className="font-medium text-[var(--color-text-heading)]">{r.batch_name}</Td>
              <Td>{r.session_count}</Td>
              <Td>{r.attendance_rate_percent}%</Td>
            </Tr>
          )}
        />
      </Section>
    </div>
  )
}
