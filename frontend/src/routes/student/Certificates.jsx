import { useQuery } from '@tanstack/react-query'
import { Award, Download } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { getStudentCertificates } from '../../api/fees'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function StudentCertificates() {
  const { user } = useAuth()
  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ['studentCertificates', user.id],
    queryFn: () => getStudentCertificates(user.id),
  })

  return (
    <div>
      <PageHeader title="Certificates" description="Certificates you've earned by completing courses." />

      {error && <p className="text-sm text-danger-500">Could not load your certificates.</p>}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && certificates && certificates.length === 0 && (
        <EmptyState icon={Award} title="No certificates yet" description="Complete a course to earn your first certificate." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {certificates?.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-100 text-accent-600">
                <Award size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text-heading)]">{c.course_title}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{c.certificate_no}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="brand">{c.type}</Badge>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(c.issued_at).toLocaleDateString()}
                  </span>
                </div>
                {c.file_url && (
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-3"
                  >
                    <Download size={14} /> Download
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
