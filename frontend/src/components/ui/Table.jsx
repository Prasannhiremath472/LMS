export function Table({ className = '', children }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead className="bg-[var(--color-surface-sunken)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
      {children}
    </thead>
  )
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">{children}</tbody>
}

export function Tr({ className = '', children, ...props }) {
  return (
    <tr className={`hover:bg-[var(--color-surface-sunken)] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  )
}

export function Th({ className = '', children }) {
  return <th className={`px-4 py-2.5 font-medium whitespace-nowrap ${className}`}>{children}</th>
}

export function Td({ className = '', children }) {
  return <td className={`px-4 py-2.5 text-[var(--color-text)] ${className}`}>{children}</td>
}
