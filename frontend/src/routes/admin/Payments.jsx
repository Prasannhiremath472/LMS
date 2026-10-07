import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Receipt } from 'lucide-react'
import { listStudents } from '../../api/batches'
import { listCourses } from '../../api/courses'
import { createInvoice, recordPayment, getStudentInvoices, issueCertificate, getStudentCertificates } from '../../api/fees'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

const MODES = ['cash', 'upi', 'card', 'netbanking']

function RecordPaymentForm({ invoiceId, onRecorded }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('cash')
  const [txnRef, setTxnRef] = useState('')
  const mutation = useMutation({
    mutationFn: () => recordPayment(invoiceId, { amount: Number(amount), mode, txn_ref: txnRef || undefined }),
    onSuccess: () => {
      setAmount('')
      setTxnRef('')
      onRecorded()
      toast.success('Payment recorded.')
    },
    onError: () => toast.error('Could not record payment.'),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]"
    >
      <Input
        type="number"
        min="0"
        required
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24"
      />
      <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-auto">
        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
      </Select>
      <Input
        placeholder="Txn ref (optional)"
        value={txnRef}
        onChange={(e) => setTxnRef(e.target.value)}
        className="w-36"
      />
      <Button type="submit" size="sm" loading={mutation.isPending}>
        Record
      </Button>
    </form>
  )
}

function StudentFeesPanel({ studentId }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['studentInvoices', studentId],
    queryFn: () => getStudentInvoices(studentId),
  })
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: listCourses })
  const { data: certificates } = useQuery({
    queryKey: ['studentCertificates', studentId],
    queryFn: () => getStudentCertificates(studentId),
  })

  const [courseId, setCourseId] = useState('')
  const [totalFee, setTotalFee] = useState('')
  const invoiceMutation = useMutation({
    mutationFn: () => createInvoice({ student_id: Number(studentId), course_id: Number(courseId), total_fee: Number(totalFee) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentInvoices', studentId] })
      setCourseId('')
      setTotalFee('')
      toast.success('Invoice created.')
    },
    onError: () => toast.error('Could not create invoice.'),
  })

  const certMutation = useMutation({
    mutationFn: (course_id) => issueCertificate(studentId, { course_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentCertificates', studentId] })
      toast.success('Certificate issued.')
    },
  })

  function refreshInvoices() {
    queryClient.invalidateQueries({ queryKey: ['studentInvoices', studentId] })
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="max-w-md">
        <CardHeader>
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">New invoice</h3>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              invoiceMutation.mutate()
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <Select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className="flex-1 min-w-[10rem]">
              <option value="">Course…</option>
              {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Input
              type="number"
              min="0"
              required
              placeholder="Total fee"
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value)}
              className="w-32"
            />
            <Button type="submit" loading={invoiceMutation.isPending}>
              Create
            </Button>
          </form>
        </CardBody>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">Invoices</h3>
        {isLoading && <SkeletonCard />}
        {!isLoading && invoices && invoices.length === 0 && (
          <EmptyState icon={Receipt} title="No invoices yet" description="Create one above to start tracking this student's fees." />
        )}
        <div className="space-y-3">
          {invoices?.map((inv) => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-heading)]">{inv.invoice_no}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{inv.course_title}</p>
                </div>
                <div className="text-right text-xs text-[var(--color-text-muted)]">
                  <p>Total ₹{Number(inv.total_fee).toLocaleString('en-IN')}</p>
                  <p>Paid ₹{Number(inv.paid).toLocaleString('en-IN')}</p>
                  <p className={inv.pending > 0 ? 'text-warning-600 font-medium' : 'text-success-600 font-medium'}>
                    Pending ₹{Number(inv.pending).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <RecordPaymentForm invoiceId={inv.id} onRecorded={refreshInvoices} />
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">Certificates</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.target)
            certMutation.mutate(Number(fd.get('cert_course_id')), {
              onError: (err) => toast.error(err.response?.data?.error || 'Could not issue certificate.'),
            })
          }}
          className="flex flex-wrap items-center gap-2 mb-3"
        >
          <Select required name="cert_course_id" className="w-auto min-w-[10rem]">
            <option value="">Course…</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Button type="submit" loading={certMutation.isPending}>
            Issue completion certificate
          </Button>
        </form>

        {certificates && certificates.length === 0 && (
          <EmptyState icon={Award} title="No certificates issued" description="Issue one once the student completes a course." />
        )}
        <ul className="space-y-1">
          {certificates?.map((c) => (
            <li key={c.id} className="text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text-heading)] font-medium">{c.certificate_no}</span> — {c.course_title} ({c.type})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const { data: students, isLoading } = useQuery({ queryKey: ['students'], queryFn: listStudents })
  const [studentId, setStudentId] = useState('')

  return (
    <div>
      <PageHeader title="Payments" description="Manage invoices, installments, and certificates per student." />

      {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading students…</p>}

      {students && (
        <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="max-w-sm">
          <option value="">Select a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
          ))}
        </Select>
      )}

      {studentId && <StudentFeesPanel studentId={studentId} />}
    </div>
  )
}
