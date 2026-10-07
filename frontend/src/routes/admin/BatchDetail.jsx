import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { getBatch, assignTrainer, enrollStudent, listTrainers, listStudents } from '../../api/batches'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'

const STATUS_VARIANT = { active: 'success', completed: 'brand', withdrawn: 'neutral' }

export default function AdminBatchDetail() {
  const { id } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => getBatch(id),
  })
  const { data: trainers } = useQuery({ queryKey: ['trainers'], queryFn: listTrainers })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: listStudents })

  const [trainerId, setTrainerId] = useState('')
  const trainerMutation = useMutation({
    mutationFn: () => assignTrainer(id, trainerId ? Number(trainerId) : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', id] })
      toast.success('Trainer updated.')
    },
    onError: () => toast.error('Could not update trainer.'),
  })

  const [studentId, setStudentId] = useState('')
  const enrollMutation = useMutation({
    mutationFn: () => enrollStudent(id, Number(studentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', id] })
      setStudentId('')
      toast.success('Student enrolled.')
    },
    onError: () => toast.error('Could not enroll this student.'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger-500">Could not load this batch.</p>
  if (!batch) return null

  const enrolledIds = new Set(batch.students.map((s) => s.id))
  const availableStudents = (students || []).filter((s) => !enrolledIds.has(s.id))

  return (
    <div>
      <PageHeader title={batch.name} description={batch.course_title} backTo="/admin/batches" backLabel="All batches" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Trainer</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Currently: {batch.trainer_name || 'Unassigned'}
            </p>
          </CardHeader>
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                trainerMutation.mutate()
              }}
              className="flex items-center gap-2"
            >
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="flex-1">
                <option value="">Unassigned</option>
                {trainers?.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </Select>
              <Button type="submit" loading={trainerMutation.isPending} variant="secondary">
                Save
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Enroll a student</h3>
          </CardHeader>
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (studentId) enrollMutation.mutate()
              }}
              className="flex items-center gap-2"
            >
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1">
                <option value="">Select a student…</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                ))}
              </Select>
              <Button type="submit" loading={enrollMutation.isPending} disabled={!studentId}>
                <UserPlus size={15} />
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">
        Enrolled students ({batch.students.length})
      </h3>
      {batch.students.length === 0 ? (
        <EmptyState icon={Users} title="No students enrolled yet" description="Use the form above to enroll students into this batch." />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {batch.students.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.full_name} size={26} />
                    <span className="font-medium text-[var(--color-text-heading)]">{s.full_name}</span>
                  </div>
                </Td>
                <Td>{s.email}</Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
