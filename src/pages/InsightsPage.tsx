import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useLoadPlayerData } from '../hooks/useLoadPlayerData'
import { LoadingScreen } from '../components/LoadingScreen'
import { ErrorScreen } from '../components/ErrorScreen'
import { InsightsDashboard } from '../components/InsightsDashboard'

export function InsightsPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { load } = useLoadPlayerData()
  const { loadingState, error, username: loadedUsername } = useGameStore()

  useEffect(() => {
    if (!username) {
      navigate('/')
      return
    }
    // Only reload if the username changed
    if (username !== loadedUsername) {
      load(username)
    }
  }, [username, loadedUsername, load, navigate])

  if (loadingState === 'loading' || loadingState === 'idle') {
    return <LoadingScreen />
  }

  if (loadingState === 'error' || error) {
    return (
      <ErrorScreen
        message={error ?? 'Unknown error'}
        onRetry={() => navigate('/')}
      />
    )
  }

  return <InsightsDashboard />
}
