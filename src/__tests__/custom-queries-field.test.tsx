/**
 * Custom-query mode in the run configurator: toggle, manual rows, and the
 * file import flow (dialog → vertical filter → form values).
 */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { FormProvider, useForm } from 'react-hook-form'
import CustomQueriesField from '@/components/CustomQueriesField'
import table from './fixtures/energy_llm_prompts_104.json'
import type { Persona } from '@/lib/api-client'

jest.mock('@/lib/readSpreadsheet', () => ({
  readSpreadsheetFile: jest.fn(async () => require('./fixtures/energy_llm_prompts_104.json')),
}))

const personas: Persona[] = [
  { id: 'p-prog', name: 'Progettisti / Specifiers', description: '', context: '' },
  { id: 'p-inst', name: 'Installatori / Installers', description: '', context: '' },
]

let latest: any
function Harness() {
  const methods = useForm({
    defaultValues: { activeLocales: ['it'], gotQueries: false, queries: {}, customQueryDefaultPersonaId: {}, topics: [{ label: '', keywords: [] }] },
  })
  latest = methods.watch()
  return (
    <FormProvider {...methods}>
      <CustomQueriesField namePrefix="" personas={personas} />
    </FormProvider>
  )
}

describe('CustomQueriesField', () => {
  it('hides the editor until the switch is turned on', async () => {
    render(<Harness />)
    expect(screen.queryByText(/Importa da file/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(latest.gotQueries).toBe(true)
    expect(screen.getByText(/Importa da file/)).toBeInTheDocument()
  })

  it('adds an empty row and stores typed values', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi query/ }))
    await userEvent.type(screen.getByLabelText('Keyword'), 'RCD')
    await userEvent.type(screen.getByLabelText('Query'), 'Quale differenziale?')
    expect(latest.queries.it).toEqual([
      expect.objectContaining({ keyword: 'RCD', query: 'Quale differenziale?' }),
    ])
  })

  it('imports only Industry + Hospitality rows from the real sheet (70 of 104)', async () => {
    expect((table as string[][]).length).toBe(105)
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /Importa da file/ }))

    const dialog = await screen.findByRole('dialog')
    const input = within(dialog).getByTestId('query-file-input')
    await userEvent.upload(input, new File(['x'], 'energy_llm_prompts_104.xlsx'))

    expect(await within(dialog).findByText('Anteprima: 104 query')).toBeInTheDocument()
    expect(within(dialog).getByText('Progettisti / Specifiers: 52')).toBeInTheDocument()
    expect(within(dialog).getByText('Installatori / Installers: 52')).toBeInTheDocument()

    for (const v of ['Sports', 'Retail', 'Altro']) {
      await userEvent.click(within(dialog).getByRole('checkbox', { name: new RegExp(`^${v} `) }))
    }
    expect(within(dialog).getByText('Anteprima: 70 query')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Importa 70 query' }))
    await waitFor(() => expect(latest.queries.it).toHaveLength(70))
    expect(latest.queries.it.every((q: any) => q.keyword && q.query && q.personaId)).toBe(true)
  })

  it('fills the topics list from the imported verticals, replacing the empty placeholder', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /Importa da file/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.upload(within(dialog).getByTestId('query-file-input'), new File(['x'], 'a.xlsx'))
    await within(dialog).findByText('Anteprima: 104 query')
    for (const v of ['Sports', 'Retail', 'Altro']) {
      await userEvent.click(within(dialog).getByRole('checkbox', { name: new RegExp(`^${v} `) }))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Importa 70 query' }))

    await waitFor(() => expect(latest.topics).toHaveLength(12))
    expect(latest.topics.every((t: any) => t.label && t.keywords.length > 0)).toBe(true)
    const topicIdsInQueries = new Set(latest.queries.it.map((q: any) => q.topicId))
    const { slugifyTopic } = jest.requireActual('@/components/RunConfigFields')
    expect(new Set(latest.topics.map((t: any) => slugifyTopic(t.label)))).toEqual(topicIdsInQueries)
  })

  it('"Sostituisci" replaces rows already present', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi query/ }))
    await userEvent.click(screen.getByRole('button', { name: /Importa da file/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.upload(within(dialog).getByTestId('query-file-input'), new File(['x'], 'a.xlsx'))
    await within(dialog).findByText('Anteprima: 104 query')
    await userEvent.click(within(dialog).getByLabelText('Sostituisci le esistenti'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Importa 104 query' }))
    await waitFor(() => expect(latest.queries.it).toHaveLength(104))
  })
})
