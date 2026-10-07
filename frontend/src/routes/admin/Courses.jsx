import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus } from 'lucide-react'
import { listCourses, createCourse } from '../../api/courses'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_VARIANT = { draft: 'neutral', published: 'success', archived: 'warning' }

function CreateCourseModal({ open, onOpenChange }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [feeAmount, setFeeAmount] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createCourse({ title, fee_amount: Number(feeAmount) || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setTitle('')
      setFeeAmount('')
      onOpenChange(false)
      toast.success('Course created.')
    },
    onError: () => toast.error('Could not create course. Try a different title.'),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New course" description="Add a course to your catalog.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-4"
      >
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Fee amount (₹)"
          type="number"
          min="0"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
        />
        <Button type="submit" loading={createMutation.isPending} className="w-full">
          Create course
        </Button>
      </form>
    </Modal>
  )
}

export default function AdminCourses() {
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
  })
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Courses"
        description="The catalog of courses your institute offers."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New course
          </Button>
        }
      />

      <CreateCourseModal open={modalOpen} onOpenChange={setModalOpen} />

      {error && <p className="text-sm text-danger-500">Could not load courses. Try refreshing the page.</p>}

      {!error && courses && courses.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start building batches and content."
          action={<Button onClick={() => setModalOpen(true)}>New course</Button>}
        />
      )}

      {!error && (isLoading || (courses && courses.length > 0)) && (
        <Table>
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th>Fee</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={3} />
            ) : (
              courses.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link to={`/admin/courses/${c.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {c.title}
                    </Link>
                  </Td>
                  <Td>₹{Number(c.fee_amount).toLocaleString('en-IN')}</Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
