import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Layers } from 'lucide-react'
import { getCourse, createModule, createLesson } from '../../api/courses'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { LESSON_ICONS } from '../../components/ui/icons'

const LESSON_TYPES = ['video', 'notes', 'assignment', 'quiz']

function AddLessonModal({ moduleId, open, onOpenChange }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('video')

  const mutation = useMutation({
    mutationFn: () => createLesson(moduleId, { title, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course'] })
      setTitle('')
      onOpenChange(false)
      toast.success('Lesson added.')
    },
    onError: () => toast.error('Could not add lesson.'),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add lesson">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <Input label="Lesson title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          {LESSON_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Add lesson
        </Button>
      </form>
    </Modal>
  )
}

function ModuleCard({ mod }) {
  const [lessonModalOpen, setLessonModalOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{mod.title}</h3>
        <button
          onClick={() => setLessonModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          <Plus size={13} /> Lesson
        </button>
      </CardHeader>
      <CardBody>
        {mod.lessons.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No lessons yet.</p>
        ) : (
          <ul className="space-y-2">
            {mod.lessons.map((lesson) => {
              const Icon = LESSON_ICONS[lesson.type]
              return (
                <li key={lesson.id} className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
                  <Icon size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <span>{lesson.title}</span>
                  <Badge variant="neutral">{lesson.type}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
      <AddLessonModal moduleId={mod.id} open={lessonModalOpen} onOpenChange={setLessonModalOpen} />
    </Card>
  )
}

function AddModuleForm({ courseId }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')

  const moduleMutation = useMutation({
    mutationFn: () => createModule(courseId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      setTitle('')
      toast.success('Module added.')
    },
    onError: () => toast.error('Could not add module.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        moduleMutation.mutate()
      }}
      className="flex flex-col sm:flex-row sm:items-end gap-3"
    >
      <Input
        placeholder="e.g. Getting Started"
        label="New module title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 max-w-sm"
      />
      <Button type="submit" loading={moduleMutation.isPending}>
        <Plus size={15} /> Add module
      </Button>
    </form>
  )
}

export default function AdminCourseDetail() {
  const { id } = useParams()
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }
  if (error) return <p className="text-sm text-danger-500">Could not load this course.</p>
  if (!course) return null

  return (
    <div>
      <PageHeader
        title={course.title}
        description={`₹${Number(course.fee_amount).toLocaleString('en-IN')} · ${course.status}`}
        backTo="/admin/courses"
        backLabel="All courses"
      />

      <div className="space-y-4 mb-8">
        {course.modules.length === 0 ? (
          <EmptyState icon={Layers} title="No modules yet" description="Add the first module below to start building this course." />
        ) : (
          course.modules.map((mod) => <ModuleCard key={mod.id} mod={mod} />)
        )}
      </div>

      <AddModuleForm courseId={id} />
    </div>
  )
}
