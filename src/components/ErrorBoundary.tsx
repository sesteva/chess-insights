import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <h1 className="text-white text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-2">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <p className="text-gray-600 text-xs mb-8">
            Try reloading the page or searching for a different player.
          </p>
          <button
            onClick={this.handleReset}
            className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }
}
