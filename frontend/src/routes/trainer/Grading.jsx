import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ExternalLink, ClipboardCheck } from 'lucide-react'
import { listCourses, getCourse } from '../../api/courses'
import { getAssignmentSubmissions, gradeSubmission } from '../../api/learning'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import { SkeletonText } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

function GradeForm({ submission, onGraded }) {
  const toast = useToast()
  const [score, setScore] = useState(submission.score ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const mutation = useMutation({
    mutationFn: () => gradeSubmission(submission.id, Number(score), feedback),
    onSuccess: () => {
      onGraded()
      toast.success('Grade saved.')
    },
    onError: () => toast.error('Could not save grade.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      className="flex flex-wrap items-center gap-2 mt-2"
    >
      <Input type="number" min="0" required placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} className="w-20" />
      <Input
        placeholder="Feedback (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="flex-1 min-w-[160px]"
      />
      <Button type="submit" size="sm" loading={mutation.isPending}>
        Save
      </Button>
    </form>
  )
}

function AssignmentSubmissions({ assignmentId }) {
  const queryClient = useQueryClient()
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => getAssignmentSubmissions(assignmentId),
  })

  if (isLoading) return <SkeletonText lines={2} />
  if (!submissions || submissions.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">No submissions yet.</p>
  }

  return (
    <ul className="space-y-3">
      {submissions.map((s) => (
        <li key={s.id} className="border-t border-[var(--color-border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-heading)]">{s.student_name}</span>
            <a
              href={s.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              View submission <ExternalLink size={12} />
            </a>
          </div>
          {s.score != null && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Current score: {s.score}</p>
          )}
          <GradeForm
            submission={s}
            onGraded={() => queryClient.invalidateQueries({ queryKey: ['submissions', assignmentId] })}
          />
        </li>
      ))}
    </ul>
  )
}

function CourseAssignments({ courseId }) {
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
  })
  const [openAssignment, setOpenAssignment] = useState(null)

  if (isLoading) return <SkeletonText lines={3} />
  if (!course) return null

  const assignmentLessons = course.modules.flatMap((m) =>
    m.lessons
      .filter((l) => l.type === 'assignment' && l.assignment_id)
      .map((l) => ({ ...l, moduleTitle: m.title }))
  )

  if (assignmentLessons.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="No assignments in this course" />
  }

  return (
    <div className="space-y-3">
      {assignmentLessons.map((lesson) => {
        const isOpen = openAssignment === lesson.id
        return (
          <Card key={lesson.id} className="p-4">
            <button
              onClick={() => setOpenAssignment(isOpen ? null : lesson.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-[var(--color-text-heading)]">
                {lesson.title} <span className="text-xs text-[var(--color-text-muted)] font-normal">({lesson.moduleTitle})</span>
              </span>
              <ChevronDown size={16} className={`text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="mt-3">
              <AssignmentSubmissions assignmentId={lesson.assignment_id} />
            </div>}
          </Card>
        )
      })}
    </div>
  )
}

export default function TrainerGrading() {
  const { data: courses, isLoading } = useQuery({ queryKey: ['courses'], queryFn: listCourses })
  const [courseId, setCourseId] = useState('')

  return (
    <div>
      <PageHeader title="Grading Queue" description="Review and score student assignment submissions." />

      {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading courses…</p>}

      {courses && (
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mb-6 max-w-sm">
          <option value="">Select a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
      )}

      {courseId && <CourseAssignments courseId={courseId} />}
    </div>
  )
}
