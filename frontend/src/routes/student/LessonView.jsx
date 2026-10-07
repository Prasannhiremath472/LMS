import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, Trophy } from 'lucide-react'
import { getLesson, updateLessonProgress, submitAssignment, getQuiz, attemptQuiz } from '../../api/learning'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card, { CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

function VideoLesson({ lesson }) {
  const queryClient = useQueryClient()
  const progressMutation = useMutation({
    mutationFn: (payload) => updateLessonProgress(lesson.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseProgress'] }),
  })

  function handlePauseOrEnd(e) {
    const watched = Math.floor(e.target.currentTime)
    const completed = e.target.ended || (lesson.duration_seconds && watched >= lesson.duration_seconds - 2)
    progressMutation.mutate({
      watched_seconds: watched,
      status: completed ? 'completed' : 'in_progress',
    })
  }

  return (
    <div>
      {lesson.content_url ? (
        <video
          src={lesson.content_url}
          controls
          onPause={handlePauseOrEnd}
          onEnded={handlePauseOrEnd}
          className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)]"
        />
      ) : (
        <EmptyState icon={FileText} title="Video not uploaded yet" />
      )}
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => progressMutation.mutate({ status: 'completed', watched_seconds: lesson.duration_seconds || 0 })}
      >
        <CheckCircle2 size={14} /> Mark as complete
      </Button>
    </div>
  )
}

function NotesLesson({ lesson }) {
  return lesson.content_url ? (
    <Card className="p-5 max-w-md">
      <a
        href={lesson.content_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <FileText size={16} /> Open notes / PDF
      </a>
    </Card>
  ) : (
    <EmptyState icon={FileText} title="Notes not uploaded yet" />
  )
}

function AssignmentLesson({ lesson }) {
  const toast = useToast()
  const [fileUrl, setFileUrl] = useState('')
  const mutation = useMutation({
    mutationFn: () => submitAssignment(lesson.assignment_id, fileUrl),
    onSuccess: () => toast.success('Assignment submitted.'),
    onError: () => toast.error('Could not submit assignment.'),
  })

  if (!lesson.assignment_id) {
    return <EmptyState icon={FileText} title="No assignment has been set up for this lesson yet" />
  }

  return (
    <Card className="max-w-md p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        {lesson.instructions && (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">{lesson.instructions}</p>
        )}
        <Input
          label="Submission file URL"
          required
          type="url"
          placeholder="https://…"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
        <Button type="submit" loading={mutation.isPending} className="w-full mt-4">
          Submit assignment
        </Button>
      </form>
    </Card>
  )
}

function QuizLesson({ lesson }) {
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', lesson.quiz_id],
    queryFn: () => getQuiz(lesson.quiz_id),
    enabled: !!lesson.quiz_id,
  })
  const [answers, setAnswers] = useState({})
  const mutation = useMutation({
    mutationFn: () => attemptQuiz(lesson.quiz_id, answers),
  })

  if (!lesson.quiz_id) {
    return <EmptyState icon={Trophy} title="No quiz has been set up for this lesson yet" />
  }
  if (isLoading || !quiz) return <SkeletonCard className="max-w-md" />

  if (mutation.data) {
    const { score, passed, correctCount, totalQuestions } = mutation.data
    return (
      <Card className="max-w-md">
        <CardBody className="text-center py-8">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
              passed ? 'bg-success-50 text-success-600 dark:bg-success-500/10' : 'bg-danger-50 text-danger-500 dark:bg-danger-500/10'
            }`}
          >
            <Trophy size={22} />
          </div>
          <p className="text-2xl font-semibold text-[var(--color-text-heading)] tabular-nums">{score}%</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{correctCount}/{totalQuestions} correct</p>
          <p className={`mt-3 text-sm font-medium ${passed ? 'text-success-600' : 'text-danger-500'}`}>
            {passed ? 'Passed' : 'Not passed'}
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="max-w-md p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="space-y-5"
      >
        {quiz.questions.map((q) => (
          <div key={q.id}>
            <p className="text-sm font-medium text-[var(--color-text-heading)] mb-2">{q.question}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === idx}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    className="accent-brand-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Submit quiz
        </Button>
      </form>
    </Card>
  )
}

const LESSON_COMPONENT = {
  video: VideoLesson,
  notes: NotesLesson,
  assignment: AssignmentLesson,
  quiz: QuizLesson,
}

export default function StudentLessonView() {
  const { courseId, lessonId } = useParams()
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => getLesson(lessonId),
  })

  if (isLoading) return <SkeletonCard className="max-w-md" />
  if (error) return <p className="text-sm text-danger-500">Could not load this lesson.</p>
  if (!lesson) return null

  const Component = LESSON_COMPONENT[lesson.type]

  return (
    <div>
      <PageHeader title={lesson.title} backTo={`/student/courses/${courseId}`} backLabel="Back to course" />
      <Component lesson={lesson} />
    </div>
  )
}
