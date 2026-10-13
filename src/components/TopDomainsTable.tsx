'use client'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import type { TopDomainRow } from '@/lib/api-client'

export default function TopDomainsTable({ rows, metric, target }: { rows: TopDomainRow[]; metric: 'mentions' | 'queries'; target: string | null }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Dominio</TableCell>
          <TableCell align="right">{metric === 'mentions' ? 'Menzioni con link' : 'Query che citano'}</TableCell>
          <TableCell sx={{ width: '35%' }}>Peso</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.domain}>
            <TableCell>
              {r.domain} {r.domain === target && <Chip label="target" size="small" color="primary" />}
            </TableCell>
            <TableCell align="right">{metric === 'mentions' ? r.mentions : r.queries}</TableCell>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'primary.main', width: `${Math.min(r.weight, 100)}%`, minWidth: 2 }} />
                <span>{`${r.weight}%`}</span>
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
