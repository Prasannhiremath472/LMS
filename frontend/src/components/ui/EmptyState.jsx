export default function EmptyState({ icon: IconComponent, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {IconComponent && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
          <IconComponent size={22} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-text-heading)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
