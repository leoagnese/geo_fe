import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TopDomainsTable from '@/components/TopDomainsTable'
import PersonaTopicMatrix from '@/components/PersonaTopicMatrix'

const rows = [
  { domain: 'a.com', mentions: 3, queries: 2, weight: 60 },
  { domain: 'b.com', mentions: 1, queries: 1, weight: 20 },
]
const matrix = {
  topics: ['T1', 'T2'],
  rows: [{ personaId: 'p1', cells: [{ total: 2, target: 1, share: 50 }, { total: 0, target: 0, share: null }], total: { total: 2, target: 1, share: 50 } }],
  totals: { cells: [{ total: 2, target: 1, share: 50 }, { total: 0, target: 0, share: null }], total: { total: 2, target: 1, share: 50 } },
}

describe('TopDomainsTable', () => {
  it('shows mentions and weight and marks the target domain', () => {
    render(<TopDomainsTable rows={rows} metric="mentions" target="a.com" />)
    expect(screen.getByText('a.com')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('target')).toBeInTheDocument()
  })
  it('switches the value to distinct queries', () => {
    render(<TopDomainsTable rows={rows} metric="queries" target={null} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })
})

describe('PersonaTopicMatrix', () => {
  it('renders topics, persona names, shares, a dash for empty cells and the counts in the tooltip', () => {
    render(<PersonaTopicMatrix matrix={matrix} personaNames={{ p1: 'Family' }} />)
    expect(screen.getByText('T1')).toBeInTheDocument()
    expect(screen.getByText('Family')).toBeInTheDocument()
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('–').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('1 di 2').length).toBeGreaterThan(0)
  })
})
