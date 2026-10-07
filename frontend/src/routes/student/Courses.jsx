import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ArrowRight } from 'lucide-react'
import { listCourses } from '../../api/courses'
import PageHeader from '../../components/ui/PageHeader'
import Card, { CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function StudentCourses() {
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: listCourses,
  })

  return (
    <div>
      <PageHeader title="My Courses" description="Courses you're currently enrolled in." />

      {error && <p className="text-sm text-danger-500">Could not load your courses.</p>}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!error && !isLoading && courses && courses.length === 0 && (
        <EmptyState icon={BookOpen} title="No courses yet" description="Once you're enrolled in a batch, your courses will show up here." />
      )}

      {!isLoading && courses && courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link key={c.id} to={`/student/courses/${c.id}`}>
              <Card className="h-full transition-colors hover:border-brand-300 dark:hover:border-brand-700">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{c.title}</h3>
                    <ArrowRight size={15} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2">
                    {c.description || 'No description yet.'}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
