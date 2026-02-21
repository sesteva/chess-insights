interface ErrorScreenProps {
  message: string
  onRetry: () => void
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-6">⚠</div>
        <h2 className="text-white text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded transition-colors"
        >
          Try another player
        </button>
      </div>
    </div>
  )
}
