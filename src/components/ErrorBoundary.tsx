import { Component, ErrorInfo, ReactNode } from 'react'

// Define the state interface for error boundary
interface ErrorBoundaryState {
  hasError: boolean
}

// Define the props interface (if you want to pass any props)
interface ErrorBoundaryProps {
  children: ReactNode
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  // Update state so the next render will show the fallback UI.
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  // Log the error and error info (optional)
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    // You could also send the error to a logging service here
    console.error('props', this.props)
  }

  render() {
    if (this.state.hasError) {
      // You can render any fallback UI here
      return (
        <div>
          <h1>Oops! Something went wrong.</h1>
          <p>Please check console.</p>
        </div>
      )
    }

    // If no error, render children
    return this.props.children
  }
}
