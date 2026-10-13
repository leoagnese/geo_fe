import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import BrandLegend from '@/components/BrandLegend'

describe('BrandLegend', () => {
  const items = [
    { label: 'Gewiss', color: '#ec5b13' },
    { label: 'Schneider', color: '#2a78d6' },
    { label: 'Altri competitor (4)', color: '#94a3b8' },
  ]

  it('lists every entry by name', () => {
    render(<BrandLegend items={items} />)
    for (const i of items) expect(screen.getByText(i.label)).toBeInTheDocument()
  })

  it('shows a colour swatch per entry, in that entry\'s colour', () => {
    render(<BrandLegend items={items} />)
    const swatch = screen.getByTestId('legend-swatch-Schneider')
    expect(swatch).toHaveStyle({ backgroundColor: 'rgb(42, 120, 214)' })
  })

  it('is exposed as a list for assistive tech', () => {
    render(<BrandLegend items={items} />)
    expect(screen.getByRole('list', { name: 'Legenda brand' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders nothing when there are no entries', () => {
    const { container } = render(<BrandLegend items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
