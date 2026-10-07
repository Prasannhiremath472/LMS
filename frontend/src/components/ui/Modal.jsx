import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export default function Modal({ open, onOpenChange, title, description, children, trigger }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2
            rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]
            shadow-[var(--shadow-popover)] focus:outline-none"
        >
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div>
              <Dialog.Title className="text-sm font-semibold text-[var(--color-text-heading)]">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] focus:outline-none">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
