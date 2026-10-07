import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from './ui/Button'
import Card, { CardBody } from './ui/Card'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardBody className="text-center py-8">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-500 dark:bg-danger-500/10">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-heading)]">Something went wrong</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              This section hit an unexpected error. Try reloading the page.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }
}
