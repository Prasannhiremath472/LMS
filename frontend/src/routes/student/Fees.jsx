import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { getStudentInvoices } from '../../api/fees'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

export default function StudentFees() {
  const { user } = useAuth()
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['studentInvoices', user.id],
    queryFn: () => getStudentInvoices(user.id),
  })

  return (
    <div>
      <PageHeader title="Fees" description="Your invoices and payment status." />

      {error && <p className="text-sm text-danger-500">Could not load your fee details.</p>}

      {isLoading && <SkeletonCard className="max-w-md" />}

      {!isLoading && invoices && invoices.length === 0 && (
        <EmptyState icon={Receipt} title="No invoices on file" description="Your fee invoices will appear here once created by the institute." />
      )}

      <div className="space-y-4">
        {invoices?.map((inv) => (
          <Card key={inv.id} className="p-5 max-w-md">
            <p className="text-sm font-semibold text-[var(--color-text-heading)]">{inv.course_title}</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">{inv.invoice_no}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                <p className="text-sm font-medium text-[var(--color-text-heading)] tabular-nums">
                  ₹{Number(inv.total_fee).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Paid</p>
                <p className="text-sm font-medium text-success-600 tabular-nums">
                  ₹{Number(inv.paid).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Pending</p>
                <p className={`text-sm font-medium tabular-nums ${inv.pending > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                  ₹{Number(inv.pending).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
