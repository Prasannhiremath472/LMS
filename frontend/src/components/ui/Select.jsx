import { forwardRef } from 'react'

const Select = forwardRef(function Select({ label, error, hint, className = '', id, children, ...props }, ref) {
  const selectId = id || props.name

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--color-text-heading)] mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm
          text-[var(--color-text-heading)]
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
          ${error ? 'border-danger-500' : 'border-[var(--color-border)]'}`}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
})

export default Select
