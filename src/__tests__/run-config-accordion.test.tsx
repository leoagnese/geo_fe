import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RunConfigAccordion from '@/components/RunConfigAccordion'
import type { Run } from '@/lib/api-client'

const run = (over: Partial<Run> = {}): Run => ({
  runId: 'r1', clientKey: 'acme', profileKey: 'openai_gpt5_mini_web_medium', status: 'done',
  runIterations: 2, plannedQueries: 70, doneQueries: 70, errorQueries: 0, testMode: false, debugMode: false,
  createdAt: '2026-10-12T10:00:00Z', targetDomain: 'gewiss.com', brand: 'Gewiss', locales: ['it'],
  profileSnapshot: { runModel: 'gpt-5-mini', llmProvider: 'openai', batchSize: 5 },
  ...over,
})

async function open() {
  await userEvent.click(screen.getByRole('button', { name: /Configurazione run/i }))
}

describe('RunConfigAccordion', () => {
  it('is collapsed by default and shows the configuration once opened', async () => {
    render(<RunConfigAccordion run={run()} />)
    expect(screen.getByRole('button', { name: /Configurazione run/i })).toHaveAttribute('aria-expanded', 'false')
    await open()
    expect(screen.getByText('gewiss.com')).toBeVisible()
    expect(screen.getByText('gpt-5-mini')).toBeVisible()
    expect(screen.getByText('openai_gpt5_mini_web_medium')).toBeVisible()
  })

  it('lists the custom queries per language when the run used them', async () => {
    render(
      <RunConfigAccordion
        run={run({
          gotQueries: true,
          queries: {
            it: [
              { keyword: 'RCD', query: 'Quale differenziale scegliere?', topicId: 'industry', intent: '', personaId: '' },
              { keyword: 'UPS', query: 'Quale UPS per un data center?', topicId: 'industry', intent: '', personaId: '' },
            ],
          },
        })}
      />,
    )
    await open()
    expect(screen.getByText(/IT — 2 query/i)).toBeInTheDocument()
    expect(screen.getByText('Quale differenziale scegliere?')).toBeInTheDocument()
    expect(screen.getByText('Quale UPS per un data center?')).toBeInTheDocument()
  })

  it('does not show a custom queries section for generated runs', async () => {
    render(<RunConfigAccordion run={run()} />)
    await open()
    expect(screen.queryByText(/Query custom/i)).not.toBeInTheDocument()
  })
})
