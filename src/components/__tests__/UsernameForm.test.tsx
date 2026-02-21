/**
 * Task 1.5: Username Input Form Tests
 *
 * Tests for the player username entry form. Covers:
 * - Rendering
 * - Input validation (empty, too short, invalid characters)
 * - Successful submission
 * - Loading state during fetch
 * - Error display when player not found
 *
 * TDD: written before implementation.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsernameForm } from '../UsernameForm'

describe('UsernameForm', () => {
  it('renders an input field and submit button', () => {
    render(<UsernameForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyze|search|go/i })).toBeInTheDocument()
  })

  it('shows a placeholder hint in the input', () => {
    render(<UsernameForm onSubmit={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder')
  })

  it('shows validation error when submitted with empty username', async () => {
    render(<UsernameForm onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /analyze|search|go/i }))
    expect(await screen.findByText(/username.*required|enter.*username/i)).toBeInTheDocument()
  })

  it('shows validation error for usernames shorter than 3 characters', async () => {
    const user = userEvent.setup()
    render(<UsernameForm onSubmit={vi.fn()} />)
    await user.type(screen.getByRole('textbox'), 'ab')
    await user.click(screen.getByRole('button', { name: /analyze|search|go/i }))
    expect(await screen.findByText(/at least 3/i)).toBeInTheDocument()
  })

  it('shows validation error for usernames with invalid characters', async () => {
    const user = userEvent.setup()
    render(<UsernameForm onSubmit={vi.fn()} />)
    await user.type(screen.getByRole('textbox'), 'invalid user!')
    await user.click(screen.getByRole('button', { name: /analyze|search|go/i }))
    expect(await screen.findByText(/invalid.*character|only.*letters/i)).toBeInTheDocument()
  })

  it('calls onSubmit with lowercase trimmed username when valid', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UsernameForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox'), '  Hikaru  ')
    await user.click(screen.getByRole('button', { name: /analyze|search|go/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hikaru'))
  })

  it('allows alphanumeric usernames with hyphens and underscores', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UsernameForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox'), 'player-one_2024')
    await user.click(screen.getByRole('button', { name: /analyze|search|go/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('player-one_2024'))
  })

  it('disables the submit button while loading', () => {
    render(<UsernameForm onSubmit={vi.fn()} isLoading={true} />)
    expect(screen.getByRole('button', { name: /analyze|search|go|loading|analyzing/i })).toBeDisabled()
  })

  it('displays an external error message (e.g. player not found)', () => {
    render(<UsernameForm onSubmit={vi.fn()} error="Player not found" />)
    expect(screen.getByText(/player not found/i)).toBeInTheDocument()
  })

  it('clears external error when user starts typing', async () => {
    const { rerender } = render(<UsernameForm onSubmit={vi.fn()} error="Player not found" />)
    expect(screen.getByText(/player not found/i)).toBeInTheDocument()

    // Simulate parent clearing the error as user types
    rerender(<UsernameForm onSubmit={vi.fn()} error={undefined} />)
    expect(screen.queryByText(/player not found/i)).not.toBeInTheDocument()
  })

  it('submits on Enter key press', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<UsernameForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox'), 'hikaru{Enter}')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hikaru'))
  })
})
