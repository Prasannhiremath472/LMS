import { createContext, useCallback, useContext, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const STYLES = {
  success: 'border-success-500/30 bg-success-50 text-success-600 dark:bg-success-500/10',
  error: 'border-danger-500/30 bg-danger-50 text-danger-600 dark:bg-danger-500/10',
  info: 'border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200',
}

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, action.toast]
    case 'remove':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const remove = useCallback((id) => dispatch({ type: 'remove', id }), [])

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    dispatch({ type: 'add', toast: { id, message, type } })
    if (duration) setTimeout(() => remove(id), duration)
  }, [remove])

  const api = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
    info: (message) => push(message, 'info'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
          {toasts.map((t) => {
            const Icon = ICONS[t.type]
            return (
              <div
                key={t.id}
                role="status"
                className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border px-4 py-3 text-sm shadow-[var(--shadow-popover)] ${STYLES[t.type]}`}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <p className="flex-1">{t.message}</p>
                <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
