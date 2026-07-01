import { render, screen } from '@testing-library/react'
import StatusChip from '@/components/StatusChip'

describe('StatusChip', () => {
  it.each([
    ['queued', 'In coda'],
    ['running', 'In esecuzione'],
    ['done', 'Completata'],
    ['error', 'Errore'],
    ['cancelled', 'Annullata'],
    ['aggregating', 'Aggregazione…'],
    ['partial', 'Parziale'],
  ] as const)('renders the Italian label for status=%s', (status, label) => {
    render(<StatusChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
