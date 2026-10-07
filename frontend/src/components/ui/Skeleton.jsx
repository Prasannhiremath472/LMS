function Base({ className = '' }) {
  return <div className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] ${className}`} />
}

export default function Skeleton({ className = '' }) {
  return <Base className={className || 'h-4 w-full'} />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Base key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonTableRows({ rows = 4, cols = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Base className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 ${className}`}>
      <Base className="h-4 w-1/3 mb-3" />
      <Base className="h-7 w-1/2 mb-2" />
      <Base className="h-3 w-2/3" />
    </div>
  )
}
