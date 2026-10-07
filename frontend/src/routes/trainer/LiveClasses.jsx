import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Video } from 'lucide-react'
import { listBatches } from '../../api/batches'
import { listBatchLiveSessions, createLiveSession, getSessionAttendance, markAttendance } from '../../api/liveSessions'
import { useToast } from '../../components/ui/ToastProvider'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import { SkeletonText } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

const PLATFORMS = ['zoom', 'meet', 'teams']

function AttendanceSheet({ sessionId, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: roster, isLoading } = useQuery({
    queryKey: ['attendance', sessionId],
    queryFn: () => getSessionAttendance(sessionId),
  })
  const [statuses, setStatuses] = useState({})

  const mutation = useMutation({
    mutationFn: () => {
      const records = Object.entries(statuses).map(([student_id, status]) => ({
        student_id: Number(student_id),
        status,
      }))
      return markAttendance(sessionId, records)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', sessionId] })
      onClose()
      toast.success('Attendance saved.')
    },
    onError: () => toast.error('Could not save attendance.'),
  })

  if (isLoading) return <SkeletonText lines={2} />
  if (!roster || roster.length === 0) return <p className="text-xs text-[var(--color-text-muted)]">No enrolled students.</p>

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <ul className="space-y-2">
        {roster.map((s) => (
          <li key={s.student_id} className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text)]">{s.full_name}</span>
            <select
              value={statuses[s.student_id] ?? s.attendance_status ?? ''}
              onChange={(e) => setStatuses((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
            >
              <option value="">Not marked</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        className="mt-3"
        loading={mutation.isPending}
        disabled={Object.keys(statuses).length === 0}
        onClick={() => mutation.mutate()}
      >
        Save attendance
      </Button>
    </div>
  )
}

function ScheduleModal({ batchId, open, onOpenChange }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('zoom')
  const [joinUrl, setJoinUrl] = useState('')
  const [startsAt, setStartsAt] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createLiveSession(batchId, { title, platform, join_url: joinUrl, starts_at: startsAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liveSessions', batchId] })
      setTitle('')
      setJoinUrl('')
      setStartsAt('')
      onOpenChange(false)
      toast.success('Live class scheduled.')
    },
    onError: () => toast.error('Could not schedule the class.'),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Schedule a live class">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-4"
      >
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Input label="Join URL" required type="url" value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} />
        <Input label="Starts at" required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <Button type="submit" loading={createMutation.isPending} className="w-full">
          Schedule
        </Button>
      </form>
    </Modal>
  )
}

function BatchSessions({ batchId }) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['liveSessions', batchId],
    queryFn: () => listBatchLiveSessions(batchId),
  })
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [openAttendance, setOpenAttendance] = useState(null)

  return (
    <div>
      <Button variant="secondary" size="sm" className="mb-4" onClick={() => setScheduleOpen(true)}>
        <Plus size={14} /> Schedule a live class
      </Button>
      <ScheduleModal batchId={batchId} open={scheduleOpen} onOpenChange={setScheduleOpen} />

      {isLoading && <SkeletonText lines={2} />}
      {!isLoading && sessions && sessions.length === 0 && (
        <EmptyState icon={Video} title="No live classes scheduled" description="Schedule one for this batch using the button above." />
      )}

      <div className="space-y-3">
        {sessions?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-heading)]">{s.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(s.starts_at).toLocaleString()} · {s.platform}
                </p>
              </div>
              <button
                onClick={() => setOpenAttendance(openAttendance === s.id ? null : s.id)}
                className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {openAttendance === s.id ? 'Hide attendance' : 'Mark attendance'}
              </button>
            </div>
            {openAttendance === s.id && (
              <AttendanceSheet sessionId={s.id} onClose={() => setOpenAttendance(null)} />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function TrainerLiveClasses() {
  const { data: batches, isLoading } = useQuery({ queryKey: ['batches'], queryFn: listBatches })
  const [batchId, setBatchId] = useState('')

  return (
    <div>
      <PageHeader title="Live Classes & Attendance" description="Schedule sessions and track attendance per batch." />

      {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading batches…</p>}

      {batches && (
        <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="mb-6 max-w-sm">
          <option value="">Select a batch…</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.course_title})</option>
          ))}
        </Select>
      )}

      {batchId && <BatchSessions batchId={batchId} />}
    </div>
  )
}
