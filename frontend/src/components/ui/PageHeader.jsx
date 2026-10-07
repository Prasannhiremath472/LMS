import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PageHeader({ title, description, backTo, backLabel, actions }) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-brand-600 mb-2"
        >
          <ChevronLeft size={15} />
          {backLabel || 'Back'}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-heading)]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
