import Card from './Card'

export default function StatCard({ label, value, icon: IconComponent, trend, trendLabel, accent = 'brand' }) {
  const accentClasses = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
  }[accent]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-heading)] tabular-nums">{value}</p>
        </div>
        {IconComponent && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${accentClasses}`}>
            <IconComponent size={18} strokeWidth={1.75} />
          </div>
        )}
      </div>
      {trend != null && (
        <p className={`mt-3 text-xs font-medium ${trend >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
          {trend >= 0 ? '+' : ''}{trend}% {trendLabel && <span className="text-[var(--color-text-muted)] font-normal">{trendLabel}</span>}
        </p>
      )}
    </Card>
  )
}
