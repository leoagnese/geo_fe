'use client'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import type { MatrixCell, PersonaTopicMatrixData } from '@/lib/api-client'

function Cell({ c }: { c: MatrixCell }) {
  return (
    <TableCell
      align="center"
      title={`${c.target} di ${c.total}`}
      sx={{ bgcolor: c.share === null ? 'transparent' : `rgba(37, 99, 235, ${(Math.min(c.share, 100) / 100) * 0.6})` }}
    >
      {c.share === null ? '–' : `${c.share}%`}
    </TableCell>
  )
}

export default function PersonaTopicMatrix({ matrix, personaNames }: { matrix: PersonaTopicMatrixData; personaNames: Record<string, string> }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Persona</TableCell>
          {matrix.topics.map((t) => <TableCell key={t} align="center">{t}</TableCell>)}
          <TableCell align="center">Totale generale</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {matrix.rows.map((r) => (
          <TableRow key={r.personaId}>
            <TableCell>{personaNames[r.personaId] ?? r.personaId}</TableCell>
            {r.cells.map((c, i) => <Cell key={i} c={c} />)}
            <Cell c={r.total} />
          </TableRow>
        ))}
        <TableRow>
          <TableCell><strong>Totale generale</strong></TableCell>
          {matrix.totals.cells.map((c, i) => <Cell key={i} c={c} />)}
          <Cell c={matrix.totals.total} />
        </TableRow>
      </TableBody>
    </Table>
  )
}
