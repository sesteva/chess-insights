import { useNavigate } from 'react-router-dom'
import { UsernameForm } from '../components/UsernameForm'

export function HomePage() {
  const navigate = useNavigate()

  function handleSubmit(username: string) {
    navigate(`/insights/${username}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo / Header */}
        <div className="mb-8">
          <span className="text-6xl">♟</span>
          <h1 className="mt-4 text-4xl font-bold text-white tracking-tight">
            Chess Insights
          </h1>
          <p className="mt-2 text-gray-400 text-lg">
            Diamond-tier analytics for every chess.com player
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mb-8 grid grid-cols-2 gap-3 text-left">
          {[
            { icon: '📈', label: 'Rating Trends' },
            { icon: '♟', label: 'Opening Stats' },
            { icon: '🎯', label: 'Accuracy Charts' },
            { icon: '🌍', label: 'Geography Map' },
            { icon: '📅', label: 'Calendar Insights' },
            { icon: '⚡', label: 'Game Phase Analysis' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <p className="text-gray-300 text-sm mb-4">
            Enter any chess.com username to load their insights
          </p>
          <UsernameForm onSubmit={handleSubmit} />
        </div>

        <p className="mt-6 text-xs text-gray-600">
          Uses the free chess.com public API. No account needed.
        </p>
      </div>
    </div>
  )
}
