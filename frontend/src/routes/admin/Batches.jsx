import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { listBatches, createBatch, listTrainers } from '../../api/batches'
import { listCourses } from '../../api/courses'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

function CreateBatchModal({ open, onOpenChange, courses, trainers }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [courseId, setCourseId] = useState('')
  const [trainerId, setTrainerId] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      createBatch({
        name,
        course_id: Number(courseId),
        trainer_id: trainerId ? Number(trainerId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      setName('')
      setCourseId('')
      setTrainerId('')
      onOpenChange(false)
      toast.success('Batch created.')
    },
    onError: () => toast.error('Could not create batch.'),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New batch" description="Group students under a trainer for a course.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-4"
      >
        <Input label="Batch name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Course" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select a course…</option>
          {courses?.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
        <Select label="Trainer (optional)" value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
          <option value="">Unassigned</option>
          {trainers?.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </Select>
        <Button type="submit" loading={createMutation.isPending} className="w-full">
          Create batch
        </Button>
      </form>
    </Modal>
  )
}

export default function AdminBatches() {
  const { data: batches, isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: listBatches,
  })
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: listCourses })
  const { data: trainers } = useQuery({ queryKey: ['trainers'], queryFn: listTrainers })
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Trainer-led groups of students working through a course together."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New batch
          </Button>
        }
      />

      <CreateBatchModal open={modalOpen} onOpenChange={setModalOpen} courses={courses} trainers={trainers} />

      {error && <p className="text-sm text-danger-500">Could not load batches. Try refreshing the page.</p>}

      {!error && batches && batches.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description="Create a batch to start enrolling students into a course."
          action={<Button onClick={() => setModalOpen(true)}>New batch</Button>}
        />
      )}

      {!error && (isLoading || (batches && batches.length > 0)) && (
        <Table>
          <Thead>
            <Tr>
              <Th>Batch</Th>
              <Th>Course</Th>
              <Th>Trainer</Th>
              <Th>Students</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : (
              batches.map((b) => (
                <Tr key={b.id}>
                  <Td>
                    <Link to={`/admin/batches/${b.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {b.name}
                    </Link>
                  </Td>
                  <Td>{b.course_title}</Td>
                  <Td>
                    {b.trainer_name ? b.trainer_name : <Badge variant="neutral">Unassigned</Badge>}
                  </Td>
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
