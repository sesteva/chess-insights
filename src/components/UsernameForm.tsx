import { useState, FormEvent } from 'react'

interface UsernameFormProps {
  onSubmit: (username: string) => void
  isLoading?: boolean
  error?: string
}

/** Validates a chess.com username: 3–25 chars, letters/numbers/hyphens/underscores only */
function validateUsername(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Username is required'
  if (trimmed.length < 3) return 'Username must be at least 3 characters'
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Invalid characters — only letters, numbers, hyphens, and underscores allowed'
  }
  return null
}

export function UsernameForm({ onSubmit, isLoading = false, error }: UsernameFormProps) {
  const [value, setValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validateUsername(value)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError(null)
    onSubmit(value.trim().toLowerCase())
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setLocalError(null)
          }}
          placeholder="Enter chess.com username…"
          aria-label="chess.com username"
          disabled={isLoading}
          maxLength={25}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {(localError || error) && (
          <p className="text-red-500 text-sm">{localError ?? error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded transition-colors"
        >
          {isLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
    </form>
  )
}
