import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { listBatches } from '../../api/batches'
import PageHeader from '../../components/ui/PageHeader'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function TrainerBatches() {
  const { data: batches, isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: listBatches,
  })

  return (
    <div>
      <PageHeader title="My Batches" description="Batches you're assigned to as trainer." />

      {error && <p className="text-sm text-danger-500">Could not load your batches.</p>}

      {!error && batches && batches.length === 0 && (
        <EmptyState icon={Layers} title="No batches assigned yet" description="Batches assigned to you by an admin will appear here." />
      )}

      {!error && (isLoading || (batches && batches.length > 0)) && (
        <Table>
          <Thead>
            <Tr>
              <Th>Batch</Th>
              <Th>Course</Th>
              <Th>Students</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <SkeletonTableRows rows={4} cols={3} />
            ) : (
              batches.map((b) => (
                <Tr key={b.id}>
                  <Td className="font-medium text-[var(--color-text-heading)]">{b.name}</Td>
                  <Td>{b.course_title}</Td>
                  <Td>{b.student_count}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
