import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TacticsCard } from '../TacticsCard'
import type { TacticsStats } from '../../../utils/gameAnalysis'

const sampleStats: TacticsStats = {
  gamesAnalyzed: 10,
  missedMates: 2,
  matesPlayed: 3,
}

describe('TacticsCard', () => {
  it('shows a loading indicator when loading=true', () => {
    render(<TacticsCard stats={null} loading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders stats when loading=false and stats provided', () => {
    render(<TacticsCard stats={sampleStats} loading={false} />)
    expect(screen.getByText('10')).toBeInTheDocument() // gamesAnalyzed
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders a fallback when stats is null and not loading', () => {
    render(<TacticsCard stats={null} loading={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
