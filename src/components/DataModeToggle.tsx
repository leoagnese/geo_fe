'use client'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useDataMode, type DataMode } from '@/lib/useDataMode'

export default function DataModeToggle() {
  const { mode, setMode } = useDataMode()
  return (
    <ToggleButtonGroup
      exclusive size="small" value={mode} aria-label="Modalità dati"
      onChange={(_e, next: DataMode | null) => { if (next) setMode(next) }}
    >
      <ToggleButton value="raw">Dati raw</ToggleButton>
      <ToggleButton value="processed">Dati elaborati</ToggleButton>
    </ToggleButtonGroup>
  )
}
