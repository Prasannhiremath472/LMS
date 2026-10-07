import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { getCourse } from '../../api/courses'
import PageHeader from '../../components/ui/PageHeader'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { LESSON_ICONS } from '../../components/ui/icons'

export default function StudentCourseDetail() {
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
      <PageHeader title={course.title} backTo="/student/courses" backLabel="My courses" />

      <div className="space-y-4">
        {course.modules.map((mod) => (
          <Card key={mod.id}>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{mod.title}</h3>
            </CardHeader>
            <CardBody>
              <ul className="space-y-1">
                {mod.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type]
                  return (
                    <li key={lesson.id}>
                      <Link
                        to={`/student/courses/${id}/lessons/${lesson.id}`}
                        className="flex items-center gap-2.5 py-1.5 text-sm text-[var(--color-text)] hover:text-brand-600 group"
                      >
                        <Icon size={16} className="text-[var(--color-text-muted)] shrink-0" />
                        <span className="flex-1">{lesson.title}</span>
                        <ChevronRight size={15} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
