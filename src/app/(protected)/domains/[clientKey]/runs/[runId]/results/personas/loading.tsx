import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

export default function PersonasLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={90} sx={{ flex: 1 }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={480} />
    </Box>
  )
}
