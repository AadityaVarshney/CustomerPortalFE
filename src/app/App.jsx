import { Component } from 'react'
import { Link } from 'react-router-dom'
import AppRouter from './router'
import { ToastContainer } from '@/components/shared/Toast'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              An unexpected error occurred. Try refreshing or return to the dashboard.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-accent rounded-lg p-3 text-left overflow-auto mb-6 text-muted-foreground max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Refresh page
              </button>
              <Link
                to="/customer/dashboard"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Return to dashboard
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AppRouter />
      <ToastContainer />
    </GlobalErrorBoundary>
  )
}
