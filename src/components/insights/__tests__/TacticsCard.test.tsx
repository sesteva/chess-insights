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
    expect(screen.getByText('3')).toBeInTheDocument()  // matesPlayed
    expect(screen.getByText('2')).toBeInTheDocument()  // missedMates
    expect(screen.getByText('60%')).toBeInTheDocument() // mateFoundPct
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders a fallback when stats is null and not loading', () => {
    render(<TacticsCard stats={null} loading={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('shows no-opportunities message when games analyzed but no mates found', () => {
    const zeroStats: TacticsStats = { gamesAnalyzed: 5, missedMates: 0, matesPlayed: 0 }
    render(<TacticsCard stats={zeroStats} loading={false} />)
    expect(screen.getByText(/no mate-in-1 opportunities detected/i)).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // mateFoundPct placeholder
  })
})
