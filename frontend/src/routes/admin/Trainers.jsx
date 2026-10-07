import { useQuery } from '@tanstack/react-query'
import { UserCog } from 'lucide-react'
import { listTrainers } from '../../api/batches'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'

export default function AdminTrainers() {
  const { data: trainers, isLoading, error } = useQuery({
    queryKey: ['trainers'],
    queryFn: listTrainers,
  })

  return (
    <div>
      <PageHeader title="Trainers" description="Instructors available to assign to batches." />

      {error && (
        <p className="text-sm text-danger-500">Could not load trainers. Try refreshing the page.</p>
      )}

      {!error && trainers && trainers.length === 0 && (
        <EmptyState icon={UserCog} title="No trainers yet" description="Trainers you add will appear here." />
      )}

      {!error && (isLoading || (trainers && trainers.length > 0)) && (
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
              trainers.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={t.full_name} size={28} />
                      <span className="font-medium text-[var(--color-text-heading)]">{t.full_name}</span>
                    </div>
                  </Td>
                  <Td>{t.email}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
