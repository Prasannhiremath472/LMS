import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const ROLE_HOME = {
  student: '/student',
  trainer: '/trainer',
  admin: '/admin',
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(ROLE_HOME[user.role] ?? '/login')
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[var(--color-surface-sunken)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(60% 50% at 50% -10%, color-mix(in srgb, var(--color-brand-500) 18%, transparent), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/images/infinity_logo.jpg"
            alt="Infinity Technology Hub"
            className="h-16 w-16 rounded-full object-cover shadow-[var(--shadow-card)]"
          />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-heading)]">Infinity LMS</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-popover)]"
        >
          <h1 className="text-lg font-semibold text-[var(--color-text-heading)] mb-1">Welcome back</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">Sign in to continue to your dashboard.</p>

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-danger-50 dark:bg-danger-500/10 px-3 py-2 text-sm text-danger-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" loading={submitting} className="w-full mt-6" size="lg">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <a href="/forgot-password" className="block text-center text-sm text-brand-600 hover:text-brand-700 mt-5">
            Forgot password?
          </a>
        </form>
      </div>
    </div>
  )
}
