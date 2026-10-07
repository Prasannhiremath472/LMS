import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { listStudents } from '../../api/batches'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'

export default function AdminStudents() {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: listStudents,
  })

  return (
    <div>
      <PageHeader title="Students" description="Everyone enrolled across your institute." />

      {error && (
        <p className="text-sm text-danger-500">Could not load students. Try refreshing the page.</p>
      )}

      {!error && students && students.length === 0 && (
        <EmptyState icon={Users} title="No students yet" description="Students will appear here once enrolled in a batch." />
      )}

      {!error && (isLoading || (students && students.length > 0)) && (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={2} />
            ) : (
              students.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.full_name} size={28} />
                      <span className="font-medium text-[var(--color-text-heading)]">{s.full_name}</span>
                    </div>
                  </Td>
                  <Td>{s.email}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
